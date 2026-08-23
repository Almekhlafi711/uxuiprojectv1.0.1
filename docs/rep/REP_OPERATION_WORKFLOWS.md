# REP Operation Workflows

Grounded in actual code: `src/modules/rep/*`, `src/modules/{sales,collections,returns,inventory,custody,cash,credit,archive,leaves}/...`, `src/mock/*`, `src/config/repPolicies.ts`, `authority.ts`.

## 1) Sale (RFD §6 / §7) — ACTUAL
1. `rep/DashboardPage` → زر "بيع جديد" → `/sales/new`.
2. `sales/NewSalePage`: اختيار العميل (scoped لـ `customers.repId===me` عبر scope.ts) → إضافة منتجات → كميات/أسعار.
3. خصم/سعر حسب `pricing` + صلاحية.
4. **فحص الائتمان** (RFD §7): في `VisitWorkspace.tsx:59-60` توجد منطق `repPolicies.credit.blockWhenExceeded` (customer.balance ≥ creditLimit → block) و `warnAtPercent`. هذا الفحص مرتبط بالـVisit لا بالـSale مباشرة — **Gap**: الـSale (NewSalePage) لا يتحقّق من الائتمان مركزياً قبل الإصدار.
5. إرسال الفاتورة → Invoice.status (workflowMatrix: draft→posted) → `Posted`.
6. بعد الـPosted: المندوب غير مخول `sales.cancel` إذا كان SoD/MGR — لا يتمكّن تعديل. التصحيح عبر Return/Credit Note حسب Policy.
7. الـInvoice ينتج `ledgerEntries` (mock/ledger.ts) → الرصيد مشتق.

**ملخص:** البيع مكتمل لكن فحص الائتمان غير موحد بين Sale و Visit.

## 2) Collection (RFD §8) — ACTUAL
1. Dashboard → "تسجيل تحصيل" → `/collections`.
2. `collections/CollectionsPage`: اختيار العميل (scoped) → المبلغ → طريقة الدفع `cash|bank|pos|check` (typeCollection.method) → رقم مرجع → مرفق.
3. إنشاء `Collection` (status:pending→approved) → ينتج `CashMovement.type=collection_in` إلى `cashBoxId`.
4. الرصيد: مشتق من ledger، لا يتم تعديل `customer.balance` مباشرة. ✅

## 3) Return (RFD §9) — ACTUAL
1. `/returns` (ReturnsPage) — `returns.view/create`.
2. `ReturnRecord`: invoiceId، items {condition: good|damaged}، status(ReturnStatus).
3. **مكتمل**: `returns.service.ts` يدعم الدورة الكاملة: create → inspect → approve/reject → post. `workflowMatrix.return` معرّف في authority.ts.

## 4) Van / Inventory (RFD §10) — ACTUAL
1. `/rep/van` (VanInventoryPage): عرض `stockByRep` (VanStock) — موجّد بـ `repId`.
2. `rep/StockRequestsPage` (/rep/stock-requests): إنشاء StockRequest (status:Status) → review → approval حسب Policy.
3. `rep/StockTransfersPage` (/rep/stock-transfers): Transfer (from→toRep/warehouse) — `transfers.service.ts` يدعم create/approve/receive/reject. `workflowMatrix.stock_transfer` معرّف مع `returned_for_correction`.
4. `rep/LoadingPage` / `rep/ReceivingPage`: استلام — ينتج `StockMovement` (type:receiving/issue/transfer_out/transfer_in/return_in/damage/count_adjust).
5. `inventory/TransfersPage|RequestsPage|MovementsPage`: مشاركة المخزون — data scope team.

**ملخص:** المخزون يعتمد على `StockMovements` (مشتق) وليس balance مخزّن ✅. الـtransfer يدعم `received|rejected|returned_for_correction` عبر `transfers.service.ts`.

## 5) Cash Box (RFD §13) — ACTUAL
1. `rep/CashBoxPage` (/rep/cash): صندوق المندوب `cashBoxes.find(b=>b.ownerId===me.id)`.
2. `CashMovement`: collection_in | rep_deposit | expense | adjustment → الرصيد مشتق من movements.
3. `closing.view/create` → DailyClosing: Opening → collections → deposits → Closing → Reconciliation.
4. لا يوجد `Edit Balance` — الرصيد مشتق. ✅

## 6) Custody / Assets (RFD §14) — ACTUAL
1. `rep/CustodyPage` / `rep/LoadingPage`: عرض CustodyRecord (assignedToId===rep) — `status: issued|returned|transferred`.
2. **Gap**: لا يوجد cycle كامل `Request→Approval→Preparation→Handover→Acceptance→Return→Archive` داخل rep module؛ الـrep يرى `issued` فقط.

## 7) Visit / Trip / Route Plan (RFD §15) — ACTUAL
1. `/rep/plan` (DailyPlanPage): RoutePlan → DailyPlan (planned entries).
2. `trips.start` → بدء الجولة → `activeTripByRep`.
3. `/rep/visit/:customerId` (VisitWorkspace): Check-in → Activities → [بيع/تحصيل/ملاحظة] → Check-out → `Visit.result: visited|not_found|closed|no_sale|completed`.
4. الـVisit مرتبط: customerId, salesOrderId?, collectionId?, GPS lat/lng. ✅

## 8) Messages (RFD §17) — ACTUAL
- `rep/MessagesPage` (/rep/messages) — مراسلة مباشرة مع Supervisor/مدير المبيعات/Authorized فقط (`repPolicies.messagesAllowedRoles`). ✅ واحد.

## 9) Archive / Leaves / Credit (RFD §18/19/§4) — ACTUAL
- `archive/ArchivePage` `/archive` — read-only Historical. ✅
- `leaves/LeavesPage` `/leaves` — Create Leave Request → Submit → Approval workflow. ✅ (المندوب يملك leaves.create فقط).
- `credit/CreditPage` `/credit` — عرض Credit Limit/Status/Exposure/Pending. ✅ (view فقط — ما يملك credit.approve).

## 10) Sync (RFD §10 تكامل)
- `rep/SyncCenterPage` /rep/sync — `sync.view`؛ يستخدم `repPolicies.sync` → حالة: pending|in_progress|synced|failed (`SyncQueueItem` line 683). ✅

## توحيد العمليات (RFD §23)
العمليات المركزية المطلوبة (Approval/Rejection/Return-for-Correction/Submission/Posting/Receiving/Handover/Reconciliation/Closing/Archive) **موجودة عبر خدمات مركزية**: `sales.service.ts`, `collections.service.ts`, `returns.service.ts`, `transfers.service.ts`, `loading.service.ts`, `closing.service.ts`, `customers.service.ts`, `products.service.ts`, `approval.service.ts`, `leaves.service.ts`, `targets.service.ts`, `custody.service.ts`. كل خدمة تستخدم `canTransition()` من `workflow.ts` مع `workflowMatrix` المعرّف في `authority.ts`.
