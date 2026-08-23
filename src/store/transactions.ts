/**
 * Transaction Store — single mutable source for all new transactions.
 *
 * Design:
 * - mock/ files = historical seed data (READ-ONLY, never mutated)
 * - this store = new runtime transactions (APPEND-ONLY, grows with each operation)
 * - Every business service writes here; reads merge seed + store
 *
 * This is NOT a database. It's an in-memory store for the prototype.
 * In production, this layer would be replaced by API calls.
 */
import type {
  Invoice,
  Collection,
  ReturnRecord,
  StockTransfer,
  StockMovement,
  StockRequest,
  CashMovement,
  AuditLog,
} from "@/types";
import type { LedgerEntry } from "@/mock/ledger";

// ─── Storage ────────────────────────────────────────────────────────────────
const invoices: Invoice[] = [];
const collections: Collection[] = [];
const returns: ReturnRecord[] = [];
const stockTransfers: StockTransfer[] = [];
const stockRequests: StockRequest[] = [];
const stockMovements: StockMovement[] = [];
const ledgerEntries: LedgerEntry[] = [];
const cashMovements: CashMovement[] = [];
const auditLogs: AuditLog[] = [];

let seq = 1;
const nextId = (prefix: string) => `${prefix}-${String(seq++).padStart(4, "0")}`;
const now = () => new Date().toISOString().slice(0, 10);

// ─── Append helpers ─────────────────────────────────────────────────────────
export const addInvoice = (inv: Invoice) => { invoices.push(inv); log("invoice.created", inv); return inv; };
export const addCollection = (col: Collection) => { collections.push(col); log("collection.created", col); return col; };
export const addReturn = (ret: ReturnRecord) => { returns.push(ret); log("return.created", ret); return ret; };
export const addStockTransfer = (tr: StockTransfer) => { stockTransfers.push(tr); log("stock_transfer.created", tr); return tr; };
export const addStockRequest = (sr: StockRequest) => { stockRequests.push(sr); log("stock_request.created", sr); return sr; };
export const addStockMovement = (m: StockMovement) => { stockMovements.push(m); return m; };
export const addLedgerEntry = (e: LedgerEntry) => { ledgerEntries.push(e); return e; };
export const addCashMovement = (cm: CashMovement) => { cashMovements.push(cm); return cm; };

// ─── Audit helper ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function log(action: string, entity: any, oldValue?: string) {
  auditLogs.push({
    id: nextId("al"),
    actor: entity.repId ?? entity.createdBy ?? "system",
    action,
    entity: action.split(".")[0],
    entityId: entity.id,
    at: now(),
    oldValue,
    newValue: JSON.stringify(entity),
  });
}

export const addAuditLog = (entry: AuditLog) => { auditLogs.push(entry); return entry; };

// ─── Read-only getters (new transactions only) ──────────────────────────────
export const newInvoices = () => [...invoices];
export const newCollections = () => [...collections];
export const newReturns = () => [...returns];
export const newStockTransfers = () => [...stockTransfers];
export const newStockRequests = () => [...stockRequests];
export const newStockMovements = () => [...stockMovements];
export const newLedgerEntries = () => [...ledgerEntries];
export const newCashMovements = () => [...cashMovements];
export const newAuditLogs = () => [...auditLogs];

// ─── Find by ID (new transactions) ──────────────────────────────────────────
export const findInvoice = (id: string) => invoices.find((i) => i.id === id);
export const findCollection = (id: string) => collections.find((c) => c.id === id);
export const findReturn = (id: string) => returns.find((r) => r.id === id);
export const findStockTransfer = (id: string) => stockTransfers.find((t) => t.id === id);

// ─── Find by entity ─────────────────────────────────────────────────────────
export const invoicesByCustomer = (customerId: string) => invoices.filter((i) => i.customerId === customerId);
export const collectionsByCustomer = (customerId: string) => collections.filter((c) => c.customerId === customerId);
export const returnsByCustomer = (customerId: string) => returns.filter((r) => r.customerId === customerId);

// ─── ID generators ──────────────────────────────────────────────────────────
export const genInvoiceId = () => nextId("inv");
export const genInvoiceNumber = () => `INV-2026-${String(seq++).padStart(4, "0")}`;
export const genCollectionId = () => nextId("col");
export const genCollectionNumber = () => `RC-2026-${String(seq++).padStart(4, "0")}`;
export const genReturnId = () => nextId("ret");
export const genReturnNumber = () => `RET-2026-${String(seq++).padStart(4, "0")}`;
export const genTransferId = () => nextId("st");
export const genTransferNumber = () => `ST-2026-${String(seq++).padStart(4, "0")}`;
export const genLedgerId = () => nextId("ledg");
export const genStockMovementId = () => nextId("sm");
export const genCashMovementId = () => nextId("cm");
export const genAuditId = () => nextId("al");

// ─── Mutation helpers (for status transitions) ──────────────────────────────
export const mutateInvoice = (id: string, patch: Partial<Invoice>): Invoice | undefined => {
  const idx = invoices.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const old = { ...invoices[idx] };
  Object.assign(invoices[idx], patch);
  log("invoice.updated", invoices[idx], JSON.stringify(old));
  return invoices[idx];
};

export const mutateCollection = (id: string, patch: Partial<Collection>): Collection | undefined => {
  const idx = collections.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  const old = { ...collections[idx] };
  Object.assign(collections[idx], patch);
  log("collection.updated", collections[idx], JSON.stringify(old));
  return collections[idx];
};

export const mutateReturn = (id: string, patch: Partial<ReturnRecord>): ReturnRecord | undefined => {
  const idx = returns.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  const old = { ...returns[idx] };
  Object.assign(returns[idx], patch);
  log("return.updated", returns[idx], JSON.stringify(old));
  return returns[idx];
};

export const mutateStockTransfer = (id: string, patch: Partial<StockTransfer>): StockTransfer | undefined => {
  const idx = stockTransfers.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  const old = { ...stockTransfers[idx] };
  Object.assign(stockTransfers[idx], patch);
  log("stock_transfer.updated", stockTransfers[idx], JSON.stringify(old));
  return stockTransfers[idx];
};
