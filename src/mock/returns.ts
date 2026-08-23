import type { ReturnRecord } from "@/types";
import { invoices } from "./sales";
import { productById } from "./products";

function returnLine(productId: string, qty: number) {
  const p = productById(productId)!;
  return { productId, productName: p.name, qty, price: p.sellPrice, lineTotal: +(p.sellPrice * qty).toFixed(2) };
}

export const returns: ReturnRecord[] = ([
  {
    id: "rt-001", number: "RET-2026-0115", invoiceId: "so-007", customerId: "c-005", repId: "u-rp-03", date: "2026-08-14",
    items: [returnLine("p-013", 4), returnLine("p-019", 2)],
    condition: "good" as const, totalAmount: 0, status: "approved" as const, reason: "اقتراب صلاحية المنتج",
  },
  {
    id: "rt-002", number: "RET-2026-0114", invoiceId: "so-003", customerId: "c-024", repId: "u-rp-02", date: "2026-08-13",
    items: [returnLine("p-001", 6)],
    condition: "damaged" as const, totalAmount: 0, status: "approved" as const, reason: "تلف أثناء النقل — عبوات منبعجة",
  },
  {
    id: "rt-003", number: "RET-2026-0113", invoiceId: "so-010", customerId: "c-012", repId: "u-rp-01", date: "2026-08-13",
    items: [returnLine("p-007", 12)],
    condition: "good" as const, totalAmount: 0, status: "pending" as const, reason: "طلب العميل — فائض من الطلب السابق",
  },
  {
    id: "rt-004", number: "RET-2026-0112", invoiceId: "so-016", customerId: "c-024", repId: "u-rp-02", date: "2026-08-12",
    items: [returnLine("p-004", 3), returnLine("p-018", 2)],
    condition: "good" as const, totalAmount: 0, status: "approved" as const, reason: "استبدال بمنتجات أحدث",
  },
  {
    id: "rt-005", number: "RET-2026-0111", invoiceId: "so-021", customerId: "c-002", repId: "u-rp-01", date: "2026-08-11",
    items: [returnLine("p-019", 3)],
    condition: "damaged" as const, totalAmount: 0, status: "approved" as const, reason: "عبوات مثقوبة",
  },
  {
    id: "rt-006", number: "RET-2026-0110", invoiceId: "so-013", customerId: "c-017", repId: "u-rp-05", date: "2026-08-10",
    items: [returnLine("p-015", 6)],
    condition: "damaged" as const, totalAmount: 0, status: "rejected" as const, reason: "انتهاء الصلاحية قبل البيع — خارج سياسة المرتجعات",
  },
  {
    id: "rt-007", number: "RET-2026-0109", invoiceId: "so-012", customerId: "c-019", repId: "u-rp-05", date: "2026-08-09",
    items: [returnLine("p-009", 2)],
    condition: "good" as const, totalAmount: 0, status: "approved" as const, reason: "تأخر تسليم — إلغاء جزئي من العميل",
  },
  {
    id: "rt-008", number: "RET-2026-0108", invoiceId: "so-023", customerId: "c-007", repId: "u-rp-04", date: "2026-08-08",
    items: [returnLine("p-012", 2)],
    condition: "good" as const, totalAmount: 0, status: "approved" as const, reason: "خطأ في الكمية المرسلة",
  },
] as const).map((r) => ({ ...r, totalAmount: r.items.reduce((s, i) => s + i.lineTotal, 0) })) as unknown as ReturnRecord[];

export const returnsByRep = (repId: string) =>
  returns.filter((r) => r.repId === repId).sort((a, b) => b.date.localeCompare(a.date));

export const returnsTotal = (list: ReturnRecord[]) => list.reduce((s, r) => s + r.totalAmount, 0);
export const invoiceRef = (id: string) => invoices.find((i) => i.id === id)?.invoiceNumber ?? "—";