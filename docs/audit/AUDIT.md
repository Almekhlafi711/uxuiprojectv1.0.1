# Enterprise Sales & Distribution ERP — Functional & Authorization Audit

**Scope:** ANALYSIS ONLY. No code, routes, permissions, policies, or mock data were modified.

**Methodology:** Compare the current implementation (as-is) against the highest-authority requirements in priority order:
1. **Chapter 3 — Operational Requirements Spec (v1.0)** ← authoritative
2. **Business Decisions** made during the current session / project Business Decisions
3. **Existing functional role docs** (REP/SUP RBAC + Data Scope audits already in repo)
4. **Chapter 4 — Architecture/logical model decisions** (Role+Permission+Scope+Policy+Workflow+Audit; balances derive from ledgers; Target Customer separate from Active Customer; Vehicle Custody separate from Mobile Stock; configurable Sales Order; Integration Hub separated; retryable accounting integration)
5. **Current code** = *Implementation Baseline under audit*, **not** a requirements source.

If code conflicts with the docs, the docs win. The code is recorded as non-compliant; it is not allowed to redefine the requirement.

---

## 1. Executive Summary

The system is currently a **UI/Mock Demo with RBAC scaffolding**, not an operationally consistent ERP. Role separation exists at the route layer for some modules, but:
**(a)** a global unguarded `/dashboard` renders for every authenticated user;
**(b)** `Role` is used as a permission bucket where `Role == Role + Permission + Scope` collapses together;
**(c)** business functions are duplicated as parallel `/rep/*`, `/supervisor/*`, and `/module` pages instead of a single `Module + Role-aware View + Data Scope`;
**(d)** several new roles (DO/DIST/FIN/AUD/HR) silently fall into a `company` data scope that violates Chapter 3 isolation;
**(e)** core workflows (Target Customer → Active, Sales Order→Invoice→Ledger, Sell-In/Sell-Out, Asset/Custody handover) are not yet wired end-to-end — pages render mock data only.

**Primary risk = Data Scope leakage**, not merely unauthorized page view: unguarded routes and company-scoped queries for DO/DIST can expose one actor's data to another.

---

## 2. Canonical Role Mapping

| Canonical | Code Role (current) | Data Scope (current) | Compliant? |
|-----------|---------------------|----------------------|------------|
| REP       | `REPRESENTATIVE`    | `self`               | Scope OK; duplicated pages & Role-as-permission |
| SUP       | `SUPERVISOR`        | `team`               | Partial — must not inherit REP actions |
| SM        | `SALES_MANAGER`     | `branch`             | Partial — over-granted on config |
| DO        | `DISTRIBUTION_OFFICER` | `company` **(VIOLATION)** | NO — should be DO-network scope |
| DIST      | `DISTRIBUTOR`       | `company` **(VIOLATION)** | NO — should be own-entity scope |
| WH        | *not a role* (function) | — | NOT MODELED |
| FIN       | `FINANCE`           | `company`            | NO — should be finance-domain scoped |
| GM        | `GENERAL_MANAGER`   | `company`            | Partial — GM OK, but GM ≠ SYS |
| SYS       | **MISSING**         | —                    | NO — required by Ch 3.7.6 / 3.25 |
| AUD       | `AUDITOR`           | `company` (read)     | Partial — read scope OK; reduce over-grants |
| HR        | `HR`                | `company`            | Partial — verify people-only scope |

> Chapter 3 (3.4, 3.7.6, 3.31) requires role separation. The code `roleLevel` (GM=1…REP=4) implies *level inheritance* which Chapter 3 explicitly forbids (`SM is not SUP+`). Scope must be **Role + Permission + Data Scope + Policy**, never Role-level arithmetic.

---

## 3. Route Audit (full table in `routes_snapshot.json`)

**Total routes: ~64.** Unguarded: `/dashboard`, `/rep/dashboard`. Dev-only: `/dev/scope-test`.

Guarded by permission only, **no role allow-list** on global modules → any role holding the permission key can enter; security then depends entirely on component-level filtering + `currentScope()`.

**Route-level problems:**
- `/dashboard` & `/rep/dashboard`: **no PermissionRoute/roles guard** → Critical.
- `/distribution-officer` & `/distributor` (newly added): only guarded by `distributor.manage`/`distributor.view`, but `mockApi.distributor.*` returns unfiltered lists → **Data Scope Violation** regardless of route guard.
- `/policy` requires `settings.manage` (GM only) — correct; but component edits have no version/approval (3.24 violation).

---

## 4. Permission Audit (full matrix in `role_permissions_snapshot.json`)

The action model is **coarse** vs Chapter 3 3.8. Missing actions: `submit`, `review`, `reject`, `return`, `execute`, `receive`, `post`, `close`, `restore`. Functions are lumped under `*.view`/`*.manage`/`*.create`/`*.approve`.

**Key findings:**
- **REP** has `sales.create` but no submit/post/cancel; REP sale entry is via `VisitWorkspace`, so `/sales/new` → `sales.create` is misaligned.
- **SUP** has `returns.approve`, `customers.transfer`, `customers.deactivate` — acceptable per SUP function doc; but SUP also has `sales.view` with no own-rep scoping guarantee on `/sales`.
- **SM** has `sales.cancel` (cancel of posted invoices) — Chapter 3 3.31 says posted invoices are not editable; cancel of posted is a financial action needing higher authority → **Flag**.
- **FIN** has `discount.approve`/`credit.approve` — Finance approving *field* discount/credit is outside Finance's stakeholder scope (Ch 3.5) → **Business Decision (BD-1)**.
- **HR** has `customers.view`/`routes.view`/`reports.view` → **over-grant** (BD-2).
- **AUD** has `messages.view`/`routes.view`/`targets.view` → **over-grant**.
- **DO** has `customers.view`/`routes.view`/`visits.view`/`gps.view` → DO needs distributor network only → likely over-broad.
- **`distributor.*`** granted correctly: GM/SM/DO only. REP/SUP/AUD/FIN/HR excluded. ✅

---

## 5. Data Scope Audit (full detail in `scopes_snapshot.json`)

`getDataScope()`: REP→`self`; SUP→`team`; SM→`branch`; **default→`company`** (catches GM, DO, DIST, FIN, AUD, HR).

### Critical scope findings:
1. **`company` default for non-core roles.** DO/DIST/FIN/AUD/HR all get `company` scope → they see *all* data in any `canAccess*` that returns true for `company`. Violates Ch 3.6/3.7.5.
2. **Distributor/Sell-In/Sell-Out** returned unfiltered by `mockApi.distributor.*` — DO/DIST pages apply client-side filters only; **API-level scope missing** → direct mock API call leaks.
3. **Profitability** scopes by `repId` for REP, but GM/SM (company/branch) see all — and uses **live cost** instead of Cost Snapshot (violates 3.15/3.21).
4. `canAccessGps` verified OK (rep self / sup team).
5. `canAccessStockTransfer` filters on receiver `toRepId` only — acceptable.

### Leak matrix (expected vs actual):
- REP-A → Customer/Invoice/Stock/CashBox/Visit/Route of REP-B: blocked by `isRep(scope, x.repId/ownerId)` in mockApi → **OK** (provided the page uses the scoped endpoint).
- REP-A → `/distributor`: REP lacks `distributor.view` → route denies → **OK**.
- DO-A → Distributor NOT in DO network: `mockApi.distributor.list()` returns ALL → **LEAK**.
- DIST-A → Distributor NOT its own entity: `mockApi.distributor.*` returns ALL → **LEAK**.

---

## 6. Workflow Audit

| Process | Required State Machine (Ch 3) | Implemented? | Gap |
|---------|------------------------------|--------------|-----|
| Sale → Invoice | Customer→Product→Price→Stock→Credit→Discount→Approve(if needed)→Invoice→Movement→Ledger→Profitability→Commission→Audit | PARTIAL | VisitWorkspace creates sale; Invoice→Ledger→Profitability→Commission not chained; audit not generated |
| Customer Target | Draft→Submitted→Review→Approved/Rejected/Returned→Active | NOT MODELED | `/customers/new` is generic; Target Customer lifecycle absent (Ch 3.12/3.15) |
| Credit | Check→Within Limit (continue) / Over Limit (Approval Request) | PARTIAL | CreditPage reads limits; over-limit approval not wired |
| Discount | Policy-based → Approval matrix | PARTIAL | `discount.approve` exists; matrix config not surfaced |
| Stock Request | Request→Approval→Preparation→Delivery→Receiving→Inventory Update | PARTIAL | Rep page present; no SM/SUP approval step |
| Stock Transfer | Sender→Transfer→Receiver→Inspect→Accept/Partial/Reject→Reconcile | PARTIAL | Rep page present; quantity/condition difference not modeled |
| Custody / Asset Handover | Request(do)→Approve(SM)→Handover→Supervisor Doc→Rep Review/Accept→SM Approve→Archive (versioned) | NOT WED | `assetApprovalWorkflow` config exists; no UI/state |
| Leave | Draft→Submitted→Under Review→Approved/Rejected/Returned | UNVERIFIED | LeavesPage present; state machine not confirmed |
| Daily Closing | Closing→Reconcile→Variance→Approve | PARTIAL | DailyClosingPage present; variance approval not enforced |
| Inventory Count | Count→Adjustment Movement | PARTIAL | `countGeneratesAdjustment` configured; adjustment not confirmed |
| Archive edit | Request→Review→Approve→Version | PARTIAL | `archive.edit`/`archive.override` exist; no version chain visible |
| Commission | Provisional→Review→Final→Approved→Exported; Bonus Draft→Approved→Paid | IMPLEMENTED | State OK; profitability link + Cost Snapshot pending |

---

## 7. Separation of Duties (SoD) Audit

Per Chapter 3 3.9/3.31: a single actor must not Create+Approve (or Approve+Execute) when the policy forbids it.

| Process | Required SoD | Code Behavior | Status |
|---------|-----------|---------------|--------|
| Asset Request | Supervisor creates; **SM approves** (`supervisorCannotApproveOwn=true`) | Config exists; UI must enforce `currentStep.role === SM` | PENDING |
| Discount | Rep→SM/GM per matrix | `discount.approve` on GM/SM/SUP/FIN | BUSINESS DECISION (BD-1) |
| Credit Override | SM/GM per policy | `credit.approve` on GM/SM/SUP/FIN | BUSINESS DECISION (BD-1) |
| Commission Approve/Export | SM/FIN approve; REP view only | Implemented in CommissionPage ✅ | KEEP |
| Inventory Count Adjustment | Counter ≠ Approver ≠ Owner | `inventory.count` on GM/SM/SUP only; REP `inventory.request` only | GAP |
| Archive edit | Editor ≠ Approver (higher) | `archive.edit`/`archive.override` GM only | GAP |
| Customer Transfer | Owner ≠ Approver if requiresApproval | `customerTransfer.requiresApproval=false` (policy) ✅ | OK |

---

## 8. Duplicate Routes / Pages (full matrix in `routes_snapshot.json`)

| Canonical Function | Route A | Route B | Same function? | Only-diff is Scope? | Recommended Action |
|---|---|---|---|---|---|
| Customer list | `/customers` (CustomersPage) | `/rep/customers` (RepCustomersPage) | YES | YES (scope) | **MERGE** |
| Customer 360 | `/customers/:id` (Customer360Page) | `/rep/customer/:id` (RepCustomer360Page) | PARTIAL | YES | **MERGE**; remove RepCustomer360Page |
| Van inventory | `/inventory/van` (VanInventoryPage) | `/rep/van` (RepVanInventoryPage) | YES | YES | **MERGE** |
| Stock transfers | `/inventory/transfers` | `/rep/stock-transfers` | YES | YES | **MERGE** |
| Stock requests | `/inventory/requests` | `/rep/stock-requests` | YES | YES | **MERGE** |
| Custody | `/custody` | `/rep/custody` | YES | YES | **MERGE** |
| Reports | `/reports` | `/rep/reports` | YES | YES | **MERGE** |
| GPS | `/gps` | `/rep/gps` | YES | YES | **MERGE** |
| Messaging | `/messages` (MessagesPage) | `/rep/messages` (RepMessagesPage) | PARTIAL | — | **REVIEW** then MERGE |

**Supervisor routes** (`/supervisor/*`) are **NOT** simple duplicates: team-monitoring view (Planning/Notes/Activity/Deviations) reusing shared components where the function is identical. **KEEP** — but enforce `team` scope at the API layer.

---

## 9. Duplicate Permissions

- `sales.view` shared across all roles — too coarse (Ch 3.8 wants view/create/edit/submit/post/approve/cancel).
- `customers.view` reused everywhere — acceptable as base read if scope enforced; should add explicit `own/team/region` variants.
- `inventory.view` single-gates warehouse/van/transfers/requests/movements — too coarse (Ch 3.3.13).
- `messages.view` on `/messages` vs `supervisor.comms` — minor namespace duplication.

---

## 10. Configuration Security

| Config area | Allowed (Ch 3) | Current code | Compliant? |
|---|---|---|---|
| Users / Roles / Permissions | GM / SYS | GM + HR | **HR over-grant** (BD-2) |
| Organization | GM / SYS | GM + HR | OK (org=structure) ✅ |
| Policies / Workflows | GM / SYS | `settings.manage` GM only ✅; SM `settings.view` ✅ | OK |
| Credit/Discount Policy | GM / SM | policy object, no UI owner/audit | GAP (3.24) |
| Commission/Bonus Policy | GM / SM | PolicyCenter mock + CommissionPage | GAP — no approval/version |
| GPS Policy | GM / SM | `repPolicies.gps.*` only | GAP — not in UI |
| Closing Policy | GM / SM | `supervisorPolicies.closing.*` only | GAP — not in UI |
| Integration Settings | GM / SYS | **NOT present** | **MISSING** |
| Approval Limits | GM per policy | no matrix UI | GAP (3.28/3.33) |

---

## 11. Mock Data Audit (`MOCK_DATA_AUDIT.md`)

Relations mostly consistent with Ch 3.30. **Inconsistencies:** No `CostSnapshot` on invoices/returns (profitability recomputes on live cost); no `SalesOrder` entity for configurable flow; `User.distributorId` added but DO-network / DIST-entity scope not implemented in `canAccess*`/`getDataScope`; no `CustomerLedger`/`TargetCustomer` lifecycle records; `SyncQueue`/`IntegrationEvent` fields partial.

---

## 12. Business Process Audit

| Process | Implemented? | Wiring missing |
|---|---|---|
| Customer Target → Approval → Active | NO | lifecycle separate from Active Customer (3.12/3.15) |
| Sales Order → Invoice → Movement → Ledger → Profitability → Commission → Audit | PARTIAL | ledger/profitability links, audit generation |
| Credit over-limit → Approval → unblock | NO | not enforced pre-`sales.create` |
| Vehicle Custody separate from Mobile Stock | PARTIAL | custody record exists; no handover workflow |
| Distributor Sell-In → receive → stock impact → Sell-Out → commission | PARTIAL | not chained to ledger/profitability |
| Archive versioned + locked-read-only | NO | no lock/append-only enforcement |

---

## 13. Missing Functions (Ch 3 coverage)

- **SYS (System Administrator)** role + Integration Hub + system audit trail.
- **Target Customer lifecycle** (Target→Active) separate from Active Customer (Ch 3.12/3.15, Ch 4).
- **Approval Matrix / Approval Limits** UI (Ch 3.33).
- **Versioned Policy Configuration** with Owner+Effective Date+Approval+Audit (Ch 3.33).
- **Workflow definitions as data** (not only `assetApprovalWorkflow` const).
- **Cost Snapshot** on invoices/returns; profitability layers (Ch 3.21).
- **Accounting Integration Hub**: `IntegrationEvent`, `SyncQueue` retry + conflict resolution (Ch 3.22/3.28).
- **GeofenceEvent / Route Deviation** persisted (Ch 3.19).
- **Exception handling** (offline/credit/late-visit/stock-variance) (Ch 3.32).

---

## 14. Unauthorized / Misplaced Functions (Role→Function)

- REP can route to global `/customers`, `/sales`, `/inventory/*`, `/cash`, `/reports`, `/gps`, `/archive`... — security relies on component+scope filtering (unverified for every page). **Risk.**
- SM has `sales.cancel` on possibly-posted invoices (Ch 3.31 violation).
- FIN has field `discount.approve`/`credit.approve` (BD-1).
- HR over-grant; AUD over-grant; DO over-grant.
- `/dev/scope-test` unguarded dev route.

---

## 15. Severity Tally

- **CRITICAL (7):** (1) unguarded `/dashboard`+`/rep/dashboard`; (2) DO/DIST in `company` scope; (3) `mockApi.distributor.*` unfiltered (API scope missing); (4) Target Customer conflated with Active Customer; (5) duplicate rep↔module pages expose global routes; (6) `/policy` no version/approval/audit; (7) `/dev/scope-test` in prod build.
- **HIGH (9):** (1) duplicate `/rep/*` customer/van/transfers/requests/custody/reports/gps pages; (2) profitability live cost (no Cost Snapshot); (3) coarse permissions; (4) SM `sales.cancel`; (5) SUP routes no API-level team scope verify; (6) Customer 360 shared w/o per-role field visibility; (7) messaging two components; (8) no SalesOrder entity; (9) no Approval Matrix UI.
- **MEDIUM (8):** no SYS role; HR over-grant; AUD over-grant; FIN field discount/credit; no integration/retry; no geofence persistence; leave state-machine unverified; SUP handover workflow not implemented.
- **LOW (6):** two policy config files should unify; naming inconsistency; `any` casts in new pages; `can` not a single hook; policies lack TS interfaces; CSV export encoding not hardened.

---

## 16. Required Refactoring (ordered, for the fix phase)

1. **Scope the API layer, not just UI** — add scope filtering inside every `mockApi.*list/get*` for DO-network, DIST-entity, FIN-domain, AUD-audit; block `company` for DO/DIST.
2. **Guard `/dashboard` & `/rep/dashboard`** with PermissionRoute + role allow-list + scope.
3. **Remove `/dev/scope-test`** from production (gate behind dev-only flag).
4. **Merge duplicate pages** into one role-aware `Module + Data Scope` component; delete `/rep/customers`, `/rep/customer/:id`, `/rep/van`, `/rep/custody`, `/rep/reports`, `/rep/gps`, `/rep/stock-transfers`, `/rep/stock-requests`.
5. **Model Target Customer lifecycle** separately; `/customers/new` must branch Target vs Active.
6. **Add Cost Snapshot** to invoices/returns; read in profitability.
7. **Add SYS role** + Integration Hub + `IntegrationEvent`/`SyncQueue` retry.
8. **Version + Audit policies**: `{ owner, version, effectiveDate, approvedAt, approvedBy }` + AuditLog on change.
9. **SoD enforcement in components** (reject Create+Approve same session).
10. **Unify configuration** into Policy Center UI (GPS interval, closing, supervisor toggles, approval matrix).
11. **Restrict FIN/HR/AUD/DO** to stakeholder domain at API scope.

---

## 17. Business Decisions Required

| # | Question | Options | Affected Roles | Affected Modules |
|---|----------|---------|----------------|--------------------|
| BD-1 | Should FINANCE approve field discount/credit currently granted? | Keep FIN / Revoke | FIN, SM, GM | Credit, Discount, Invoices |
| BD-2 | Should HR be allowed `users.manage`/`roles.manage`, or only org/leaves? | HR=people/org only | HR | Users, Organization |
| BD-3 | Should DO scope be by branch or by managed-distributor-network? | network | DO | Distributor |
| BD-4 | Who owns Target Customer approval — SM or SM+GM for high-value? | SM per Ch 3.12 | SM, GM | Customers, Approvals |
| BD-5 | Should `/rep/*` duplicate pages be merged to generic module pages with scope, or kept as distinct REP experiences? | MERGE (Ch 3.6 + Ch 4 Module+Views principle) | REP, SUP, SM | Customers, Inventory, Custody, Reports, GPS, Transfers, Requests |
| BD-6 | Who manages Integration Settings / SYS role — separate SYS user or GM delegate? | GM+optional SYS | GM, SYS (new) | Settings, Users |
| BD-7 | Approval matrix thresholds for discount/credit — fixed values or per-rep tier? | fixed per policy | SM, GM | Credit, Discount, PolicyCenter |

---

## 18. Compliance Matrix vs Chapter 3

| Ch 3 section | Requirement | Current state | Gap? |
|---|---|---|---|
| 3.1–3.5 Roles | Role ≠ permission bucket; hierarchy DO under SM | Roles exist; hierarchy enforced via scope only | GAP (level inheritance risk) |
| 3.6 Data Scope | applied in API/queries/reports/search/export | applied in mockApi `canAccess*` for REP/SUP/SM; **missing for DO/DIST/FIN/AUD/HR (company default)** | CRITICAL |
| 3.8 Action model | granular actions submit/review/post/close... | coarse `*.view/approve` | HIGH |
| 3.9 SoD | no Create+Approve same actor | policy const exists; no component enforcement | HIGH |
| 3.11 Sales | Customer→...→Invoice→Ledger→Profitability→Commission→Audit chained | partial | HIGH |
| 3.12 Target Customer | separate lifecycle to Active | conflated with `/customers/new` | CRITICAL |
| 3.14 Cash | balance from movements, not edited | balance computed; verify no direct edit | REVIEW |
| 3.15/3.21 Cost Snapshot | cost frozen on transaction | live cost used | HIGH |
| 3.16 Transfer | receiver inspect/accept/reject/reconcile | rep page only; no difference model | MEDIUM |
| 3.19 GPS | GeofenceEvent/Route Deviations | GPS page; no persistence | MEDIUM |
| 3.20 Offline-Sync | queue/retry/idempotency/conflict | `repPolicies.sync` config only | GAP |
| 3.22 Accounting Integration | Integration Hub, retryable | not present | MISSING |
| 3.24/3.33 Policy Versioning | owner+effective+approval+audit+version | no versioning/audit (except PolicyCenter mock has `version`? no) | CRITICAL |
| 3.25 Messages | scoped conversation, no global chat | two components, scope partial | HIGH |
| 3.27 Reports | Data Scope enforced | unverified | REVIEW |
| 3.31 Invariants | rep sees own only; balances via ledger; posted invoice read-only; no self-approve | partial | CRITICAL/HIGH |
| 3.32 Exceptions | offline, credit, late visit, stock variance | not modeled | GAP |

---

## 19. Fix Plan (sequenced) — ANALYSIS ONLY, not yet executed

Phase 1 (Authorization hardening): guard `/dashboard`; scope `mockApi.distributor.*`; add `DataScope` to DO/DIST/FIN/AUD/HR; remove `/dev/scope-test`.

Phase 2 (Dedup + Module Views): merge `/rep/*` duplicates into scoped generic pages; remove redundant components.

Phase 3 (Business lifecycle): Target Customer lifecycle; Cost Snapshot + profitability layers; Sales Order entity; ledger chaining.

Phase 4 (SoD + Workflows): component-level SoD checks; approval matrix UI; versioned policies with audit.

Phase 5 (Integration + Exceptions): Integration Hub/SyncQueue; Geofence + route deviation; offline conflict resolution.

---

## 20. Deliverables Produced (in `docs/audit/`)

- `AUDIT.md` (this file)
- `role_permissions_snapshot.json` + `.csv`
- `routes_snapshot.json` + `.csv`
- `policies_snapshot.json`
- `scopes_snapshot.json`
- `AUTHORIZATION_MATRIX.md`
- `ROUTE_ACCESS_MATRIX.md`
- `ROLE_SCOPE_MATRIX.md`
- `DUPLICATION_REPORT.md`
- `FUNCTIONAL_GAPS.md`
- `MOCK_DATA_AUDIT.md`
- `BUSINESS_DECISIONS_REQUIRED.md`
