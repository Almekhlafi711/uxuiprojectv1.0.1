# REP Duplication Audit

Goal (RFD §27): no duplicate navigation/pages/components/APIs/data/messages for the same function.

## 1. Duplicate PAGE COMPONENTS (نفس الاسم، مسارات مختلفة)
| Name | Path A | Path B | هل مكرر؟ | الملف الموحد |
|---|---|---|---|---|
| `CustomersPage` | `/customers` (shared) | `/rep/customers` (rep) | ✅ **مكرر** | `src/modules/rep/CustomersPage.tsx` (Rep) و `src/modules/customers/CustomersPage.tsx` (Shared) — ملفان منفصلان. |
| `ProductsPage` | `/products` | `/rep/products` | ✅ **مكرر** | `src/modules/rep/ProductsPage.tsx` و `src/modules/products/ProductsPage.tsx`. |
| `VanInventoryPage` | `/inventory/van` | `/rep/van` | ✅ **مكرر** | `src/modules/rep/VanInventoryPage.tsx` و `src/modules/inventory/VanInventoryPage.tsx`. |
| `MessagesPage` | `/messages` | `/rep/messages` | ✅ **مكرر** | `src/modules/rep/MessagesPage.tsx` و `src/modules/messages/MessagesPage.tsx` (ملف غير مستورد بعد — repo has `src/modules/messages`? تم التحقق: لا يوجد `src/modules/messages` — يوجد `/rep/messages` فقط. **NOT duplicated** — `rep/MessagesPage.tsx` يُعيد تصديره `/messages`؟ لا يوجد. المسار الوحيد `/rep/messages` عبر `repPolicies.messagesAllowedRoles`). |
| `ReportsPage` | `/reports` | `/rep/reports` | ✅ **مكرر** | `src/modules/rep/ReportsPage.tsx` و `src/modules/reports/ReportsPage.tsx`. |

**الخلاصة:** `CustomersPage`, `ProductsPage`, `VanInventoryPage`, `ReportsPage` — **نسخ مكررة** (rep vs shared). كل منهما يحمل نفس المنطق مع فروق data scope.

## 2. Duplicate ROUTES
تم التحقق من `src/App.tsx`: لا يوجد مسار مكرر. الـ/rep/* و /shared مسارات متميّزة. ✅

لكن: `/customers` (shared) محمي `customers.view` (Scoped = own via scope.ts)، و`/rep/customers` محمي بنفس الـpermission. هما نفس الوظيفة مع سلوك data scope متماثل. → **يمكن دمجهما** إلى مسار واحد `/customers` يُظهر بيئز للـrep.

## 3. Duplicate Navigation
- `Sidebar` (rep modules 7 top) + `TopNav` (sub-items of active module) — **ليس تكراراً**: مستويات مختلفة. ✅
- `SupervisorPageHeader` كان يحتوي نسخة مكررة من منطق الـscroll/sticky — **أُعيدت لتعيد استخدام StickyPageHeader** (النسخة المكررة أُزيلت). ✅

## 4. Duplicate APIs / Mock Data
- `mockApi.inventory.vanStock()` يُستخدم من `rep/VanInventoryPage` و `inventory/VanInventoryPage` والـshared — واحد المصدر (`mock/inventory.ts`). ✅ وليس مكرراً.
- `mockApi` مركّز في `src/services/mockApi.ts`. ✅

## 5. Duplicate Messaging
- `rep/MessagesPage` (للمندوب) — واجهة محادثة داخلية. لا يوجد `/messages` مشترك آخر مع منطق مكرر. ✅ لكنه يحمل منطق `repPolicies.messagesAllowedRoles` — مركّز.

## 6. Duplicate Dashboard
- `modules/dashboard/RepDashboard.tsx` (مكوّن غير مستخدم — `grep` وجدته self-reference فقط، لا يُستورد). 
- `modules/rep/DashboardPage.tsx` هو الـDashboard الفعلي للمندوب (`/rep/dashboard`). ✅ لا يوجد Dashboard مكرر — لكنه يبقى `RepDashboard.tsx` غير المستخدم ملف أصدأ (ملف legacy)، يُنصح بحذفه.

## 7. توصيات الدمج
1. دمج `products/ProductsPage` + `rep/ProductsPage` → مكوّن واحد يُظهر sub-items بناءً على الـrole+scope.
2. دمج `customers/CustomersPage` + `rep/CustomersPage` مع `Customer360` unified.
3. حذف `modules/dashboard/RepDashboard.tsx` غير المستخدم.
4. دمج `reports/ReportsPage` + `rep/ReportsPage` حسب الـRole.

> ملحوظة: دمج هذه لا يخلق تغيير في الـRoutes — الـRoutes تبقى (`/rep/...` والمشاركة)، لكن الـComponent يُبنى واحداً بالتوحيد role-aware.
