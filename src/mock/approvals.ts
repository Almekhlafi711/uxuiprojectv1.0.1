import type { ApprovalRequest } from "@/types";

export const approvals: ApprovalRequest[] = [
  {
    id: "ap-001", number: "APR-2026-0088", type: "discount", title: "طلب خصم استثنائي — أسواق الخليج",
    description: "خصم استثنائي 8% على فاتورة بيع آجل لمدة 30 يوم لدعم الحجم الشهري للعميل.",
    requestedBy: "عبدالرحمن فهد الدوسري", requestedById: "u-rp-03", date: "2026-08-14",
    status: "under_review", currentLevel: 1, totalLevels: 2, amount: 1840, priority: "high",
    relatedId: "so-007",
    steps: [
      { level: 1, role: "SUPERVISOR", status: "approved", by: "ناصر علي القحطاني", at: "2026-08-14T09:00:00", note: "موافق — العميل مهم" },
      { level: 2, role: "SALES_MANAGER", status: "pending" },
    ],
  },
  {
    id: "ap-002", number: "APR-2026-0087", type: "credit_override", title: "تجاوز حد ائتماني — شركة الأفق للتجارة",
    description: "طلب رفع حد ائتماني مؤقت من 80,000 إلى 100,000 ر.س لمدة 60 يوم.",
    requestedBy: "أحمد سامي الزهراني", requestedById: "u-rp-01", date: "2026-08-14",
    status: "submitted", currentLevel: 1, totalLevels: 2, amount: 100000, priority: "high",
    steps: [
      { level: 1, role: "SUPERVISOR", status: "pending" },
      { level: 2, role: "SALES_MANAGER", status: "pending" },
    ],
  },
  {
    id: "ap-003", number: "APR-2026-0086", type: "stock_transfer", title: "تحويل مخزون — مستودع جدة إلى الرياض",
    description: "تحويل 240 كرتون مشروب برتقال بين المستودعات لتغطية الطلب.",
    requestedBy: "أمين المستودع — جدة", requestedById: "u-wh-02", date: "2026-08-13",
    status: "approved", currentLevel: 2, totalLevels: 2, priority: "normal",
    relatedId: "st-003",
    steps: [
      { level: 1, role: "SALES_MANAGER", status: "approved", by: "فهد سعود المطيري", at: "2026-08-13T14:00:00", note: "مطلوب لسد العجز" },
      { level: 2, role: "GENERAL_MANAGER", status: "approved", by: "خالد العتيبي", at: "2026-08-13T16:30:00" },
    ],
  },
  {
    id: "ap-004", number: "APR-2026-0085", type: "leave", title: "طلب إجازة سنوية — سعد الغامدي",
    description: "إجازة سنوية 5 أيام من 2026-08-20 إلى 2026-08-24.",
    requestedBy: "سعد الغامدي", requestedById: "u-rp-05", date: "2026-08-13",
    status: "under_review", currentLevel: 1, totalLevels: 2, priority: "low",
    steps: [
      { level: 1, role: "SUPERVISOR", status: "approved", by: "ماجد خالد الشمري", at: "2026-08-13T12:00:00" },
      { level: 2, role: "GENERAL_MANAGER", status: "pending" },
    ],
  },
  {
    id: "ap-005", number: "APR-2026-0084", type: "route_plan", title: "اعتماد خطة سير — عبدالرحمن فهد الدوسري",
    description: "خطة سير شهرية لمنطقة جنوب الرياض — 30 عميل نشط.",
    requestedBy: "ناصر علي القحطاني", requestedById: "u-sp-02", date: "2026-08-12",
    status: "under_review", currentLevel: 1, totalLevels: 1, priority: "normal",
    relatedId: "rp-003",
    steps: [
      { level: 1, role: "SALES_MANAGER", status: "pending" },
    ],
  },
  {
    id: "ap-006", number: "APR-2026-0083", type: "target", title: "اعتماد أهداف شهر سبتمبر — فريق الرياض الشمالي",
    description: "أهداف المبيعات والتحصيل والزيارات للفريق للشهر القادم.",
    requestedBy: "سالم محمد الهاجري", requestedById: "u-sp-01", date: "2026-08-12",
    status: "pending", currentLevel: 1, totalLevels: 2, amount: 420000, priority: "normal",
    steps: [
      { level: 1, role: "SALES_MANAGER", status: "pending" },
      { level: 2, role: "GENERAL_MANAGER", status: "pending" },
    ],
  },
  {
    id: "ap-007", number: "APR-2026-0082", type: "custody", title: "عهدة جهاز POS — محمد حسن العجمي",
    description: "تسليم جهاز POS جديد للمندوب بعد استلام القديم التالف.",
    requestedBy: "أمين العهد", requestedById: "u-wh-03", date: "2026-08-11",
    status: "approved", currentLevel: 1, totalLevels: 1, priority: "normal",
    steps: [
      { level: 1, role: "SUPERVISOR", status: "approved", by: "سالم محمد الهاجري", at: "2026-08-11T10:00:00" },
    ],
  },
  {
    id: "ap-008", number: "APR-2026-0081", type: "archive_change", title: "تعديل أرشيف — مستند استلام قديم",
    description: "طلب تعديل كمية استلام GRN-2025-0102 بعد اكتشاف خطأ تسجيل.",
    requestedBy: "المحاسب", requestedById: "u-acc-01", date: "2026-08-10",
    status: "approved", currentLevel: 2, totalLevels: 2, priority: "high",
    steps: [
      { level: 1, role: "SALES_MANAGER", status: "approved", by: "فهد سعود المطيري", at: "2026-08-10T11:00:00", note: "الخطأ موثق" },
      { level: 2, role: "GENERAL_MANAGER", status: "approved", by: "خالد العتيبي", at: "2026-08-10T15:30:00", note: "اعتماد التعديل مع تدقيق" },
    ],
  },
  {
    id: "ap-009", number: "APR-2026-0080", type: "price_change", title: "تعديل سعر — مياه معدنية 330مل",
    description: "تعديل سعر البيع من 13.00 إلى 13.50 ر.س اعتباراً من 2026-09-01.",
    requestedBy: "فهد سعود المطيري", requestedById: "u-sm-01", date: "2026-08-10",
    status: "rejected", currentLevel: 1, totalLevels: 2, priority: "normal",
    steps: [
      { level: 1, role: "GENERAL_MANAGER", status: "rejected", by: "خالد العتيبي", at: "2026-08-10T16:00:00", note: "يرجى إعادة التقديم مع دراسة أثر الربحية" },
    ],
  },
  {
    id: "ap-010", number: "APR-2026-0079", type: "customer_transfer", title: "تحويل عميل — هايبر ستي إلى مندوب جديد",
    description: "تحويل العميل هايبر ستي من محمد حسن العجمي إلى أحمد سامي الزهراني.",
    requestedBy: "سالم محمد الهاجري", requestedById: "u-sp-01", date: "2026-08-09",
    status: "approved", currentLevel: 1, totalLevels: 1, priority: "normal",
    relatedId: "c-024",
    steps: [
      { level: 1, role: "SALES_MANAGER", status: "approved", by: "فهد سعود المطيري", at: "2026-08-09T13:00:00" },
    ],
  },
];

export const approvalsByStatus = (status: string) => approvals.filter((a) => a.status === status);
export const pendingApprovals = () => approvals.filter((a) => ["pending", "submitted", "under_review"].includes(a.status));