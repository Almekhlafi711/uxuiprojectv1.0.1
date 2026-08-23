import type { StockItem, StockMovement, StockRequest, StockTransfer, VanStock, Warehouse } from "@/types";
import { products } from "./products";
import { TODAY } from "@/config/date";

export const warehouses: Warehouse[] = [
  { id: "wh-01", name: "المستودع الرئيسي — الرياض", branchId: "b-01" },
  { id: "wh-02", name: "مستودع جدة", branchId: "b-02" },
  { id: "wh-03", name: "مستودع الدمام", branchId: "b-03" },
];

function stockItem(productId: string, available: number, warehouseId = "wh-01", reserved = 0, damaged = 0, inTransit = 0): StockItem {
  const p = products.find((x) => x.id === productId)!;
  return {
    productId,
    productName: p.name,
    warehouseId,
    available,
    reserved,
    damaged,
    inTransit,
    reorderLevel: p.reorderLevel,
    costPrice: p.costPrice,
  };
}

export const warehouseStock: StockItem[] = [
  stockItem("p-001", 1420, "wh-01", 120, 15, 240),
  stockItem("p-002", 860, "wh-01", 60, 8, 120),
  stockItem("p-003", 540, "wh-01", 40, 5, 96),
  stockItem("p-004", 380, "wh-01", 24, 3, 48),
  stockItem("p-005", 240, "wh-01", 18, 4, 36),
  stockItem("p-006", 160, "wh-01", 12, 2, 24),
  stockItem("p-007", 2400, "wh-01", 300, 40, 480),
  stockItem("p-008", 1250, "wh-01", 150, 25, 240),
  stockItem("p-009", 96, "wh-01", 12, 4, 24),
  stockItem("p-010", 210, "wh-01", 30, 6, 36),
  stockItem("p-011", 320, "wh-01", 40, 10, 60),
  stockItem("p-012", 140, "wh-01", 18, 3, 24),
  stockItem("p-013", 260, "wh-01", 24, 6, 48),
  stockItem("p-014", 120, "wh-01", 12, 2, 24),
  stockItem("p-015", 640, "wh-01", 80, 20, 120),
  stockItem("p-016", 48, "wh-01", 8, 2, 8),
  stockItem("p-017", 96, "wh-01", 12, 4, 24),
  stockItem("p-018", 72, "wh-01", 8, 3, 12),
  stockItem("p-019", 36, "wh-01", 6, 2, 12),
  stockItem("p-020", 420, "wh-01", 60, 15, 96),
  stockItem("p-022", 180, "wh-01", 24, 6, 36),
  stockItem("p-001", 860, "wh-02", 80, 10, 120),
  stockItem("p-002", 540, "wh-02", 40, 5, 60),
  stockItem("p-003", 320, "wh-02", 30, 4, 48),
  stockItem("p-007", 1800, "wh-02", 200, 30, 360),
  stockItem("p-008", 960, "wh-02", 100, 15, 120),
  stockItem("p-009", 72, "wh-02", 8, 2, 12),
  stockItem("p-010", 160, "wh-02", 20, 4, 24),
  stockItem("p-011", 240, "wh-02", 30, 6, 36),
  stockItem("p-012", 100, "wh-02", 12, 2, 12),
  stockItem("p-015", 480, "wh-02", 60, 15, 60),
  stockItem("p-004", 120, "wh-02", 12, 2, 12),
  stockItem("p-005", 80, "wh-02", 8, 1, 8),
  stockItem("p-006", 48, "wh-02", 6, 1, 6),
  stockItem("p-013", 160, "wh-02", 16, 3, 18),
  stockItem("p-014", 60, "wh-02", 6, 1, 6),
  stockItem("p-016", 24, "wh-02", 4, 1, 4),
  stockItem("p-017", 48, "wh-02", 6, 2, 6),
  stockItem("p-018", 36, "wh-02", 4, 1, 4),
  stockItem("p-019", 24, "wh-02", 4, 1, 4),
  stockItem("p-020", 180, "wh-02", 20, 4, 18),
  stockItem("p-022", 96, "wh-02", 12, 3, 12),
  stockItem("p-001", 620, "wh-03", 50, 8, 96),
  stockItem("p-002", 380, "wh-03", 30, 4, 48),
  stockItem("p-003", 240, "wh-03", 20, 3, 36),
  stockItem("p-007", 1200, "wh-03", 150, 20, 240),
  stockItem("p-008", 720, "wh-03", 80, 10, 96),
  stockItem("p-009", 48, "wh-03", 6, 2, 12),
  stockItem("p-010", 120, "wh-03", 15, 3, 18),
  stockItem("p-015", 360, "wh-03", 40, 10, 48),
  stockItem("p-004", 80, "wh-03", 8, 2, 8),
  stockItem("p-005", 60, "wh-03", 6, 1, 6),
  stockItem("p-006", 36, "wh-03", 4, 1, 4),
  stockItem("p-013", 120, "wh-03", 12, 3, 12),
  stockItem("p-014", 48, "wh-03", 4, 1, 6),
  stockItem("p-016", 18, "wh-03", 3, 1, 3),
  stockItem("p-017", 36, "wh-03", 4, 2, 6),
  stockItem("p-018", 24, "wh-03", 3, 1, 3),
  stockItem("p-019", 18, "wh-03", 3, 1, 3),
  stockItem("p-020", 120, "wh-03", 15, 4, 12),
  stockItem("p-022", 72, "wh-03", 8, 2, 8),
];

export const vanStock: VanStock[] = [
  {
    repId: "u-rp-01",
    updatedAt: `${TODAY}T08:20:00`,
    items: [
      { productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 96, damagedQty: 2 },
      { productId: "p-007", productName: "مياه معدنية 330مل", qty: 144, damagedQty: 0 },
      { productId: "p-009", productName: "أرز بسمتي 5 كجم", qty: 24, damagedQty: 1 },
      { productId: "p-022", productName: "مشروب غازي كولا 1.5 لتر", qty: 60, damagedQty: 0 },
      { productId: "p-010", productName: "زيت عباد الشمس 1.5 لتر", qty: 36, damagedQty: 2 },
    ],
  },
  {
    repId: "u-rp-02",
    updatedAt: `${TODAY}T08:05:00`,
    items: [
      { productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 120, damagedQty: 1 },
      { productId: "p-005", productName: "عصير مانجو 1 لتر", qty: 36, damagedQty: 0 },
      { productId: "p-015", productName: "شيبس مالح 60 جرام", qty: 180, damagedQty: 4 },
      { productId: "p-017", productName: "حليب طازج 1 لتر", qty: 48, damagedQty: 3 },
      { productId: "p-008", productName: "مياه معدنية 1.5 لتر", qty: 72, damagedQty: 0 },
    ],
  },
  {
    repId: "u-rp-03",
    updatedAt: `${TODAY}T07:55:00`,
    items: [
      { productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 84, damagedQty: 2 },
      { productId: "p-010", productName: "زيت عباد الشمس 1.5 لتر", qty: 48, damagedQty: 0 },
      { productId: "p-013", productName: "صلصة طماطم 340 جرام", qty: 72, damagedQty: 2 },
      { productId: "p-019", productName: "مسحوق غسيل 3 كجم", qty: 24, damagedQty: 1 },
    ],
  },
  {
    repId: "u-rp-04",
    updatedAt: `${TODAY}T07:50:00`,
    items: [
      { productId: "p-002", productName: "مشروب غازي برتقال 330مل", qty: 96, damagedQty: 1 },
      { productId: "p-012", productName: "شاي أسود 250 جرام", qty: 36, damagedQty: 0 },
      { productId: "p-020", productName: "صابون استحمام 125 جرام", qty: 240, damagedQty: 0 },
      { productId: "p-009", productName: "أرز بسمتي 5 كجم", qty: 24, damagedQty: 0 },
    ],
  },
  {
    repId: "u-rp-05",
    updatedAt: `${TODAY}T07:40:00`,
    items: [
      { productId: "p-003", productName: "مشروب غازي ليمون 330مل", qty: 72, damagedQty: 2 },
      { productId: "p-017", productName: "حليب طازج 1 لتر", qty: 36, damagedQty: 1 },
      { productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 60, damagedQty: 1 },
      { productId: "p-011", productName: "سكر ناعم 1 كجم", qty: 96, damagedQty: 2 },
    ],
  },
  {
    repId: "u-rp-06",
    updatedAt: "2026-08-13T17:10:00",
    items: [
      { productId: "p-007", productName: "مياه معدنية 330مل", qty: 120, damagedQty: 0 },
      { productId: "p-005", productName: "عصير مانجو 1 لتر", qty: 24, damagedQty: 0 },
      { productId: "p-016", productName: "حلاوة طحينية 1 كجم", qty: 12, damagedQty: 0 },
    ],
  },
  {
    repId: "u-rp-07",
    updatedAt: `${TODAY}T08:00:00`,
    items: [
      { productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 48, damagedQty: 0 },
      { productId: "p-007", productName: "مياه معدنية 330مل", qty: 72, damagedQty: 0 },
      { productId: "p-009", productName: "أرز بسمتي 5 كجم", qty: 12, damagedQty: 0 },
    ],
  },
];

export const stockMovements: StockMovement[] = [
  { id: "mv-001", type: "receiving", productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 480, toWarehouseId: "wh-01", date: "2026-08-14T08:00:00", refNumber: "GRN-2026-0180", createdBy: "أمين المستودع — أحمد" },
  { id: "mv-002", type: "transfer_out", productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 96, fromWarehouseId: "wh-01", repId: "u-rp-01", date: "2026-08-14T07:30:00", refNumber: "ST-2026-0095", createdBy: "أمين المستودع" },
  { id: "mv-003", type: "transfer_out", productId: "p-007", productName: "مياه معدنية 330مل", qty: 144, fromWarehouseId: "wh-01", repId: "u-rp-01", date: "2026-08-14T07:30:00", refNumber: "ST-2026-0095", createdBy: "أمين المستودع" },
  { id: "mv-004", type: "return_in", productId: "p-013", productName: "صلصة طماطم 340 جرام", qty: 4, toWarehouseId: "wh-01", repId: "u-rp-03", date: "2026-08-14T11:40:00", refNumber: "RET-2026-0115", createdBy: "محمود — مستودع" },
  { id: "mv-005", type: "damage", productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 6, fromWarehouseId: "wh-01", date: "2026-08-13T16:20:00", refNumber: "DMG-2026-0041", createdBy: "أمين المستودع", notes: "تلف أثناء التحميل" },
  { id: "mv-006", type: "transfer_in", productId: "p-002", productName: "مشروب غازي برتقال 330مل", qty: 240, toWarehouseId: "wh-01", date: "2026-08-13T15:00:00", refNumber: "ST-2026-0093", createdBy: "أمين المستودع" },
  { id: "mv-007", type: "issue", productId: "p-009", productName: "أرز بسمتي 5 كجم", qty: 12, fromWarehouseId: "wh-01", date: "2026-08-13T14:30:00", refNumber: "SO-2026-0833", createdBy: "نظام المبيعات" },
  { id: "mv-008", type: "count_adjust", productId: "p-015", productName: "شيبس مالح 60 جرام", qty: 18, fromWarehouseId: "wh-01", date: "2026-08-12T10:00:00", refNumber: "CNT-2026-0022", createdBy: "فريق الجرد", notes: "فرق جرد — كسر" },
  { id: "mv-009", type: "receiving", productId: "p-007", productName: "مياه معدنية 330مل", qty: 1200, toWarehouseId: "wh-01", date: "2026-08-12T09:00:00", refNumber: "GRN-2026-0178", createdBy: "أمين المستودع" },
  { id: "mv-010", type: "transfer_out", productId: "p-017", productName: "حليب طازج 1 لتر", qty: 48, fromWarehouseId: "wh-01", repId: "u-rp-02", date: "2026-08-12T07:00:00", refNumber: "ST-2026-0090", createdBy: "أمين المستودع" },
  { id: "mv-011", type: "receiving", productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 360, toWarehouseId: "wh-02", date: "2026-08-14T09:00:00", refNumber: "GRN-2026-0181", createdBy: "أمين المستودع — جدة" },
  { id: "mv-012", type: "transfer_out", productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 84, fromWarehouseId: "wh-02", repId: "u-rp-03", date: "2026-08-14T07:30:00", refNumber: "ST-2026-0097", createdBy: "أمين المستودع — جدة" },
  { id: "mv-013", type: "transfer_out", productId: "p-010", productName: "زيت عباد الشمس 1.5 لتر", qty: 48, fromWarehouseId: "wh-02", repId: "u-rp-03", date: "2026-08-14T07:30:00", refNumber: "ST-2026-0097", createdBy: "أمين المستودع — جدة" },
  { id: "mv-014", type: "receiving", productId: "p-003", productName: "مشروب غازي ليمون 330مل", qty: 240, toWarehouseId: "wh-02", date: "2026-08-13T10:00:00", refNumber: "GRN-2026-0179", createdBy: "أمين المستودع — جدة" },
  { id: "mv-015", type: "receiving", productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 240, toWarehouseId: "wh-03", date: "2026-08-14T08:30:00", refNumber: "GRN-2026-0182", createdBy: "أمين المستودع — الدمام" },
  { id: "mv-016", type: "transfer_out", productId: "p-003", productName: "مشروب غازي ليمون 330مل", qty: 72, fromWarehouseId: "wh-03", repId: "u-rp-05", date: "2026-08-13T07:45:00", refNumber: "ST-2026-0092", createdBy: "أمين المستودع — الدمام" },
  { id: "mv-017", type: "transfer_out", productId: "p-017", productName: "حليب طازج 1 لتر", qty: 36, fromWarehouseId: "wh-03", repId: "u-rp-05", date: "2026-08-13T07:45:00", refNumber: "ST-2026-0092", createdBy: "أمين المستودع — الدمام" },
  { id: "mv-018", type: "receiving", productId: "p-007", productName: "مياه معدنية 330مل", qty: 600, toWarehouseId: "wh-03", date: "2026-08-12T09:30:00", refNumber: "GRN-2026-0177", createdBy: "أمين المستودع — الدمام" },
];

export const stockTransfers: StockTransfer[] = [
  { id: "st-001", number: "ST-2026-0095", status: "completed", fromWarehouseId: "wh-01", toRepId: "u-rp-01", items: [{ productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 96 }, { productId: "p-007", productName: "مياه معدنية 330مل", qty: 144 }], createdBy: "أمين المستودع", date: TODAY, approvedBy: "سالم الهاجري" },
  { id: "st-002", number: "ST-2026-0094", status: "pending", fromWarehouseId: "wh-01", toRepId: "u-rp-03", items: [{ productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 120 }, { productId: "p-010", productName: "زيت عباد الشمس 1.5 لتر", qty: 48 }], createdBy: "أمين المستودع", date: TODAY, notes: "إعادة تموين" },
  { id: "st-003", number: "ST-2026-0093", status: "completed", fromWarehouseId: "wh-02", toWarehouseId: "wh-01", items: [{ productId: "p-002", productName: "مشروب غازي برتقال 330مل", qty: 240 }], createdBy: "أمين المستودع — جدة", date: "2026-08-13", approvedBy: "فهد المطيري" },
  { id: "st-004", number: "ST-2026-0092", status: "approved", fromWarehouseId: "wh-01", toRepId: "u-rp-05", items: [{ productId: "p-003", productName: "مشروب غازي ليمون 330مل", qty: 72 }, { productId: "p-017", productName: "حليب طازج 1 لتر", qty: 36 }], createdBy: "أمين المستودع", date: "2026-08-13", approvedBy: "ماجد خالد الشمري" },
  { id: "st-005", number: "ST-2026-0091", status: "rejected", fromWarehouseId: "wh-01", toRepId: "u-rp-06", items: [{ productId: "p-019", productName: "مسحوق غسيل 3 كجم", qty: 24 }], createdBy: "أمين المستودع", date: "2026-08-12", notes: "المخزون غير متاح للكمية المطلوبة" },
  { id: "st-006", number: "ST-2026-0090", status: "completed", fromWarehouseId: "wh-01", toRepId: "u-rp-02", items: [{ productId: "p-017", productName: "حليب طازج 1 لتر", qty: 48 }, { productId: "p-015", productName: "شيبس مالح 60 جرام", qty: 120 }], createdBy: "أمين المستودع", date: "2026-08-12", approvedBy: "سالم الهاجري" },
  { id: "st-007", number: "ST-2026-0096", status: "in_transit", fromWarehouseId: "wh-01", toRepId: "u-rp-01", items: [{ productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 120 }, { productId: "p-007", productName: "مياه معدنية 330مل", qty: 96 }], createdBy: "أمين المستودع", date: "2026-08-14", approvedBy: "سالم الهاجري", notes: "قيد النقل — بانتظار استلام المندوب" },
  { id: "st-008", number: "ST-2026-0098", status: "pending", fromWarehouseId: "wh-01", toRepId: "u-rp-02", items: [{ productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 96 }, { productId: "p-002", productName: "مشروب غازي برتقال 330مل", qty: 72 }], createdBy: "أمين المستودع", date: TODAY },
  { id: "st-009", number: "ST-2026-0099", status: "pending", fromWarehouseId: "wh-01", toRepId: "u-rp-03", items: [{ productId: "p-007", productName: "مياه معدنية 330مل", qty: 144 }, { productId: "p-003", productName: "مشروب غازي ليمون 330مل", qty: 96 }], createdBy: "أمين المستودع", date: TODAY },
  { id: "st-010", number: "ST-2026-0100", status: "completed", fromWarehouseId: "wh-01", toRepId: "u-rp-04", items: [{ productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 120 }, { productId: "p-007", productName: "مياه معدنية 330مل", qty: 96 }], createdBy: "أمين المستودع", date: TODAY, approvedBy: "سالم الهاجري" },
  { id: "st-011", number: "ST-2026-0101", status: "pending", fromWarehouseId: "wh-01", toRepId: "u-rp-05", items: [{ productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 96 }, { productId: "p-009", productName: "أرز بسمتي 5 كجم", qty: 24 }], createdBy: "أمين المستودع", date: TODAY },
  { id: "st-012", number: "ST-2026-0102", status: "completed", fromWarehouseId: "wh-01", toRepId: "u-rp-07", items: [{ productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 72 }, { productId: "p-007", productName: "مياه معدنية 330مل", qty: 96 }], createdBy: "أمين المستودع", date: TODAY, approvedBy: "سالم الهاجري" },
];

export const stockRequests: StockRequest[] = [
  { id: "sr-001", number: "SRQ-2026-0061", repId: "u-rp-03", status: "pending", warehouseId: "wh-01", date: "2026-08-14", items: [{ productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 120 }, { productId: "p-010", productName: "زيت عباد الشمس 1.5 لتر", qty: 48 }], notes: "إعادة تموين — مخزون منخفض" },
  { id: "sr-002", number: "SRQ-2026-0060", repId: "u-rp-05", status: "approved", warehouseId: "wh-02", date: "2026-08-13", items: [{ productId: "p-003", productName: "مشروب غازي ليمون 330مل", qty: 72 }, { productId: "p-017", productName: "حليب طازج 1 لتر", qty: 36 }] },
  { id: "sr-003", number: "SRQ-2026-0059", repId: "u-rp-01", status: "delivered", warehouseId: "wh-01", date: "2026-08-13", items: [{ productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 96 }, { productId: "p-007", productName: "مياه معدنية 330مل", qty: 144 }] },
  { id: "sr-004", number: "SRQ-2026-0058", repId: "u-rp-04", status: "rejected", warehouseId: "wh-01", date: "2026-08-12", items: [{ productId: "p-019", productName: "مسحوق غسيل 3 كجم", qty: 24 }], notes: "غير متوفر حالياً" },
  { id: "sr-005", number: "SRQ-2026-0057", repId: "u-rp-02", status: "delivered", warehouseId: "wh-01", date: "2026-08-12", items: [{ productId: "p-017", productName: "حليب طازج 1 لتر", qty: 48 }] },
  { id: "sr-006", number: "SRQ-2026-0062", repId: "u-rp-01", status: "pending", warehouseId: "wh-01", date: "2026-08-14", items: [{ productId: "p-001", productName: "مشروب غازي كولا 330مل", qty: 120 }, { productId: "p-007", productName: "مياه معدنية 330مل", qty: 96 }], notes: "إعادة تموين — الكمية مطلوبة بعد الإقفال" },
];

export const stockByRep = (repId: string) => vanStock.find((v) => v.repId === repId)?.items ?? [];
export const movementsByProduct = (productId: string) =>
  stockMovements.filter((m) => m.productId === productId).sort((a, b) => b.date.localeCompare(a.date));