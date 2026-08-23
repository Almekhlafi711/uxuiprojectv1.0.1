# BUSINESS DECISIONS REQUIRED

Open questions where Chapter 3/4 silent or code conflicts; resolution needed before FIX phase.

| ID | Decision | Options | Recommendation | Who |
|----|----------|---------|----------------|-----|
| BD-1 | Finance can approve *field* discount/credit | A) remove from FIN; B) keep with dual-thresholds; C) move to SM+GM only | **B** — keep but require SM co-approval above threshold (Ch 3 §3.13 allows GM override, not FIN unilateral) | GM Finance |
| BD-2 | HR `roles.manage` / `organization.manage` scope | A) company(people); B) company(full); C) separate SYS role | **A** — people only; org config = GM+SYS | Ch 3 §3.7.8 |
| BD-3 | DO data scope = branch or network? | A) branch(DIST); B) network(entity); C) company | **B** — DO manages distribution network = `entity` (own distributor chain) | Ch 3 §3.7.4 |
| BD-4 | DIST can edit own Sell-In? | A) yes; B) no (view only) | **A** — DIST records own Sell-In | Ch 3 §3.26 |
| BD-5 | Merge `/rep/*` pages into generic modules? | A) yes; B) keep parallel | **A** — dedup; generic module + role-aware view | Architecture |
| BD-6 | SM `sales.cancel` on posted invoices | A) allow; B) draft only; C) needs approval | **B** — draft only; cancel posted = GM+FIN approval | Ch 3 §3.8, Ch 4 |
| BD-7 | AUD scope = read-only company or audit-only? | A) read company; B) audit.* only | **A** — read-only company (compliance) | Ch 3 §3.7.7 |
| BD-8 | SM `users.manage`? | A) yes; B) no (GM+HR) | **B** — SM should NOT manage users | Ch 3 §3.8 |
| BD-9 | WH role modeled or folded into SUP/SM? | A) separate role; B) fold | **B** — fold (no WH users today) | Chapter 3 |
| BD-10 | Vehicle Custody vs Mobile Stock separation | A) single Custody entity; B) split | **A** — CustodyAssignment distinct; mobile stock = inventory movements only | Ch 4 |
| BD-11 | Integration retry policy | A) exponential backoff 3x; B) linear 5x; C) manual | **A** — exponential, max 24h | Ch 3 §3.28 |
| BD-12 | Leave approval chain | A) direct supervisor; B) matrix by branch | **A** — direct supervisor (simpler) | Ch 3 §3.25 |
| BD-13 | Messages recipients — same role only? | A) cross-role within scope; B) role-limited | **A** — within data scope (REP→SUP→SM→GM) | Ch 3 §3.27 |
| BD-14 | Archive override by GM bypasses SoD? | A) yes; B) always dual | **B** — dual (GM+SYS/AUD witness) | Ch 3 §3.24 |
