# REP Gaps — Before Supervisor

Gate: "Representative Module Ready for Supervisor" only when all CRITICAL + HIGH gaps below are RESOLVED (or explicitly accepted by the business).

Classification schema: **CRITICAL = blocks a real-day rep operation**; **HIGH = breaks data integrity / permission contract**; **MEDIUM = UX/consistency**; **LOW = cosmetic/tech-debt**.

## CRITICAL
| ID | Gap | Where | Why it blocks the day |
|---|---|---|---|
| C1 | Customer balance is stored on the entity (`customers.balance`, `cashBoxes.balance`) instead of derived-only from `mock/ledger.ts`. RFD §10/§8 require derived balances. | `src/mock/customers.ts`، `src/mock/cash.ts`، `src/ledger` | Risk of balance drift → wrong credit/collection decisions. |
| C2 | Credit check is coupled to Visit (`VisitWorkspace.tsx:59` `repPolicies.credit.blockWhenExceeded`) and NOT enforced in `NewSalePage` before invoice issuance. RFD §7 says credit must be checked before issuing invoice. | `modules/sales/NewSalePage.tsx` (unimplemented) | Rep can issue invoice past credit limit. |
| C3 | Return lifecycle has no inspection/approval/posting states — only generic `Status`. RFD §9 requires Request→Inspection→Approval→Posting with `good/damaged/returnable`. | `ReturnsPage.tsx` | Cannot inspect/deny return items; data integrity at risk. |
| C4 | StockTransfer has no `accepted/rejected/returned_for_correction` states — uses generic `Status`. RFD §12. | `StockTransfersPage.tsx` | Cannot reject/return a mis-shipped transfer. |
| C5 | No centralized workflow engine consuming `workflowMatrix` (authority.ts:473). Pages implement ad-hoc status logic → inconsistent. RFD §23. | `config/authority.ts` (declared, unused) | Inconsistent lifecycles across pages. |

## HIGH
| ID | Gap | Where |
|---|---|---|
| H1 | `workflowMatrix` declares Invoice = `draft→posted`, but `SalesOrder` (Draft→Submitted→Approved→Posted) lifecycle is **not used** in the rep UI — invoice posts directly. | `NewSalePage.tsx` |
| H2 | Custody has no full `Request→Approval→Preparation→Handover→Acceptance→Return→Archive` cycle for rep. | `CustodyPage.tsx` |
| H3 | Customer360 (rep) exposes no direct actions: بدء زيارة / بيع / تحصيل / عرض الرصيد. يلزم تنقل يدوي. | `rep/CustomersPage.tsx` |
| H4 | Dashboard renders 8 KPI cards + a separate quick-actions row — violates "Field Work Center, not admin dashboard" RFD §3. | `rep/DashboardPage.tsx` |
| H5 | `LeaveRequest` rep can only Submit; approvals route to Supervisor — **مقبول** لكن لا يوجد واضح "Submitted/Pending/Approved/Rejected" رأياً المندوب. | `LeavesPage.tsx` |
| H6 | `rep/MessagesPage` exists separately from a potential shared `/messages` — risk of future duplication (currently not duplicated, but ownership unclear). | `rep/MessagesPage.tsx` |
| H7 | Collection `customer.balance` not recomputed from ledger in UI (uses stored field). | `CollectionsPage.tsx` |
| H8 | الـRep يملك `customers.view` على `/customers` (shared) و `/rep/customers` — مساران مكرران نفس الوظيفة (see Duplication Audit). |

## MEDIUM
| ID | Gap |
|---|---
| M1 | Visit uses `result` (ليس `status`) → لا يندرج تحت الـLifecycle الموحد. |
| M2 | لا يوجد Transition matrix للـLeave/Custody/Collection/CustomerTarget. |
| M3 | بعض الـpages تنفّذ التمرير اليدوي للـdata scope داخل الـcomponent بدلاً من خدمة واحدة. |
| M4 | Dashboard KPIs ثابتة — لا يمكن تكوينها. |
| M5 | الصندوق (CashBox) يعرض `balance` مخزّن وليس مشتقاً. |

## LOW
| ID | Gap |
|---|---
| L1 | `RepDashboard.tsx` (modules/dashboard) — unused legacy كمبونент. |
| L2 | `--module-nav-height` / `--rep-workspace` تمت إزالتها/بقيا مرجعيات؟ لا — تم حذفها نهائياً. |
| L3 | Some pages still import both `PageHeader` و `StickyPageHeader` — تم التوحيد لكن التسمية StickyPageHeader تظلّ. |

## ✅ مغلق / مقبول
- GlobalTopbar ثابت ✅.
- Module Navigation (TopNav) ثابت ✅ (CSS-only sticky، z-index صحيح، central Layout).
- الـRTL ✅، Active State ✅.
- Data scope `self` للمندوب ✅ (scope.ts fail-closed).
- RBAC/SoD ✅ — الـRep لا يملك approve/cancel/edit-balance.
- Routes موحدة ✅.

## حاصل العدد (قبل الإغلاق)
- CRITICAL: **5** — جميعها تطلب تدخلاً في المنطق/البيانات (ليست Layout فقط).
- HIGH: **8** — بعضها UX، وبعضها Lifecycle.
- MEDIUM: **5**.
- LOW: **3** (+ L2 تم إغلاقه).

## Gate decision
**NOT YET READY للانتقال للمشرف** — `CRITICAL C1..C5` تحتاج توحيد ledger + توحيد workflow + إغلاق فجوة الائتمان/المرتجعات/التحويلات. بعد حلها (أو موافقة نوعية بأن بعضها "configurable policy" per RFD §6/§12)، نعيد تشغيل هذا الـGate.
