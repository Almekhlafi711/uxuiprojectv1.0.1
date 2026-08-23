# SUPERVISOR FUNCTIONAL + RBAC + DATA SCOPE AUDIT

**Enterprise Sales & Distribution ERP — Field Operations Supervisor Module**
إصدار المرحلة: قبل التنفيذ | تاريخ الفحص: 2026-08-16 | الأساس المرجعي: «وثيقة التحليل المرجعية — وظائف المشرف ونطاقه التشغيلي v0.1» (SUP-01 → SUP-24)

> قاعدة الاشتغال: المشرف **مدير تشغيل ميداني لفريق**، وليس Administrator ولا Sales Manager ولا General Manager. النطاق = `SUPERVISOR → TEAM`. لا يوجد «اعرض ثم اخفِ» — الحماية على طبقة الخدمة (mockApi/scope).

---

## 1. ملخص الحالة الحالية

| البند | الحالة |
|---|---|
| دور `SUPERVISOR` في النظام | موجود (users: u-sp-01/02/03) ومفعّل في `rolePermissions` |
| Data Scope `team` في `src/services/scope.ts` | موجود (visibleRepIds, canAccessCustomer/Invoice/Visit/…Gps/Target/Custody/Leave) |
| صفحة Dashboard مشرف | موجودة (`modules/dashboard/SupervisorDashboard.tsx`) لكنها تقرأ `@/mock/*` مباشرة وتفلتر في الواجهة، بدون خدمات، وبلا Quick Actions Sticky، وبلا سطر «Pending Workflows» كامل |
| مسارات `/supervisor/*` | **غير موجودة** (لا توجد أي صفحة قائمة بذاتها للمشرف) |
| قائمة جانبية خاصة بالمشرف | **غير موجودة** (المشرف يرى القوائم العامة نفسها + قسم «ميدان المندوب» بشكل خاطئ) |
| صلاحيات `SUPERVISOR` في permissions.ts | أوسع من نطاق الوثيقة (customers.create/edit، صلاحيات المندوب، archive.view عام، cash.settle عام) |
| إعدادات قابلة للتهيئة (supervisorWarehouse/cash/teamSize/transferPolicy/assetApprovalWorkflow) | **غير موجودة** — تُثبَّت قيم في الكود حاليًا |
| الوحدات الاختيارية (مخزون المشرف، صندوق المشرف) | غير مُدارة عبر Config؛ يظهر قسم المخزون والصناديق دائمًا |
| العهدة/الأصول: طلب أصل من المشرف | غير موجود (لا توجد طلبات أصول، ولا مسار Sales Manager Approval) |
| مراجعة `TargetOrganization` من المشرف | **غير موجودة** (المندوب يرفع `under_review` ولا يوجد من يوافق) |
| مراجعة الخطط اليومية / الإقفالات / الجرد / الإيداعات | غير موجودة (أنواع البيانات جاهزة في types + mock، بلا واجهة مشرف) |
| تقارير وأداء الفريق | موجود جزئيًا عبر صفحات عامة scope-aware (Targets/Reports/VanInventory/Gps) |
| عزل بيانات المشرف (المشرف «أ» لا يرى «ب») | جزئي — ثغرات في StockTransfer/StockMovement/CashBox/Archive/Audit/rep.* |

---

## 2. فحص الوظائف SUP-01 → SUP-24

| ID | الوظيفة | الحالة الحالية | المطلوب | الثغرات | الإصلاح المطلوب |
|---|---|---|---|---|---|
| SUP-01 | إدارة فريق المناديب | لا توجد صفحة «فريقي»؛ المناديب تُعرض في صفحات عامة | صفحة `/supervisor/team` تظهر مناديب المشرف فقط | - | صفحة جديدة TeamPage + خدمة `mockApi.team.representatives()` |
| SUP-02 | خطة السير | RoutesPage عامة scope-aware (team) + زر إنشاء routes.create | `/supervisor/planning/routes` إنشاء لمندوبي الفريق فقط | لا يوجد قيد «فريق» صريح في نموذج الإنشاء | صفحة + قيد team في النموذج |
| SUP-03 | الأهداف | TargetsPage عامة scope-aware + إنشاء targets.create | `/supervisor/planning/targets` (مالي/تشغيلي/كمّي) | لا يوجد أهداف كمية (وحدات/كراتين/منتجات) | صفحة Targets مع Quantitative tab |
| SUP-04 | الأهداف الكمية | **غير موجود** | منتج/وحدة/كرتون/فترة/مندوب | نوع Target لا يحمل items | إضافة `TargetLine[]` + tab |
| SUP-05 | GPS | GpsPage تفلتر للفريق (واجهة) | `/supervisor/gps` خريطة فريق | يعتمد على mock مباشر للتسميات (مقبول للعرض) | إعادة هيكلة داخل module |
| SUP-06 | التتبع اللحظي | GpsPage يعرض آخر موضع + سرعة | تمييز Live / Last Synced | لا يوجد وسم Sync State | إضافة Sync State badge |
| SUP-07 | متابعة الإنجاز | TargetsPage يحسب التقدم مباشرة | إنجاز خطة/زيارات/مبيعات/تحصيل/كميات | الحساب من mock مباشر في الواجهة | مركزة في service/helper |
| SUP-08 | متابعة الأداء | ReportsPage عامة (team عبر scope) | `/supervisor/team/performance` | - | صفحة أداء الفريق |
| SUP-09 | تجهيز البضاعة | RequestsPage يعرض الطلبات (team عبر scope) | مراجعة/تجهيز طلبات البضاعة للفريق | لا يمنع المشرف إظهار طلبات خارج الفريق على مستوى service (RequestsPage يفلتر repId===self فقط للمندوب، والمشرف يرى team عبر canAccessStockRequest ✓) | Workflow تجهيز/تسليم |
| SUP-10 | تسليم البضاعة | لا يوجد | توثيق تسليم (Source/Dest/Product/Qty/Expected/Delivered/Variance/Receiver) | - | Receiving UI + حركات |
| SUP-11 | طلب عهدة/أصل | CustodyPage يعرض العهد فقط، بلا طلبات | `/supervisor/assets/requests/new` | لا يوجد مفهوم AssetRequest | كيان + نموذج + mock |
| SUP-12 | توثيق العهدة | لا يوجد | مرفقات (صور/فيديو/وثائق) مربوطة بالأصل بعد الموافقة | - | توثيق + أرشفة |
| SUP-13 | تحويل المخزون | TransfersPage عامة لكن scope يعالج team كـ «نفسه فقط» (canAccessStockTransfer: toRepId===self) | `/supervisor/inventory/transfers` ضمن Policy (Scope/Product/Qty/Approval/Receiving) | **ثغرة نطاق** — المشرف لا يرى تحويلات فريقه عبر الخدمة | إصلاح scope |
| SUP-14 | صندوق المشرف | CashPage scope يعالج team كـ «نفسه فقط» (ownerId===self) | صندوق المشرف فقط إذا Enabled | **ثغرة نطاق** + لا إعداد Enabled | إصلاح scope + Config |
| SUP-15 | مخزون المشرف | غير موجود | مخزون مشرف إذا Enabled | - | Config + صفحة |
| SUP-16 | إيقاف مندوب | غير موجود (لا توجد واجهة تغيير حالة مندوب) | Suspend (Active/Suspended/Inactive) بلا حذف + فحص مخزون/صندوق/عهدة | - | صفحة/أكشن |
| SUP-17 | تحويل العملاء | Approval type `customer_transfer` موجود (ap-010) لكن بلا واجهة | `/supervisor/customers/transfers` wizard | - | صفحة تحويل |
| SUP-18 | مسؤولية الدين | غير موجود | حفظ Previous/New/EffectiveDate/Reason/DebtResponsibility بلا حذف تاريخ | - | كيان CustomerTransfer |
| SUP-19 | أعمار الديون | غير موجود | `/supervisor/debts/aging` بـ NotDue/1-30/31-60/61-90/>90 | - | صفحة Aging |
| SUP-20 | العملاء المستهدفون | TargetOrganizationsPage (مندوب) يرفع under_review — **لا يوجد مراجعة مشرف** | `/supervisor/customers/targets` Approve/Return/Reject/Forward | **فجوة حرجة** | صفحة مراجعة |
| SUP-21 | أرشفة العملاء المستهدفين | TargetOrganization يحمل attachments فقط | رفع مستندات وربطها بالأرشيف | - | ربط + أرشفة |
| SUP-22 | إيقاف عميل | CustomersPage يسمح deactivate (permission) لكن بلا واجهة سبب/تاريخ | Suspend بلا Delete + سجل User/Date/Reason | - | أكشن + سجل |
| SUP-23 | ملاحظات المندوب | غير موجود | `/supervisor/team-notes` (أداء/إداري/تشغيلي + Visibility Policy) | - | صفحة ملاحظات |
| SUP-24 | المراسلات | MessagesPage عام (canAccessConversation يشمل المشاركة) — بلا Compose جديد | `/supervisor/messages` مع نطاق اتصال (فريقي/مدير المبيعات/جهات مسموحة) | لا يوجد مؤلف رسائل جديد | Compose + policy |

---

## 3. فحص RBAC (permissions)

### 3.1 صلاحيات موجودة للمشرف صحيحة (تبقى)
`dashboard.view`، `customers.view/transfer/deactivate`، `products.view`، `pricing.view`، `sales.view`، `collections.view/create`، `returns.view/create/approve`، `inventory.view/transfer`، `routes.view/create/approve`، `visits.view/create`، `gps.view`، `targets.view/create`، `credit.view`، `approvals.view/review`، `reports.view`، `custody.view`، `archive.view`، `messages.view`، `leaves.view/approve`.

### 3.2 صلاحيات يجب إزالتها من SUPERVISOR (خارج نطاق الوثيقة)
| الصلاحية | السبب | الإجراء |
|---|---|---|
| `customers.create` | الوثيقة (15): العملاء = تحويل/إيقاف/مراجعة فقط | إزالة |
| `customers.edit` | نفسه | إزالة |
| `trips.view, closing.view, sync.view, expenses.view, loading.view, count.view, deposit.view, targets.org.view` | صلاحيات «ميدان المندوب» — تجعل قائمة المندوب تظهر للمشرف | إزالة + `roles:["REPRESENTATIVE"]` على عناصر قسم المندوب (دفاع متعدد الطبقات) |

### 3.3 صلاحيات محظورة — تأكيد غيابها ✓
`users.view/manage`، `roles.manage`، `organization.manage`، `settings.*`، `profitability.view`، `credit.approve`، `discount.approve`، `pricing.approve`، `products.edit`، `sales.cancel`، `archive.edit/override`، `custody.manage`، `approvals.approve` — كلها غير موجودة للمشرف ✓ (لا حاجة لتغيير).

### 3.4 صلاحيات جديدة مقترحة (لأدوار المشرف حصرًا)
تُضاف إلى `rolePermissions.SUPERVISOR` وإلى `permissionCatalog`:
`supervisor.team`, `supervisor.planning`, `supervisor.field`, `supervisor.customers`, `supervisor.inventory`, `supervisor.cash`, `supervisor.assets`, `supervisor.comms`, `supervisor.requests`, `supervisor.activity`.

> القاعدة: الحماية = `Role` + `Permission` + `DataScope` + `Workflow`. المندوب لا يملك أيًا من `supervisor.*`.

---

## 4. فحص DATA SCOPE — ثغرات مؤكدة على طبقة الخدمة

| الثغرة | الملف/السطر | السلوك الحالي | السلوك المطلوب |
|---|---|---|---|
| **تحويلات المخزون** | `scope.ts:149` `canAccessStockTransfer` | team → `toRepId === self` فقط | team → `toRepId ∈ visibleRepIds(scope)` |
| **حركات المخزون** | `scope.ts:152` `canAccessStockMovement` | team → `repId === self` فقط | team → `repId ∈ visibleRepIds(scope)` |
| **صناديق النقد** | `scope.ts:155` `canAccessCashBox` | team → `ownerId === self` فقط | team → `ownerId === self` (صندوق المشرف) **أو** `ownerId ∈ visibleRepIds(scope)` (صناديق الفريق) |
| **حركات الصندوق** | `scope.ts:158` `canAccessCashMovement` | team → boxId الخاص فقط | team → boxId في نطاق صناديق الفريق أو relatedRepId في الفريق |
| **الأرشيف** | `scope.ts:202` `canAccessArchive` | كل ما ليس `self` → `true` (يرى كل الأرشيف) | team → سجلات الفريق فقط (entityId في كيانات الفريق أو createdBy من الفريق أو employee في الفريق) |
| **سجل التدقيق** | `mockApi.ts:358-365` `audit.list` | team/branch → `clone(auditLogs)` كامل | team → سجلات الفريق فقط (actor ∈ أسماء الفريق أو entityId ∈ كيانات الفريق) |
| **rep.\*** | `mockApi.ts:366-425` | `p.repId === scope.userId` | إضافة namespace `team.*` مركزي بنطاق الفريق (dailyPlans, trips, expenses, closings, targetOrganizations, deposits, counts, loadingOrders) |
| **مخزون المستودع** | `mockApi.ts:178-183` `warehouseStock` | team → كامل `warehouseStock` | team → المستودعات ضمن نطاق المشرف (مستودع منطقته) أو ثابتة وفق سياسة (إبقاء لسلسلة التوريد، تُوثَّق كقرار) |

> ملاحظة: `warehouseStock` يُعتبر «مخزون المستودع العام» لأغراض تجهيز البضاعة (SUP-09). يُحفظ كقرار مؤقت «نطاق إقليمي» ويُسجَّل في Pending Business Decisions.

---

## 5. فحص MOCK DATA — فجوات لسيناريوهات الاختبار

| السيناريو (Spec 47) | متوفر؟ | الوضع |
|---|---|---|
| 1 Normal Team Day | ✓ | مبيعات/زيارات/تحصيل في 08-14 للفريقين |
| 2 Representative Late | ✓ | visits v-007 بلا checkInAt (not_found) + تجاوز أوقات مخطط لها |
| 3 GPS Offline | ✓ | u-rp-06 (stale 08-13) |
| 4 Route Deviation | ✓ | u-rp-03 2.8km + routeDeviation |
| 5 Pending Stock Request | ✓ | sr-001 (u-rp-03), sr-006 (u-rp-01) |
| 6 Pending Stock Transfer | ✓ | st-002 (u-rp-03), st-007 in_transit (u-rp-01) |
| 7 Customer Transfer | ✓/جزئي | ap-010 (customer_transfer) موجود لكن بلا سجل CustomerTransfer منفصل |
| 8 Customer Suspended | ✓ | c-022 suspended |
| 9 Target Customer Pending Review | ✓ | to-001 under_review (u-rp-01) — **يحتاج واجهة مراجعة** |
| 10 Asset Request Pending SM Approval | ✗ | **غير موجود** — إضافة |
| 11 Asset Request Approved | ✗ | **غير موجود** — إضافة |
| 12 Inventory Variance | ✓ | ic-002 draft (فروقات) |
| 13 Cash Difference | ✓ | dc-002 cashVariance -50 |
| 14 Debt > 90 Days | ✓ | c-005/c-017 overdue (تُحسب من invoices.dueDate) |
| 15 Representative Suspended | ✓ | u-rp-06 inactive |

فجوات إضافية:
- **Supervisor A له 3 مناديب** (الوثيقة: حتى 10): إضافة `u-rp-07` ضمن فريق u-sp-01 (t-01) لتحقيق اختبار A1/A2/A3.
- **TargetOrganizations لفريق u-sp-02**: إضافة to-005/006 من u-rp-03/04 لاختبار عزل مراجعة العملاء المستهدفين.
- **طلب أصل (Laptop)**: إضافة `assetRequests` (pending SM + approved + handed_over + archived) مرتبطة بموظف/مندوب/مستفيد.
- **صندوق bx-sp-03 مفقود** لـ u-sp-03 (نقص بيانات — إضافة أو تجاهل باختبار).
- **ملاحظات مندوب**: لا توجد بيانات `supervisorNotes` — إنشاء مصفوفة صغيرة.
- **مخزون مشرف/صندوق مشرف Config**: إنشاء `supervisorPolicies.ts`.

---

## 6. إعدادات قابلة للتهيئة (Spec 54) — المطلوب إنشاؤها

`src/config/supervisorPolicies.ts`:
```ts
supervisorPolicies = {
  teamSizeLimit: 10,                    // SUPPORTED: 1–10+
  planningPeriods: ["daily","weekly","monthly","yearly"],
  gps: { intervalMinutes: 5, showLiveVsSynced: true },
  supervisorWarehouse: { enabled: true },   // SUP-15 conditional
  supervisorCashBox: { enabled: true },     // SUP-14 conditional
  stockTransferPolicy: { scope: "team", productScope: "all", quantityLimitPerTransaction: 0, approvalRequired: false, receivingRequired: true },
  customerTransfer: { allowed: true, requiresApproval: false },
  debtResponsibility: "new_rep",            // SUP-18 policy-driven
  assetApprovalWorkflow: { role: "SALES_MANAGER" },  // ثابت لهذا المشروع
  communicationScope: { withReps: true, withSalesManager: true },
  closing: { frequency: "daily" },
}
```
> «المشرف لا يعتمد طلب عهدة ينشئه هو» → يُثبت عبر `assetApprovalWorkflow.role = SALES_MANAGER` ولا يُجعل المشرف يرى زر اعتماد لطلبه.

---

## 7. نقاط تحتاج تثبيتًا (Pending Business Decisions — Spec 55)
تُسجَّل ولا تُثبَّت كقواعد:
- اعتماد خطة السير قبل نشرها؟ → Workflow-driven.
- تعديل الأهداف أثناء الفترة ومن يعتمدها؟ → Pending (يُبقي «التعديل» عرضًا، ويوافق مدير المبيعات إن كانت سياسة).
- GPS interval → `gps.intervalMinutes`.
- إلزامية مخزون المشرف؟ → `enabled` اختياري.
- حدود صندوق المشرف؟ → `supervisorCashBox` اختياري.
- حدود تحويل المخزون؟ → `stockTransferPolicy`.
- سرية ملاحظات المشرف؟ → `visibility` على الملاحظة.
- تفاصيل مسؤولية الدين → `debtResponsibility`.
- `warehouseStock` للمشرف (نطاق عام أم إقليمي) → يسجَّل قرار مؤقت.

---

## 8. خطة التنفيذ (لا يُعاد بناء الصحيح)

### 8.1 إعادة استخدام (موجود وصحيح)
- `DataTable`, `Card/SectionBlock`, `StatCard`, `Badge/StatusBadge`, `Progress`, `Tabs`, `Modal/ConfirmDialog`, `Drawer`, `FilterBar`, `FormControls`, `States`, `Pagination`, `Timeline/WorkflowSteps`, `Tooltip`, `MockMap`, `ApprovalTimeline`, `BarChart/LineChart/DonutChart`, `DashboardQuickActions`.
- الصفحات العامة scope-aware للمشرف: `GpsPage` (فريق)، `VanInventoryPage` (فريق)، `TargetsPage` (فريق)، `RoutesPage` (فريق)، `VisitsPage` (فريق)، `CustomersPage`/`Customer360Page`، `ApprovalsPage`/`ApprovalDetailPage`، `ReportsPage`، `MessagesPage`، `CustodyPage`.
- `PermissionRoute` + `useData` + `useAuthStore` + `getDataScope`.

### 8.2 بنية Module جديدة `src/modules/supervisor/`
```
supervisor/
├── pages/
│   ├── dashboard/SupervisorHomePage.tsx      → /supervisor/dashboard
│   ├── team/TeamPage.tsx                     → /supervisor/team
│   ├── team/RepDetailPage.tsx                → /supervisor/team/:id
│   ├── team/PerformancePage.tsx              → /supervisor/team/performance
│   ├── planning/RoutesPage.tsx               → /supervisor/planning/routes
│   ├── planning/DailyPlansPage.tsx           → /supervisor/planning/daily
│   ├── planning/AssignmentsPage.tsx          → /supervisor/planning/assignments
│   ├── planning/TargetsPage.tsx              → /supervisor/planning/targets
│   ├── field/TeamGpsPage.tsx                 → /supervisor/gps
│   ├── field/LiveLocationsPage.tsx           → /supervisor/gps/live
│   ├── field/TripsPage.tsx                   → /supervisor/gps/trips/:tripId (ضمنيًا)
│   ├── field/VisitsPage.tsx                  → /supervisor/gps/visits/:visitId (ضمنيًا)
│   ├── field/DeviationsPage.tsx              → /supervisor/gps/deviations
│   ├── customers/TeamCustomersPage.tsx       → /supervisor/customers
│   ├── customers/TransfersPage.tsx           → /supervisor/customers/transfers
│   ├── customers/SuspensionsPage.tsx         → /supervisor/customers/suspended
│   ├── customers/TargetCustomersPage.tsx     → /supervisor/customers/targets
│   ├── debts/AgingPage.tsx                   → /supervisor/debts/aging
│   ├── inventory/InventoryPage.tsx           → /supervisor/inventory (شرطي)
│   ├── cash/CashBoxPage.tsx                  → /supervisor/cash (شرطي)
│   ├── assets/AssetsPage.tsx                 → /supervisor/assets
│   ├── assets/RequestsPage.tsx               → /supervisor/assets/requests
│   ├── comms/MessagesPage.tsx                → /supervisor/messages
│   ├── comms/TeamNotesPage.tsx               → /supervisor/team-notes
│   ├── requests/RequestsPage.tsx             → /supervisor/requests
│   └── activity/ActivityPage.tsx             → /supervisor/activity
├── components/    (بطاقات فريق، AgingBuckets، AssetRequestCard…)
├── hooks/
├── services/supervisorApi.ts  (مركزي، يمر عبر scope؛ أو إضافة namespace team.* في mockApi)
├── types/         (TargetLine, AssetRequest, SupervisorNote, CustomerTransfer)
├── constants/
├── permissions/
└── routes.tsx
```
> بعض الوظائف Actions/Views داخل Module وليست صفحات مستقلة (Spec: لا تصنع صفحة لكل وظيفة).

### 8.3 القائمة الجانبية (Sidebar)
- إضافة `src/config/supervisorNavigation.ts` (أقسام: Dashboard / My Team / Planning / Field Monitoring / Customers / Inventory? / Cash Box? / Assets & Custody / Communications / Requests / Activity) مع `roles:["SUPERVISOR"]`.
- `Sidebar.tsx`: عندما `role === "SUPERVISOR"` تُعرض هذه القائمة بدل العامة.
- عناصر «ميدان المندوب» تُقيَّد بـ `roles:["REPRESENTATIVE"]` (منع الظهور للمشرف حتى مع أي permission).

### 8.4 المسارات
تُضاف في `App.tsx` داخل `AppLayout` مع `PermissionRoute permission="supervisor.*" roles={["SUPERVISOR"]}` لكل /supervisor/*. Redirect `/dashboard` للمشرف → `/supervisor/dashboard`.

### 8.5 العزل (Data Scope)
- إصلاح ثغرات Scope (القسم 4) في `scope.ts` + `mockApi.ts` + namespace `team.*`.
- `PermissionRoute` + `canAccessRepresentative/Customer/Visit/Gps/…` على صفحات التفاصيل (رابط مباشر → 403).

---

## 9. أولوية التنفيذ (حزم)
1. **حزمة البنية**: supervisorPolicies + إصلاح scope/mockApi + mock data (u-rp-07, assetRequests, targetOrgs sp-02, notes) + sidebar + routes + Supervisor Home Page.
2. **Dashboard + Field Monitoring** (KPIs، GPS، Live، Deviations، Pending Workflows، Quick Actions Sticky).
3. **My Team** (Team، Rep Detail، Performance، Suspend).
4. **Planning & Targets** (Routes، Daily، Assignments، Targets + Quantitative).
5. **Customers & Debts** (Team Customers، Transfers، Suspensions، Target Customers Review، Aging).
6. **Inventory (شرطي) + Cash (شرطي) + Assets & Custody**.
7. **Communications & Notes + Requests + Activity**.
8. **الاختبارات**: Cross-Scope (Supervisor A vs B)، tsc، build، التقرير النهائي.

---

## 10. اختبارات القبول (Spec 65)
- Supervisor A = `u-sp-01` يرى u-rp-01/02/(07) ولا يرى u-rp-03/04/05/06.
- العملاء/المبيعات/التحصيل/المرتجعات/الزيارات/GPS/الأهداف/الإجازات/العهد/طلبات البضاعة → team فقط.
- تحويلات/حركات المخزون والصناديق والأرشيف والتدقيق → team فقط (بعد الإصلاح).
- روابط مباشرة: `/supervisor/team/REP-B`، `/supervisor/customers/CUSTOMER-B`، `/supervisor/gps/REP-B`، `/supervisor/assets/ASSET-B` → 403.
- المشرف لا يعتمد طلبه (Asset Request → Sales Manager).
- `npx tsc --noEmit` + `npm run build` ينجحان.
