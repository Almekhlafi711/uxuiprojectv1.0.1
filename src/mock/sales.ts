import type { Invoice, SalesOrder } from "@/types";
import { products, productById } from "./products";
import { customers } from "./customers";

const P = (id: string) => productById(id) ?? products[0];

function line(productId: string, qty: number, discountRate?: number) {
  const p = P(productId);
  const rate = discountRate ?? p.discountRate;
  const price = p.sellPrice;
  return {
    productId: p.id,
    productName: p.name,
    qty,
    price,
    cost: p.costPrice,
    discountRate: rate,
    lineTotal: +(price * qty * (1 - rate / 100)).toFixed(2),
  };
}

function buildInvoice(
  id: string,
  number: string,
  customerId: string,
  repId: string,
  type: "cash" | "credit",
  date: string,
  lines: { productId: string; qty: number; discountRate?: number }[],
  status: SalesOrder["status"],
  paymentStatus: Invoice["paymentStatus"],
  paid?: number,
  discount = 0
): Invoice {
  const items = lines.map((l) => line(l.productId, l.qty, l.discountRate));
  const subtotal = +items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2);
  const total = +(subtotal - discount).toFixed(2);
  const dueDays = type === "credit" ? 30 : 0;
  const dueDate = new Date(new Date(date).getTime() + dueDays * 86400000).toISOString().slice(0, 10);
  return {
    id,
    number,
    invoiceNumber: "INV-" + number.replace("SO-", ""),
    customerId,
    repId,
    type,
    status,
    date,
    total,
    discount,
    net: total,
    paid: paid ?? (paymentStatus === "paid" ? total : paymentStatus === "partial" ? paid ?? Math.round(total / 2) : 0),
    items,
    dueDate: type === "credit" ? dueDate : undefined,
    paymentStatus,
  };
}

export const invoices: Invoice[] = [
  buildInvoice("so-001", "SO-2026-0841", "c-001", "u-rp-01", "credit", "2026-08-14", [
    { productId: "p-001", qty: 20 },
    { productId: "p-007", qty: 30 },
    { productId: "p-009", qty: 10 },
  ], "completed", "unpaid"),
  buildInvoice("so-002", "SO-2026-0840", "c-003", "u-rp-02", "cash", "2026-08-14", [
    { productId: "p-005", qty: 6 },
    { productId: "p-015", qty: 12 },
    { productId: "p-017", qty: 4 },
  ], "completed", "paid"),
  buildInvoice("so-003", "SO-2026-0839", "c-024", "u-rp-02", "credit", "2026-08-14", [
    { productId: "p-001", qty: 40 },
    { productId: "p-022", qty: 24 },
    { productId: "p-008", qty: 20 },
    { productId: "p-010", qty: 12 },
  ], "completed", "partial", 18000, 350),
  buildInvoice("so-004", "SO-2026-0838", "c-013", "u-rp-02", "cash", "2026-08-14", [
    { productId: "p-004", qty: 6 },
    { productId: "p-016", qty: 2 },
  ], "completed", "paid"),
  buildInvoice("so-005", "SO-2026-0837", "c-015", "u-rp-04", "credit", "2026-08-14", [
    { productId: "p-002", qty: 12 },
    { productId: "p-012", qty: 6 },
  ], "completed", "unpaid"),
  buildInvoice("so-006", "SO-2026-0836", "c-029", "u-rp-04", "cash", "2026-08-14", [
    { productId: "p-007", qty: 12 },
    { productId: "p-020", qty: 24 },
  ], "completed", "paid"),
  buildInvoice("so-007", "SO-2026-0835", "c-005", "u-rp-03", "credit", "2026-08-13", [
    { productId: "p-001", qty: 30 },
    { productId: "p-010", qty: 18 },
    { productId: "p-013", qty: 24 },
    { productId: "p-019", qty: 8 },
  ], "completed", "unpaid"),
  buildInvoice("so-008", "SO-2026-0834", "c-006", "u-rp-03", "cash", "2026-08-13", [
    { productId: "p-017", qty: 6 },
    { productId: "p-005", qty: 3 },
    { productId: "p-016", qty: 4 },
  ], "completed", "paid"),
  buildInvoice("so-009", "SO-2026-0833", "c-023", "u-rp-04", "credit", "2026-08-13", [
    { productId: "p-009", qty: 16 },
    { productId: "p-011", qty: 24 },
    { productId: "p-014", qty: 12 },
  ], "completed", "partial", 3000, 150),
  buildInvoice("so-010", "SO-2026-0832", "c-012", "u-rp-01", "credit", "2026-08-13", [
    { productId: "p-001", qty: 50 },
    { productId: "p-022", qty: 36 },
    { productId: "p-007", qty: 48 },
  ], "completed", "unpaid"),
  buildInvoice("so-011", "SO-2026-0831", "c-016", "u-rp-05", "credit", "2026-08-12", [
    { productId: "p-003", qty: 12 },
    { productId: "p-017", qty: 8 },
  ], "completed", "unpaid"),
  buildInvoice("so-012", "SO-2026-0830", "c-019", "u-rp-05", "credit", "2026-08-12", [
    { productId: "p-001", qty: 24 },
    { productId: "p-009", qty: 8 },
    { productId: "p-018", qty: 6 },
  ], "completed", "partial", 2500, 200),
  buildInvoice("so-013", "SO-2026-0829", "c-017", "u-rp-05", "credit", "2026-08-11", [
    { productId: "p-007", qty: 36 },
    { productId: "p-015", qty: 24 },
  ], "completed", "unpaid"),
  buildInvoice("so-014", "SO-2026-0828", "c-027", "u-rp-05", "credit", "2026-08-10", [
    { productId: "p-001", qty: 20 },
    { productId: "p-011", qty: 12 },
  ], "completed", "unpaid"),
  buildInvoice("so-015", "SO-2026-0827", "c-010", "u-rp-01", "cash", "2026-08-09", [
    { productId: "p-002", qty: 8 },
    { productId: "p-020", qty: 12 },
  ], "completed", "paid"),
  buildInvoice("so-016", "SO-2026-0826", "c-024", "u-rp-02", "credit", "2026-08-09", [
    { productId: "p-001", qty: 60 },
    { productId: "p-004", qty: 24 },
    { productId: "p-008", qty: 36 },
    { productId: "p-018", qty: 12 },
  ], "completed", "unpaid", undefined, 400),
  buildInvoice("so-017", "SO-2026-0825", "c-014", "u-rp-01", "credit", "2026-08-09", [
    { productId: "p-010", qty: 12 },
    { productId: "p-013", qty: 12 },
  ], "completed", "partial", 6000, 100),
  buildInvoice("so-018", "SO-2026-0824", "c-030", "u-rp-06", "credit", "2026-08-08", [
    { productId: "p-005", qty: 8 },
    { productId: "p-014", qty: 6 },
  ], "completed", "unpaid"),
  buildInvoice("so-019", "SO-2026-0823", "c-022", "u-rp-06", "cash", "2026-08-08", [
    { productId: "p-007", qty: 10 },
  ], "cancelled", "unpaid"),
  buildInvoice("so-020", "SO-2026-0822", "c-021", "u-rp-06", "credit", "2026-08-08", [
    { productId: "p-002", qty: 16 },
    { productId: "p-011", qty: 20 },
  ], "completed", "unpaid"),
  buildInvoice("so-021", "SO-2026-0821", "c-002", "u-rp-01", "credit", "2026-08-08", [
    { productId: "p-001", qty: 36 },
    { productId: "p-007", qty: 24 },
    { productId: "p-010", qty: 24 },
    { productId: "p-019", qty: 12 },
  ], "completed", "unpaid", undefined, 300),
  buildInvoice("so-022", "SO-2026-0820", "c-004", "u-rp-02", "credit", "2026-08-07", [
    { productId: "p-006", qty: 6 },
    { productId: "p-017", qty: 6 },
  ], "completed", "partial", 1500, 0),
  buildInvoice("so-023", "SO-2026-0819", "c-007", "u-rp-04", "credit", "2026-08-06", [
    { productId: "p-009", qty: 12 },
    { productId: "p-010", qty: 24 },
    { productId: "p-012", qty: 12 },
  ], "completed", "unpaid", undefined, 100),
  buildInvoice("so-024", "SO-2026-0818", "c-025", "u-rp-03", "cash", "2026-08-06", [
    { productId: "p-017", qty: 4 },
    { productId: "p-014", qty: 2 },
  ], "completed", "paid"),
  buildInvoice("so-025", "SO-2026-0817", "c-001", "u-rp-01", "credit", "2026-08-06", [
    { productId: "p-001", qty: 24 },
    { productId: "p-022", qty: 12 },
  ], "completed", "partial", 4000, 150),
  buildInvoice("so-026", "SO-2026-0816", "c-008", "u-rp-04", "cash", "2026-08-05", [
    { productId: "p-015", qty: 6 },
    { productId: "p-007", qty: 6 },
  ], "completed", "paid"),
  buildInvoice("so-027", "SO-2026-0815", "c-028", "u-rp-01", "credit", "2026-08-05", [
    { productId: "p-005", qty: 6 },
    { productId: "p-013", qty: 6 },
  ], "completed", "unpaid"),
  buildInvoice("so-028", "SO-2026-0814", "c-016", "u-rp-05", "credit", "2026-08-04", [
    { productId: "p-001", qty: 18 },
    { productId: "p-018", qty: 6 },
  ], "completed", "unpaid"),
  buildInvoice("so-029", "SO-2026-0813", "c-026", "u-rp-01", "cash", "2026-08-04", [
    { productId: "p-003", qty: 6 },
    { productId: "p-011", qty: 6 },
  ], "draft", "unpaid"),
  buildInvoice("so-030", "SO-2026-0812", "c-020", "u-rp-06", "credit", "2026-08-03", [
    { productId: "p-017", qty: 8 },
    { productId: "p-016", qty: 2 },
  ], "completed", "unpaid"),
  buildInvoice("so-031", "SO-2026-0842", "c-010", "u-rp-07", "credit", "2026-08-14", [
    { productId: "p-001", qty: 16 },
    { productId: "p-007", qty: 24 },
  ], "completed", "unpaid"),
  buildInvoice("so-032", "SO-2026-0843", "c-011", "u-rp-07", "cash", "2026-08-12", [
    { productId: "p-009", qty: 8 },
    { productId: "p-003", qty: 12 },
  ], "completed", "paid"),
];

export const salesOrders: SalesOrder[] = invoices.map((i) => {
  const { paymentStatus, dueDate, ...rest } = i;
  return rest;
});

export const invoiceById = (id: string) => invoices.find((i) => i.id === id);
export const invoicesByCustomer = (customerId: string) =>
  invoices.filter((i) => i.customerId === customerId).sort((a, b) => b.date.localeCompare(a.date));
export const invoicesByRep = (repId: string) =>
  invoices.filter((i) => i.repId === repId).sort((a, b) => b.date.localeCompare(a.date));

export const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";