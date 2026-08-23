# تقرير إعادة تنظيم التنقل — Representative Workspace

التاريخ: 2026-08-18 · النطاق: صفحة المندوب فقط (REPRESENTATIVE)

## 1. فحص الحالة الحالية

### المشكلة الجذرية
الـ Sidebar الحالي يعرض **15 عنصرًا مسطحًا** تحت قسم «ميدان المندوب» لكل صفحات `/rep/*`،
بالإضافة إلى **5 صفحات عامة** (المبيعات والتحصيل والمرتجعات والعملاء والمنتجات) من الأقسام العامة.
النتيجة: Sidebar طويل، وتكرار (عميل = `/rep/customers` + `/customers`)، ولا يوجد Top Navigation.

### الجرد الحالي — صفحة المندوب

| المسار | الصفحة | الحالة |
|--------|--------|--------|
| `/rep/dashboard` | لوحة المندوب (rep/DashboardPage) | موجود |
| `/rep/plan` | خطة اليوم والجولة (DailyPlanPage) | موجود |
| `/rep/customers` | عملائي (CustomersPage) | موجود |
| `/rep/customer/:id` | 360 عميل (Customer360Page) | موجود |
| `/rep/van` | مخزون السيارة (VanInventoryPage) | موجود |
| `/rep/stock-requests` | طلبات التموين (StockRequestsPage) | موجود |
| `/rep/stock-transfers` | تحويلات المخزون (StockTransfersPage) | موجود |
| `/rep/receiving` | استلام التحويلات (ReceivingPage) | موجود |
| `/rep/loading` | استلام البضاعة (LoadingPage) | موجود |
| `/rep/gps` | GPS المندوب (RepGpsPage) | موجود |
| `/rep/closing` | إقفال اليوم (DailyClosingPage) | موجود |
| `/rep/sync` | مركز المزامنة (SyncCenterPage) | موجود |
| `/rep/custody` | عهدتي (CustodyPage) | موجود |
| `/rep/reports` | تقاريري (ReportsPage) | موجود |
| `/rep/messages` | مراسلاتي (MessagesPage) | موجود |
| `/rep/targets-org` | المؤسسات المستهدفة (TargetOrganizationsPage) | موجود |
| `/rep/visit/:customerId` | مساحة الزيارة (VisitWorkspace) | موجود |
| `/rep/products` | المنتجات (ProductsPage rep) | **غير مربوط** |
| `/rep/cash` | صندوق التحصيل (CashBoxPage rep) | **غير مربوط** |
| `/sales`, `/collections`, `/returns` | صفحات عامة نطاقية | مستخدمة من المندوب |

## 2. التصنيف

| التصنيف | العناصر |
|---------|---------|
| **Duplicate Pages** | `RepDashboard` (عام) مقابل `rep/DashboardPage` — لوحتان مختلفتان لنفس الدور |
| **Duplicate Routes** | `/customers` (عام) مقابل `/rep/customers` — نفس الدور يصل لكلاهما |
| **Legacy Routes** | `/rep/products`، `/rep/cash` (معرّفة الصفحة بلا Route) |
| **Unrouted Pages** | `CashBoxPage`، `ProductsPage` (rep) — غير قابلة للوصول |
| **Role-specific** | كل `/rep/*` |
| **Shared** | `/sales`, `/collections`, `/returns`, `/visits`, `/archive`, `/leaves` (مشتركة بين الأدوار مع DataScope) |

## 3. التصميم الجديد

### Sidebar = Modules فقط (7 وحدات)
1. الرئيسية → `/rep/dashboard`
2. البيع والتوزيع
3. الميدان
4. المخزون والمالية
5. العملاء المستهدفون
6. الإدارة
7. التقارير

### Top Navigation = Sub-modules (ثابت/Sticky أعلى المحتوى)

| Module | Sub-modules |
|--------|-------------|
| البيع والتوزيع | العملاء، المنتجات والأسعار، المبيعات، التحصيل، المرتجعات |
| الميدان | خطة اليوم والجولة، الزيارات، GPS / موقعي |
| المخزون والمالية | مخزوني/السيارة، طلبات البضاعة، تحويلات المخزون، الصندوق والتسويات، إقفال اليوم، استلام البضاعة، استلام التحويلات |
| العملاء المستهدفون | المؤسسات المستهدفة |
| الإدارة | العهد والأصول، الأرشيف، المراسلات، الإجازات، مركز المزامنة |
| التقارير | تقاريري |

## 4. قرارات الدمج والإبقاء

| العنصر | القرار | السبب |
|--------|--------|-------|
| `/rep/dashboard` | **إبقاء** — الرئيسية | هو لوحة المندوب |
| `/rep/customers` | **إبقاء** — تحت «البيع والتوزيع» → العملاء | نطاق المندوب |
| `/rep/products` | **ربط Route** — تحت «البيع والتوزيع» → المنتجات والأسعار | إصلاح Legacy |
| `/sales` (عام) | **إبقاء** — تحت «البيع والتوزيع» → المبيعات | Shared + DataScope |
| `/collections` (عام) | **إبقاء** — تحت «البيع والتوزيع» → التحصيل | Shared + DataScope |
| `/returns` (عام) | **إبقاء** — تحت «البيع والتوزيع» → المرتجعات | Shared + DataScope |
| `/rep/plan` | **إبقاء** — تحت «الميدان» → خطة اليوم | موجود |
| `/visits` (عام) | **إبقاء** — تحت «الميدان» → الزيارات | Shared + DataScope |
| `/rep/gps` | **إبقاء** — تحت «الميدان» → GPS/موقعي | موجود |
| `/rep/van` | **إبقاء** — تحت «المخزون والمالية» → مخزوني/السيارة | موجود |
| `/rep/stock-requests` | **إبقاء** — تحت «المخزون والمالية» → طلبات البضاعة | موجود |
| `/rep/stock-transfers` | **إبقاء** — تحت «المخزون والمالية» → تحويلات المخزون | موجود |
| `/rep/cash` | **ربط Route** — تحت «المخزون والمالية» → الصندوق والتسويات | إصلاح Legacy |
| `/rep/closing` | **إبقاء** — تحت «المخزون والمالية» → إقفال اليوم | موجود |
| `/rep/loading` | **إبقاء** — تحت «المخزون والمالية» → استلام البضاعة | موجود |
| `/rep/receiving` | **إبقاء** — تحت «المخزون والمالية» → استلام التحويلات | موجود |
| `/rep/targets-org` | **إبقاء** — تحت «العملاء المستهدفون» | موجود |
| `/rep/custody` | **إبقاء** — تحت «الإدارة» → العهد والأصول | موجود |
| `/archive` (عام) | **إبقاء** — تحت «الإدارة» → الأرشيف | Shared |
| `/rep/messages` | **إبقاء** — تحت «الإدارة» → المراسلات | موجود |
| `/leaves` (عام) | **إبقاء** — تحت «الإدارة» → الإجازات | Shared |
| `/rep/sync` | **إبقاء** — تحت «الإدارة» → مركز المزامنة | موجود |
| `/rep/reports` | **إبقاء** — تحت «التقارير» → تقاريري | موجود |
| `/dashboard` (RepDashboard عام) | **إبطال** للمندوب — يوجه إلى `/rep/dashboard` | إزالة الازدواج |

### ملاحظة: سؤال مفتوح — المبيعات/التحصيل/المرتجعات
المندوب لا يملك صفحات مخصصة (`/rep/sales` غير موجودة). القرار: استخدام الصفحات **العامة**
نفسها (`/sales`, `/collections`, `/returns`) لأنها **محدودة النطاق** للمندوب عبر `canAccessInvoice`
و`canAccessCollection` و`canAccessReturn` (DataScope = self). لا إنشاء صفحات مكررة (وفق القاعدة 8/9).

## 5. الحماية (Authorization × 3 طبقات)
- **Route:** `PermissionRoute` موجود لكل المسارات.
- **View:** الـ Sidebar/TopNav تفلتر بـ `can(permission)`.
- **Data Access:** جميع الصفحات العامة مقيدة بنطاق `getDataScope` (self للمندوب).

## 6. ما سيُطبَّق (Implementation)
1. `src/config/repNavigation.ts` — هيكل Modules/Sub-modules جديد.
2. `Sidebar.tsx` — عند دور REPRESENTATIVE يعرض 7 Modules فقط.
3. `TopNav.tsx` — شريط Sub-modules ثابت (Sticky) أعلى المحتوى.
4. `AppLayout/index.tsx` — إدراج TopNav.
5. `App.tsx` — ربط `/rep/products` و `/rep/cash`؛ تعديل Dispatcher (`/dashboard` → `/rep/dashboard` للمندوب).
6. `components.css` — أنماط TopNav (Sticky, RTL, overflow-x داخلي فقط).