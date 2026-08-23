import type { Conversation, Message } from "@/types";

/**
 * Messaging mock data — realistic conversations linked to the existing user hierarchy.
 *
 * Hierarchy:
 *   GM (u-gm-01, u-gm-02)
 *     └─ Sales Manager (u-sm-01)
 *          ├─ Supervisor (u-sp-01) → u-rp-01, u-rp-02, u-rp-07
 *          ├─ Supervisor (u-sp-02) → u-rp-03, u-rp-04
 *          └─ Supervisor (u-sp-03) → u-rp-05, u-rp-06
 *     └─ Distribution Officer (u-do-01)
 *     └─ Finance (u-acc-01, u-fn-01)
 *     └─ Warehouse (u-wh-01)
 */

// ---------------------------------------------------------------------------
// Direct Conversations (1:1 or small group)
// ---------------------------------------------------------------------------

export const messagingConversations: Conversation[] = [
  // --- Ahmed (rp-01) ↔ Supervisor Salem (sp-01) ---
  {
    id: "mc-001",
    subject: "تعليمات الجولة اليوم",
    participants: ["u-sp-01", "u-rp-01"],
    lastMessageAt: "2026-08-14T10:30:00",
    type: "direct",
    createdBy: "u-sp-01",
    readBy: ["u-sp-01", "u-rp-01"],
    messages: [
      { id: "mm-001", conversationId: "mc-001", senderId: "u-sp-01", body: "أحمد، يرجى التركيز على العملاء المتأخرين في الزيارة رقم 3 و 5. المستهدف اليوم 5,000 ر.س.", sentAt: "2026-08-14T07:30:00", attachments: [], read: true, readAt: "2026-08-14T07:32:00", priority: "high", msgType: "direct" },
      { id: "mm-002", conversationId: "mc-001", senderId: "u-rp-01", body: "فهمت، سأبدأ بالعميل المتأخر أولاً. بخصوص العميل رقم 5، المحل مغلق عادة في الصباح.", sentAt: "2026-08-14T07:35:00", attachments: [], read: true, readAt: "2026-08-14T07:36:00", priority: "normal", msgType: "direct" },
      { id: "mm-003", conversationId: "mc-001", senderId: "u-sp-01", body: "ممتاز. تأكد من تسجيل الزيارة في النظام بعد كل عميل.", sentAt: "2026-08-14T07:40:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-004", conversationId: "mc-001", senderId: "u-rp-01", body: "تم، سجلت أول زيارتين. مبيعات: 2,800 ر.س حتى الآن.", sentAt: "2026-08-14T09:15:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-005", conversationId: "mc-001", senderId: "u-sp-01", body: "أحسنت. واصل بنفس الوتيرة. أحتاج تقريرك قبل 2 ظهراً.", sentAt: "2026-08-14T10:30:00", attachments: [], read: false, priority: "normal", msgType: "direct" },
    ],
  },
  // --- Ahmed (rp-01) ↔ Supervisor Salem (sp-01) — stock request ---
  {
    id: "mc-002",
    subject: "طلب بضاعة — مخزون منخفض",
    participants: ["u-sp-01", "u-rp-01", "u-wh-01"],
    lastMessageAt: "2026-08-14T08:50:00",
    type: "group",
    createdBy: "u-rp-01",
    readBy: ["u-rp-01", "u-wh-01"],
    messages: [
      { id: "mm-006", conversationId: "mc-002", senderId: "u-rp-01", body: "مخزون المياه في السيارة قارب على النفاد، أحتاج 144 كرتوناً.", sentAt: "2026-08-14T08:30:00", attachments: [], read: true, priority: "high", msgType: "direct" },
      { id: "mm-007", conversationId: "mc-002", senderId: "u-wh-01", body: "تم تجهيز الطلب SRQ-2026-0071، جاهز للتحميل الساعة 10 صباحاً.", sentAt: "2026-08-14T08:45:00", attachments: ["SRQ-2026-0071.pdf"], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-008", conversationId: "mc-002", senderId: "u-sp-01", body: "تمام، يرجى الاستلام والتاكيد.", sentAt: "2026-08-14T08:50:00", attachments: [], read: false, priority: "normal", msgType: "direct" },
    ],
  },
  // --- Mohamed (rp-02) ↔ Supervisor Salem (sp-01) ---
  {
    id: "mc-003",
    subject: "متابعة أداء يوم أمس",
    participants: ["u-sp-01", "u-rp-02"],
    lastMessageAt: "2026-08-13T18:30:00",
    type: "direct",
    createdBy: "u-sp-01",
    readBy: ["u-sp-01", "u-rp-02"],
    messages: [
      { id: "mm-009", conversationId: "mc-003", senderId: "u-rp-02", body: "تقرير نهاية اليوم: مبيعات 4,200 ر.س، تحصيل 3,800 ر.س، زيارات 6/7.", sentAt: "2026-08-13T18:00:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-010", conversationId: "mc-003", senderId: "u-sp-01", body: "أداء جيد. العميل الذي لم تزره، لماذا؟", sentAt: "2026-08-13T18:15:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-011", conversationId: "mc-003", senderId: "u-rp-02", body: "العميل كان مغلقاً. سأحاول مرة أخرى غداً صباحاً.", sentAt: "2026-08-13T18:20:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-012", conversationId: "mc-003", senderId: "u-sp-01", body: "موافق. حاول الذهاب في الصباح الباكر.", sentAt: "2026-08-13T18:30:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
    ],
  },
  // --- Abdalrahman (rp-03) ↔ Supervisor Nasser (sp-02) — collection ---
  {
    id: "mc-004",
    subject: "متابعة تحصيل أسواق الخليج",
    participants: ["u-sm-01", "u-sp-02", "u-rp-03"],
    lastMessageAt: "2026-08-14T09:20:00",
    type: "group",
    createdBy: "u-sp-02",
    readBy: ["u-sp-02", "u-rp-03"],
    messages: [
      { id: "mm-013", conversationId: "mc-004", senderId: "u-rp-03", body: "العميل وعد بالسداد يوم الأحد، سأتابع الزيارة غداً.", sentAt: "2026-08-14T09:20:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-014", conversationId: "mc-004", senderId: "u-sp-02", body: "تمام، أحتاج تقريراً بالمبلغ المستحق قبل نهاية الأسبوع.", sentAt: "2026-08-13T15:10:00", attachments: [], read: true, priority: "high", msgType: "direct" },
      { id: "mm-015", conversationId: "mc-004", senderId: "u-sm-01", body: "الحد الائتماني للعميل مرفوع مؤقتاً، يُرجى المتابعة بحرص.", sentAt: "2026-08-13T15:40:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
    ],
  },
  // --- Yousef (rp-04) ↔ Supervisor Nasser (sp-02) ---
  {
    id: "mc-005",
    subject: "تعديل خطة الزيارات",
    participants: ["u-sp-02", "u-rp-04"],
    lastMessageAt: "2026-08-14T10:00:00",
    type: "direct",
    createdBy: "u-sp-02",
    readBy: ["u-sp-02", "u-rp-04"],
    messages: [
      { id: "mm-016", conversationId: "mc-005", senderId: "u-sp-02", body: "يוסף، تم إضافة عميل جديد (مؤسسة النخبة) في الزيارة رقم 9. يرجى المرور عليه بعد العميل رقم 8.", sentAt: "2026-08-14T09:45:00", attachments: [], read: true, priority: "high", msgType: "direct" },
      { id: "mm-017", conversationId: "mc-005", senderId: "u-rp-04", body: "تمام، هل لديه طلبات محددة؟", sentAt: "2026-08-14T09:50:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-018", conversationId: "mc-005", senderId: "u-sp-02", body: "نعم، يطلب عرض أسعار لـ 3 منتجات. أرفقت التفاصيل.", sentAt: "2026-08-14T10:00:00", attachments: ["عرض_النخبة.pdf"], read: false, priority: "high", msgType: "direct" },
    ],
  },
  // --- Saad (rp-05) ↔ Supervisor Majed (sp-03) ---
  {
    id: "mc-006",
    subject: "تقرير نهاية اليوم",
    participants: ["u-sp-03", "u-rp-05"],
    lastMessageAt: "2026-08-13T18:00:00",
    type: "direct",
    createdBy: "u-rp-05",
    readBy: ["u-sp-03", "u-rp-05"],
    messages: [
      { id: "mm-019", conversationId: "mc-006", senderId: "u-rp-05", body: "تقرير اليوم: مبيعات 3,500 ر.س، تحصيل 2,900 ر.س. لا يوجد متأخرات جديدة.", sentAt: "2026-08-13T17:45:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-020", conversationId: "mc-006", senderId: "u-sp-03", body: "ممتاز. لا تنسَ زيارة مؤسسة النور غداً صباحاً.", sentAt: "2026-08-13T18:00:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
    ],
  },
  // --- Supervisor Salem (sp-01) ↔ Sales Manager (sm-01) ---
  {
    id: "mc-007",
    subject: "أداء الفريق — تقرير أسبوعي",
    participants: ["u-sm-01", "u-sp-01"],
    lastMessageAt: "2026-08-14T08:00:00",
    type: "direct",
    createdBy: "u-sp-01",
    readBy: ["u-sm-01", "u-sp-01"],
    messages: [
      { id: "mm-021", conversationId: "mc-007", senderId: "u-sp-01", body: "تقرير الأسبوع: إجمالي المبيعات 48,500 ر.س (87% من المستهدف). أحمد سامي الزهراني الأعلى أداءاً.", sentAt: "2026-08-14T07:30:00", attachments: ["تقرير_الأسبوع.pdf"], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-022", conversationId: "mc-007", senderId: "u-sm-01", body: "أحسنت. ما هي أبرز التحديات؟", sentAt: "2026-08-14T07:45:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-023", conversationId: "mc-007", senderId: "u-sp-01", body: "تأخر تحصيل من 3 عملاء. سأتابعها اليوم.", sentAt: "2026-08-14T08:00:00", attachments: [], read: false, priority: "high", msgType: "direct" },
    ],
  },
  // --- Ahmed (rp-01) ↔ Sales Manager (sm-01) — pricing ---
  {
    id: "mc-008",
    subject: "عرض أسعار — عميل مستهدف",
    participants: ["u-rp-01", "u-sp-01", "u-sm-01"],
    lastMessageAt: "2026-08-14T13:00:00",
    type: "group",
    createdBy: "u-rp-01",
    readBy: ["u-rp-01", "u-sm-01"],
    messages: [
      { id: "mm-024", conversationId: "mc-008", senderId: "u-rp-01", body: "قدمت عرض أسعار لشركة المستقبل، طلبوا شروط دفع 45 يوم.", sentAt: "2026-08-14T12:45:00", attachments: ["عرض_أسعار_المستقبل.pdf"], read: true, priority: "high", msgType: "direct" },
      { id: "mm-025", conversationId: "mc-008", senderId: "u-sm-01", body: "شروط الدفع تتجاوز السياسة المعتادة. سنناقش الأمر في الاجتماع.", sentAt: "2026-08-14T13:00:00", attachments: [], read: false, priority: "normal", msgType: "direct" },
    ],
  },
  // --- Financial (acc-01) ↔ GM (gm-01) — archive ---
  {
    id: "mc-009",
    subject: "تعديل أرشيف GRN-2025-0102",
    participants: ["u-acc-01", "u-gm-01", "u-sm-01"],
    lastMessageAt: "2026-08-10T16:00:00",
    type: "group",
    createdBy: "u-acc-01",
    readBy: ["u-acc-01", "u-gm-01", "u-sm-01"],
    messages: [
      { id: "mm-026", conversationId: "mc-009", senderId: "u-acc-01", body: "تم اكتشاف خطأ في كمية الاستلام، المطلوب تعديل السجل.", sentAt: "2026-08-10T10:00:00", attachments: ["خطأ_الكمية.png"], read: true, priority: "high", msgType: "direct" },
      { id: "mm-027", conversationId: "mc-009", senderId: "u-gm-01", body: "تم اعتماد التعديل مع تدقيق مالي كامل.", sentAt: "2026-08-10T15:30:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
    ],
  },
  // --- Saad (rp-05) ↔ Supervisor Majed (sp-03) ↔ GM (gm-01) — leave ---
  {
    id: "mc-010",
    subject: "إجازة سعد الغامدي",
    participants: ["u-rp-05", "u-sp-03", "u-gm-01"],
    lastMessageAt: "2026-08-13T12:30:00",
    type: "group",
    createdBy: "u-rp-05",
    readBy: ["u-rp-05", "u-sp-03"],
    messages: [
      { id: "mm-028", conversationId: "mc-010", senderId: "u-rp-05", body: "طلب إجازة سنوية 5 أيام، تم تسليم المهام لبندر مؤقتاً.", sentAt: "2026-08-13T12:00:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-029", conversationId: "mc-010", senderId: "u-sp-03", body: "موافق على طلب الإجازة، جارٍ اعتمادها.", sentAt: "2026-08-13T12:30:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
    ],
  },
  // --- Distribution Officer (do-01) ↔ Sales Manager (sm-01) ---
  {
    id: "mc-011",
    subject: "تنسيق التوزيع — جدة",
    participants: ["u-do-01", "u-sm-01"],
    lastMessageAt: "2026-08-14T07:00:00",
    type: "direct",
    createdBy: "u-do-01",
    readBy: ["u-do-01", "u-sm-01"],
    messages: [
      { id: "mm-030", conversationId: "mc-011", senderId: "u-do-01", body: "تم توزيع 85% من طلبات جدة._remaining 12 طلب بانتظار التأكيد.", sentAt: "2026-08-14T06:45:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
      { id: "mm-031", conversationId: "mc-011", senderId: "u-sm-01", body: "ممتاز. تأكد من وصول البضاعة قبل 10 صباحاً.", sentAt: "2026-08-14T07:00:00", attachments: [], read: false, priority: "normal", msgType: "direct" },
    ],
  },
  // --- Talal (rp-07) ↔ Supervisor Salem (sp-01) ---
  {
    id: "mc-012",
    subject: "تعليمات اليوم — المنطقة الشرقية",
    participants: ["u-sp-01", "u-rp-07"],
    lastMessageAt: "2026-08-14T07:15:00",
    type: "direct",
    createdBy: "u-sp-01",
    readBy: ["u-sp-01", "u-rp-07"],
    messages: [
      { id: "mm-032", conversationId: "mc-012", senderId: "u-sp-01", body: "طلال، اليوم تغطي المنطقة الشرقية. راجع خطة السير المرفقة.", sentAt: "2026-08-14T07:00:00", attachments: ["خطة_الشرقية.pdf"], read: true, priority: "high", msgType: "direct" },
      { id: "mm-033", conversationId: "mc-012", senderId: "u-rp-07", body: "تمام، سأبدأ من مؤسسة النور.", sentAt: "2026-08-14T07:15:00", attachments: [], read: true, priority: "normal", msgType: "direct" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Broadcasts (announcements)
// ---------------------------------------------------------------------------

export const broadcasts: Conversation[] = [
  // --- Sales Manager → All Reps: discount policy ---
  {
    id: "bc-001",
    subject: "تحديث سياسة الخصم الجديدة",
    participants: ["u-sm-01", "u-sp-01", "u-sp-02", "u-sp-03", "u-rp-01", "u-rp-02", "u-rp-03", "u-rp-04", "u-rp-05", "u-rp-07"],
    lastMessageAt: "2026-08-13T15:00:00",
    type: "broadcast",
    createdBy: "u-sm-01",
    readBy: ["u-sm-01", "u-sp-01", "u-rp-01", "u-rp-02", "u-rp-05"],
    audienceLabel: "جميع المناديب والمشرفين",
    audienceType: "all_reps",
    messages: [
      { id: "bm-001", conversationId: "bc-001", senderId: "u-sm-01", body: "اعتباراً من الغد، الحد الأقصى للخصم دون اعتماد يصبح 3% بدلاً من 5%. أي خصم يتجاوز 3% يحتاج اعتماد المشرف. الخصم الاستثنائي يبقى بموافقة مدير المبيعات.", sentAt: "2026-08-13T15:00:00", attachments: ["سياسة_الخصم_الجديد.pdf"], read: true, readAt: "2026-08-13T15:05:00", priority: "high", msgType: "broadcast" },
    ],
  },
  // --- GM → All: new working hours ---
  {
    id: "bc-002",
    subject: "ساعات العمل الرسمية — تحديث",
    participants: ["u-gm-01", "u-sm-01", "u-sp-01", "u-sp-02", "u-sp-03", "u-rp-01", "u-rp-02", "u-rp-03", "u-rp-04", "u-rp-05", "u-rp-07", "u-do-01", "u-acc-01", "u-wh-01"],
    lastMessageAt: "2026-08-12T09:00:00",
    type: "broadcast",
    createdBy: "u-gm-01",
    readBy: ["u-gm-01", "u-sm-01", "u-sp-01", "u-sp-02", "u-sp-03"],
    audienceLabel: "جميع الموظفين",
    audienceType: "all_reps",
    messages: [
      { id: "bm-002", conversationId: "bc-002", senderId: "u-gm-01", body: "ساعات العمل الرسمية ابتداءً من الأحد: 7:30 صباحاً - 4:30 مساءً.Duration خارج هذه الفترة يُسجل كعمل إضافي وتحتاج اعتماد.", sentAt: "2026-08-12T09:00:00", attachments: ["ساعات_العمل.pdf"], read: true, priority: "high", msgType: "broadcast" },
    ],
  },
  // --- Supervisor Salem → His team: weekly meeting ---
  {
    id: "bc-003",
    subject: "اجتماع الفريق الأسبوعي",
    participants: ["u-sp-01", "u-rp-01", "u-rp-02", "u-rp-07"],
    lastMessageAt: "2026-08-14T06:30:00",
    type: "broadcast",
    createdBy: "u-sp-01",
    readBy: ["u-sp-01", "u-rp-01", "u-rp-07"],
    audienceLabel: "فريق الرياض الشمالي",
    audienceType: "team",
    messages: [
      { id: "bm-003", conversationId: "bc-003", senderId: "u-sp-01", body: "اجتماع الفريق الأسبوعي يوم الأحد الساعة 9 صباحاً. يرجى إحضار تقارير الأداء الأسبوعية.", sentAt: "2026-08-14T06:30:00", attachments: [], read: true, priority: "normal", msgType: "broadcast" },
    ],
  },
  // --- Supervisor Nasser → His team: target reminder ---
  {
    id: "bc-004",
    subject: "تذكير — الأهداف الشهرية",
    participants: ["u-sp-02", "u-rp-03", "u-rp-04"],
    lastMessageAt: "2026-08-13T08:00:00",
    type: "broadcast",
    createdBy: "u-sp-02",
    readBy: ["u-sp-02", "u-rp-03", "u-rp-04"],
    audienceLabel: "فريق الرياض الجنوبي",
    audienceType: "team",
    messages: [
      { id: "bm-004", conversationId: "bc-004", senderId: "u-sp-02", body: "تذكير: نحن في منتصف الشهر. الأهداف الشهرية: المبيعات 120,000 ر.س، التحصيل 95,000 ر.س. الحالية: 68%. يرجى التكاتف في الأيام المتبقية.", sentAt: "2026-08-13T08:00:00", attachments: [], read: true, priority: "high", msgType: "broadcast" },
    ],
  },
];

// ---------------------------------------------------------------------------
// All conversations combined
// ---------------------------------------------------------------------------

export const allConversations: Conversation[] = [...messagingConversations, ...broadcasts];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all conversations (direct + broadcast) a user participates in */
export const userConversations = (userId: string): Conversation[] =>
  allConversations.filter((c) => c.participants.includes(userId));

/** Get direct conversations only (non-broadcast) */
export const userDirectConversations = (userId: string): Conversation[] =>
  messagingConversations.filter((c) => c.participants.includes(userId));

/** Get broadcasts only */
export const userBroadcasts = (userId: string): Conversation[] =>
  broadcasts.filter((c) => c.participants.includes(userId));

/** Count unread messages in a conversation for a user */
export const unreadCount = (conversation: Conversation, userId: string): number => {
  if (!conversation.messages.length) return 0;
  const lastMsg = conversation.messages[conversation.messages.length - 1];
  if (lastMsg.senderId === userId) return 0;
  if (conversation.readBy?.includes(userId)) return 0;
  return 1;
};

/** Total unread across all conversations */
export const totalUnread = (userId: string): number =>
  userConversations(userId).reduce((sum, c) => sum + unreadCount(c, userId), 0);
