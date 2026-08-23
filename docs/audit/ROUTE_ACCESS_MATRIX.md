# ROUTE ACCESS MATRIX

Source: `src/App.tsx`, `src/config/navigation.ts`, `src/components/guards/PermissionRoute.tsx`.
Legend: ✅ = guarded & correct · ⚠️ = guarded but scope-weak · ❌ = unguarded/insecure · 🚫 = dev-only/removed · 🃏 = business decision

| Path | Component | Permission | Roles (explicit guard) | Effective Scope | Status | Problem |
|------|-----------|------------|------------------------|-----------------|--------|---------|
| `/dashboard` | DashboardPage | *(none)* | NONE | — | ❌ CRITICAL | No `PermissionRoute`/roles guard; renders for any user incl. unauthenticated |
| `/rep/dashboard` | RepDashboard | trips.view | REP | self | ✅ | correct |
| `/customers` | CustomersPage | customers.view | REP/SUP/SM/DO/DIST/FIN/GM/AUD/HR | component-filtered | ⚠️ | scope enforced in list only; detail/export/filter missing |
| `/customers/new` | CustomerForm | customers.create | SM/GM | branch | ❌ CRITICAL | Allows creating *Active Customer*; Ch 3 requires Target→Approve→Active lifecycle |
| `/customers/:id` | Customer360 | customers.view | SM+REP+DO+DIST+FIN+GM+AUD+HR | scoped | ⚠️ | Shared view; field-level visibility not per-role |
| `/customers/:id/edit` | CustomerForm | customers.edit | SM/GM | branch | ❌ | No status check (cannot edit closed customers) |
| `/products` | ProductsPage | products.view | all | company | ✅ | correct |
| `/sales` | SalesPage | sales.view | GM/SM/SUP/DO/DIST/FIN | scoped | ⚠️ | No `SalesOrder` entity; sales via visits only |
| `/sales/new` | NewSalePage | sales.create | SM/GM (via Visit) | scoped | ❌ CRITICAL | `sales.create` only on SM; REP missing at route level |
| `/sales/:id` | InvoiceDetail | sales.view | scoped | scoped | ⚠️ | Posted invoices editable (no read-only guard) |
| `/collections` | CollectionsPage | collections.view | GM/SM/SUP/REP/FIN | scoped | ⚠️ | Collections.create must be REP-only at route |
| `/collections/pay` | CollectionPay | collections.create | REP | self | ❌ | No explicit guard at route (component only) |
| `/returns` | ReturnsPage | returns.view | GM/SM/SUP/REP/FIN | scoped | ⚠️ | returns.create missing on route (REP submits) |
| `/inventory` | InventoryIndex | inventory.view | all | scoped | ⚠️ | Van/warehouse/transfer mix in one list |
| `/inventory/warehouse` | WarehouseInv | inventory.view | GM/SM/SUP | company-warehouse | ✅ | has role guard |
| `/inventory/van` | VanInventory | inventory.view | REP | self | ❌ HIGH | Duplicate view of `/rep/van`; van = REP custody |
| `/inventory/transfers` | TransfersPage | inventory.transfer | GM/SM/SUP | scoped | ❌ | Duplicate of `/rep/stock-transfers` |
| `/inventory/requests` | RequestsPage | inventory.request | REP | self | ❌ | Duplicate of `/rep/stock-requests` |
| `/inventory/movements` | MovementsPage | inventory.view | GM/SM/SUP/FIN | scoped | ⚠️ | |
| `/inventory/count` | CountPage | inventory.count | SM/GM | scoped | ⚠️ | |
| `/cash` | CashPage | cash.view | GM/SM/SUP/REP/FIN | personal/branch | ⚠️ | |
| `/cash/deposit` | DepositPage | cash.* | — | — | ❌ | No guard; should be SM/GM |
| `/custody` | CustodyPage | custody.view | GM/SM/SUP/REP | scoped | ❌ HIGH | Duplicate of `/rep/custody` |
| `/routes` | RoutesPage | routes.view | GM/SM/SUP/REP | scoped | ⚠️ | |
| `/visits` | VisitsPage | visits.view | GM/SM/REP | scoped | ⚠️ | |
| `/gps` | GpsPage | gps.view | GM/SM/REP | scoped | ❌ HIGH | Duplicate of `/rep/gps` |
| `/targets` | TargetsPage | targets.view | GM/SM/SUP/REP | scoped | ⚠️ | |
| `/credit` | CreditPage | credit.view | GM/SM/SUP/FIN | scoped | ⚠️ | Approval routing missing |
| `/approvals` | ApprovalsPage | approvals.view | GM/SM/SUP/REP/FIN | scoped | ⚠️ | Self-approve not blocked |
| `/approvals/:id` | ApprovalDetail | approvals.view | scoped | scoped | ⚠️ | No SoD check on open |
| `/profitability` | Profitability | profitability.view | GM/SM/FIN | scoped | ⚠️ | Uses live cost; no `CostSnapshot` |
| `/commission` | CommissionPage | commission.view | GM/SM/FIN | scoped | ✅ | new module OK |
| `/policy` | PolicyCenterPage | settings.manage | GM | company | ❌ CRITICAL | No version/approval/audit (Ch 3 §3.24/3.33) |
| `/audit` | AuditPage | audit.view | GM/SM/AUD | company | ⚠️ | read-only not enforced |
| `/distribution-officer` | DistributionOfficerPage | distributor.manage | DO | VIOLATION | ❌ CRITICAL | API returns unfiltered distributor network |
| `/distributor` | DistributorPage | distributor.view | GM/SM/DO/DIST | VIOLATION | ❌ CRITICAL | API returns unfiltered entity |
| `/reports` | ReportsPage | reports.view | all | scoped | ⚠️ | |
| `/archive` | ArchivePage | archive.view | GM/SM/SUP/FIN/AUD | scoped | ⚠️ | |
| `/archive/:id` | ArchiveDetail | archive.view | scoped | scoped | ⚠️ | editable; needs lock |
| `/messages` | MessagesPage | messages.view | all (conversation) | conversation | ⚠️ | |
| `/leaves` | LeavesPage | leaves.view | all | scoped | ⚠️ | |
| `/users` | UsersPage | users.view | GM/HR/AUD | people | ⚠️ | |
| `/users/new` | UserForm | users.manage | GM/HR | people | ❌ | No guard |
| `/organization` | OrganizationPage | organization.manage | GM/HR | company | ⚠️ | |
| `/settings` | SettingsPage | settings.view | GM/SM/HR | company | ⚠️ | |
| `/dev/scope-test` | DataScopeTestPage | *(none)* | NONE | NONE | ❌ CRITICAL | Dev route in prod build; remove from prod router |
| `/rep/*` (bulk) | various | role-scoped | REP | self | MEDIUM | Duplicate of generic modules via `/rep/` alias |
| `/supervisor/*` | various | supervisor.* | SUP | team | ✅ | team-monitoring (not duplicate) |
| `/integration` | (missing) | sync.view | GM | company | 🚫 MISSING | no route exists for Ch 3 §3.22/3.28 |
| `/cost-snapshots` | (missing) | profitability.view | GM/SM/FIN | scoped | 🚫 MISSING | Ch 3 §3.15/3.21 not implemented |
| `/stock-transfers-in` | (missing) | inventory.view | REP | incoming | 🚫 MISSING | inbound transfer view not present |
