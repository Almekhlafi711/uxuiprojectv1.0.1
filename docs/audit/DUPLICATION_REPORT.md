# DUPLICATION REPORT

Two duplication classes found: (A) generic module vs `/rep/*`/generic duplicate pages, (B) supervisor team-monitoring (NOT duplicates — kept).

## A. Duplicate pages / feature sprawl (must consolidate)

| Generic module path | Duplicate path | Entity | Action |
|---------------------|----------------|--------|--------|
| `/customers` | `/rep/customer-360` | Customer | Merge into single Customer 360 view, role-aware tabs/fields |
| `/customers/:id` | `/rep/customer-360` | Customer | Merge; Customer 360 = Target lifecycle + active status |
| `/custody` | `/rep/custody` | Custody | Merge; custody = REP custody of van/mobile stock (per Ch 4, NOT mobile stock) |
| `/gps` | `/rep/gps` | GpsEvent | Merge; live view role-scoped |
| `/inventory/transfers` | `/rep/stock-transfers` | InventoryMovement | Merge into TransfersPage (inbound+outbound) |
| `/inventory/requests` | `/rep/stock-requests` | StockRequest | Merge into RequestsPage |
| `/inventory/van` | `/rep/van` | VanInventory | Merge; van stock = REP custody |
| `/messages` | `/rep/messages` | Message | Merge; mailbox role-scored |
| `/audit` | `/rep/audit-log` (component) | AuditLog | Merge into AuditPage |
| `/commission` | `/rep/commission` | CommissionStatement/Bonus | Already merged into `/commission`; remove leftovers |

**Supervisor routes (KEPT — NOT duplicates):**
`/supervisor/team`, `/supervisor/planning`, `/supervisor/field`, `/supervisor/customers`, `/supervisor/inventory`, `/supervisor/cash`, `/supervisor/assets`, `/supervisor/comms`, `/supervisor/requests`, `/supervisor/activity` — these are *team-monitoring* views (SM also monitors teams), distinct from REP self-serve. Keep, but ensure scope = `team`.

## B. Duplicate permission entries (coarse action model)
- `customers.transfer`, `customers.deactivate`, `customers.assign` exist as separate perms but should be sub-actions of `customers.manage` (per Ch 3 §3.8 aggregate model).
- `sales.create` + `visits.create` + `trips.start` overlap in Visit-driven sales flow — keep distinct (visit vs invoice vs trip), but document sequence.
- `returns.create` only on REP at component; route guard missing.

## C. Duplicate mock data files
- `src/mock/distributors.ts` (Distributor + SellIn + SellOut) duplicates fields also in `src/mock/customers.ts` distributor flag. Keep distributors.ts as source of truth, remove flag from customers.
- `commissions`/`bonuses` mocks in two locations — consolidate.
