# REP Page → Action Matrix

Columns = permissions from `repPerms` (authority.ts). Cells = whether the page performs that action + the guard. Data source: `src/App.tsx` (route guards) + `src/components/guards/PermissionRoute.tsx` + page-level action buttons.

Legend: ✅ present / — n/a / ⚠️ partial. Data scope = `self` (authority.ts:446, scope.ts fail-closed).

| Page (route) | Permission guard | Data scope | Create | Submit | Approve | Receive | Post | Cancel | Export | Archive |
|---|---|---|---|---|---|---|---|---|---|---|
| `/rep/dashboard` | `dashboard.view` | self (KPIs) | ⚠️ New Sale link (sales.create) | — | — | — | — | — | — | — |
| `/rep/customers` | `customers.view` | rep's customers | — | — | — | — | — | — | — | — |
| `/rep/customer/:id` | `customers.view` | own+assigned | — | — | — | — | — | — | — | — |
| `/rep/products` | `products.view`+`pricing.view` | — | — | — | — | — | — | — | — | — |
| `/sales` | `sales.view`+`sales.create` | self invoices | ✅ (New Sale) | ✅ (submit draft→posted) | — | — | ✅ posted via matrix | ⚠️ no sales.cancel for rep | — | — |
| `/sales/new` | `sales.view`+`sales.create` | self | ✅ | ✅ | — | — | ✅ | — | — | — |
| `/sales/:id` | `sales.view` | self invoice | — | — | — | — | — | ⚠️ لا يملك rep sales.cancel | — | — |
| `/collections` | `collections.view`+`collections.create` | self | ✅ collection | ✅ submit | — | — | ✅ approved | — | — | — |
| `/returns` | `returns.view`+`returns.create` | self | ✅ return | ⚠️ partial (no inspection/approval) | — | — | ⚠️ partial | — | — | — |
| `/rep/plan` | `trips.view`+`trips.start` | own route | — | ✅ start trip | — | — | — | — | — | — |
| `/rep/visit/:id` | `visits.view`+`visits.create` | own visit | ✅ (sale within visit) | ✅ check-in/out | — | — | — | — | — | — |
| `/rep/van` | `inventory.view` | own van stock | — | — | — | — | — | — | — | — |
| `/inventory/requests` | `inventory.request`/`stock_request.create` | team | ✅ request | ✅ submit | — | ✅ receive | ✅ posted | — | — | — |
| `/rep/stock-requests` | `stock_request.create` | self | ✅ | ✅ | — | ✅ | ✅ | — | — | — |
| `/rep/stock-transfers` | `inventory.view` | self | ✅ | ✅ | — | ✅ receive | ✅ | — | ⚠️ no rejected/returned states | — |
| `/rep/cash` | `cash.view`+`closing.*` | own cash box | ✅ deposit/expense | ✅ submit | — | — | ✅ closing | — | — | — |
| `/rep/custody` | `custody.view` | own custody | ✅ return asset | — | — | — | ✅ returned | — | ⚠️ view-only assets | — |
| `/rep/loading` | `loading.view`+`loading.receive` | — | — | ✅ receive stock | — | ✅ | ✅ posted | — | — | — |
| `/rep/receiving` | `inventory.view` | — | — | ✅ receive | — | ✅ | ✅ posted | — | — | — |
| `/rep/closing` | `closing.view`+`closing.create` | own | ✅ closing entry | ✅ submit | — | — | ✅ closed | — | — | — |
| `/rep/sync` | `sync.view` | self | — | ✅ sync queue | — | — | ✅ synced | — | — | — |
| `/rep/reports` | `reports.view` | self | — | — | — | — | — | — | ✅ export (rep reports) | — |
| `/rep/gps` | `gps.view` | own | — | — | — | — | — | — | — | — |
| `/rep/targets-org` | `targets.org.view`/`create` | self | ✅ target org | ✅ submit | — | — | ✅ | — | — | — |
| `/rep/messages` | `messages.view` | own | ✅ send | — | — | — | — | — | — | — |
| `/archive` | `archive.view` | read | — | — | — | — | — | — | — | ✅ read-only |
| `/leaves` | `leaves.view`/`create` | self | ✅ | ✅ submit | ⚠️ rep لا يعتمد (leaves.approve للمشرف) | — | ✅ approved | — | — | — |
| `/credit` | `credit.view` | self | — | — | — | — | — | — | — | — |

## Access-control summary
- كل صفحة `/rep/*` محمية `PermissionRoute` بالـpermission المناسب — المندوب يرىها فقط إذا كانت الصلاحية ممنوحة.
- لا صفحة تُظهر زر Action ليس له scope — ✅ SoD محترم.
