# REPRESENTATIVE MODULE — FUNCTIONAL GAP AUDIT

**Date:** 2026-08-16 — **Target role:** REPRESENTATIVE (مندوب) — **B2B Field Sales Model**

---

## 1. Summary

The representative (REP) interface has working **read/view screens** (sales, collections, returns,
visits, inventory, cash, targets) but is **NOT a complete field-sales workflow**. The core
daily operational loop (Daily Plan → Start Trip → Visit → Sell/Collect → Daily Closing →
Sync) does not exist as a connected flow, mock data is not interconnected across those steps,
and the B2B terminology/process (Target Organizations, Customer = Organization) is only partial.

## 2. What Exists (baseline)

| Area | Files | State |
|---|---|---|
| Dashboard (statistics only) | `src/modules/dashboard/RepDashboard.tsx` | Read-only KPIs, no operational actions |
| Customers | `src/modules/customers/{CustomersPage,Customer360Page,CustomerForm}.tsx` | Basic CRUD, no B2B fields |
| Sales | `src/modules/sales/{SalesPage,NewSalePage,InvoiceDetailPage}.tsx` | Works; no discount-request workflow |
| Collections | `src/modules/collections/CollectionsPage.tsx` | List only |
| Returns | `src/modules/returns/ReturnsPage.tsx` | List only |
| Inventory (Van/Warehouse/Transfers/Requests/Movements) | `src/modules/inventory/*` | Partially present; no loading/receiving or count flow for REP |
| Cash | `src/modules/cash/CashPage.tsx` | Box + movements; no daily closing / deposit workflow |
| Routes / Visits / GPS / Targets | `src/modules/{routes,visits,gps,targets}/*` | Read-only lists |
| Custody | `src/modules/custody/CustodyPage.tsx` | No REP accept/correct/return flow |
| Archive / Messages | `src/modules/{archive,messages}/*` | Hidden from REP (permission) |
| Approvals | `src/modules/approvals/*` | Generic; no REP-facing "my requests" context |

## 3. Functional Gaps (by REP-01…REP-09)

### REP-03 — Daily Workspace
- RepDashboard is a read-only scoreboard; **no "today" status card** (trip state, GPS on/off,
  vehicle assignment, sync pending count), **no ordered daily plan**, **no start-trip CTA**,
  **no alerts for pending approvals / credit blocks / low van stock**, **no context-aware quick actions**.

### REP-04 — Daily Plan + Trip
- **Missing entirely:** `DailyPlan` entity, ordered plan from route, plan approval/request-change flow.
- **Missing:** `Trip` entity — start/pause/end, pre-checks (GPS permission, stock, cash-box balance,
  route approved), trip GPS live view, distance tracking, trip expenses.
- Policy: vehicle must be **optional** (Vehicle Assignment Optional → do not force a car).

### REP-05 — Visit Workspace
- **Missing:** a visit screen that opens from the plan with check-in (location), one-screen actions
  (new sale / collection / return / note), policy-driven credit check, check-out with result
  (visited / not found / closed / no sale), route-deviation handling (distanceFromRoute).

### REP-06 — Target Organizations (B2B)
- Customer model lacks B2B fields (legal name, commercial reg, tax number, sector, contact person).
- **Missing:** `TargetOrganization` entity + full form + duplicate detection + territory validation +
  workflow (draft → under_review → approved/rejected → convert to customer). c-031/c-032 exist only as
  placeholder pending customers with `targetFlag`, not as proper target-org records.

### REP-07 — Sales / Discount / Collection / Return
- **Missing:** discount request workflow (submitting an ApprovalRequest type `discount` from the sale
  context with reason, that blocks/annotates the sale until approved per policy).
- **Missing:** credit-limit enforcement/warning at sale time; overdue-customer warning.

### REP-08 — Daily Closing + Trip Expenses + Deposit
- **Missing entirely:** `DailyClosing` (expected vs actual cash, variance), `TripExpense`,
  `DepositRequest`. Cash page has no closing tabs, no deposit-from-rep flow.

### REP-09 — Sync Center / Mobile Inventory / Custody / Archive
- **Missing:** `SyncQueueItem` — offline/online queue with real statuses.
- **Missing:** `LoadingOrder` (receive requested stock against quantities/condition) and
  `InventoryCount` (physical vs system variance → adjustment).
- Custody: REP must accept/reject/request-correction on issued assets.
- Archive: REP lacks `archive.view`; should archive from customer/sale/collection/return/custody/
  target/closing records.
- Notifications: only `priority=high` warnings; no real business-notification generator.
- Messages: REP may only message supervisor/manager per permission (already participants-filtered;
  needs guard for REP).

## 4. Data / Type Gaps

| Missing type | Usage |
|---|---|
| `Trip` | Start/pause/end trip, GPS, distance, vehicle |
| `DailyPlan` | Ordered plan per day from RoutePlan |
| `DailyClosing` | Cash/inventory closing with variance |
| `TripExpense` | Trip costs (fuel, parking, …) |
| `SyncQueueItem` | Offline sync queue |
| `LoadingOrder` | Stock receiving (expected vs received, condition) |
| `InventoryCount` | Van count (system vs physical variance) |
| `TargetOrganization` | B2B prospect full lifecycle |
| `ContactPerson` + optional B2B Customer fields | B2B identity on Customer |
| `DepositRequest` | Rep deposit to supervisor/main box |
| Status additions | `converted`, `paused`, `synced` (needed for new entities) |

## 7. Policy-Driven UI (from spec)

- Vehicle assignment: **optional** — never force a car in Start Trip.
- GPS: required during an active trip.
- Credit check: warn/block based on policy config, not hardcoded.
- Stock request does **not** raise van stock; only **receiving a loading order** raises it.
- Transfer between reps: **complete only after receiver confirmation** per policy.
- Inventory count result → generates adjustment movement.
- Cash-box balance = derived from movements, not manually editable.
- Closing tabs: Overview / Cash / Inventory / Expenses / Submit.
- Sync center shows real statuses (pending/syncing/synced/failed) per queued item.
- Messages: REP restricted to supervisor/manager participants.

## 5. Severity Summary

| Severity | Count | Examples |
|---|---|---|
| Critical (workflow blocked) | 6 | No DailyPlan, no Trip, no VisitWorkspace, no Closing, no Sync, no Loading/Count |
| High (broken/misleading) | 4 | Non-B2B customer model, no discount workflow, no deposit flow, REP hidden from Archive/Custody actions |
| Medium (polish) | 5 | Notifications not business-real, no REP context in Approvals, plan change request, alert wiring |

## 6. Recommended Fix (order)

1. **REP-01** — Add types + interconnected mock data (all 12 scenarios) + policy config.
2. **REP-02** — Permissions, navigation, routes for new pages.
3. **REP-03** — Rebuild RepDashboard → Daily Workspace.
4. **REP-04** — Daily Plan page + Start Trip flow + Trip GPS screen.
5. **REP-05** — Visit Workspace screen.
6. **REP-06** — Target Organizations (B2B) page + workflow.
7. **REP-07** — Sale-time discount request + credit checks; enhance collections/returns.
8. **REP-08** — Daily Closing (tabs) + Trip Expenses + Deposit.
9. **REP-09** — Sync Center + Loading Order/Inventory Count + Custody actions + Archive +
   business notifications + messages guard.
10. Verify 12 scenarios end-to-end → `tsc --noEmit` + `npm run build` → 22-step test → final report.
