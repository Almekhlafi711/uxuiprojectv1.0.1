# ROLE SCOPE MATRIX

Defines the *data boundary* each role may touch. Enforcement points: `src/services/scope.ts` (`getDataScope`, `canAccess*`, `visibleRepIds`, `visibleUsers`) and every `mockApi.*` endpoint.

Legend: `self` (own records) · `team` (subordinates in same territory/team) · `branch` (SM's branch) · `company` (entire enterprise) · `entity` (own distributor entity only) · `network` (finance view across entities) · `read` (audit/compliance read-only) · `people` (HR personnel)

| Role code | Role label | Declared scope (`getDataScope`) | `canAccess*` applied? | API-level enforcement | Violation |
|-----------|------------|-------------------------------|------------------------|-----------------------|-----------|
| `GENERAL_MANAGER` | GM | company | yes (all canAccess*) | yes | none |
| `SALES_MANAGER` | SM | branch | yes | yes (within branch) | none (scope correct) |
| `SUPERVISOR` | SUP | team | yes | yes (within team) | none (scope correct) |
| `REPRESENTATIVE` | REP | self | yes | yes (self) | none (scope correct) |
| `DISTRIBUTION_OFFICER` | DO | company ❌ | no | no | **CRITICAL**: defaults to `company`; exposes whole network |
| `DISTRIBUTOR` | DIST | company ❌ | no | no | **CRITICAL**: returns unfiltered distributor lists |
| `FINANCE` | FIN | company ❌ | no | no | **CRITICAL**: defaults to `company`; should be `network` per Ch 4 |
| `WAREHOUSE` | WH | (not in code) | — | — | MISSING role in enum |
| `SYSTEM_ADMIN` | SYS | company | — | — | MISSING role in enum (Ch 3 §3.7.6) |
| `AUDITOR` | AUD | company (read) | yes (audit.*) | partial | over-grants: customers/sales/inventory/custody/routes/visits/gps/targets/credit (should be `read`) |
| `HR` | HR | company (people) | yes (people.*) | partial | over-grants: users.manage OK; routes/reports/archive (should be people only) |

## Enforcement gap summary
- **DO/DIST/FIN**: `getDataScope()` returns `company` — must be `entity`/`network`.
- **AUD**: `audit.view` OK; the 14 extra modules above are over-grants, must restrict to read-only `company(read)`.
- **HR**: `users.manage`/`roles.manage`/`organization.manage` correct; `routes.view`/`reports.view` are over-scopes.
- **SYS**: role absent; no user-facing route.

## Enforcement locations requiring changes
- `src/config/permissions.ts` `rolePermissions` (add SYS, WH; fix DO/DIST/FIN scope)
- `src/services/scope.ts` `getDataScope` (branch/network/entity/people/read cases)
- `src/services/mockApi.ts` `distributor.*` (filter by `assignedToId`/`territoryIds` per role)
- `src/config/navigation.ts` (hide modules per scope)
- `src/components/guards/PermissionRoute.tsx` (add scope to role allow-list)
