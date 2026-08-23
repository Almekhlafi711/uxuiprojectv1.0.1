/**
 * @deprecated — Unified Chat
 * تم توحيد الدردشة: كل الأدوار تستخدم الآن src/modules/messages/MessagesPage.tsx
 * مع فلترة صلاحيات عبر messages.service (getAccessibleRecipients + canCreateBroadcast).
 * هذا الملف يُبقي توافقاً خلفياً فقط ويُعيد التصدير الموحد.
 */
export { MessagesPage } from "@/modules/messages/MessagesPage";
export { MessagesPage as default } from "@/modules/messages/MessagesPage";
