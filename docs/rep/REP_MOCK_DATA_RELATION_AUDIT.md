# REP Mock-Data Relation Audit

Verifies the mock graph is interconnected (RFD §25) so the Dashboard and reports read **one source of truth** derived from movements/ledger — not per-page duplicated balances.

Source of truth per entity + FK links:

- **`customers.ts`**: base entity. Key: `id` (e.g. `c-001`). Links: `repId`, `supervisorId`, `territoryId`, `targetFlag`, `status` (`active|inactive|suspended|overdue|pending`), `balance`/`creditLimit`.
- **`sales.ts`** (Invoices): `Invoice.id`/`invoiceNumber`. FK: `customerId`, `repId`, `salesOrderNumber`. Fields: `paymentStatus` (`paid|partial|unpaid`)، `status` (Status)، `net`/`tax`/`discount`.
- **`collections.ts`** (`todayCollections` + collection entries): FK: `customerId`, `invoiceIds[]`, `repId`, `cashBoxId`. `method` (`cash|transfer|pos|check`)، `status`.
- **`returns.ts`** (`returnsByRep`): FK: `invoiceId`, `customerId`, `repId`. `condition` (`good|damaged`)، `status`.
- **`inventory.ts`** (`stockByRep`/`VanStock`): FK: `repId`. contains `items[]`. مصدر المخزون = **StockMovements** (`mock/inventory.ts` StockMovement: type `receiving|issue|transfer_out|transfer_in|return_in|damage|count_adjust`، `fromWarehouseId`/`toWarehouseId`/`repId`) — مشتق، ليس مخزّناً ✅.
- **`cash.ts`** (`cashBoxes`): FK: `ownerId` (rep). `CashMovement` (types: `collection_in|rep_deposit|supervisor_receipt|expense|adjustment`) تُشتق الصندوق. الرصيد = مشتق من movements ✅.
- **`custody.ts`**: `CustodyRecord` FK: `assignedToId` (rep). `status` (`issued|returned|transferred`) + `condition`.
- **`visits.ts`**: FK: `customerId`، `repId`. `result` (`visited|not_found|closed|no_sale|completed`) + GPS lat/lng.
- **`repField.ts`**: `dailyPlanByRepDate` (rep, date) + `activeTripByRep`. FK: `repId`، `entries[]` → `customerId`. مصدر تخطيط الجولة.
- **`approvals.ts`**: `ApprovalRequest` FK: `requestedBy`، `relatedId` (entity)، `status` + `steps[]`.
- **`ledger.ts`** (`ledgerEntries`): **المصدر الموحد للأرصدة** — `customerLedger(customerId)` → `debit/credit/balance` مشتق ✅؛ لا يوجد `balance` مخزّن. (`MockData` customers.ts يحمل field `balance` للعرض، لكنه **يُفضّل** من ledger وفق التوثيق — Gap: الـmock يحمل `balance` مكرر في `customers` و`cashBoxes` رغم أن الـledger يشتقه).
- **`leaves.ts`**: FK: `repId`.
- **`messages.ts`**/`admin.ts` (`conversations`/`userMessages`): FK: `fromId`/`toId` (userId).
- **`targets.ts`**: FK: `ownerId` (rep/territory) + `lines` → productId.
- **`returns.ts`**、**`commission.ts`**、**`profitability.ts`**、**`routes.ts`**، **`gps.ts`** — مرتبطة بربط فعلي.

## روابط التكامل (ER-style)
```
Customer ──┬──(يدفع)──► Collection ──(cashBox)──► CashBox
           ├──(يُباع)──► Invoice ──(invoiceIds)──► Collection
           ├──(يُرتجع)──► Return ──(invoiceId)──► Invoice
           ├──(يزور)//──► Visit ──(routePlan)──► DailyPlan ──► Trip
           └──(له)──► Target

Rep ──(يدير)──► VanStock ──(عبر)──► StockMovement ──► StockRequest/StockTransfer
Rep ──(يدير)──► CashBox ──(عبر)──► CashMovement ──► DailyClosing
Rep ──(يدير)──► CustodyRecord ──► AssetRequest
Rep ──(يدير)──► LeaveRequest ──(اعتماد)──► ApprovalRequest
```

## فحص التكرار
- `customers.balance` و `cashBoxes.balance` هما قيمة مخزّنة في الـmock — على الرغم من وجود `ledger.ts` المشتق. هذا **تكرار بيانات** (Gap): يجب أن يكون الأرصدة مشتقة فقط من ledger لتفادي التحيّز (RFD §10/§8).
- `rep/customers.ts` + `rep/DailyPlanPage` + `rep/VisitWorkspace` تستخدم `mock/customers.ts`، `sales.ts`، `visits.ts`، `repField.ts` نفسه — لا توجد نسخ مستقلة. ✅
