/**
 * Daily Closing Service — execution layer for end-of-day operations.
 *
 * submitClosing(): submits closing for supervisor review + ledger entries.
 * registerExpense(): logs trip expenses + ledger entry.
 * submitDeposit(): creates deposit request + cash movement.
 */
import { customers } from "@/mock/customers";
import {
  addLedgerEntry,
  addCashMovement,
  addAuditLog,
  genLedgerId,
  genCashMovementId,
  genAuditId,
} from "@/store/transactions";
import type { LedgerEntry } from "@/mock/ledger";
import type { CheckActor } from "@/services/workflow";

const today = () => new Date().toISOString().slice(0, 10);

let closingSeq = 1;
let expenseSeq = 1;
let depositSeq = 1;

/**
 * Submit daily closing for supervisor review.
 */
export const submitClosing = (
  input: {
    repId: string;
    date: string;
    actualCash: number;
    expectedCash: number;
    salesCount: number;
    collectionCount: number;
    returnCount: number;
    expenseTotal: number;
    depositAmount: number;
    inventoryVarianceItems: { productId: string; productName: string; systemQty: number; physicalQty: number; variance: number }[];
    notes?: string;
  },
  actor: CheckActor
): { success: boolean; reason?: string } => {
  const variance = +(input.actualCash - input.expectedCash).toFixed(2);

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "closing.submitted",
    entity: "daily_closing",
    entityId: `closing-${closingSeq++}`,
    at: today(),
    newValue: JSON.stringify({
      date: input.date,
      expectedCash: input.expectedCash,
      actualCash: input.actualCash,
      variance,
    }),
  });

  return { success: true };
};

export interface RegisterExpenseInput {
  repId: string;
  tripId: string;
  type: "fuel" | "parking" | "tolls" | "meals" | "phone" | "other";
  amount: number;
  paymentMethod: "cash" | "transfer" | "pos";
  description?: string;
}

/**
 * Register a trip expense.
 */
export const registerExpense = (
  input: RegisterExpenseInput,
  actor: CheckActor
): { success: boolean; reason?: string } => {
  if (input.amount <= 0) return { success: false, reason: "المبلغ يجب أن يكون أكبر من صفر" };

  const ledgerEntry: LedgerEntry = {
    id: genLedgerId(),
    date: today(),
    entityType: "customer",
    entityId: input.repId,
    type: "invoice_debit",
    debit: input.amount,
    credit: 0,
    sourceRef: `EXP-${expenseSeq++}`,
    sourceType: "invoice",
    description: `مصروف ${input.type} — ${input.description ?? ""}`,
  };
  addLedgerEntry(ledgerEntry);

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "expense.registered",
    entity: "expense",
    entityId: ledgerEntry.sourceRef,
    at: today(),
    newValue: JSON.stringify({ type: input.type, amount: input.amount }),
  });

  return { success: true };
};

export interface SubmitDepositInput {
  repId: string;
  amount: number;
  method: "cash" | "transfer";
  toBoxId: string;
  reference?: string;
  notes?: string;
}

/**
 * Submit a cash deposit request.
 */
export const submitDeposit = (
  input: SubmitDepositInput,
  actor: CheckActor
): { success: boolean; reason?: string } => {
  if (input.amount <= 0) return { success: false, reason: "المبلغ يجب أن يكون أكبر من صفر" };

  const depositNumber = `DEP-${String(depositSeq++).padStart(4, "0")}`;

  addCashMovement({
    id: genCashMovementId(),
    number: depositNumber,
    type: "rep_deposit",
    amount: input.amount,
    cashBoxId: input.toBoxId,
    relatedRepId: input.repId,
    date: today(),
    notes: input.notes,
    createdBy: input.repId,
  });

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "deposit.submitted",
    entity: "deposit",
    entityId: depositNumber,
    at: today(),
    newValue: JSON.stringify({ amount: input.amount, method: input.method }),
  });

  return { success: true };
};

/**
 * Approve a deposit request (supervisor action).
 */
export const approveDeposit = (
  depositId: string,
  amount: number,
  toBoxId: string,
  repId: string,
  actor: CheckActor
): { success: boolean; reason?: string } => {
  addCashMovement({
    id: genCashMovementId(),
    number: `DEPA-${String(depositSeq++).padStart(4, "0")}`,
    type: "rep_deposit",
    amount,
    cashBoxId: toBoxId,
    relatedRepId: repId,
    date: today(),
    notes: `Dep approved ${depositId}`,
    createdBy: actor.id,
  });
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "deposit.approved",
    entity: "deposit",
    entityId: depositId,
    at: today(),
    newValue: JSON.stringify({ status: "approved", amount }),
  });
  return { success: true };
};

/**
 * Reject a deposit request (supervisor action).
 */
export const rejectDeposit = (
  depositId: string,
  actor: CheckActor,
  reason?: string
): { success: boolean; reason?: string } => {
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "deposit.rejected",
    entity: "deposit",
    entityId: depositId,
    at: today(),
    newValue: JSON.stringify({ status: "rejected", reason }),
  });
  return { success: true };
};

/**
 * Review a daily closing (supervisor action).
 */
export const reviewClosing = (
  closingId: string,
  decision: "approved" | "returned",
  actor: CheckActor,
  note?: string
): { success: boolean; reason?: string } => {
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: `closing.${decision}`,
    entity: "daily_closing",
    entityId: closingId,
    at: today(),
    newValue: JSON.stringify({ status: decision, note }),
  });
  return { success: true };
};
