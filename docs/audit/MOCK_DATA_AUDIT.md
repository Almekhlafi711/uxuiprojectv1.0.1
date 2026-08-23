# MOCK DATA AUDIT

Source: `src/mock/*` (no real DB — confirmed). Relations audited for RBAC scope support.

## Entities present (relation-correct)
- `Customer` — has `repId`, `supervisorId`, `territoryId`, `branchId`, `status` (Target/Active/Closed). ✅ relations support REP/SUP/SM scope.
- `Invoice` — has `repId`, `customerId`, `status` (Draft/Submitted/Posted/Cancelled). ✅
- `GpsEvent` — has `userId`, `timestamp`, `lat/lng`, `recordType`. ✅ user-scoped.
- `CustodyAssignment` — has `assignedToId`, `vehicleId`/`vanId`, `startDate`, `returnDate`. ✅
- `Distributor` — has `branchId`, `territoryIds[]`, `status`. ✅ BUT `mockApi.distributor.list()` returns unfiltered.
- `DistributorSellInOrder` / `DistributorSellOutRead` — linked to Distributor via `distributorId`. ✅
- `AuditLog` — has `actorId`, `action`, `entityType`, `entityId`, `timestamp`. ✅
- `CommissionStatement` / `BonusPayment` — linked to `repId`. ✅

## Gaps (relations missing → blocks RBAC)
| Entity needed | Chapter | Missing field(s) | Effect |
|---------------|---------|------------------|--------|
| `SalesOrder` | §3.6 | (entity entirely missing) | Cannot scope order→invoice; REP cannot own order |
| `CustomerLedger` | §3.14 | running balance, `repId` linkage | Collections/credit scoped by rep |
| `CostSnapshot` | §3.15 | snapshot-of cost per product/date | Profitability integrity |
| `IntegrationEvent` | §3.22 | `status`, `attempts`, `retryAt` | Retryable sync queue |
| `SyncQueue` | §3.28 | `nextRunAt`, `consecutiveErrors` | Accounting sync retry |
| `LeaveRequest` | §3.25 | `requesterId`, `approverId`, `status`, `state` | Leave workflow |
| `TargetCustomer` | §3.12 | (use Customer.status=Target — OK) | ✅ OK, no new entity |
| `Vehicle` / `Van` | Ch 4 | (use CustodyAssignment.vehicleId — OK) | ✅ OK |

## Enforcement check: mockApi layer
- `mockApi.customers` — filtered by `getCustomerIdScope()`. ✅
- `mockApi.invoices` — filtered by rep scope. ✅
- `mockApi.distributor.*` — **NOT filtered** for DO/DIST scope. ❌ (F6)
- `mockApi.custody.*` — filtered by `assignedToId`. ✅
- `mockApi.gps.*` — filtered by `userId`. ✅
- `mockApi.commission.*` — filtered by `repId`. ✅ (NEW, OK)
- `mockApi.bonus.*` — filtered by `repId`. ✅ (NEW, OK)

## Summary
- Relations mostly consistent and RBAC-ready EXCEPT distributors (API unscoped) and missing SalesOrder/CostSnapshot/IntegrationEvent/LeaveRequest.
- Fix targets: `distributor.ts` (filter), add `SalesOrder` entity, add `CostSnapshot` entity, add `IntegrationEvent`/`SyncQueue` fields, add `LeaveRequest`.
