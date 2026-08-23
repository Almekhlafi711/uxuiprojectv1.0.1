# Representative RBAC — Final Audit & Implementation Report

**Date:** 2026-08-14 · **App:** UXUI ERP (mock-driven React 18 + TS + Vite) · **Scope:** field-sales-rep data isolation (Rep-A vs Rep-B)

---

## 1. Root Cause

The mock ERP exposed **all** rows of every rep-owned collection to **any** logged-in user:
- Pages read raw mock arrays directly (`customers`, `invoices`, `collections`, `vanStock`, `cashBoxes`, …) and only filtered by the logged-in rep on *some* screens.
- The mock API layer (`src/services/mockApi.ts`) returned **unfiltered** lists, so any UI could pull another rep's data.
- Routes and sidebar items were guarded only by *module permission strings*, with no row-level data scope; several pages (Customers, Sales, Cash, Inventory) even had **rep/territory dropdowns** that listed all reps company-wide.
- There was no "deny by default" — a rep could open direct URLs (`/customers/c-005`, `/sales/so-006`, `/rep/visit/…`) for data that was not theirs.

**Fix principle:** every rep-owned entity is now gated **at the service layer** (`mockApi`) using a per-user `DataScope`; UIs consume only scoped data; routes and actions are additionally permission/role-gated. Nothing is "shown then hidden".

## 2. Data Leaks (Rep A vs Rep B) — Fixed

| Entity | Before | After (enforced in `mockApi`) |
|---|---|---|
| Customers / Sales / Collections / Returns / Visits / Routes / Van stock / Stock requests / Movements / Profitability | all reps | `repId === scope.userId` |
| Stock transfers | all reps | `toRepId === scope.userId` |
| Cash boxes | all | `ownerId === scope.userId` |
| Cash movements | all | own box ids **or** `relatedRepId === scope.userId` |
| Targets | all | own + supervisor + own territory (per `visibleUserIds`) |
| GPS | all | own + supervisor only |
| Approvals / Custody / Leaves | all | **self-scope:** own rows only; manager: visible users |
| Messages / conversations | all | participant of conversation |
| Notifications | all | `recipientId === userId`; managers also see broadcast (`no recipientId`) |
| Archive | all | own employee docs + `createdBy === me` + own entity ids (`archiveOwnIds`) |
| Territories (org) | all | own territory only |
| Users list | all | own + supervisor only |
| Warehouse stock | all | **`[]` for self scope** (deny) |
| Audit log | all | **`[]` for self scope** (deny) |
| Rep field ops (`dailyPlans, trips, tripExpenses, dailyClosings, targetOrganizations, syncQueue, loadingOrders, inventoryCounts, deposits`) | all | `repId/userId === scope.userId`; `syncQueue` further gated by `syncOwnIds` |

## 3. Permission Leaks — Fixed

- `src/config/permissions.ts`: removed `customers.create` / `customers.edit` from the REPRESENTATIVE role (spec #47 / #49) — the "إضافة عميل" button now auto-hides for reps.
- Action-level gating via `can()`:
  - `TransfersPage` — "تحويل جديد" only for roles with `inventory.transfer`.
  - `RoutesPage` — create button gated by `routes.create`.
  - Rep is blocked (no permission strings) from: credit, approvals, profitability, reports, users, organization, settings, warehouse stock.

## 4. Route Leaks — Fixed

- New `PermissionRoute` guard (`src/components/guards/PermissionRoute.tsx`): renders a 403 `EmptyState` when the current role lacks the route's permission; supports an optional `roles` allow-list.
- Every route in `src/App.tsx` is now wrapped: `dashboard`, `customers(+new/:id)`, `products`, `sales(+new/:id)`, `collections`, `returns`, `inventory(+warehouse/van/transfers/requests/movements)`, `cash`, `custody`, `routes`, `visits`, `gps`, `targets`, `credit`, `approvals(+:id)`, `profitability`, `reports`, `archive`, `messages`, `leaves`, `users`, `organization`, `settings`, and all `rep/*` routes.
- `/inventory/warehouse` additionally restricted to `roles={GENERAL_MANAGER, SALES_MANAGER, SUPERVISOR}`.
- Direct-URL targets (`/customers/c-005`, `/sales/so-006`, `/approvals/…`, …) resolve via scoped `getById` (return `undefined` → error state) or are route-blocked outright.

## 5. UI Leaks — Fixed

- **CustomersPage:** rep sees title "عملائي" and read-only context chips (`المنطقة` / `المندوب`) instead of territory/rep dropdowns; chip values come from the user's scope.
- **SalesPage:** rep filter replaced with a chip; filter options scoped (`visibleReps` / `visibleTerritories`).
- **NewSalePage:** customer select + customer lookups restricted to `canAccessCustomer`.
- **CustomerForm:** territory / rep selects scoped to the visible set.
- **CashPage:** boxes list, filter, settle-modal options and totals scoped to `visibleBoxes`; main-box stat hidden for rep.
- **InventoryIndexPage:** rep sees "مخزوني" (own van value/units/low-stock list); warehouse card hidden for rep.
- **TransfersPage:** destination select scoped to `visibleUsers`.
- **Header (global search + notifications):** scoped via `canAccessCustomer / canAccessInvoice / canAccessCollection / canAccessNotification`.
- **RepDashboard:** notification feed now `recipientId === me.id || !recipientId`.
- **Sidebar:** fixed the old `|| true` child-filter bug; children are filtered by their own permission *and* new `roles`; `inventory/warehouse` hidden for reps.
- **VisitWorkspace:** customer resolved through `canAccessCustomer` — out-of-scope direct URLs render a denial state.
- Added `.filter-chip` style to `src/styles/components.css`.

## 6. Services Fixed

`src/services/scope.ts` (new, source of truth):
- `DataScopeType = self | team | branch | company`; role mapping: REPRESENTATIVE→self, SUPERVISOR→team, SALES_MANAGER→branch, GENERAL_MANAGER→company.
- `getDataScope(user)`, `visibleRepIds`, `visibleUserIds`, `visibleUsers`, and `canAccess*` for Customer, Invoice, Visit, Collection, Return, Route, VanStock, StockRequest, StockTransfer, StockMovement, CashBox, CashMovement, Gps, Target, Approval, Profitability, Custody, Leave, Conversation, Territory, Notification, Archive.
- Team scope (supervisor) keeps its own data + assigned reps' data + their customers by territory/supervisor.

## 7. Mock API Fixed

`src/services/mockApi.ts` rewritten end-to-end:
- Reads `useAuthStore.getState().user` at call time (`currentScope()`); **deny-by-default** — returns `[]` / `undefined` when no scope.
- Helpers: `ownBoxIds`, `archiveOwnIds`, `syncOwnIds`.
- `auth.login` unchanged; products / warehouses / organization metadata stay global (company-wide, non-rep-owned).
- `sales.getById`, `customers.getById`, `approvals.getById` enforce scope (protect direct URLs).

## 8. Sidebar / Filters / Search Fixed

- `src/config/navigation.ts`: `NavItem.roles?: Role[]`; warehouse child restricted to GM/SM/Supervisor.
- `src/layouts/AppLayout/Sidebar.tsx`: item + child filtering by roles **and** permissions (bug fixed).
- Header search results scoped per entity.

## 9. Direct URL Protection

| URL | Rep outcome |
|---|---|
| `/credit`, `/approvals/:id`, `/profitability`, `/reports`, `/users`, `/organization`, `/settings`, `/inventory/warehouse` | 403 (no permission / role block) |
| `/customers/c-005` (other rep's customer) | scoped `getById` → undefined → error state |
| `/sales/so-006` (other rep's invoice) | scoped `getById` → undefined → error state |
| `/rep/visit/c-007` (other rep's customer) | `canAccessCustomer` denial state |
| `/inventory/van` | scoped `vanStock` → own van only |
| `/cash`, `/inventory/movements` | scoped lists |

## 10. Test Results

Automated Rep-A-vs-Rep-B acceptance test (`/dev/scope-test` page + Node runner). **RESULT: PASS** — 0 rows out of scope across both accounts.

| Source | Rep A (`u-rp-01`) rows / leaked | Rep B (`u-rp-02`) rows / leaked |
|---|---|---|
| customers | 9 / 0 | 4 / 0 |
| sales | 8 / 0 | 5 / 0 |
| collections | 6 / 0 | 4 / 0 |
| returns | 2 / 0 | 2 / 0 |
| visits | 4 / 0 | 3 / 0 |
| routes | 1 / 0 | 1 / 0 |
| vanStock | 1 / 0 | 1 / 0 |
| stockRequests | 2 / 0 | 1 / 0 |
| stockTransfers | 2 / 0 | 1 / 0 |
| stockMovements | 2 / 0 | 1 / 0 |
| cashBoxes | 1 / 0 | 1 / 0 |
| cashMovements | 3 / 0 | 1 / 0 |
| targets (own+supervisor) | 3 / 0 | 3 / 0 |
| custody | 2 / 0 | 2 / 0 |
| leaves | 1 / 0 | 1 / 0 |
| gps (own+supervisor) | 2 / 0 | 2 / 0 |
| notifications | 5 / 0 | 0 / 0 |
| messages | 2 / 0 | 0 / 0 |
| approvals | 1 / 0 | 0 / 0 |
| archive | 2 / 0 | 0 / 0 |
| territories | 1 / 0 | 1 / 0 |
| users | 2 / 0 | 2 / 0 |
| warehouseStock | 0 / 0 | 0 / 0 |

Cross-check: Rep A cannot see Rep B's customer `c-003`; Rep B cannot see Rep A's customer `c-001`. **Both blocked.**

Manual browser verification is available at `dev/scope-test` (any logged-in user; temporarily swaps the session user between the two reps and restores it).

## 11. TypeScript

`npx tsc --noEmit` — **clean** (fixed 2 union-type errors in `InventoryIndexPage` by mapping `lowRows` to `{ productId, productName, qty, reorderLevel }`).

## 12. Build

`npm run build` (tsc + Vite) — **passes** (1690 modules, ~6s).

---

## Files Changed

- `src/services/scope.ts` — new (authorization core)
- `src/services/mockApi.ts` — rewritten (scope enforcement)
- `src/components/guards/PermissionRoute.tsx` — new
- `src/modules/dev/DataScopeTestPage.tsx` — new acceptance-test page (route `dev/scope-test`)
- `src/App.tsx` — route guards
- `src/config/permissions.ts` — rep `customers.create/edit` removed
- `src/config/navigation.ts` + `src/layouts/AppLayout/Sidebar.tsx` — roles + child-filter fix
- `src/layouts/AppLayout/Header.tsx` — scoped search/notifications
- `src/types/index.ts` — `Notification.recipientId?`
- `src/mock/admin.ts` — notifications tagged with `recipientId`
- Edited pages: `CustomersPage`, `CustomerForm`, `SalesPage`, `NewSalePage`, `CashPage`, `InventoryIndexPage`, `TransfersPage`, `RepDashboard`, `VisitWorkspace`
- `src/styles/components.css` — `.filter-chip`

## Deliberate Design Decisions (kept)

- Management dashboards (`Supervisor / SalesManager / GeneralManager`) remain on raw mock reads — they are company/team-level role views, not rep-to-rep exposure, and were left untouched to avoid regressions.
- `RepDashboard` daily-target fallback (`targets.find(daily) ?? targets[0]`) is safe because both demo reps own daily targets (`tg-010` / `tg-011`).
- GPS shares own + supervisor location (per `visibleUserIds("self")`), matching the product's field-tracking intent.
- Notification broadcast items (`no recipientId`) are visible only to manager scopes, not to reps.
