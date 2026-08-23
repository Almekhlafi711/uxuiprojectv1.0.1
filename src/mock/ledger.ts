/**
 * Ledger — transaction-derived balances (Phase F)
 *
 * Balances are COMPUTED from movements (invoices + collections + returns),
 * NOT stored. This enforces accounting integrity: no balance field is a
 * source of truth; every display reads from the ledger.
 */
import { invoices } from "./sales";
import { collections } from "./collections";
import { returns } from "./returns";

export type LedgerEntryType =
  | "invoice_debit"
  | "collection_credit"
  | "return_credit"
  | "invoice_cancel"
  | "collection_reverse";

export interface LedgerEntry {
  id: string;
  date: string;
  entityType: "customer" | "cashbox" | "distributor";
  entityId: string;
  type: LedgerEntryType;
  debit: number;
  credit: number;
  sourceRef: string;
  sourceType: "invoice" | "collection" | "return" | "invoice_cancel";
  description: string;
}

const entries: LedgerEntry[] = [];

function addEntry(e: Omit<LedgerEntry, "id">) {
  entries.push({ id: `ledg-${entries.length + 1}`, ...e });
}

for (const inv of invoices) {
  if (inv.status === "completed") {
    addEntry({
      date: inv.date,
      entityType: "customer",
      entityId: inv.customerId,
      type: "invoice_debit",
      debit: 0,
      credit: inv.total,
      sourceRef: inv.id,
      sourceType: "invoice",
      description: `فاتورة مبيعات ${inv.number}`,
    });
  }
}

for (const col of collections) {
  if (col.status === "approved") {
    addEntry({
      date: col.date,
      entityType: "customer",
      entityId: col.customerId,
      type: "collection_credit",
      debit: col.amount,
      credit: 0,
      sourceRef: col.id,
      sourceType: "collection",
      description: `تحصيل ${col.number}`,
    });
    addEntry({
      date: col.date,
      entityType: "cashbox",
      entityId: col.cashBoxId,
      type: "collection_credit",
      debit: 0,
      credit: col.amount,
      sourceRef: col.id,
      sourceType: "collection",
      description: `إيداع تحصيل ${col.number}`,
    });
  }
}

for (const r of returns) {
  if (r.status === "approved") {
    addEntry({
      date: r.date,
      entityType: "customer",
      entityId: r.customerId,
      type: "return_credit",
      debit: r.totalAmount,
      credit: 0,
      sourceRef: r.id,
      sourceType: "return",
      description: `مرتجع مبيعات ${r.number}`,
    });
  }
}

export const ledgerEntries = entries;

export interface CustomerBalance {
  customerId: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  currency: string;
}

export const getCustomerBalance = (customerId: string): CustomerBalance => {
  const custEntries = entries.filter((e) => e.entityType === "customer" && e.entityId === customerId);
  const totalDebit = +custEntries.reduce((s, e) => s + e.debit, 0).toFixed(2);
  const totalCredit = +custEntries.reduce((s, e) => s + e.credit, 0).toFixed(2);
  return { customerId, totalDebit, totalCredit, balance: +(totalCredit - totalDebit).toFixed(2), currency: "SAR" };
};

export const getAllCustomerBalances = (): CustomerBalance[] => {
  const ids = new Set(entries.filter((e) => e.entityType === "customer").map((e) => e.entityId));
  return Array.from(ids).map((id) => getCustomerBalance(id));
};
