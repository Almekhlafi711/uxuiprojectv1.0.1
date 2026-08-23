import type { CashBox, CashMovement } from "@/types";

export const cashBoxes: CashBox[] = [
  { id: "bx-main", name: "الصندوق الرئيسي — الرياض", type: "main", balance: 48650 },
  { id: "bx-sp-01", name: "صندوق المشرف — سالم محمد الهاجري", type: "supervisor", ownerId: "u-sp-01", balance: 12400 },
  { id: "bx-sp-02", name: "صندوق المشرف — ناصر علي القحطاني", type: "supervisor", ownerId: "u-sp-02", balance: 9800 },
  { id: "bx-rp-01", name: "صندوق المندوب — أحمد سامي الزهراني", type: "rep", ownerId: "u-rp-01", balance: 3420 },
  { id: "bx-rp-02", name: "صندوق المندوب — محمد حسن العجمي", type: "rep", ownerId: "u-rp-02", balance: 2850 },
  { id: "bx-rp-03", name: "صندوق المندوب — عبدالرحمن فهد الدوسري", type: "rep", ownerId: "u-rp-03", balance: 6100 },
  { id: "bx-rp-04", name: "صندوق المندوب — يوسف طلال الحربي", type: "rep", ownerId: "u-rp-04", balance: 1950 },
  { id: "bx-rp-05", name: "صندوق المندوب — سعد عبدالعزيز الغامدي", type: "rep", ownerId: "u-rp-05", balance: 4300 },
  { id: "bx-rp-06", name: "صندوق المندوب — بندر صالح السبيعي", type: "rep", ownerId: "u-rp-06", balance: 1220 },
];

export const cashMovements: CashMovement[] = [
  { id: "cm-001", number: "CM-2026-0230", type: "collection_in", amount: 5000, cashBoxId: "bx-rp-01", relatedRepId: "u-rp-01", date: "2026-08-14", createdBy: "أحمد سامي الزهراني", notes: "تحصيل مؤسسة النور" },
  { id: "cm-002", number: "CM-2026-0229", type: "collection_in", amount: 1850, cashBoxId: "bx-rp-02", relatedRepId: "u-rp-02", date: "2026-08-14", createdBy: "محمد حسن العجمي" },
  { id: "cm-003", number: "CM-2026-0228", type: "rep_deposit", amount: 12000, cashBoxId: "bx-sp-01", relatedRepId: "u-rp-01", date: "2026-08-13", createdBy: "سالم محمد الهاجري", notes: "توريد من مندوب" },
  { id: "cm-004", number: "CM-2026-0227", type: "collection_in", amount: 2600, cashBoxId: "bx-rp-04", relatedRepId: "u-rp-04", date: "2026-08-14", createdBy: "يوسف طلال الحربي" },
  { id: "cm-005", number: "CM-2026-0226", type: "supervisor_receipt", amount: 18500, cashBoxId: "bx-main", relatedRepId: "u-sp-01", date: "2026-08-13", createdBy: "المحاسب", notes: "استلام من صندوق المشرف" },
  { id: "cm-006", number: "CM-2026-0225", type: "collection_in", amount: 8000, cashBoxId: "bx-rp-03", relatedRepId: "u-rp-03", date: "2026-08-13", createdBy: "عبدالرحمن فهد الدوسري" },
  { id: "cm-007", number: "CM-2026-0224", type: "expense", amount: 350, cashBoxId: "bx-rp-03", relatedRepId: "u-rp-03", date: "2026-08-13", createdBy: "عبدالرحمن فهد الدوسري", notes: "وقود سيارة" },
  { id: "cm-008", number: "CM-2026-0223", type: "rep_deposit", amount: 15000, cashBoxId: "bx-sp-02", relatedRepId: "u-rp-04", date: "2026-08-12", createdBy: "ناصر علي القحطاني" },
  { id: "cm-009", number: "CM-2026-0222", type: "adjustment", amount: 500, cashBoxId: "bx-rp-01", relatedRepId: "u-rp-01", date: "2026-08-12", createdBy: "المحاسب", notes: "فروقات تحصيل — تسوية" },
  { id: "cm-010", number: "CM-2026-0221", type: "collection_in", amount: 6000, cashBoxId: "bx-rp-05", relatedRepId: "u-rp-05", date: "2026-08-10", createdBy: "سعد عبدالعزيز الغامدي" },
];

export const boxById = (id: string) => cashBoxes.find((b) => b.id === id);
export const movementsByBox = (boxId: string) =>
  cashMovements.filter((m) => m.cashBoxId === boxId).sort((a, b) => b.date.localeCompare(a.date));