import type { CustodyObjection, CustodyRecord } from "@/types";

export const custodyRecords: CustodyRecord[] = [
  { id: "cs-001", assetType: "car", assetName: "تويوتا هيلوكس 2024", serialNumber: "VEH-00128", assignedToId: "u-rp-01", assignedToRole: "REPRESENTATIVE", issuedAt: "2024-01-10", condition: "good", status: "issued" },
  { id: "cs-002", assetType: "car", assetName: "هوندا سيفيك 2023", serialNumber: "VEH-00142", assignedToId: "u-rp-02", assignedToRole: "REPRESENTATIVE", issuedAt: "2024-02-15", condition: "good", status: "issued" },
  { id: "cs-003", assetType: "car", assetName: "نيسان باترول 2023", serialNumber: "VEH-00155", assignedToId: "u-sp-01", assignedToRole: "SUPERVISOR", issuedAt: "2023-08-01", condition: "needs_maintenance", status: "issued", notes: "صيانة دورية قادمة" },
  { id: "cs-004", assetType: "tablet", assetName: "تابلت Samsung A9", serialNumber: "TAB-00418", assignedToId: "u-rp-03", assignedToRole: "REPRESENTATIVE", issuedAt: "2024-03-01", condition: "good", status: "issued" },
  { id: "cs-005", assetType: "tablet", assetName: "تابلت Samsung A9", serialNumber: "TAB-00419", assignedToId: "u-rp-04", assignedToRole: "REPRESENTATIVE", issuedAt: "2024-03-01", condition: "damaged", status: "issued", notes: "شاشة مكسورة — بانتظار الإصلاح" },
  { id: "cs-006", assetType: "pos", assetName: "جهاز POS — stc pay", serialNumber: "POS-00214", assignedToId: "u-rp-05", assignedToRole: "REPRESENTATIVE", issuedAt: "2024-04-05", condition: "good", status: "issued" },
  { id: "cs-007", assetType: "phone", assetName: "جوال iPhone 12", serialNumber: "PHN-00912", assignedToId: "u-rp-01", assignedToRole: "REPRESENTATIVE", issuedAt: "2024-01-10", condition: "good", status: "issued" },
  { id: "cs-008", assetType: "cashbox", assetName: "صندوق تحصيل معدني", serialNumber: "CBX-00077", assignedToId: "u-rp-02", assignedToRole: "REPRESENTATIVE", issuedAt: "2024-02-15", condition: "good", status: "issued" },
  { id: "cs-009", assetType: "car", assetName: "تويوتا هايلكس 2022", serialNumber: "VEH-00094", assignedToId: "u-rp-06", assignedToRole: "REPRESENTATIVE", issuedAt: "2023-05-01", returnedAt: "2026-08-02", condition: "good", status: "returned", notes: "إيقاف المندوب مؤقتاً" },
  { id: "cs-010", assetType: "printer", assetName: "طابعة حرارية", serialNumber: "PRN-00056", assignedToId: "u-rp-03", assignedToRole: "REPRESENTATIVE", issuedAt: "2024-03-01", condition: "good", status: "transferred", notes: "تم نقلها إلى مندوب آخر" },
];

export const assetTypeLabels: Record<CustodyRecord["assetType"], string> = {
  car: "سيارة",
  phone: "جوال",
  tablet: "تابلت",
  pos: "جهاز POS",
  printer: "طابعة",
  cashbox: "صندوق تحصيل",
};

export const custodyObjections: CustodyObjection[] = [];