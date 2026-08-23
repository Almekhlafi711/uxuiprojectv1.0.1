# REP Functional Completion Audit

**Scope:** `REPRESENTATIVE` role workflow / field-day coverage.
**Sources reviewed:** `src/App.tsx` (routes), `src/modules/rep/*`, `src/config/authority.ts` (perms + SoD + data scope), `src/mock/*` (data graph), `src/types/index.ts` (Status), `src/services/scope.ts`, `src/services/mockApi.ts`.

> This audit is **UI/process-readiness only**. No RBAC / API / Mock / Route semantics have been changed while writing it.

## 1. Routes actually wired for the Representative (from `src/App.tsx`)

| Route | Component | Permission | Data Scope |
|---|---|---|---|
| `/rep/dashboard` | `rep/DashboardPage` | `dashboard.view` (role REPRESENTATIVE) | self |
| `/rep/customers` | `rep/CustomersPage` | `customers.view` | self |
| `/rep/customer/:id` | `rep/CustomersPage` (Customer360 branch) | `customers.view` | self |
| `/rep/products` | `rep/ProductsPage` | `products.view` / `pricing.view` | self |
| `/sales` (rep opens via nav) | `sales/SalesPage` | `sales.view` | self |
| `/sales/new` | `sales/NewSalePage` | `sales.view`+`sales.create` | self |
| `/sales/:id` | `sales/InvoiceDetailPage` | `sales.view` | self |
| `/collections` | `collections/CollectionsPage` | `collections.view`+`collections.create` | self |
| `/returns` | `returns/ReturnsPage` | `returns.view`+`returns.create` | self |
| `/rep/plan` | `rep/DailyPlanPage` | `trips.view`+`trips.start` | self |
| `/rep/visit/:customerId` | `rep/VisitWorkspace` | `visits.view`+`visits.create` | self |
| `/rep/van` | `rep/VanInventoryPage` | `inventory.view` | self |
| `/inventory/requests` | `inventory/RequestsPage` | `inventory.view` | self (team scope) |
| `/rep/stock-requests` | `rep/StockRequestsPage` | `inventory.request`+`stock_request.create` | self |
| `/rep/stock-transfers` | `rep/StockTransfersPage` | `inventory.view` | self |
| `/rep/cash` | `rep/CashBoxPage` | `cash.view`+`closing.view`+`count/deposit` | self |
| `/rep/custody` | `rep/CustodyPage` | `custody.view` | self |
| `/rep/loading` | `rep/LoadingPage` | `loading.view`+`loading.receive` | self |
| `/rep/receiving` | `rep/ReceivingPage` | `inventory.view` | self |
| `/rep/closing` | `rep/DailyClosingPage` | `closing.view`+`closing.create` | self |
| `/rep/sync` | `rep/SyncCenterPage` | `sync.view` | self |
| `/rep/reports` | `rep/ReportsPage` | `reports.view` | self |
| `/rep/gps` | `rep/RepGpsPage` | `gps.view` | self |
| `/rep/targets-org` | `rep/TargetOrganizationsPage` | `targets.org.view`+`targets.org.create` | self |
| `/rep/messages` | `rep/MessagesPage` | `messages.view` | self |
| `/archive` | `archive/ArchivePage` | `archive.view` | read |
| `/leaves` | `leaves/LeavesPage` | `leaves.view`+`leaves.create` | self |
| `/credit` | `credit/CreditPage` | `credit.view` | self |

## 2. Required real-day flow (Chapter 3 v1.0 / RFD v0.2) — mapped to actual screens

Login → Dashboard → Daily Plan → Trip/Visit → Customer → Sale → Collection → Return (if needed) → Van/Cash/Custody → Closing → Reports.

| Real-day step | Screen (component) | Status |
|---|---|---|
| Auth | `/login` (AuthLayout) | ✅ exists |
| Field work center | `rep/DashboardPage` | ✅ exists (alerts + quick actions + KPIs) |
| Route / daily plan | `rep/DailyPlanPage` | ✅ exists (`/rep/plan`) |
| Start trip | `rep/DailyPlanPage` action `trips.start` | ✅ exists |
| Visit (check-in / activities / check-out) | `rep/VisitWorkspace` | ✅ exists |
| Customer 360 → actions | `rep/CustomersPage` (detail branch) | ✅ exists |
| Sale (w/ credit gate) | `sales/NewSalePage` + `SalesPage` | ✅ exists |
| Collection (Cash/Bank/Network) | `collections/CollectionsPage` | ✅ exists |
| Return | `returns/ReturnsPage` | ✅ exists |
| Van/mobile stock | `rep/VanInventoryPage` | ✅ exists |
| Stock request | `rep/StockRequestsPage` | ✅ exists |
| Stock transfer | `rep/StockTransfersPage` | ✅ exists |
| Cash box | `rep/CashBoxPage` | ✅ exists |
| Custody/Assets | `rep/CustodyPage` | ✅ exists |
| Receiving / loading | `rep/LoadingPage`, `rep/ReceivingPage` | ✅ exists |
| Day closing | `rep/DailyClosingPage` | ✅ exists |
| Sync | `rep/SyncCenterPage` | ✅ exists |
| GPS | `rep/RepGpsPage` | ✅ exists |
| Reports | `rep/ReportsPage` | ✅ exists |
| Messages | `rep/MessagesPage` | ✅ exists |
| Archive | `archive/ArchivePage` | ✅ exists |
| Leaves | `leaves/LeavesPage` | ✅ exists |
| Credit limit view | `credit/CreditPage` | ✅ exists |

## 3. Module-by-module functional checklist

- **Customers:** List ✅, 360 ✅ (linked visit/sale/collection/balance). Target-customer lifecycle is **partially modeled** (mock has `status:"pending"` + `targetFlag:true`, see `REP_ENTITY_LIFECYCLE.md`).
- **Products & pricing:** `rep/ProductsPage` lists price, units, stock, offers ✅; rep settings (cost / price list / discount policy) are server-side/config (not editable by rep) ✅ — see RFD §5.
- **Sales:** NewSalePage has credit gate via `VisitWorkspace` (`repPolicies.credit.blockWhenExceeded`) ✅ — see §6, §7.
- **Collections:** Cash/Bank/Network + reference + attachment ✅ — see §8.
- **Returns:** Request/Inspection/Approval/Posting not fully separated in current UI — see GAP.
- **Inventory (van):** view/request/receive/transfer/return ✅ — see §10.
- **Cash box:** opening/collections/deposits/closing/recon ✅ — see §13.
- **Custody:** exists but **lifecycle handover/archive linkage is partial** — see GAP.

## 4. Readiness verdict

- Core field-day operations: **all screens exist (17/17)** and are permission-gated.
- End-to-end wiring of operations to **Ledger / Stock / Cash / Audit** is the main remaining risk (see `REP_GAPS_BEFORE_SUPERVISOR.md`).
