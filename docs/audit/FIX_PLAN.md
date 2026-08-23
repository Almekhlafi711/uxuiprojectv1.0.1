# FIX PLAN

Phased remediation. Code unchanged until `FIX_PLAN.md` is accepted. Each fix ends with `tsc --noEmit` + `npm run build` + security re-test.

## Phase map
| Phase | Title | Goal | Security impact |
|-------|-------|------|-----------------|
| 1 | Authorization Hardening | Guard unguarded routes/guards | High |
| 2 | Data Scope Hardening | Fail-closed scopes, scope mockApi | Critical |
| 3 | Route/Page Deduplication | Merge `/rep/*` duplicates | Medium |
| 4 | Workflow & Separation of Duties | Posted read-only, cancel workflow, SoD | High |
| 5 | Missing Business Entities | SalesOrder/CostSnapshot/IntegrationEvent/SyncQueue/LeaveRequest stubs | Medium |
| 6 | Policy Lifecycle | Draft→Archived, version/audit | High |
| 7 | Mock Data Integrity | Relations + filters for new scopes | Medium |
| 8 | Functional Completion | State machines, targets, credit, archive lock | Medium |
| 9 | Final Audit | Re-run AUDIT.md against code | High |

---

## PHASE 1 — Authorization Hardening

| # | Issue | Files | Change | Security | Business | Tests | Acceptance |
|---|-------|-------|--------|----------|----------|-------|------------|
| 1.1 | SYS role missing | `src/types/index.ts`, `src/config/permissions.ts`, `src/config/navigation.ts` | Add `SYSTEM_ADMIN` to `Role` enum; add `SYS` canonical in `rolePermissions` with only `users.view/manage`, `roles.manage`, `organization.manage`, `settings.manage`, `sync.view`, `audit.view`, `integration.*`; never inherits GM business perms | Closes SYS gap | Separates admin from business | tsc+build; login as SYS, assert no `sales.cancel`/`credit.approve`/`commission.approve` | SYS cannot approve business |
| 1.2 | GM no longer inherits SYS | `src/types/index.ts`, `src/config/permissions.ts` | `roleLevel` GM=4, SYS=5; `rolePermissions` GM has NO integration/sync/users.manage (those move to SYS) | Removes admin creep | GM stays business | Assert GM lacks `users.manage`/`sync.view` | GM cannot manage users |
| 1.3 | `/dashboard` unguarded | `src/App.tsx`, `src/pages/DashboardPage.tsx` | Wrap in `PermissionRoute` + `roles` allow-list; route reads `getDataScope(role)` to slice data | Closes unguarded entry | Role-aware dashboard | Unauth→redirect; REP sees own only | No global dashboard visible |
| 1.4 | `/dev/scope-test` exposed | `src/App.tsx` | Route only renders if `role === SYS` (or `import.meta.env.DEV`); hide from navigation | Closes dev leak | Dev-only kept | DEV only; non-SYS 404/redirect | Not in prod nav |
| 1.5 | GM `sales.cancel` on posted | `src/config/permissions.ts` | `sales.cancel` → draft only; posted cancel via Credit Note/Return; SM loses posted cancel | Stops posted tampering | SM drafts only | Attempt POSTED cancel → denied | Cannot cancel posted |
| 1.6 | `/sales/new` create scope | `src/App.tsx`, `src/pages/NewSalePage.tsx` | Guard `sales.create` explicitly on route; REP allowed via Visit-driven flow | Enforces create perms | REP sales via visits | Non-SM/REP → 403 | Only SM/REP reach new sale |
| 1.7 | `/customers/new` creates Active | `src/pages/CustomerForm.tsx`, `src/services/mockApi.ts` | New defaults to `Target`; Active requires `customers.approve` (SM/GM) after Target stage | Separates target/active | Target lifecycle starts | Create customer → status=Target | New = Target |
| 1.8 | `/policy` no guard/version | `src/pages/PolicyCenterPage.tsx` | Wrap in `PermissionRoute` (SM+GM+SYS); read-only until Published | Locks policy edit | Policy gated | Non-allowed → 403 | Only allowed roles |

---

## PHASE 2 — Data Scope Hardening

| # | Issue | Files | Change | Security | Business | Tests | Acceptance |
|---|-------|-------|--------|----------|----------|-------|------------|
| 2.1 | DO/DIST/FIN/AUD/HR default company | `src/services/scope.ts` | `getDataScope(role)` returns: DO=`network(entity)`, DIST=`entity`, FIN=`network(financial)`, AUD=`company(read)`, HR=`company(people)`; **fail-closed** default = `none` (empty) | Closes scope leak | Explicit scopes | Unauth role → empty | No company fallback |
| 2.2 | `mockApi.distributor.*` unscoped | `src/services/mockApi.ts` | Filter `distributor.list()` by caller scope: DO sees `distributors where branchId in DO.branches`; DIST sees own `distributorId`; non-DO/DIST→empty | Closes network leak | Scope enforced at API | DO lists → only own | DO cannot see others' |
| 2.3 | AUD over-grants | `src/config/permissions.ts` | AUD keeps `audit.view`, `customers.view`*(read)*, `sales.view`*(read)*, `inventory.view`*(read)*, `cash.view`*(read)*, `routes.view`*(read)*, `gps.view`*(read)*, `targets.view`*(read)*, `credit.view`*(read)*, `messages.view`*(read)*; remove write perms | Read-only audit | AUD read-only | AUD edit any → denied | AUD cannot mutate |
| 2.4 | HR over-grants | `src/config/permissions.ts`, `src/config/navigation.ts` | HR: `leaves.*`, `users.view`, `users.manage`, `roles.manage`(people), `organization.manage`, `settings.view`, `audit.view`*(people)*; remove `sales/collection/inventory/cash/policy` | HR people-only | HR isolated | HR opens Sales → 403 | HR no commercial |
| 2.5 | Dashboard data slicing | `src/pages/DashboardPage.tsx` | Each dashboard calls `loadDashboardData(scope)` returning only scoped KPIs | Card data protected | Dashboard real scoping | REP dashboard shows own KPIs | No cross-scope cards |
| 2.6 | `canAccess*` coverage | `src/services/scope.ts` | Add `canAccessDistributor(id)`, `canAccessFinancialReport(id)`, `canAccessPerson(peopleId)`; apply in components | Extends SoD | HR/AUD/FIN scoped | HR opens other branch people → denied | Scope enforced |

---

## PHASE 3 — Route/Page Deduplication

| # | Issue | Files | Change | Security | Business | Tests | Acceptance |
|---|-------|-------|--------|----------|----------|-------|------------|
| 3.1 | `/customers` vs `/rep/customer-360` | `src/pages/CustomersPage.tsx`, `src/pages/Customer360Page.tsx`, `src/App.tsx` | Single `/customers` route; `/rep/customer-360` → redirect or remove; role-aware tabs | Reduces surface | One customer view | REP opens /rep/customer-360 → redirect 301 | No duplicate page |
| 3.2 | `/custody` vs `/rep/custody` | same pattern | Merge; `/rep/custody` → `/custody` | | | | |
| 3.3 | `/gps` vs `/rep/gps` | same pattern | Merge | | | | |
| 3.4 | `/inventory/transfers` vs `/rep/stock-transfers` | same pattern | Merge into `/inventory/transfers` (inbound+outbound) | | | | |
| 3.5 | `/inventory/requests` vs `/rep/stock-requests` | same pattern | Merge | | | | |
| 3.6 | `/inventory/van` vs `/rep/van` | same pattern | Merge (van = custody) | | | | |
| 3.7 | `/messages` vs `/rep/messages` | same pattern | Merge (conversation-scoped) | | | | |
| 3.8 | `/audit` vs `/rep/audit-log` | same pattern | Merge | | | | |
| 3.9 | `/commission` vs `/rep/commission` | already merged | Remove leftover `/rep` alias | | | | |
| 3.10 | Remove `/rep/*` aliases | `src/App.tsx`, `src/config/navigation.ts` | Redirect old `/rep/*` to generic; 404 after grace | Reduces surface | Cleaner routes | /rep/* → new path | |

---

## PHASE 4 — Workflow & Separation of Duties

| # | Issue | Files | Change | Security | Business | Tests | Acceptance |
|---|-------|-------|--------|----------|----------|-------|------------|
| 4.1 | Posted invoice editable | `src/pages/InvoiceDetailPage.tsx`, `src/services/mockApi.ts` | `PUT/POST` denied if `status === Posted/Cancelled`; UI read-only | Stops posted tampering | Posted immutable | Edit posted → 403/readonly | |
### Cancellation workflow
| 4.2 | SM cancel posted via workflow | `src/services/mockApi.ts`, `src/types/index.ts` | New `CancellationRequest` entity: RequestedBy→SubmittedTo(GM/SM?)→ApprovedBy(FIN); posted → CreditNote; audit trail | SoD + audit | Cancel via workflow | | Cancel = workflow |
| 4.3 | Return/credit-note workflow | new `src/mock/returns.ts`, `src/services/mockApi.ts` | ReturnRequest flow w/ approval; CreditNote issued | | | | |
| 4.4 | Approvals self-approve | `src/services/mockApi.ts` | `approvals.approve(id, by)` rejects if `by === doc.createdBy` or same-level peer | SoD | No self-approve | Self-approve → denied | |
| 4.5 | Dual-control for FIN discount/credit | `src/services/mockApi.ts`, `src/types/index.ts` | Field `discount.approve`/`credit.approve` (FIN) requires second approver SM/GM above threshold | | | | |

---

## PHASE 5 — Missing Business Entities (stubs first)

| # | Entity | Files | Pre-requisite mapping | Change | Security | Tests | Acceptance |
|---|--------|-------|----------------------|--------|----------|-------|------------|
| 5.1 | `SalesOrder` | `src/types/index.ts`, `src/mock/salesOrders.ts`, `src/services/mockApi.ts` | BR §3.6 · UC-Sales · State Draft→Submitted→Approved→Posted · Module Sales · Roles REP/SM/GM · Audit required | Add type + stub mock + CRUD mockApi (scoped) | Scoped CRUD | REP sees own | |
| 5.2 | `CostSnapshot` | `src/types/index.ts`, `src/mock/costSnapshots.ts` | BR §3.15 · UC-Margin · State versioned · Module Inventory/Profitability · Roles GM/SM/FIN · Audit | Add type + snapshot-per-product-per-date | Read by profit roles | Profitability read-only | |
| 5.3 | `IntegrationEvent` | `src/types/index.ts`, `src/mock/integrationEvents.ts` | BR §3.22 · UC-Sync · State pending→success/failed→retried · Module Integrations · Roles SYS+GM · Audit | Add type + retry fields | SYS/GM only | Non-SYS → 403 | |
| 5.4 | `SyncQueue` | same as 5.3 | BR §3.28 · retry exponential backoff | Add queue entry type | SYS/GM only | | |
| 5.5 | `LeaveRequest` | `src/types/index.ts`, `src/mock/leaves.ts` | BR §3.25 · State Draft→Submitted→Approved/Rejected· Module HR · Roles REP/self + SUP · | Add type + workflow | HR/SUP only | REP sees own | |

> Note: Phase 5 adds entities as typed stubs with mock data + scoped `mockApi` methods. Full UI workflows follow in Phase 8.

---

## PHASE 6 — Policy Lifecycle

| # | Issue | Files | Change | Security | Business | Tests | Acceptance |
|---|-------|-------|--------|----------|----------|-------|------------|
| 6.1 | Policy object flat | `src/types/index.ts`, `src/mock/policy.ts` | Add `Policy` with fields: id,name,owner,version,status,effectiveFrom,EffectiveTo,createdBy,approvedBy,approvalDate,changeReason,auditTrail; `status` enum Draft/Submitted/Review/Approved/Published/Effective/Superseded/Archived | Versioned policy | Lifecycle enforced | |
| 6.2 | Published policy editable | `src/services/mockApi.ts`, `src/pages/PolicyCenterPage.tsx` | Edit allowed only in Draft; new version required otherwise; submit→review→approve→publish | Version lock | No direct edit | Edit Published → denied | |
| 6.3 | Policy approval workflow | `src/services/mockApi.ts` | Draft→Submit→Review(SM/GM)→Approve(GM)→Publish; audit log each transition | Approval chain | Policy lifecycle | |
| 6.4 | Policy ownership | `src/types/index.ts` | `owner` field = role/GM; changes audited | | | |

---

## PHASE 7 — Mock Data Integrity

| # | Issue | Files | Change | Security | Tests | Acceptance |
|---|-------|-------|--------|----------|-------|------------|
| 7.1 | Distributors unfiltered | `src/mock/distributors.ts`, `src/services/mockApi.ts` | Add `distributorId`/`branchId`/`territoryIds` filtering in all distributor queries | Scope enforced | DO sees own | |
| 7.2 | SalesOrder relations | `src/mock/salesOrders.ts` | `SalesOrder.repId`, `customerId`, `status` | | | |
| 7.3 | CostSnapshot linkage | `src/mock/costSnapshots.ts` | `productId`, `date`, `cost` | | | |
| 7.4 | IntegrationEvent retry | `src/mock/integrationEvents.ts` | `status`, `attempts`, `retryAt`, `nextRunAt` | | | |
| 7.5 | LeaveRequest workflow | `src/mock/leaves.ts` | `requesterId`, `approverId`, `status` | | | |

---

## PHASE 8 — Functional Completion

| # | Issue | Files | Change | Security | Tests | Acceptance |
|---|-------|-------|--------|----------|-------|------------|
| 8.1 | Credit limit approval | `src/services/mockApi.ts` | Approval routing + audit | | | |
| 8.2 | Leave state machine | `src/services/mockApi.ts` | Approve/reject transitions | | | |
| 8.3 | Archive lock | `src/services/mockApi.ts`, `src/types/index.ts` | Published/Archived → read-only; edits = new version | | | |
| 8.4 | Target Customer lifecycle | `src/services/mockApi.ts` | Target→Approve→Active; active customer cannot revert | | | |

---

## PHASE 9 — Final Audit

| # | Action | Files | Result |
|---|--------|-------|--------|
| 9.1 | Re-run AUDIT.md findings | all | All CRITICAL/HIGH re-tested |
| 9.2 | Regression run | full suite | No regressions across phases |
| 9.3 | Publish updated audit | `docs/audit/AUDIT.md` (final) | Green status |

---

## Re-test protocol (after each phase)
1. `npx tsc --noEmit` (no type/cast errors)
2. `npm run build` (no lint/bundle errors)
3. Direct-URL access (unauth → redirect/403)
4. Unauthorized role access (non-allowed → 403)
5. Unauthorized scope (other branch/entity → empty/403)
6. Unauthorized action (read-only role write → 403)
7. `mockApi` direct access (console) → scope enforced
8. Navigation renders only allowed modules
9. Reports/exports respect scope
10. Details/modals respect scope + read-only where required

No code modified until this plan is accepted.
