# SUPERVISOR MODULE — FINAL REPORT (المرحلة 1: النواة الوظيفية + RBAC + عزل البيانات)

**التاريخ:** 2026-08-16 · **الأساس:** `SUPERVISOR_FUNCTIONAL_RBAC_DATA_SCOPE_AUDIT.md` (SUP-01 → SUP-24)
**قاعدة الاشتغال:** المشرف = مدير تشغيل ميداني لفريق (`SUPERVISOR → TEAM`). الحماية على طبقة الخدمة (mockApi/scope)، لا «اعرض ثم اخفِ».

---

## 1. ملخص الإنجاز

| الحزمة | الحالة |
|---|---|
| بنية: supervisorPolicies + إصلاح scope/mockApi + mock data + Sidebar + Routes + Home | ✅ منفّذة |
| Dashboard + Field Monitoring (KPIs, GPS/Live, Pending Workflows, Quick Actions) | ✅ منفّذة |
| My Team (Team, Rep Detail) | ✅ منفّذة |
| Planning & Targets (خطط اليوم/الأهداف الكمية، جولات، خطط سير) | ✅ منفّذة |
| Customers & Debts (عملاء الفريق، أعمار الديون، تحويل العملاء) | ✅ منفّذة |
| Inventory (شرطي) + Cash (شرطي) + Assets & Custody | ✅ منفّذة |
| Communications & Notes + Requests + Activity | ✅ منفّذة |
| الاختبارات: Cross-Scope (مشرف «أ» ضد «ب») + tsc + build + التقرير | ✅ منفّذة |

`npx tsc --noEmit` ✅ · `npm run build` ✅ (1710 modules, vite 6.4.3)

---

## 2. خريطة المتطلبات → التنفيذ (SUP-01 → SUP-24)

| ID | الوظيفة | التنفيذ |
|---|---|---|
| SUP-01 | إدارة فريق المناديب | `/supervisor/team` (`TeamPage`) + `/supervisor/team/:repId` (`RepDetailPage`) عبر `mockApi.team.representatives()` |
| SUP-02 | خطة السير | `/supervisor/plans` (`TeamPlansPage`) — خطط سير/جولات الفريق فقط |
| SUP-03 | الأهداف | `/supervisor/planning` (`PlanningPage`) — أهداف الفريق (مالي/تشغيلي) |
| SUP-04 | الأهداف الكمية | `Target.lines?: TargetLine[]` (منتج/كمية/فترة/مندوب) + عرض كمّي في `PlanningPage` |
| SUP-05 | GPS | `/supervisor/field` (`FieldMonitoringPage`) — خريطة الفريق (`MockMap`) |
| SUP-06 | التتبع اللحظي | شارة Live/Last Synced حسب `gps.intervalMinutes`/`offlineAfterMinutes` من السياسات |
| SUP-07 | متابعة الإنجاز | `useTeamData` (مركزي) + `RepStat` لحساب التقدم من طبقة الخدمات |
| SUP-08 | متابعة الأداء | `SupervisorHomePage` (KPIs) + `RepDetailPage` (أداء المندوب) |
| SUP-09 | تجهيز البضاعة | `RequestsPage` يمر عبر `canAccessStockRequest` (team) — طلبات الفريق فقط |
| SUP-10 | تسليم البضاعة | نماذج التسليم موجودة في صفحات المخزون العامة scope-aware (policy `stockTransferPolicy.receivingRequired`) |
| SUP-11 | طلب عهدة/أصل | `AssetRequest` + `AssetsPage` (إنشاء طلب → Modal → toast → refetch) |
| SUP-12 | توثيق العهدة | `assetApprovalWorkflow.role = SALES_MANAGER`؛ المشرف لا يعتمد طلبه (`supervisorCannotApproveOwn`) |
| SUP-13 | تحويل المخزون | ثغرة النطاق مُصلَحة: `canAccessStockTransfer`/`canAccessStockMovement` (team) = `toRepId/repId ∈ visibleRepIds` |
| SUP-14 | صندوق المشرف | `/supervisor/cash` شرطي بـ `supervisorCashBox.enabled`؛ ثغرة النطاق مُصلَحة (`ownerId ∈ visibleUserIds`, `cashBoxId ∈ visibleCashBoxIds`) |
| SUP-15 | مخزون المشرف | `/supervisor/inventory` شرطي بـ `supervisorWarehouse.enabled` (team) |
| SUP-16 | إيقاف مندوب | يُظهر حالة المندوب (active/inactive) ولا يحذف؛ بلا قرار نهائي (مسجّل في Pending) |
| SUP-17 | تحويل العملاء | `CustomerTransferRecord` + `mockApi.customers.transfers()` + عرض التحويلات في `DebtsPage` |
| SUP-18 | مسؤولية الدين | `debtResponsibility: "new_rep"` (policy) + Previous/New/EffectiveDate/Reason/DebtResponsibility |
| SUP-19 | أعمار الديون | `/supervisor/debts` (`DebtsPage`) — فئات NotDue/1-30/31-60/61-90/+90 |
| SUP-20 | العملاء المستهدفون | مراجعة `TargetOrganization` (`under_review`) من صفحة الطلبات المرتبطة بالاعتماد |
| SUP-21 | أرشفة المستهدفين | موجود عبر `canAccessArchive` (team) + أرشفة العمليات |
| SUP-22 | إيقاف عميل | سجل تعطيل + سبب/تاريخ عبر approvals؛ بلا حذف |
| SUP-23 | ملاحظات المندوب | `SupervisorNote` + `mockApi.team.notes()` (بمُؤلف المشرف) + عرض في `RepDetailPage` |
| SUP-24 | المراسلات | `/supervisor/comms` (`CommsPage`) — نطاق `communicationScope.ownTeamOnly` + إشعارات الفريق |

---

## 3. إصلاحات عزل البيانات (Data Scope)

ملفات: `src/services/scope.ts` + `src/services/mockApi.ts`.

| الكيان | الثغرة السابقة | الإصلاح |
|---|---|---|
| `canAccessStockTransfer` | team → `toRepId === self` | team → `toRepId ∈ visibleRepIds` |
| `canAccessStockMovement` | team → `repId === self` | team → `repId ∈ visibleRepIds` |
| `canAccessCashBox` | team → `ownerId === self` | team → `ownerId ∈ visibleUserIds` |
| `canAccessCashMovement` | team → ذاتي فقط | team → `cashBoxId ∈ visibleCashBoxIds ∪ relatedRepId ∈ visibleRepIds` |
| `canAccessArchive` | team → غير مقيّد | team → `createdBy` في أسماء الفريق ∨ `entityId` لموظف في الفريق ∨ في `archiveTeamOwnIds` |
| `audit.list` | يعرض الكل للمشرف | team → `actor` من الفريق ∨ `entityId` من الفريق |
| `rep.*` للمشرف | يقرأ بيانات self فقط | namespace `team.*` جديد (مفلتر بـ `visibleRepIds`) |
| `customers.transfers` | غير موجود | team-scoped عبر `previousRepId/newRepId ∈ visibleRepIds` |
| `assets.requests` | غير موجود | team → طلبات المشرف فقط؛ self → [] |
| `warehouseStock` | ظهر للمندوب | self → [] (يبقى team/branch/company متاحًا) |

---

## 4. RBAC والبنية

- `permissions.ts`: صلاحيات `supervisor.*` (team/planning/field/customers/inventory/cash/assets/comms/requests/activity) بدل الصلاحيات الأوسع؛ أُزيلت `customers.create/edit`, `collections.create`, `returns.create`, `visits.create`, وصلاحيات الميدان (`trips.view`…`targets.org.view`).
- `src/config/supervisorNavigation.ts`: قائمة مشرف خاصة (Dashboard / فريقي / التخطيط / المتابعة الميدانية / العملاء والديون / المخزون / الصناديق / الأصول / التواصل / الطلبات / سجل النشاط). `Sidebar.tsx`: `role === "SUPERVISOR" → supervisorNavigation`؛ عناصر «ميدان المندوب» مقيدة بـ `roles:["REPRESENTATIVE"]`.
- `App.tsx`: 16 مسارًا `/supervisor/*` داخل `AppLayout` بـ `PermissionRoute permission="supervisor.*"`؛ `/dashboard` للمشرف → `/supervisor/dashboard`؛ حُذف `SupervisorDashboard` القديم (كان يقرأ mock مباشرة).
- `src/config/supervisorPolicies.ts`: `teamSizeLimit`, `stockTransferPolicy`, `debtResponsibility`, `assetApprovalWorkflow`, `gps`, `supervisorWarehouse`, `supervisorCashBox`, `communicationScope`, `planning`, `activity.readOnly`, `SYSTEM_TODAY = "2026-08-14"`.

## 5. Mock Data المضافة

- `u-rp-07` طلال فهد العتيبي (فريق u-sp-01، t-03) → المشرف «أ» لديه 3 مناديب.
- `assetRequests` (arq-001/002/003: pending_approval → approved → handed_over).
- `customerTransfers` (ct-001: c-024 من u-rp-02 إلى u-rp-01، `debtResponsibility: new_rep`).
- `supervisorNotes` (sn-001/002/003) + `TargetOrganization` to-005/to-006 (فريق u-sp-02، `under_review`).

---

## 6. اختبارات القبول (Spec 65) — النتائج

| # | الاختبار | النتيجة |
|---|---|---|
| 1 | Supervisor A (u-sp-01) يرى u-rp-01/02/07 ولا يرى u-rp-03/04/05/06 | ✅ `visibleRepIds` + `team.representatives` |
| 2 | العملاء/المبيعات/التحصيل/المرتجعات/الزيارات/GPS/الأهداف/الإجازات/العهد/طلبات البضاعة → team فقط | ✅ `DataScopeTestPage` (مشرف ضد مشرف) — كل الصفوف ضمن النطاق |
| 3 | التحويلات/حركات المخزون/الصناديق/الأرشيف/التدقيق → team فقط | ✅ مُصلَح في service + مختبر |
| 4 | روابط مباشرة خارج الفريق → 403 | ✅ `RepDetailPage` → ErrorState؛ `Customer360Page` عبر `getById` scope-aware؛ `PermissionRoute` |
| 5 | المشرف لا يعتمد طلبه (Asset → Sales Manager) | ✅ `assetApprovalWorkflow.role = SALES_MANAGER` |
| 6 | `npx tsc --noEmit` + `npm run build` | ✅ ناجحان |

**أداة التحقق:** `/dev/scope-test` — `DataScopeTestPage` الآن يختبر **مندوب ضد مندوب** (u-rp-01 vs u-rp-02) **و مشرف ضد مشرف** (u-sp-01 vs u-sp-02) عبر 22+ مصدرًا لكل نطاق (بما فيها `team.*` و`audit` و`assets.requests`).

---

## 7. قرارات معلّقة (Pending Business Decisions — Spec 55)

تُسجَّل ولا تُثبَّت كقواعد في الكود:
- اعتماد خطة السير قبل النشر → Workflow-driven (غير مُفعَّل).
- تعديل الأهداف أثناء الفترة ومن يعتمدها → للعرض فقط (يُتابع).
- إلزامية مخزون المشرف / حدود صندوق المشرف → `enabled` اختياري (معطّل عبر Config).
- حدود تحويل المخزون → `stockTransferPolicy` (إعدادات فقط).
- `warehouseStock` للمشرف (عام أم إقليمي) → قرار مؤقت: متاح للفريق.
- إيقاف مندوب (Suspend) بفحص المخزون/الصندوق/العهدة → واجهة حالة فقط بلا قواعد إجبارية بعد.

---

## 8. الملفات الرئيسية

- `src/config/supervisorPolicies.ts`, `src/config/supervisorNavigation.ts`, `src/config/permissions.ts`, `src/config/navigation.ts`
- `src/services/scope.ts`, `src/services/mockApi.ts`
- `src/modules/supervisor/` (hooks/useTeamData.ts, components/SupervisorPageHeader.tsx, 15 صفحة)
- `src/modules/dev/DataScopeTestPage.tsx` (أداة الاختبار الموسعة)
- `src/mock/supervisor.ts`, `src/mock/users.ts`, `src/mock/organization.ts`, `src/mock/repField.ts`, `src/types/index.ts`
