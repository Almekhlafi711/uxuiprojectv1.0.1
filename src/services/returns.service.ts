/**
 * Returns Transaction Service — CENTRAL execution layer for all returns.
 *
 * Lifecycle:
 *   createReturn()  → rep submits (draft → submitted)
 *   inspectReturn() → supervisor inspects (submitted → inspection)
 *   approveReturn() → supervisor approves (inspection → approved)
 *   rejectReturn()  → supervisor rejects (inspection → rejected)
 *   postReturn()    → final posting (approved → posted)
 *
 * Every operation:
 *   1. Workflow gate (canTransition)
 *   2. Stock movement (return_in if good condition)
 *   3. Ledger entry (return_credit)
 *   4. Audit log
 */
import { customers } from "@/mock/customers";
import { products } from "@/mock/products";
import { vanStock } from "@/mock/inventory";
import {
  addReturn,
  addLedgerEntry,
  addStockMovement,
  addAuditLog,
  findReturn,
  genReturnId,
  genReturnNumber,
  genLedgerId,
  genStockMovementId,
  genAuditId,
} from "@/store/transactions";
import { canTransition, type CheckActor } from "@/services/workflow";
import type { ReturnRecord, ReturnLine } from "@/types";
import type { LedgerEntry } from "@/mock/ledger";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface CreateReturnInput {
  invoiceId: string;
  customerId: string;
  repId: string;
  items: { productId: string; qty: number; price: number; condition: "good" | "damaged" }[];
  reason: string;
  notes?: string;
}

export interface ReturnResult {
  success: boolean;
  returnRecord?: ReturnRecord;
  reason?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const buildReturnLines = (items: CreateReturnInput["items"]): ReturnLine[] =>
  items.map((item) => {
    const p = products.find((x) => x.id === item.productId);
    return {
      productId: item.productId,
      productName: p?.name ?? item.productId,
      qty: item.qty,
      price: item.price,
      lineTotal: +(item.price * item.qty).toFixed(2),
    };
  });

/**
 * Restore van stock for returned items (good condition only).
 */
const restoreVanStock = (repId: string, items: ReturnLine[]) => {
  const van = vanStock.find((v) => v.repId === repId);
  if (!van) return;
  for (const item of items) {
    const slot = van.items.find((i) => i.productId === item.productId);
    if (slot) {
      slot.qty += item.qty;
    } else {
      van.items.push({
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        damagedQty: 0,
      });
    }
  }
  van.updatedAt = today();
};

// ─── Main operations ────────────────────────────────────────────────────────

/**
 * Create and submit a return.
 */
export const createReturn = (
  input: CreateReturnInput,
  actor: CheckActor
): ReturnResult => {
  // 1. Validate
  const customer = customers.find((c) => c.id === input.customerId);
  if (!customer) return { success: false, reason: "العميل غير موجود" };
  if (input.items.length === 0) return { success: false, reason: "لا توجد بنود للمرتجع" };

  // 2. Workflow gate
  const gate = canTransition({
    entityType: "return",
    from: "draft",
    action: "submit",
    to: "submitted",
    actor,
  });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  // 3. Build lines
  const items = buildReturnLines(input.items);
  const totalAmount = +items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2);

  // 4. Create return record
  const returnRecord: ReturnRecord = {
    id: genReturnId(),
    number: genReturnNumber(),
    invoiceId: input.invoiceId,
    customerId: input.customerId,
    repId: input.repId,
    date: today(),
    items,
    condition: input.items.some((i) => i.condition === "damaged") ? "damaged" : "good",
    totalAmount,
    status: "submitted",
    reason: input.reason,
  };
  addReturn(returnRecord);

  // 5. Ledger entry — credit customer (return)
  const ledgerEntry: LedgerEntry = {
    id: genLedgerId(),
    date: today(),
    entityType: "customer",
    entityId: input.customerId,
    type: "return_credit",
    debit: 0,
    credit: totalAmount,
    sourceRef: returnRecord.number,
    sourceType: "return",
    description: `مرتجع ${returnRecord.number} — ${input.reason}`,
  };
  addLedgerEntry(ledgerEntry);

  // 6. Stock movement — return_in (only good items)
  for (const item of items) {
    addStockMovement({
      id: genStockMovementId(),
      type: "return_in",
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      repId: input.repId,
      date: today(),
      refNumber: returnRecord.number,
      createdBy: input.repId,
      notes: `مرتجع — ${returnRecord.number}`,
    });
  }

  // 7. Restore van stock (good condition items)
  const goodItems = items.filter((_, idx) => input.items[idx].condition === "good");
  if (goodItems.length > 0) {
    restoreVanStock(input.repId, goodItems);
  }

  // 8. Audit
  addAuditLog({
    id: genAuditId(),
    actor: input.repId,
    action: "return.submitted",
    entity: "return",
    entityId: returnRecord.id,
    at: today(),
    newValue: JSON.stringify(returnRecord),
  });

  return { success: true, returnRecord };
};

/**
 * Supervisor inspects a submitted return.
 */
export const inspectReturn = (
  returnId: string,
  actor: CheckActor
): ReturnResult => {
  const ret = findReturn(returnId);
  if (!ret) return { success: false, reason: "المرتجع غير موجود" };

  const gate = canTransition({
    entityType: "return",
    from: "submitted",
    action: "inspect",
    to: "inspection",
    actor,
  });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const oldStatus = ret.status;
  ret.status = "inspection";

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "return.inspected",
    entity: "return",
    entityId: ret.id,
    at: today(),
    oldValue: oldStatus,
    newValue: "inspection",
  });

  return { success: true, returnRecord: ret };
};

/**
 * Supervisor approves a return under inspection.
 */
export const approveReturn = (
  returnId: string,
  actor: CheckActor
): ReturnResult => {
  const ret = findReturn(returnId);
  if (!ret) return { success: false, reason: "المرتجع غير موجود" };

  const gate = canTransition({
    entityType: "return",
    from: "inspection",
    action: "approve",
    actor,
  });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const oldStatus = ret.status;
  ret.status = "approved";

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "return.approved",
    entity: "return",
    entityId: ret.id,
    at: today(),
    oldValue: oldStatus,
    newValue: "approved",
  });

  return { success: true, returnRecord: ret };
};

/**
 * Supervisor rejects a return under inspection.
 */
export const rejectReturn = (
  returnId: string,
  actor: CheckActor,
  reason: string
): ReturnResult => {
  const ret = findReturn(returnId);
  if (!ret) return { success: false, reason: "المرتجع غير موجود" };

  const gate = canTransition({
    entityType: "return",
    from: "inspection",
    action: "reject",
    actor,
  });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const oldStatus = ret.status;
  ret.status = "rejected";

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "return.rejected",
    entity: "return",
    entityId: ret.id,
    at: today(),
    oldValue: oldStatus,
    newValue: "rejected",
    reason,
  });

  return { success: true, returnRecord: ret };
};

/**
 * Post an approved return (final).
 */
export const postReturn = (
  returnId: string,
  actor: CheckActor
): ReturnResult => {
  const ret = findReturn(returnId);
  if (!ret) return { success: false, reason: "المرتجع غير موجود" };

  const gate = canTransition({
    entityType: "return",
    from: "approved",
    action: "post",
    actor,
  });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const oldStatus = ret.status;
  ret.status = "posted";

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "return.posted",
    entity: "return",
    entityId: ret.id,
    at: today(),
    oldValue: oldStatus,
    newValue: "posted",
  });

  return { success: true, returnRecord: ret };
};
