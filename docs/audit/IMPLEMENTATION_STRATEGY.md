# IMPLEMENTATION STRATEGY — ERP Re-Architecture

> Supersedes the per-issue FIX_PLAN. The codebase is treated as **one integrated ERP**; fixes target **root causes** and **architectural gaps**, not isolated bugs. No code changed until this strategy is accepted.

## 1. Current state (as-built) — verified from source

| Layer | Reality |
|-------|---------|
| Auth | `src/store/auth.ts` — zustand, mock login. **No session/permission middleware.** |
| User model | `User.role` in `types/index.ts` (9 roles, **SYS missing**). |
| Permissions | `rolePermissions: Record<Role,string[]>` in `permissions.ts` — flat string lists. `can(perm,role)`. |
| Guards | `PermissionRoute` — **permission only**, no role allow-list, no data scope. |
| Scope | `src/services/scope.ts` — `getDataScope` defaults DO/DIST/FIN/AUD/HR to `company` (CRITICAL leak). `canAccess*` exists for REP/SUP/SM only. |
| mockApi | `src/services/mockApi.ts` — scope filters in place for customers/invoices/visits/custody/etc. **BUT** `distributor.*` returns **unfiltered** (leak). `commission`/`bonus`/`policy` **no scope at all**. |
| Navigation | Two configs: `navigation.ts` + `supervisorNavigation.ts`. Sidebar branches on role. |
| Types | **Rich** — `SalesOrder`, `Invoice`, `SyncQueueItem`, `LeaveRequest`, `CostSnapshot`(missing), `ArchiveRecord`, `PolicyConfig`, `CommissionRun`, `Distributor`, `TargetOrganization`, `ApprovalRequest` all exist. |
| Policies | `policyConfig` (centralized operational policy, no lifecycle). `supervisorPolicies` (flat feature flags). |
| Mock data | `mock/` folder: customers, sales(invoices), collections, returns, inventory, cash, custody, visits, gps, targets, approvals, profitability, commission, policy, distributors, organization, repField, supervisor, admin. |

## 2. Root-cause problems (why the audit issues exist)

| # | Root cause | Symptoms |
|---|-----------|----------|
| RC-1 | **No SYS role** | GM inherits technical/admin perms (users.manage, roles.manage, sync.view) — Ch 3 §3.7.6 violated. |
| RC-2 | **Scope defaulting to `company`** | DO/DIST/FIN/AUD/HR see everything — fail-open. |
| RC-3 | **Permission-only route guard** | `/dashboard`, `/dev/scope-test` accessible; no role+scope binding. |
| RC-4 | **Permissions are flat strings, not bound to entities/workflow states** | SM `sales.cancel` on posted; AUD over-grants; no posted-immutability. |
| RC-5 | **Policy has no lifecycle/version/owner** | Policy edited directly without approval/audit trail. |
| RC-6 | **Navigation is role-switched branches, not a unified role→capabilities matrix** | Hard to audit; `/rep/*` duplicates generic modules. |
| RC-7 | **mockApi not uniformly scoped** | `distributor.*`, `commission.*`, `bonus.*`, `policy.*` ignore DataScope. |
| RC-8 | **No Central Configuration Authority** | `policyConfig` + `supervisorPolicies` + scattered feature flags — multiple sources of truth. |
| RC-9 | **Duplicate `/rep/*` and `/supervisor/*` pages** | Same capability in two route trees → scope drift. |
| RC-10 | **Two distributor mock datasets** | `dist-01/02` (with balances) vs `d-01/02/03` (territory mapping) — inconsistent. |

## 3. Target architecture

```
                    ┌───────────────────────────────────┐
                    │       CENTRAL AUTHORITY            │
                    │  src/config/authority.ts           │
                    │  (single source of truth)          │
                    │  - RoleCatalog (with authorities)  │
                    │  - PermissionCatalog (entity+action) │
                    │  - DataScopeMatrix (per role)        │
                    │  - PolicyRegistry (versioned)        │
                    │  - WorkflowMatrix (state transitions)│
                    └────────────┬──────┬────────┬─────────┘
                                 │      │        │
          ┌──────────────────────┘      │        └──────────────────────┐
          ▼                              ▼                            ▼
  ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
  │  AUTH + GUARD    │         │   DATA ACCESS    │         │   NAVIGATION     │
  │ src/store/auth   │         │ src/services/    │         │ src/config/      │
  │ src/components/  │         │   scope.ts       │         │  navigation.ts   │
  │  guards/         │         │ src/services/    │         │ (unified, role-  │
  │  PermissionRoute │         │  mockApi.ts      │         │  capabilities   │
  │  RoleRoute       │         │  (scoped queries)│         │  driven)        │
  └──────────────────┘         └──────────────────┘         └──────────────────┘
          │                              │                            │
          └──────────────────────┬───────┴────────┬──────────────────┘
                                 ▼                ▼                    ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │           DOMAIN MODULES (src/modules/)                   │
                    │  customers  sales  inventory  cash  custody  planning    │
                    │  visits    targets  credit  approvals  reports         │
                    │  distribution  commission  policy  audit   archive      │
                    └─────────────────────────────────────────────────────────┘
                                 │                │                    │
                                 └─────────┬──────┴────────┬───────────┘
                                           ▼               ▼
                                ┌────────────────┐  ┌────────────────┐
                                │  LEDGER LAYER  │  │  INTEGRATION   │
                                │ (movements →   │  │ src/services/  │
                                │  balances)     │  │  integration.ts │
                                └────────────────┘  └────────────────┘
```

### 3.1 Central Authority (`src/config/authority.ts`) — NEW
Single source of truth replacing scattered `rolePermissions`, `roleLevel`, `supervisorPolicies`, `policyConfig`. Contains:

- **RoleCatalog** — 11 roles: REP, SUP, SM, DO, DIST, WH, FIN, GM, SYS, AUD, HR. Each with `authority: "technical" | "business" | "administrative" | "operational" | "compliance"`.
- **PermissionMatrix** — `PermissionKey` = `"{entity}.{action}"` (e.g. `invoice.post`, `customer.approve`). Actions normalized: view/create/edit/submit/review/approve/execute/receive/post/settle/cancel/export/manage. Bound to entity lifecycle.
- **DataScopeMatrix** — role → explicit `ScopeType` (self/team/branch/entity/network/people/audit/system/admin). **Default = none (fail-closed)**.
- **PolicyRegistry** — versioned policies with lifecycle.
- **WorkflowMatrix** — state transitions per entity type (no invalid transitions).
- **SoDMatrix** — conflicting permission pairs.

### 3.2 Auth + Guard layer
- `useAuthStore` keeps `user` + derived `userPermissions` + `dataScope`.
- `PermissionRoute` enhanced → checks `permission` AND `roles` AND `dataScope` (via `canAccess*`).
- New `RoleRoute` component for role-only sections (e.g. SYS-only `/dev/scope-test`).
- New `ScopeGuard` component for inline data-level checks (lists, actions, modals).

### 3.3 Data access layer
- `scope.ts` → `getDataScope` returns **explicit scope per role** (fail-closed).
- `mockApi.ts` → **every** endpoint filters by scope; adds `distributor.*` scoping, `commission.*`/`bonus.*` scoping, `policy` read-only for non-SYS.
- **Reconcile distributor mocks**: merge `d-01..d-03` (territory/map) with `dist-01/02` (financials) → single `Distributor` list w/ `id`, `territoryIds`, `branchId`, `balance`, `creditLimit`.

### 3.4 Navigation layer
- **Unified** `navigation.ts` — single `Capabilities[]` structure; Sidebar filters by `role.capabilities` (not role string). Removes `/rep/*` duplicates; `/supervisor/*` stays (team-monitoring is a distinct capability, not a duplicate).

## 4. Role authority model (decisions locked)

| Role | Canonical | Authority class | Scope (fail-closed) | Inherits? |
|------|-----------|-----------------|---------------------|-----------|
| REP | Representative | Operational | self | none |
| SUP | Supervisor | Operational | team | **none** |
| SM | Sales Manager | Operational/Administrative | branch | **none** (not SUP+) |
| DO | Distribution Officer | Operational | network (own distributor chain) | none |
| DIST | Distributor | Operational | entity (own only) | none |
| WH | Warehouse Keeper | Operational | warehouse | none |
| FIN | Finance | Business | network (financial) | none |
| GM | General Manager | Administrative/Business | company | **none** (not SYS+) |
| SYS | System Admin | Technical | system | none |
| AUD | Auditor | Compliance | company (read) | none |
| HR | HR | Administrative (people) | people | none |

**SYS has NO business permissions** unless explicitly granted. GM has NO technical permissions.

## 5. Implementation phases (root-cause driven)

### Phase A — Central Authority + SYS role (root-cause: RC-1, RC-8)
- Create `src/config/authority.ts`: RoleCatalog (add SYS, WH), PermissionMatrix, DataScopeMatrix, WorkflowMatrix (initial state map), SoDMatrix.
- Add `SYSTEM_ADMIN` to `Role` enum + `rolePermissions` (technical only: users.view/manage, roles.manage, organization.manage, settings.manage, sync.view, integration.*, audit.view).
- Remove technical perms (`users.manage`, `roles.manage`, `sync.view`, `settings.manage`, `organization.manage`) from GM → move to SYS.
- `tsc --noEmit` + build + test: GM cannot manage users; SYS can; SYS has no `sales.cancel`/`credit.approve`.

### Phase B — Data Scope Framework (root-cause: RC-2, RC-7)
- Rewrite `getDataScope` → fail-closed, explicit per role.
- Add `canAccessDistributor`, `canAccessFinancialReport`, `canAccessPerson`.
- Scope `mockApi.distributor.*` (DO sees own chain; DIST sees self only), `commission.*`, `bonus.*`, `policy.*` (SYS/SM/GM read; SYS write).
- Reconcile distributor mocks → single source.
- Test: DO lists distributors → only own; DIST → only own; FIN audit → only financial scope.

### Phase C — Unified Navigation + Route Dedup (root-cause: RC-6, RC-9)
- Rewrite `navigation.ts` as capability matrix; Sidebar consumes `user.capabilities`.
- Remove `/rep/*` duplicate routes (redirect to generic modules); keep `/supervisor/*` (distinct team-monitoring capability).
- Guard `/dashboard` (role-aware) + lockdown `/dev/scope-test` (SYS/DEV only).
- Test: REP nav has no supervisor items; SM nav has no `/rep/*`; unauth direct-URL on `/dev/scope-test` → 404/redirect.

### Phase D — Transaction Integrity + Immutability (root-cause: RC-4, RC-9)
- Posted invoices read-only (no PUT/POST on Posted).
- Cancellation = new workflow (`CancellationRequest` → CreditNote/Return). SM loses posted-cancel.
- Approval self-approve blocked (`requestedBy !== approver`).
- Mock data chains sales→inventory movement→customer ledger→profitability (no orphan records).
- Test: POSTED invoice edit → denied; self-approve → denied; inventory decrement on sale exists.

### Phase E — Policy Lifecycle + Central Config (root-cause: RC-5, RC-8)
- Promote `policyConfig` to versioned `PolicyRegistry` (Draft→Archived, owner, effective dates, audit trail, new-version-on-change).
- Integrate `supervisorPolicies` feature flags into PolicyRegistry (single source).
- `/policy` page enforces lifecycle: only Draft editable.
- Test: edit Published policy → denied; new version created; audit trail records.

### Phase F — Ledgers + Reporting (root-cause: RC-9 transaction integrity)
- `CustomerLedger`, `CashBox` balance, `InventoryBalance` derived from movements (no manual edits).
- Reports read from same scoped mockApi queries (Sales = invoices list; Collections = collections list; Profitability = profitabilityRecords; Commission = commissionRuns).
- Test: report total matches sum of scoped transactions; no separate mock numbers.

### Phase G — Business Entities Completion (corrected Phase 5)
- Entities exist as **types** (`SalesOrder`, `SyncQueueItem`, `LeaveRequest`) but `SalesOrder` is not in mockApi as operational data, `CostSnapshot` missing, `IntegrationEvent` not modeled. Wire them:
  - `SalesOrder` → mockApi (draft→submitted→posted; triggers invoice+movement+ledger).
  - `CostSnapshot` → add type + mock + mockApi (product/date/cost; profitability source-of-truth).
  - `IntegrationEvent` → add type + mockApi (status/attempts/retryAt; retry backoff policy).
  - `LeaveRequest` → already typed; scope + workflow (Draft→Submitted→Approved/Rejected).
- Each entity mapped to: BR, UC, State Machine, Module, Roles, Audit Requirement.

### Phase H — Final Audit (acceptance gates)
- Re-run all gates from §6 below. Produce `FINAL_AUDIT_REPORT.md`.

## 6. Acceptance gates (run after each phase — blocking)

1. `npx tsc --noEmit` — no errors.
2. `npm run build` — no errors.
3. **Direct URL** — unauth → redirect/login; unauthorized role → 403.
4. **Unauthorized scope** — DO lists distributors → only own chain; DIST → only own.
5. **Unauthorized action** — Posted invoice edit → denied; self-approve → denied.
6. **API/mockApi direct access** — `mockApi.distributor.list()` as DIST → only own.
7. **Navigation** — REP sees no supervisor/SYS items; SYS sees only technical.
8. **Reports** — totals match scoped underlying transactions.
9. **Posted transactions** — no edit path reaches write API.
10. **Policy lifecycle** — Published not directly editable; version created.
11. **Audit** — sensitive operations (policy change, posted-cancel attempt, scope change) produce AuditLog entries.
12. **Regression** — prior phase tests still pass.

## 7. Files changed (anticipated)

| File | Action | Phase |
|------|--------|-------|
| `src/types/index.ts` | Add `SYSTEM_ADMIN`, `WAREHOUSE` roles; fix `RoleDefinition`; add `CostSnapshot`, `IntegrationEvent` | A, G |
| `src/config/authority.ts` | **NEW** — central authority | A |
| `src/config/permissions.ts` | Slim to proxy `authority.ts` (compat) | A |
| `src/config/navigation.ts` | Rewrite as capability matrix | C |
| `src/config/supervisorNavigation.ts` | Fold into unified (or keep, driven by authority) | C |
| `src/services/scope.ts` | Fail-closed scopes + new `canAccess*` | B |
| `src/services/mockApi.ts` | Scope all endpoints; distributor/commission/bonus/policy scoping | B |
| `src/components/guards/PermissionRoute.tsx` | Add role+scope checks | C |
| `src/components/guards/RoleRoute.tsx` | **NEW** | C |
| `src/components/guards/ScopeGuard.tsx` | **NEW** | C |
| `src/layouts/AppLayout/Sidebar.tsx` | Consume capability matrix | C |
| `src/App.tsx` | Guard `/dashboard`, lockdown `/dev/scope-test`, redirect `/rep/*` | C, D |
| `src/pages/DashboardPage.tsx` | Role-aware KPI loading | C |
| `src/pages/InvoiceDetailPage.tsx` | Posted → read-only | D |
| `src/services/integration.ts` | **NEW** — retryable sync | G |
| `src/mock/distributors.ts` | Reconcile with organization.ts | B |
| `src/mock/policy.ts` | Add lifecycle/owner/version/audit | E |
| `src/mock/costSnapshots.ts` | **NEW** | G |

## 8. Risks & mitigations
- **Risk**: Large refactor breaks UI. **Mitigation**: Phase A/B first (data layer), keep component APIs stable, type-driven.
- **Risk**: Navigation rewrite breaks routes. **Mitigation**: redirect `/rep/*` → generic; preserve supervisor paths.
- **Risk**: SYS role removes perms GM needs day-to-day. **Mitigation**: GM retains business/admin; SYS = dedicated technical admin.
- **Risk**: Scope rewrite filters out legitimate data. **Mitigation**: test matrix per role; explicit whitelist of `none`-scope fallbacks only where Ch 3 allows.

## 9. Documents updated
`AUDIT.md`, `FIX_PLAN.md`, `IMPLEMENTATION_STRATEGY.md` (this), `AUTHORIZATION_MATRIX.md`, `ROLE_SCOPE_MATRIX.md`, `DUPLICATION_REPORT.md` — status column updated to Resolved/Ongoing per phase.
