# FUNCTIONAL GAP LIST

As-built vs Chapter 3 v1.0. Gaps prioritized for fix phase.

## CRITICAL
| ID | Gap | Chapter ref | Impact |
|----|-----|-------------|--------|
| F1 | `SYS` role missing from `Role` enum | §3.7.6 | No system-admin; GM wears SYS functions |
| F2 | `/dashboard` route unguarded | §3.8 | Any user sees global dashboard |
| F3 | No `SalesOrder` entity; sales only via visits | §3.6, §3.31 | Cannot model configurable order→invoice→cash |
| F4 | `CostSnapshot` not implemented | §3.15, §3.21 | Profitability uses live cost (no margin integrity) |
| F5 | Target Customer vs Active Customer not separated | §3.12, §3.15 | `/customers/new` creates Active directly |
| F6 | `mockApi.distributor.*` returns unfiltered lists | §3.22 | DO/DIST see entire network |
| F7 | Policy config not versioned/approved/audited | §3.24, §3.33 | `/policy` has no approval workflow |
| F8 | Posted invoices editable | §3.31 | Violates Ch 3 §3.31 (posted read-only) |
| F9 | SM `sales.cancel` on posted invoices | §3.8 | Ch 4 notes: SM cancels draft only |
| F10 | Fin over-grants: field `discount.approve`, `credit.approve` without SoD | §3.13 | Conflict of interest |

## HIGH
| ID | Gap | Chapter ref | Impact |
|----|-----|-------------|--------|
| H1 | Archive not version-locked | §3.24 | Edits to closed documents allowed |
| H2 | Van Inventory vs Mobile Stock conflated | Ch 4 | Custody model weak |
| H3 | Integration Hub missing | §3.22, §3.28 | No retryable accounting sync |
| H4 | `/dev/scope-test` in prod router | — | Dev route exposed |
| H5 | AUD over-grants to 14 modules | §3.7.7 | Audit sees more than read-only |
| H6 | HR over-grants routes/reports | §3.7.8 | HR sees non-people data |
| H7 | Leave state machine not implemented | §3.25 | No approval/rejection workflow |
| H8 | Collections.create not route-guarded REP-only | §3.8 | Any role can record payments |

## MEDIUM
| ID | Gap | Chapter ref | Impact |
|----|-----|-------------|--------|
| M1 | No `/integration` route | §3.22 | Operators can't monitor sync |
| M2 | `/cost-snapshots` missing | §3.15 | No snapshot management UI |
| M3 | `customers/:id/edit` no status check | §3.12 | Cannot edit closed customers |
| M4 | Approvals self-approve not blocked | §3.8, SoD | Users approve own docs |
| M5 | `/rep/*` alias pages duplicate modules | — | Maintenance burden / scope drift |
| M6 | Customer 360 field visibility not per-role | §3.12 | Sensitive fields leak |
| M7 | Messages recipients not conversation-scoped | §3.27 | Messages visible beyond thread |
| M8 | No inbound transfer view | §3.6 | REP can't receive stock |

## LOW
| ID | Gap | Chapter ref | Impact |
|----|-----|-------------|--------|
| L1 | WH role not in enum (acceptable as SUP/SM) | §3.7.6 | None (no WH users) |
| L2 | GPS config permissions absent | §3.6 | No route to configure trackers |
| L3 | Credit limit approval flow missing | §3.13 | Overrides not auditable |

## Resolved / Not a gap
- Supervisor team-monitoring routes (kept) — SM monitors teams.
- Commission module (new, state OK).
