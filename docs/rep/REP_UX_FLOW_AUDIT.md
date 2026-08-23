# REP UX Flow Audit (RFD §28)

Measures unnecessary clicks / re-typing / navigation for the rep's real-day flow. Sources: actual `rep/*` + `sales/*` + `collections/*` + `returns/*` components and `repNavigation.ts`.

## 1) Current UX friction points (verified in code)

| # | Friction | حيث | التأثير |
|---|---|---|---|
| U1 | من قائمة العملاء لا يوجد زر "بدء زيارة" مباشر من صفحة العميل — يلزم العودة للخطة أو كتابة مسار الزيارة يدوياً. | `rep/CustomersPage` | +1-2 clicks |
| U2 | البيع داخل VisitWorkspace لا يمرّر العميل تلقائياً إلى NewSalePage — يتم اختيار العميل من جديد. | `VisitWorkspace → /sales/new` | إعادة إدخال |
| U3 | التحصيل من Customer 360 لا يمرّر العميل تلقائياً. | `CustomersPage` detail | إعادة إدخال |
| U4 | بعد إنهاء الزيارة يلزم العودة يدوياً للخطة. | `VisitWorkspace` | +1 click |
| U5 | طلب بضاعة والتحويل منفصلان عن صفحة المخزون. | `rep/StockRequestsPage` vs `rep/VanInventoryPage` | تنقل إضافي |
| U6 | Dashboard KPIs كثيرة (8 بطاقات) تُشتت التركيز — RFD يطلب التقليل. | `rep/DashboardPage` | تشتيت بصري |

## 2) Expected rep flows (RFD §28 examples) — الحالة الفعلية

- من **Customer 360** → [بدء زيارة] / [بيع] / [تحصيل] / [عرض الرصيد]؟
  - الكود: Customer360 يعرض `Breadcrumbs` + `actions={[<Button> ملف العميل...</Button>]}` — **ليس** الأزرار المطلوبة. يبقي على المستخدم البحث عن /sales أو /collections. → **Gap تجريبي**.
- من **Visit** → [بيع] / [تحصيل] / [ملاحظة]؟
  - VisitWorkspace يحتوي زر بيع/تحصيل/ملاحظة داخل الواجهة ✅ (موجود جزئياً).
- من **Dashboard** → [بيع جديد] / [تحصيل] / [الجولة] / [طلب بضاعة]؟
  - DashboardPage quickActions = exactly these 4 ✅.

## 3) توصيات تحسين (بدون تغيير business)
- Dمج: إضافة زرّين "بدء زيارة" و "بيع" و "تحصيل" مباشرة في صفحة العميل 360 (scoped, same permissions).
- تمرير `customerId` كـ`state` أو query param عبر الـrouter عند الانتقال Visit→Sale أو Customer→Collection لتعبئة العميل تلقائياً.
- تقليل Dashboard KPIs: دمج "الأربعة فوق" في بطاقة واحدة "يومي" بمؤشرات مرئية، والإبقاء على quick-actions.
- دمج "طلب بضاعة" كزر إضافي داخل صفحة المخزون (Van) بدلاً من البحث في التنقل.

## 4) الاستنتاج
- الـUX الأساسي يعمل لكنه يحتاج **ربطاً سياقياً بين الصفحات** (customer→sale/collection/visit context prefill) — Gap تجريبي MEDIUM، لا يحتاج Permissions جديدة.
