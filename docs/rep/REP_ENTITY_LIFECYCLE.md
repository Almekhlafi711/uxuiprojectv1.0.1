# REP Entity Lifecycle

Authoritative status values come from `src/types/index.ts` (`Status` union + per-entity unions) and the transition rules in `src/config/authority.ts` (`workflowMatrix`).

## Canonical `Status` union (types/index.ts:25)
`active | inactive | pending | approved | rejected | returned | draft | completed | cancelled`

## Per-entity lifecycles (REP-relevant scope only)

### Invoice (`Invoice.status` = `Status`, line 177)
- Actual flow in code: Draft → Posted (completed) — see `workflowMatrix.invoice` (authority.ts:481): `draft→posted`, `posted→cancelled`.
- `paymentStatus: "paid" | "partial" | "unpaid"` (line 200) is **separate** from document lifecycle (cash outcome).
- Gap: الـ`workflowMatrix` للـInvoice لا يشمل `submitted/approved` — لكن `SalesOrder` (line 171) قد يستخدمهما. الـRep يصدر Invoices مباشرة (لا يوجد SalesOrder مفعل في الواجهة الحالية للمندوب).

### SalesOrder (`SalesOrder.status = Status`, line 171)
- `workflowMatrix.sales_order` (authority.ts:474): `draft→submitted→approved→posted→cancelled`.
- حالياً: الـRep يفتح `NewSalePage` الذي يصدر Invoice مباشرة — لا ينتج SalesOrder intermediate. إذا فُعل SalesOrder: Draft→Submitted→(Credit Approval)→Approved→Posted.

### Collection (`Collection.status = Status`, line 213)
- lifecycle: `pending → approved → posted`.
- الـRep يُرسل تحصيلاً كـ`pending`/`submitted`، يُعتمد لاحقاً → balance مشتق من ledger (ليس مخزّناً).

### Return (`ReturnRecord.status = ReturnStatus`, line 234)
- **مكتمل**: `returns.service.ts` يدعم الدورة الكاملة: `draft → submitted → inspection → approved/rejected → posted`.
- `workflowMatrix.return` معرّف في authority.ts مع جميع الانتقالات including `returned_for_correction → submitted`.

### StockRequest (`StockRequest.status = Status`, line 297)
- **مكتمل**: `stockRequests.service.ts` يدعم الإنشاء، و `workflowMatrix.stock_request` معرّف في authority.ts: `draft→submitted→approved/rejected`.

### StockTransfer (`StockTransfer.status = TransferStatus`, line 282)
- **مكتمل**: `transfers.service.ts` يدعم: `createTransfer`, `approveTransfer`, `receiveTransfer`, `rejectTransfer`.
- `workflowMatrix.stock_transfer` معرّف مع: `draft→submitted→approved→sent→in_transit→received/rejected` + `returned_for_correction`.

### CustodyRecord (line 453-465)
- `status: "issued" | "returned" | "transferred"` (line 464) — ثلاثي.
- `condition: "good" | "needs_maintenance" | "damaged" | "lost"`.
- lifecycle مطلوب وفق RFD §14: Request→Approval→Preparation→Handover→Acceptance→(Usage)→Return→Archive. الكود يدعم `issued/returned/transferred` + الاعتماد المباشر — **مكتمل جزئياً**.

### AssetRequest (line 494-515) — SUP-16 (ليس منطقة rep مباشرة، لكن الـrep يتعامل مع الأصول):
- `AssetRequestStatus`: `draft|submitted|pending_approval|approved|rejected|returned|ready_for_handover|handed_over|archived`.

### Visit (`Visit.result`, line 350) — **ليس `status`، بل `result`**
- `planned | in_progress | paused | completed | cancelled` (DailyPlan، line 631) — `result: "visited" | "not_found" | "closed" | "no_sale" | "completed"` (Visit line 350).
- lifecycle: Planned → In Progress → (Visited/Not Found/Closed/No Sale) → Completed. **مكتمل** ✅.

### Trip (`Trip` line 600) — `status`؟ (للتحقق في mock)
- يستخدم result/result نوع. الـDashboard يتحقّق من `trip.status === "in_progress"`.

### CashBox (`CashBox`, line 304) + CashMovement
- الصندوق رصيده **مشتق من `CashMovement`** (ملف `mock/cash.ts` + ledger). lifecycle اليومي: Opening → (التحصيلات/الأقساط/الإغلاق) → Closing → Reconciliation.
- `DailyClosing` (line 662) + `OpeningBalance` — لا توجد قيمة `status` ثابتة؛ الإغلاق عملية يومية.

### Customer (`Customer.status`, line 111)
- `active | inactive | suspended | overdue | pending` (استخدمت في mock كقيم text). 
- TargetCustomer lifecycle مطلوب وفق RFD §4: `prospect → target → active → (suspended/inactive) → archived`. الـMock يحتوي `status:"pending"` و `targetFlag:true` (ملف `customers.ts`) — **مكتمل جزئياً** (prospect→active موجود، لكن customer_assignment/dept_responsibility غير مصمّح).

### LeaveRequest (`LeaveRequest.status = Status`, line 763)
- lifecycle: Draft → Submitted → Pending → Approved/Rejected. الـRep يملك `leaves.create` فقط (ليس approve) — يُرسل طلباً.

### ApprovalRequest (`ApprovalRequest.status = Status`, line 416)
- lifecycle: `pending → approved/rejected` + `steps[]` بـ `pending/approved/rejected`.
- الـRep غير مخول بـ `approvals.review` (SoD — authority.ts:461)، لذا لا يرى الموافقات كمعتمد.

## ملخص الثبات (مقابل RFD §24)
| Entity | Lifecycle موحد؟ | transition matrix مركزي؟ |
|---|---|---|
| Invoice / SalesOrder | partial (Invoice مبسّط) | ✅ نعم (authority.ts workflowMatrix) |
| Collection | لا صريح | ❌ لا |
| Return | لا | �ا لا (Gap) |
| StockRequest | لا | ❌ لا (Gap) |
| StockTransfer | لا | ❌ لا (Gap) |
| Custody | جزئي | ❌ لا |
| Visit/Trip | ✅ نعم | نعم (result) |
| Customer/Target | جزئي | ❌ لا |
| Leave | موجود وظيفياً | ❌ لا |

## أنماطًا غير موحدة كخطر
- `Visit` يستخدم `result` (ليس `status`) → يختل عنوان Lifecycle الموحد.
- بعض الكيان تستخدم `Status` العام، وبعضها `status` مثير داخلي. هذا لا يعيق الـUI لكنه يعقد التوحيد.
