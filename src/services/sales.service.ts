/**
 * Sales Transaction Service — CENTRAL execution layer for all sales.
 *
 * Flow:
 *   createInvoice() → submits (draft → submitted)
 *   postInvoice()   → supervisor posts (submitted → posted)
 *   cancelInvoice() → reverses stock + ledger + marks cancelled
 *
 * Every operation:
 *   1. Workflow gate (canTransition)
 *   2. Ledger entry (debit or reversal)
 *   3. Stock movement (van deduction or return)
 *   4. Audit log (who/what/when)
 *
 * This service does NOT navigate or toast — caller does.
 */
import { customers } from "@/mock/customers";
import { products } from "@/mock/products";
import { vanStock } from "@/mock/inventory";
import {
  addInvoice,
  addLedgerEntry,
  addStockMovement,
  addAuditLog,
  findInvoice,
  genInvoiceId,
  genInvoiceNumber,
  genLedgerId,
  genStockMovementId,
  genAuditId,
} from "@/store/transactions";
import { canTransition, type CheckActor } from "@/services/workflow";
import type { Invoice, SalesOrderLine } from "@/types";
import type { LedgerEntry } from "@/mock/ledger";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface CreateInvoiceInput {
  customerId: string;
  repId: string;
  items: { productId: string; qty: number; price: number; discountRate: number }[];
  saleType: "cash" | "credit";
  paymentMethod: "cash" | "transfer" | "pos";
  overallDiscount?: number;
  notes?: string;
}

export interface SalesResult {
  success: boolean;
  invoice?: Invoice;
  reason?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const buildInvoiceLines = (
  items: CreateInvoiceInput["items"]
): SalesOrderLine[] =>
  items.map((item) => {
    const p = products.find((x) => x.id === item.productId);
    const rate = item.discountRate;
    const price = item.price;
    return {
      productId: item.productId,
      productName: p?.name ?? item.productId,
      qty: item.qty,
      price,
      cost: p?.costPrice ?? 0,
      discountRate: rate,
      lineTotal: +(price * item.qty * (1 - rate / 100)).toFixed(2),
    };
  });

/**
 * Deduct van stock for the given items.
 * Mutates the in-memory vanStock array directly (prototype-only pattern).
 */
const deductVanStock = (repId: string, items: CreateInvoiceInput["items"]) => {
  const van = vanStock.find((v) => v.repId === repId);
  if (!van) return;
  for (const item of items) {
    const slot = van.items.find((i) => i.productId === item.productId);
    if (slot) {
      slot.qty = Math.max(0, slot.qty - item.qty);
    } else {
      van.items.push({
        productId: item.productId,
        productName: products.find((p) => p.id === item.productId)?.name ?? item.productId,
        qty: 0,
        damagedQty: 0,
      });
    }
  }
  van.updatedAt = today();
};

/**
 * Restore van stock (used on cancel).
 */
const restoreVanStock = (repId: string, items: SalesOrderLine[]) => {
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
 * Create and submit a new invoice.
 *
 * Steps:
 *  1. Validate input
 *  2. canTransition(invoice: draft → submitted)
 *  3. Build invoice lines from cart
 *  4. Deduct van stock
 *  5. Create Invoice in transactions store
 *  6. Create LedgerEntry (invoice_debit)
 *  7. Create StockMovement (issue)
 *  8. Audit log
 */
export const createInvoice = (
  input: CreateInvoiceInput,
  actor: CheckActor
): SalesResult => {
  // 1. Validate
  const customer = customers.find((c) => c.id === input.customerId);
  if (!customer) return { success: false, reason: "العميل غير موجود" };
  if (input.items.length === 0) return { success: false, reason: "السلة فارغة" };

  // 2. Workflow gate: draft → submitted
  const gate = canTransition({
    entityType: "invoice",
    from: "draft",
    action: "submit",
    actor,
  });
  if (!gate.allowed) {
    return { success: false, reason: gate.reason };
  }

  // 3. Build lines
  const items = buildInvoiceLines(input.items);
  const subtotal = +items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2);
  const total = +(subtotal - (input.overallDiscount ?? 0)).toFixed(2);

  // 4. Deduct van stock
  deductVanStock(input.repId, input.items);

  // 5. Create invoice
  const dueDays = input.saleType === "credit" ? 30 : 0;
  const date = today();
  const dueDate = dueDays
    ? new Date(new Date(date).getTime() + dueDays * 86400000).toISOString().slice(0, 10)
    : undefined;

  const invoice: Invoice = {
    id: genInvoiceId(),
    number: genInvoiceNumber(),
    invoiceNumber: "", // set below
    customerId: input.customerId,
    repId: input.repId,
    type: input.saleType,
    status: "submitted",
    date,
    total,
    discount: input.overallDiscount ?? 0,
    net: total,
    paid: 0,
    items,
    notes: input.notes,
    dueDate,
    paymentStatus: "unpaid",
  };
  invoice.invoiceNumber = `INV-${invoice.number.replace("SO-", "")}`;
  addInvoice(invoice);

  // 6. Ledger entry — debit customer
  const ledgerEntry: LedgerEntry = {
    id: genLedgerId(),
    date,
    entityType: "customer",
    entityId: input.customerId,
    type: "invoice_debit",
    debit: total,
    credit: 0,
    sourceRef: invoice.invoiceNumber,
    sourceType: "invoice",
    description: `فاتورة بيع ${invoice.invoiceNumber}`,
  };
  addLedgerEntry(ledgerEntry);

  // 7. Stock movement — issue from van
  for (const item of items) {
    addStockMovement({
      id: genStockMovementId(),
      type: "issue",
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      repId: input.repId,
      date,
      refNumber: invoice.invoiceNumber,
      createdBy: input.repId,
      notes: `بيع — ${invoice.invoiceNumber}`,
    });
  }

  // 8. Audit
  addAuditLog({
    id: genAuditId(),
    actor: input.repId,
    action: "invoice.submitted",
    entity: "invoice",
    entityId: invoice.id,
    at: date,
    newValue: JSON.stringify(invoice),
  });

  return { success: true, invoice };
};

/**
 * Post an invoice (supervisor/SM approval → posted).
 * This is a status transition only — the invoice is already created.
 */
export const postInvoice = (
  invoiceId: string,
  actor: CheckActor
): SalesResult => {
  const inv = findInvoice(invoiceId);
  if (!inv) return { success: false, reason: "الفاتورة غير موجودة" };

  const gate = canTransition({
    entityType: "invoice",
    from: "submitted",
    action: "post",
    actor,
  });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const oldStatus = inv.status;
  inv.status = "completed";
  inv.paymentStatus = inv.paid >= inv.total ? "paid" : inv.paid > 0 ? "partial" : "unpaid";

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "invoice.posted",
    entity: "invoice",
    entityId: inv.id,
    at: today(),
    oldValue: oldStatus,
    newValue: "completed",
  });

  return { success: true, invoice: inv };
};

/**
 * Cancel a posted invoice — reverses stock + ledger.
 */
export const cancelInvoice = (
  invoiceId: string,
  actor: CheckActor,
  reason: string
): SalesResult => {
  const inv = findInvoice(invoiceId);
  if (!inv) return { success: false, reason: "الفاتورة غير موجودة" };

  const gate = canTransition({
    entityType: "invoice",
    from: inv.status,
    action: "cancel",
    actor,
  });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  // Restore van stock
  restoreVanStock(inv.repId, inv.items);

  // Reverse ledger entry
  addLedgerEntry({
    id: genLedgerId(),
    date: today(),
    entityType: "customer",
    entityId: inv.customerId,
    type: "return_credit",
    debit: 0,
    credit: inv.total,
    sourceRef: inv.invoiceNumber,
    sourceType: "invoice_cancel",
    description: `إلغاء فاتورة ${inv.invoiceNumber} — ${reason}`,
  });

  // Reverse stock movements
  for (const item of inv.items) {
    addStockMovement({
      id: genStockMovementId(),
      type: "return_in",
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      repId: inv.repId,
      date: today(),
      refNumber: inv.invoiceNumber,
      createdBy: actor.id,
      notes: `إلغاء فاتورة — ${reason}`,
    });
  }

  const oldStatus = inv.status;
  inv.status = "cancelled";

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "invoice.cancelled",
    entity: "invoice",
    entityId: inv.id,
    at: today(),
    oldValue: oldStatus,
    newValue: "cancelled",
    reason,
  });

  return { success: true, invoice: inv };
};
