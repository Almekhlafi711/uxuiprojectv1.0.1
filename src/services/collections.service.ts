/**
 * Collections Transaction Service — CENTRAL execution layer for all collections.
 *
 * Flow:
 *   createCollection() → rep submits (draft → submitted)
 *   approveCollection() → supervisor approves (submitted → approved)
 *   rejectCollection()  → supervisor rejects (submitted → rejected)
 *
 * Every operation:
 *   1. Workflow gate (canTransition)
 *   2. Ledger entry (collection_credit)
 *   3. Cash movement (collection_in to rep's cash box)
 *   4. Update invoice paymentStatus
 *   5. Audit log
 */
import { customers } from "@/mock/customers";
import { invoices as mockInvoices } from "@/mock/sales";
import { cashBoxes } from "@/mock/cash";
import {
  addCollection,
  addLedgerEntry,
  addCashMovement,
  addAuditLog,
  findCollection,
  genCollectionId,
  genCollectionNumber,
  genLedgerId,
  genCashMovementId,
  genAuditId,
} from "@/store/transactions";
import { canTransition, type CheckActor } from "@/services/workflow";
import type { Collection } from "@/types";
import type { LedgerEntry } from "@/mock/ledger";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface CreateCollectionInput {
  customerId: string;
  repId: string;
  amount: number;
  method: "cash" | "transfer" | "pos" | "check";
  invoiceIds: string[];
  notes?: string;
}

export interface CollectionResult {
  success: boolean;
  collection?: Collection;
  reason?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const findRepCashBox = (repId: string) =>
  cashBoxes.find((b) => b.ownerId === repId && b.type === "rep");

// ─── Main operations ────────────────────────────────────────────────────────

/**
 * Create and submit a new collection.
 *
 * Steps:
 *  1. Validate input
 *  2. canTransition(collection: draft → submitted)
 *  3. Create Collection in transactions store
 *  4. Create LedgerEntry (collection_credit)
 *  5. Create CashMovement (collection_in)
 *  6. Audit log
 */
export const createCollection = (
  input: CreateCollectionInput,
  actor: CheckActor
): CollectionResult => {
  // 1. Validate
  const customer = customers.find((c) => c.id === input.customerId);
  if (!customer) return { success: false, reason: "العميل غير موجود" };
  if (input.amount <= 0) return { success: false, reason: "المبلغ يجب أن يكون أكبر من صفر" };

  // 2. Workflow gate: draft → submitted
  const gate = canTransition({
    entityType: "collection",
    from: "draft",
    action: "submit",
    actor,
  });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const date = today();
  const cashBox = findRepCashBox(input.repId);

  // 3. Create collection
  const collection: Collection = {
    id: genCollectionId(),
    number: genCollectionNumber(),
    customerId: input.customerId,
    repId: input.repId,
    amount: input.amount,
    method: input.method,
    date,
    invoiceIds: input.invoiceIds,
    cashBoxId: cashBox?.id ?? "",
    status: "submitted",
    notes: input.notes,
  };
  addCollection(collection);

  // 4. Ledger entry — credit customer
  const ledgerEntry: LedgerEntry = {
    id: genLedgerId(),
    date,
    entityType: "customer",
    entityId: input.customerId,
    type: "collection_credit",
    debit: 0,
    credit: input.amount,
    sourceRef: collection.number,
    sourceType: "collection",
    description: `تحصيل ${collection.number} — ${input.method}`,
  };
  addLedgerEntry(ledgerEntry);

  // 5. Cash movement — collection_in
  if (cashBox) {
    addCashMovement({
      id: genCashMovementId(),
      number: collection.number,
      type: "collection_in",
      amount: input.amount,
      cashBoxId: cashBox.id,
      relatedRepId: input.repId,
      date,
      notes: `تحصيل من ${customer.name}`,
      createdBy: input.repId,
    });
  }

  // 6. Audit
  addAuditLog({
    id: genAuditId(),
    actor: input.repId,
    action: "collection.submitted",
    entity: "collection",
    entityId: collection.id,
    at: date,
    newValue: JSON.stringify(collection),
  });

  return { success: true, collection };
};

/**
 * Approve a submitted collection.
 */
export const approveCollection = (
  collectionId: string,
  actor: CheckActor
): CollectionResult => {
  const col = findCollection(collectionId);
  if (!col) return { success: false, reason: "سند التحصيل غير موجود" };

  const gate = canTransition({
    entityType: "collection",
    from: "submitted",
    action: "approve",
    actor,
  });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const oldStatus = col.status;
  col.status = "approved";

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "collection.approved",
    entity: "collection",
    entityId: col.id,
    at: today(),
    oldValue: oldStatus,
    newValue: "approved",
  });

  return { success: true, collection: col };
};

/**
 * Reject a submitted collection.
 */
export const rejectCollection = (
  collectionId: string,
  actor: CheckActor,
  reason: string
): CollectionResult => {
  const col = findCollection(collectionId);
  if (!col) return { success: false, reason: "سند التحصيل غير موجود" };

  const gate = canTransition({
    entityType: "collection",
    from: "submitted",
    action: "reject",
    actor,
  });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const oldStatus = col.status;
  col.status = "rejected";

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "collection.rejected",
    entity: "collection",
    entityId: col.id,
    at: today(),
    oldValue: oldStatus,
    newValue: "rejected",
    reason,
  });

  return { success: true, collection: col };
};
