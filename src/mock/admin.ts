import type { ArchiveRecord, AuditLog, Conversation, LeaveRequest, Message, Notification } from "@/types";

export const archiveRecords: ArchiveRecord[] = [
  { id: "ar-001", title: "مستند استلام GRN-2025-0102", type: "مستند استلام", entityType: "stock_receiving", entityId: "GRN-2025-0102", version: 3, status: "locked", createdAt: "2025-03-12", updatedAt: "2026-08-10", createdBy: "المحاسب", locked: true, reason: "تم تعديل الكميات بعد اعتماد الإدارة" },
  { id: "ar-002", title: "عقد الموزع — مؤسسة الصافي للتوزيع", type: "عقد", entityType: "distributor", entityId: "d-01", version: 2, status: "approved", createdAt: "2024-06-01", updatedAt: "2026-07-20", createdBy: "فهد المطيري", locked: false },
  { id: "ar-003", title: "فاتورة مبيعات INV-2026-0835", type: "فاتورة", entityType: "invoice", entityId: "so-007", version: 1, status: "locked", createdAt: "2026-08-13", updatedAt: "2026-08-13", createdBy: "نظام المبيعات", locked: true },
  { id: "ar-004", title: "تقرير جرد شهري — يوليو 2026", type: "تقرير جرد", entityType: "stock_count", entityId: "CNT-2026-0021", version: 1, status: "approved", createdAt: "2026-07-31", updatedAt: "2026-08-01", createdBy: "فريق الجرد", locked: false },
  { id: "ar-005", title: "محضر تسوية صندوق — ناصر القحطاني", type: "محضر تسوية", entityType: "cash_settlement", entityId: "STL-2026-0033", version: 1, status: "submitted", createdAt: "2026-08-12", updatedAt: "2026-08-12", createdBy: "ناصر القحطاني", locked: false },
  { id: "ar-006", title: "سند قبض RC-2026-0396", type: "سند قبض", entityType: "collection", entityId: "col-017", version: 1, status: "locked", createdAt: "2026-08-06", updatedAt: "2026-08-06", createdBy: "نظام التحصيل", locked: true },
  { id: "ar-007", title: "خطة سير معتمدة — الرياض الشمالي (أ)", type: "خطة سير", entityType: "route_plan", entityId: "rp-001", version: 4, status: "approved", createdAt: "2026-07-28", updatedAt: "2026-07-28", createdBy: "سالم الهاجري", locked: false },
  { id: "ar-008", title: "عقد موظف — أحمد سامي الزهراني", type: "عقد", entityType: "employee", entityId: "u-rp-01", version: 1, status: "draft", createdAt: "2026-08-05", updatedAt: "2026-08-06", createdBy: "شؤون الموظفين", locked: false, reason: "بانتظار التوقيع النهائي" },
];

export const conversations: Conversation[] = [
  {
    id: "conv-001",
    subject: "متابعة تحصيل أسواق الخليج",
    participants: ["u-sm-01", "u-sp-02", "u-rp-03"],
    lastMessageAt: "2026-08-14T09:20:00",
    messages: [
      { id: "m-001", conversationId: "conv-001", senderId: "u-rp-03", body: "العميل وعد بالسداد يوم الأحد، سأتابع الزيارة غداً.", sentAt: "2026-08-14T09:20:00", attachments: [] },
      { id: "m-002", conversationId: "conv-001", senderId: "u-sp-02", body: "تمام، أحتاج تقريراً بالمبلغ المستحق قبل نهاية الأسبوع.", sentAt: "2026-08-13T15:10:00", attachments: [] },
      { id: "m-003", conversationId: "conv-001", senderId: "u-sm-01", body: "الحد الائتماني للعميل مرفوع مؤقتاً، يُرجى المتابعة بحرص.", sentAt: "2026-08-13T15:40:00", attachments: [] },
    ],
  },
  {
    id: "conv-002",
    subject: "طلب بضاعة — مخزون منخفض",
    participants: ["u-sp-01", "u-rp-01", "u-wh-01"],
    lastMessageAt: "2026-08-14T08:45:00",
    messages: [
      { id: "m-004", conversationId: "conv-002", senderId: "u-rp-01", body: "مخزون المياه في السيارة قارب على النفاد، طلبت 144 كرتوناً.", sentAt: "2026-08-14T08:45:00", attachments: [] },
      { id: "m-005", conversationId: "conv-002", senderId: "u-wh-01", body: "تم تجهيز الطلب، جاهز للتحميل الساعة 10 صباحاً.", sentAt: "2026-08-14T08:50:00", attachments: [] },
    ],
  },
  {
    id: "conv-003",
    subject: "تعديل أرشيف GRN-2025-0102",
    participants: ["u-acc-01", "u-gm-01", "u-sm-01"],
    lastMessageAt: "2026-08-10T16:00:00",
    messages: [
      { id: "m-006", conversationId: "conv-003", senderId: "u-acc-01", body: "تم اكتشاف خطأ في كمية الاستلام، المطلوب تعديل السجل.", sentAt: "2026-08-10T10:00:00", attachments: ["خطأ_الكمية.png"] },
      { id: "m-007", conversationId: "conv-003", senderId: "u-gm-01", body: "تم اعتماد التعديل مع تدقيق مالي كامل.", sentAt: "2026-08-10T15:30:00", attachments: [] },
    ],
  },
  {
    id: "conv-004",
    subject: "إجازة سعد الغامدي",
    participants: ["u-rp-05", "u-sp-03", "u-gm-01"],
    lastMessageAt: "2026-08-13T12:30:00",
    messages: [
      { id: "m-008", conversationId: "conv-004", senderId: "u-rp-05", body: "طلب إجازة سنوية 5 أيام، تم تسليم المهام لبندر مؤقتاً.", sentAt: "2026-08-13T12:00:00", attachments: [] },
      { id: "m-009", conversationId: "conv-004", senderId: "u-sp-03", body: "موافق على طلب الإجازة، جارٍ اعتمادها.", sentAt: "2026-08-13T12:30:00", attachments: [] },
    ],
  },
  {
    id: "conv-005",
    subject: "عرض أسعار — عميل مستهدف",
    participants: ["u-rp-01", "u-sp-01", "u-sm-01"],
    lastMessageAt: "2026-08-14T12:45:00",
    messages: [
      { id: "m-010", conversationId: "conv-005", senderId: "u-rp-01", body: "قدمت عرض أسعار لشركة المستقبل، طلبوا شروط دفع 45 يوم.", sentAt: "2026-08-14T12:45:00", attachments: ["عرض_أسعار.pdf"] },
      { id: "m-011", conversationId: "conv-005", senderId: "u-sm-01", body: "شروط الدفع تتجاوز السياسة، سنناقش الأمر اليوم.", sentAt: "2026-08-14T13:00:00", attachments: [] },
    ],
  },
];

export const leaveRequests: LeaveRequest[] = [
  { id: "lv-001", employeeId: "u-rp-05", type: "annual", fromDate: "2026-08-20", toDate: "2026-08-24", days: 5, reason: "إجازة سنوية", status: "under_review", requestedAt: "2026-08-13", steps: [{ level: 1, role: "SUPERVISOR", status: "approved", by: "ماجد خالد الشمري", at: "2026-08-13T12:30:00" }, { level: 2, role: "GENERAL_MANAGER", status: "pending" }] },
  { id: "lv-002", employeeId: "u-rp-04", type: "sick", fromDate: "2026-08-10", toDate: "2026-08-11", days: 2, reason: "مرض — شهادة طبية", status: "approved", requestedAt: "2026-08-09", approvedBy: "ناصر القحطاني", steps: [{ level: 1, role: "SUPERVISOR", status: "approved", by: "ناصر القحطاني", at: "2026-08-09T14:00:00" }] },
  { id: "lv-003", employeeId: "u-rp-02", type: "emergency", fromDate: "2026-07-30", toDate: "2026-07-30", days: 1, reason: "ظرف عائلي طارئ", status: "approved", requestedAt: "2026-07-29", approvedBy: "سالم الهاجري", steps: [{ level: 1, role: "SUPERVISOR", status: "approved", by: "سالم الهاجري", at: "2026-07-29T11:00:00" }] },
  { id: "lv-004", employeeId: "u-rp-06", type: "annual", fromDate: "2026-08-01", toDate: "2026-08-03", days: 3, reason: "إجازة سنوية", status: "rejected", requestedAt: "2026-07-25", steps: [{ level: 1, role: "SUPERVISOR", status: "rejected", by: "ماجد خالد الشمري", at: "2026-07-26T09:00:00", note: "لا يمكن التغيب أثناء فترة المتابعة" }] },
  { id: "lv-005", employeeId: "u-rp-01", type: "annual", fromDate: "2026-09-01", toDate: "2026-09-05", days: 5, reason: "إجازة سنوية", status: "pending", requestedAt: "2026-08-14", steps: [{ level: 1, role: "SUPERVISOR", status: "pending" }] },
];

export const notifications: Notification[] = [
  { id: "n-001", title: "طلب اعتماد جديد", description: "طلب خصم استثنائي من عبدالرحمن فهد الدوسري بانتظار موافقتك.", time: "2026-08-14T09:05:00", priority: "high", type: "approval", read: false, relatedPath: "/approvals/ap-001", recipientId: "u-sp-02" },
  { id: "n-002", title: "تجاوز حد ائتماني", description: "شركة الأفق للتجارة تجاوزت 90% من الحد الائتماني.", time: "2026-08-14T08:55:00", priority: "high", type: "credit", read: false, relatedPath: "/customers/c-002", recipientId: "u-sp-02" },
  { id: "n-003", title: "انخفاض مخزون", description: "منتج مسحوق غسيل 3 كجم وصل إلى مستوى إعادة الطلب في المستودع الرئيسي.", time: "2026-08-14T08:30:00", priority: "normal", type: "inventory", read: false, relatedPath: "/inventory/warehouse" },
  { id: "n-004", title: "طلب بضاعة جديد", description: "عبدالرحمن فهد الدوسري طلب بضاعة بقيمة 5,760 ر.س.", time: "2026-08-14T08:10:00", priority: "normal", type: "stock_request", read: false, relatedPath: "/inventory/requests", recipientId: "u-sp-02" },
  { id: "n-005", title: "طلب إجازة", description: "أحمد سامي الزهراني طلب إجازة سنوية 5 أيام.", time: "2026-08-14T07:50:00", priority: "normal", type: "leave", read: false, relatedPath: "/leaves", recipientId: "u-sp-01" },
  { id: "n-006", title: "تحويل مخزون معتمد", description: "تم اعتماد التحويل ST-2026-0093 من مستودع جدة.", time: "2026-08-13T16:30:00", priority: "normal", type: "inventory", read: true, relatedPath: "/inventory/transfers" },
  { id: "n-007", title: "تأخر تحصيل", description: "أسواق الخليج لم تسدد منذ 45 يوم — متأخرات 31,500 ر.س.", time: "2026-08-13T10:00:00", priority: "high", type: "collection", read: true, relatedPath: "/collections", recipientId: "u-sp-02" },
  { id: "n-008", title: "تعديل أرشيف", description: "تم تعديل مستند GRN-2025-0102 بعد اعتماد الإدارة.", time: "2026-08-10T15:35:00", priority: "normal", type: "archive", read: true, relatedPath: "/archive" },
  { id: "n-009", title: "مرتجع بانتظار الاعتماد", description: "مرتجع RET-2026-0113 من أحمد سامي الزهراني بانتظار مراجعتك.", time: "2026-08-13T09:00:00", priority: "normal", type: "return", read: false, relatedPath: "/returns", recipientId: "u-sp-01" },
  { id: "n-010", title: "خطة سير بانتظار الاعتماد", description: "خطة سير عبدالرحمن فهد الدوسري بانتظار اعتماد مدير المبيعات.", time: "2026-08-12T11:00:00", priority: "normal", type: "route", read: true, relatedPath: "/routes", recipientId: "u-sm-01" },
  { id: "n-011", title: "طلب بضاعة جاهز للتسليم", description: "تم تجهيز طلبك SRQ-2026-0062 — بانتظار الاستلام من المستودع.", time: "2026-08-14T13:15:00", priority: "high", type: "stock_request", read: false, relatedPath: "/rep/sync", recipientId: "u-rp-01" },
  { id: "n-012", title: "تحويل مخزون قيد النقل", description: "التحويل ST-2026-0096 في طريقه إليك — أكّد الاستلام عند الوصول.", time: "2026-08-14T12:40:00", priority: "normal", type: "inventory", read: false, relatedPath: "/inventory/transfers", recipientId: "u-rp-01" },
  { id: "n-013", title: "مزامنة فشلت", description: "فاتورة مبيعات INV-2026-0899 لم تُزامن — لا يوجد اتصال بالإنترنت.", time: "2026-08-14T12:50:00", priority: "high", type: "sync", read: false, relatedPath: "/rep/sync", recipientId: "u-rp-01" },
  { id: "n-014", title: "تجاوز حد ائتماني — مؤسسة النور", description: "رصيد مؤسسة النور 90% من الحد الائتماني — راجع الفواتير الآجلة قبل البيع.", time: "2026-08-14T09:10:00", priority: "high", type: "credit", read: false, relatedPath: "/customers/c-001", recipientId: "u-rp-01" },
  { id: "n-015", title: "اعتماد طلب الخصم", description: "تم اعتماد طلب الخصم الاستثنائي من المشرف — جاهز للمتابعة.", time: "2026-08-14T10:20:00", priority: "normal", type: "approval", read: false, relatedPath: "/approvals", recipientId: "u-rp-01" },
];

export const auditLogs: AuditLog[] = [
  { id: "log-001", actor: "خالد العتيبي", action: "approve", entity: "ApprovalRequest", entityId: "ap-008", at: "2026-08-10T15:35:00", oldValue: "submitted", newValue: "approved", reason: "اعتماد تعديل الأرشيف مع التدقيق" },
  { id: "log-002", actor: "فهد المطيري", action: "approve", entity: "PriceList", entityId: "pl-03", at: "2026-08-09T10:00:00", oldValue: "draft", newValue: "under_review", reason: "تقديم قائمة عروض الصيف" },
  { id: "log-003", actor: "سالم الهاجري", action: "update", entity: "Customer", entityId: "c-024", at: "2026-08-09T09:30:00", oldValue: "rep: u-rp-02", newValue: "rep: u-rp-01", reason: "تحويل العميل إلى مندوب جديد" },
  { id: "log-004", actor: "ناصر القحطاني", action: "create", entity: "RoutePlan", entityId: "rp-003", at: "2026-08-08T14:00:00", oldValue: "-", newValue: "خطة سير شهرية" },
  { id: "log-005", actor: "أمين المستودع", action: "adjust", entity: "StockItem", entityId: "p-015", at: "2026-08-12T10:15:00", oldValue: "available: 658", newValue: "available: 640", reason: "فرق جرد — كسر" },
  { id: "log-006", actor: "المحاسب", action: "update", entity: "ArchiveRecord", entityId: "ar-001", at: "2026-08-10T11:00:00", oldValue: "version: 2", newValue: "version: 3", reason: "تصحيح كمية الاستلام" },
  { id: "log-007", actor: "ماجد خالد الشمري", action: "reject", entity: "LeaveRequest", entityId: "lv-004", at: "2026-07-26T09:00:00", oldValue: "pending", newValue: "rejected", reason: "لا يمكن التغيب أثناء المتابعة" },
  { id: "log-008", actor: "فهد المطيري", action: "update", entity: "CreditLimit", entityId: "c-002", at: "2026-08-08T12:00:00", oldValue: "80,000", newValue: "100,000 (مؤقت)", reason: "تجاوز ائتماني معتمد" },
];

export const userMessages = (userId: string) => conversations.filter((c) => c.participants.includes(userId));