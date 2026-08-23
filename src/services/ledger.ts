/**
 * Ledger Service
 *
 * Single read-source for ALL account balances. Balances are COMPUTED from
 * transactions/movements — never read from a stored `balance` field.
 *
 * Sources (read-only):
 * - customers        -> mock/ledger.ts (invoice_debit / collection_credit / return_credit)
 * - cashBoxes / reps -> mock/cash.ts   (cashMovements: collection_in/rep_deposit/
 *                                        supervisor_receipt = IN, expense/adjustment = OUT)
 *
 * No new mock data is introduced. This is a pure derivation layer.
 */
import { getCustomerBalance as _custBalance, getAllCustomerBalances as _allCustBalances } from "@/mock/ledger";
import { cashMovements, cashBoxes } from "@/mock/cash";
import { invoices } from "@/mock/sales";
import { customers } from "@/mock/customers";
import { collections as _collections } from "@/mock/collections";
const collections = _collections as Array<{ id: string; customerId: string; amount: number; date: string; status: string; invoiceIds?: string[] }>;

export interface CustomerBalance {
  customerId: string;
  name: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  currency: string;
  aging: { current: number; days30: number; days60: number; days90: number; over90: number };
}

export interface CashBoxBalance {
  cashBoxId: string;
  name: string;
  ownerId?: string;
  balance: number;
  movementCount: number;
}

export interface RepresentativeCashBalance {
  repId: string;
  repName: string;
  cashBoxId?: string;
  totalIn: number;
  totalOut: number;
  balance: number;
  currency: string;
}

// ---------- Credit-direction sign: IN = + , OUT = - ----------
const isCashInflow = (m: typeof cashMovements[number]): boolean =>
  m.type === "collection_in" || m.type === "rep_deposit" || m.type === "supervisor_receipt";

export const getCustomerBalance = (customerId: string): CustomerBalance => {
  const c = customers.find((x) => x.id === customerId);
  const base = _custBalance(customerId);
  return {
    customerId,
    name: c?.name ?? "",
    totalDebit: base.totalDebit,
    totalCredit: base.totalCredit,
    balance: base.balance,
    currency: base.currency,
    aging: getCustomerAging(customerId),
  };
};

export const getAllCustomerBalances = (): CustomerBalance[] => {
  const ids = new Set(
    [...invoices.filter((i) => i.status === "completed"), ...collections.filter((c) => c.status === "approved")]
      .map((t) => t.customerId)
  );
  return Array.from(ids).map(getCustomerBalance);
};

/**
 * Aging buckets derived from unpaid invoices of a customer.
 * Bucket boundaries: 0 (current) | 1-30 | 31-60 | 61-90 | 90+.
 * Outstanding = invoice total - sum of applied approved collections.
 */
export const getCustomerAging = (customerId: string): CustomerBalance["aging"] => {
  const today = new Date("2026-08-19");
  const bucket = () => ({ current: 0, days30: 0, days60: 0, days90: 0, over90: 0 });
  const out: ReturnType<typeof bucket> = bucket();

  const custInvs = invoices.filter((i) => i.customerId === customerId && i.status === "completed");
  const custCols = collections.filter((col) => col.customerId === customerId && col.status === "approved");
  const appliedByInvoice: Record<string, number> = {};
  for (const col of custCols) {
    for (const ref of col.invoiceIds ?? []) {
      appliedByInvoice[ref] = (appliedByInvoice[ref] ?? 0) + col.amount;
    }
  }

  for (const inv of custInvs) {
    const paid = appliedByInvoice[inv.id] ?? 0;
    const outstanding = Math.max(0, inv.total - paid);
    if (outstanding <= 0) continue;
    const due = new Date(inv.dueDate ?? inv.date);
    const days = Math.max(0, Math.round((today.getTime() - due.getTime()) / 86400000));
    if (days === 0) out.current += outstanding;
    else if (days <= 30) out.days30 += outstanding;
    else if (days <= 60) out.days60 += outstanding;
    else if (days <= 90) out.days90 += outstanding;
    else out.over90 += outstanding;
  }
  return out;
};

export const getCashBoxBalance = (cashBoxId: string): CashBoxBalance => {
  const box = cashBoxes.find((b) => b.id === cashBoxId);
  const movs = cashMovements.filter((m) => m.cashBoxId === cashBoxId);
  let net = 0;
  for (const m of movs) net += isCashInflow(m) ? m.amount : -m.amount;
  return {
    cashBoxId,
    name: box?.name ?? "",
    ownerId: box?.ownerId,
    balance: +net.toFixed(2),
    movementCount: movs.length,
  };
};

export const getRepresentativeCashBalance = (repId: string): RepresentativeCashBalance => {
  const ownBox = cashBoxes.find((b) => b.ownerId === repId && b.type === "rep");
  const movs = cashMovements.filter((m) => m.relatedRepId === repId);
  let totalIn = 0;
  let totalOut = 0;
  for (const m of movs) {
    if (isCashInflow(m)) totalIn += m.amount;
    else totalOut += m.amount;
  }
  const balance = +(totalIn - totalOut).toFixed(2);
  return {
    repId,
    repName: ownBox?.name ?? "",
    cashBoxId: ownBox?.id,
    totalIn: +totalIn.toFixed(2),
    totalOut: +totalOut.toFixed(2),
    balance,
    currency: "SAR",
  };
};
