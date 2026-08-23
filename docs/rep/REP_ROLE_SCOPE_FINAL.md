# REP Role / Scope (final)

## الدور: REPRESENTATIVE (`authority.ts:296-304`)
- `id: "REPRESENTATIVE"`، `nameAr: "المندوب"`
- `level: 4` (أدناف)، `authority: "operational"`، **scope: `self`**
- `permissions: repPerms` (authority.ts:51-79)

## Data Scope (fail-closed)
`dataScopeOf[REPRESENTATIVE] = "self"` (authority.ts:446) — يرى:
- بياناته الخاصة فقط.
- عملاءه المُعيّنين (`customers.repId === me.id`).
- مخزونه الشخصي (`stockByRep`).
- صندوقه النقدي (`cashBoxes.find(b => b.ownerId===me.id)`).
- مبيعاته/تحصيله/زياراته.
توافق: `src/services/scope.ts` → `getDataScope`/`canAccessCustomer` fail-closed.

## Permissions الحقيقية الممنوحة للمندوب (authority.ts:51-79)
```
dashboard.view
customers.view
products.view, pricing.view
sales.view, sales.create
collections.view, collections.create
returns.view, returns.create
inventory.view, inventory.request
custody.view
cash.view
routes.view
visits.view, visits.create
gps.view
targets.view
messages.view
reports.view
leaves.view, leaves.create
archive.view      (read-only)
commission.view, bonus.view (قراءة فقط — لا ينشئ/approve)
loading.view, loading.receive
count.view, count.create
deposit.view, deposit.create
stock_request.view, stock_request.create
closing.view, closing.create
trips.view, trips.start
sync.view
targets.org.view, targets.org.create
expenses.view, expenses.create
```

### ما لا يملكه المندوب (SoD + role level 4) — RFD §21
لا يملك (ممنوعات صلاحية):
- `approvals.review` (معطّل SoD مع sales.create — authority.ts:461).
- `discount.approve` / `credit.approve` (SoD — authority.ts:463,464).
- `sales.cancel` (غير مدرجة — فقط SUP+ على المنصوب).
- `archive.edit` / `archive.override`.
- `commission.approve` / `commission.export`.
- `customers.transfer` / `customers.deactivate` (خاص بالمشرف).
- `inventory.transfer` (مشرف/مستودع).
- `cash.settle` (مشرف).
- `credit.approve`، `routes.create/approve`، `targets.create` (غير shared scope).
- `settings.*`, `users.*`, `roles.manage`, `policy.manage`, `organization.manage`, `integration.*` — كلها إدارية.

## Role hierarchy (level = أعلى يتحكم)
SYSTEM_ADMIN(0) > GM(1) > SM/DO/FIN/AUDITOR/HR(2) > WAREHOUSE/SUPERVISOR(3) > DISTRIBUTOR/REPRESENTATIVE(4).

⇒ المندوب ليس له أي صلاحية "اعتماد/تغيير/حذف/إدارة" — كل ما يملكه Create/Submit/View بعد.

## Scope boundaries (RFD §22)
- **Own**: `repId===me.id` على invoices/collections/visits/returns/cashBox/stock.
- **Assigned customers**: `customers.repId===me.id` (scope.ts `canAccessCustomer`).
- **لا يرى**: بيانات مندوب آخر / فريقه المشرف / فروع أخرى.

## Policy toggles (rep field) — `src/config/repPolicies.ts`
- `credit.blockWhenExceeded`، `credit.warnAtPercent`
- `transferReceiptRequired`， `stockRequestIncreasesVanOnReceiptOnly`
- `transferReceiptRequired`، `countGeneratesAdjustment`
- `gpsRequiredForTrip`، `sync.*`
- `messages.allowedRoles`
- `expenses.maxWithoutApproval`
هذه الـ**policies** تحكم سلوك الـUI للمندوب لكنها لا تُغيّر الـpermissions الثابتة.

## الخلاصة: لا خرق صلاحيات
- كل مسار `/rep/*` محمي `PermissionRoute` بـpermission من `repPerms` فقط.
- لا يوجد زر/عملية تُظهر للمندوب ليس لهِ صلاحيته.
