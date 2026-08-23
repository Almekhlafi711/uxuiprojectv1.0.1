# AUTHORIZATION MATRIX

Source: `src/config/permissions.ts` `rolePermissions` (as-built). Actions normalized against Chapter 3 §3.8.

Legend: ✅ granted · ❌ denied · 🚫 prohibited-by-chapter-3 · ⚠️ scope-dependent · 🃏 business-decision-required

## Legend of canonical actions
- **view**: read
- **create**: draft/new
- **edit**: modify draft
- **submit**: send to approval
- **review**: evaluate
- **approve**: authorize
- **execute/receive/post/close**: process
- **export**: extract
- **manage**: administrative + create + edit + delete (treated as aggregate; see notes)

## Master table

| Module / Feature | Action | REP | SUP | SM | DO | DIST | WH | FIN | GM | SYS | AUD | HR |
|------------------|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Dashboard | view | ✅ | ✅ | ✅ | ✅⚠️ | ✅⚠️ | — | ✅⚠️ | ✅ | ❌ | ✅⚠️ | ✅⚠️ |
| Customers | view | ✅own | ✅team | ✅branch | ✅⚠️ | ✅⚠️ | — | ✅ | ✅ | ❌ | ✅⚠️ | ✅⚠️ |
| Customers | create/target | ❌ | ❌ | ✅branch | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Customers | edit | ❌ | ✅ | ✅branch | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Customers | transfer | ❌ | ✅ | ✅ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Customers | deactivate | ❌ | ✅ | ✅ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Customers | assign (to rep) | ❌ | ✅ | ✅ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Target Customer | approve-active | ❌ | ❌ | ✅ | ❌ | ❌ | — | ❌ | ✅🃏 | ❌ | ❌ | ❌ |
| Products | view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅⚠️ | ✅⚠️ |
| Products | edit | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Prices | view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅⚠️ | ✅⚠️ |
| Prices | approve | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Sales Invoice | view | ✅own | ✅team | ✅branch | ⚠️BD | ⚠️BD | — | ✅ | ✅ | ❌🚫 | ⚠️BD | ⚠️BD |
| Sales Invoice | create | ✅(via Visit) | ❌ | ✅(via Visit)🃏 | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Sales Invoice | submit | ✅ | ❌ | ✅ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Sales Invoice | edit (draft) | ✅ | ❌ | ✅ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Sales Invoice | approve | ❌ | ❌ | ✅(matrix) | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Sales Invoice | edit (posted) | ❌🚫 | ❌🚫 | ❌🚫 | ❌🚫 | ❌🚫 | — | ❌🚫 | ✅🃏 | ❌ | ❌🚫 | ❌ |
| Sales Cancel | ❌🚫 | ❌ | ✅(unposted only) | ❌ | ❌ | — | ✅🃏SM | ✅ | ❌ | ❌ | ❌ | ❌ |
| Credit | view | ❌ | ✅team | ✅branch | ❌ | ❌ | — | ✅ | ✅ | ❌ | ✅⚠️ | ❌ |
| Credit | approve/override | ❌ | ❌ | ✅🃏BD1 | ❌ | ❌ | — | ✅ | ✅ | ❌ | ❌ | ❌ |
| Discount | approve | ❌ | ❌ | ✅🃏BD1 | ❌ | ❌ | — | ✅🃏BD1 | ✅ | ❌ | ❌ | ❌ |
| Collections | view | ✅own | ✅team | ✅branch | ❌ | ❌ | — | ✅ | ✅ | ❌ | ⚠️BD | ❌ |
| Collections | create | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ | ❌ | ❌ | ❌ |
| Collections | settle/post | ❌ | ❌ | ✅(within scope) | ❌ | ❌ | — | ✅🃏 | ✅ | ❌ | ❌ | ❌ |
| Returns | view | ✅own | ✅team | ✅branch | ❌ | ❌ | — | ✅ | ✅ | ❌ | ⚠️BD | ❌ |
| Returns | create | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ | ❌ | ❌ | ❌ |
| Returns | approve | ❌ | ✅ | ✅ | ❌ | ❌ | — | ✅ | ✅ | ❌ | ❌ | ❌ |
| Inventory | view | ✅own | ✅team/supervisor-wh | ✅branch | ⚠️BD | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅⚠️ | ⚠️BD |
| Inventory | request | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Inventory | transfer | ❌ | ✅(team) | ✅(branch) | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Inventory | count | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Inventory | adjust | ❌ | ❌ | ✅🃏SoD | ❌ | ❌ | ✅🃏SoD | ❌ | ✅ | ❌ | ❌ | ❌ |
| Stock Request | create | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Stock Transfer | create/transfer | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Stock Transfer | receive | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cash Box | view own | ✅own | personal-if-enabled | ✅branch | ❌ | ❌ | — | ✅ | ✅ | ❌ | ✅⚠️ | ❌ |
| Cash Movement | view | ✅own | ❌ | ✅branch | ❌ | ❌ | — | ✅ | ✅ | ❌ | ⚠️BD | ❌ |
| Cash Settle | ❌ | ❌ | ✅(own box) | ❌ | ❌ | — | ✅🃏 | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cash Deposit | ❌ | ❌ | ✅ | ❌ | ❌ | — | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cash Closing | ❌ | ❌ | ✅(own)/team | ❌ | ❌ | — | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Custody / Assets | view | ✅own | ✅team | ✅branch | ❌ | ❌ | — | ✅ | ✅ | ❌ | ✅⚠️ | ❌ |
| Custody Request | create | ❌ | ✅(own) | ❌ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Custody Approve | ❌ | ❌ | ✅(SoD: SM) | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Routes / Planning | view | ✅own | ✅team | ✅branch | ❌ | ❌ | — | ✅ | ✅ | ❌ | ✅⚠️ | ⚠️BD |
| Routes / Planning | create | ❌ | ✅ | ✅ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Visits | view | ✅own | ✅team | ✅branch | ❌ | ❌ | — | ✅ | ✅ | ❌ | ✅⚠️ | ⚠️BD |
| Visits | create | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| GPS | view live | ✅own | ✅team | ✅branch | ❌ | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅⚠️ | ❌ |
| GPS | config | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ✅🃏 | ❌ | ❌ | ❌ |
| Targets | view | ✅own | ✅team | ✅branch | ⚠️BD | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅⚠️ | ⚠️BD |
| Targets | create | ❌ | ✅ | ✅ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Targets | approve | ❌ | ❌ | ✅🃏matrix | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Target Customers | review pipeline | ❌ | ✅ | ✅ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| Credit Limits | approve | ❌ | ❌ | ✅🃏BD1 | ❌ | ❌ | — | ✅🃏BD1 | ✅ | ❌ | ❌ | ❌ |
| Approvals | view inbox | ⚠️BD | ✅team | ✅branch | ⚠️BD | ⚠️BD | — | ✅ | ✅ | ❌ | ✅⚠️ | ⚠️BD |
| Approvals | review/approve | ⚠️BD | ✅(own level) | ✅(own level) | ⚠️BD | ⚠️BD | — | ✅ | ✅ | ❌ | ❌ | ⚠️BD |
| Commission | view | ✅own | ❌ | ✅ | ❌ | ❌ | — | ✅ | ✅ | ❌ | ✅⚠️ | ❌ |
| Commission | approve/export | ❌ | ❌ | ✅ | ❌ | ❌ | — | ✅ | ✅ | ❌ | ❌ | ❌ |
| Bonus | approve/pay | ❌ | ❌ | ✅ | ❌ | ❌ | — | ✅ | ✅ | ❌ | ❌ | ❌ |
| Profitability | view | ✅own | ❌ | ✅(branch) | ⚠️BD | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅⚠️ | ⚠️BD |
| Reports | view/export | ✅own | ✅team | ✅branch | ⚠️BD | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅⚠️ | ⚠️BD |
| Archive | view | ✅own | ✅team | ✅branch | ❌ | ❌ | — | ✅ | ✅ | ❌ | ✅⚠️ | ⚠️BD |
| Archive | edit (request) | ❌ | ✅ | ✅ | ❌ | ❌ | — | ✅ | ✅ | ❌ | ❌ | ⚠️BD |
| Archive | approve/version | ❌ | ❌ | ✅🃏SoD | ❌ | ❌ | — | ✅ | ✅ | ❌ | ❌ | ⚠️BD |
| Archive | override | ❌ | ❌ | ❌ | ❌ | ❌ | — | ✅🃏 | ✅ | ❌ | ❌ | ❌ |
| Messages | view | ✅allowed | ✅team+SM+GM | ✅SM+GM | ⚠️BD | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅⚠️ | ⚠️BD |
| Messages | create | ✅→SM+GM | ✅+up | ✅+up | ⚠️BD | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅⚠️ | ⚠️BD |
| Leaves | view | ✅own | ✅team | ✅branch | ❌ | ❌ | — | ✅ | ✅ | ❌ | ✅⚠️ | ✅ |
| Leaves | create | ✅ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ✅ | ❌ | ❌ | ✅(HR own) |
| Leaves | approve | ❌ | ✅(policy) | ✅(policy) | ❌ | ❌ | — | ✅(policy) | ✅ | ❌ | ❌ | ✅ |
| Integration Events | view/retry | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ✅🃏 | ✅ | ❌ | ❌ |
| Audit Log | view | ❌ | ❌ | ✅ | ❌ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅⚠️ |

## Notes / Business Decisions referenced
- BD1: Finance approving field discount/credit — see `BUSINESS_DECISIONS_REQUIRED.md`.
- SoD: discount/credit/archive-adjust/archive-override must be a different actor than creator.
- SYS: System Administrator role is **MISSING** from code (required by Ch 3 §3.7.6). Until added, GM holds SYS functions.
- WH: no dedicated role; warehouse functions are under SUP/SM/GM (acceptable) but no WH user type exists.
