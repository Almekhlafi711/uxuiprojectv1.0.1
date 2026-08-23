# CUSTOMER_DUPLICATION_REPORT.md — تقرير الازدواجية في وحدة العملاء (Module 01)

التاريخ: 2026-08-18 · الحالة: **تحليل** (لا تعديل كود)
الهدف: الكشف عن تكرار الصفحات/المسارات/البيانات/المفاهيم في وحدة العملاء للدمج قبل التنفيذ.

## 1. ازدواجية الصفحات (Pages)
| النوع | المسار/الصفحة A | المسار/الصفحة B | الحكم |
|-------|-----------------|-----------------|-------|
| **CustomersPage** | `/customers` → `src/modules/customers/CustomersPage.tsx` | `/rep/customers` → `src/modules/rep/CustomersPage.tsx` | **دمج** في صفحة واحدة Role-aware (نفس البيانات، نفس DataScope) |
| **Customer360Page** | `/customers/:id` + `/supervisor/customers/:id` → `src/modules/customers/Customer360Page.tsx` | `/rep/customer/:id` → `src/modules/rep/CustomersPage.tsx` (يصدّر `Customer360Page`) | **دمج** في 360 واحد بـ 14 قسماً + تفريق حسب الدور |

**ملاحظة**: `/supervisor/customers/:id` يستخدم 360 العام بالفعل (جيد) — الازدواج الحقيقي هو نسخة المندوب.

## 2. ازدواجية المسارات (Routes)
| Route | الصفحة | الحالة |
|-------|--------|--------|
| `/customers` | عام | محجوز لغير المندوب |
| `/rep/customers` | مندوب | نفسه بالمعنى — يظهر للمندوب في التنقل الجديد |
| `/customers/new` | `CustomerForm` (Drawer عام) | **مكرر المفهوم** مع إنشاء Target — يُدمج في مسار المستهدف |
| `/rep/targets-org` | `TargetOrganizationsPage` | مسار المستهدف (محفوظ) |
| `/supervisor/customers/targets` | `TargetCustomersPage` | مراجعة المشرف (محفوظ) |

> لا نزيل `/rep/customers` إلا بعد ترحيل رابط التنقل لنسخة عامة نطاقية واحدة — **قرار ترحيل معلّق على الموافقة**.

## 3. ازدواجية المفاهيم/البيانات (Data)
| المفهوم | الموقع A | الموقع B | التعارض |
|---------|----------|----------|---------|
| العميل المستهدف | `TargetOrganization` (repField.ts) — مسار كامل بالحالات | `customers.ts` سجلات `status:"pending"` + `targetFlag:true` (c-031, c-032) | **مفهومان موازيان** لنفس الشيء (C2) |
| رصيد العميل | `customer.balance` (مخزّن) | `ledger.ts getCustomerBalance` (مشتق) | **مصدران** غير متطابقين (C1) |
| الإسناد | `customer.repId` (قيمة واحدة) | `CustomerTransferRecord.previousRepId/newRepId` | الإسناد الحالي بلا تاريخ/سجل كامل (C3) |
| مسؤولية الدين | `supervisorPolicies.customerTransfer.debtResponsibility` | `CustomerTransferRecord.debtResponsibility` | نفس السياسة محمولة في موضعين — توحيد كسجل مؤرَّخ |

## 4. ازدواجية الكود داخل الملفات (Code)
- `src/modules/rep/CustomersPage.tsx` يحتوي **صفحتين كاملتين** في ملف واحد (`CustomersPage` + `Customer360Page`) — يُفصلان عند الدمج.
- تسميات `typeLabels` (rep) و `customerTypeLabels` (عام) مكررة لترجمة نفس الأنواع — تُوحَّد في `mock/customers.ts`.

## 5. تداخل الصفحات المتشابهة (Similar — ليست ازدواجاً، يجب تمييزها في الواجهة)
| الصفحة | الغرض | تمييز |
|--------|-------|-------|
| `/targets` (TargetsPage) | أهداف KPI (مبيعات/تحصيل/زيارات) | «الأهداف والمستهدفات» |
| `/rep/targets-org` | العملاء المستهدفون (org) | «المؤسسات المستهدفة» |
| `/supervisor/customers/targets` | مراجعة المستهدفين | «مراجعة المستهدفين» |

> أسماء متقاربة قد تربك المستخدم — ننصح بتوحيد المصطلح: «عميل مستهدف» للـ org، و«هدف» لـ KPI.

## 6. قرارات الدمج المقترحة (للموافقة)
| # | القرار | الأثر |
|---|--------|-------|
| D1 | صفحة عملاء **واحدة** Role-aware (إلغاء `/rep/customers` وتوجيهه للعام مع DataScope self) | إزالة ازدواج M5 |
| D2 | Customer360 **واحد** بـ 14 قسماً، يتبدل حسب الدور | إزالة نسخة المندوب |
| D3 | تحويل سجلات `status:"pending"` من `customers.ts` إلى `TargetOrganization` وربط `targetId` عند التحويل | فصل Target عن Customer (C2) |
| D4 | قراءة الأرصدة من `ledger.ts` حصراً (حذف الاعتماد على `customer.balance` المخزّن) | توحيد مصدر الحقيقة (C1) |
| D5 | إنشاء `CustomerAssignment` + `DebtResponsibility` كسجلات مؤرّخة تُقرأ من `CustomerTransferRecord` | سجل كامل (C3) |
| D6 | توحيد تسمية الأنواع و`typeLabels` في مصدر واحد | تقليل الازدواج |

## 7. ما لا يجب لمسه (Keep)
- `/supervisor/customers/*` (مراقبة الفريق) — ليست ازدواجاً بل Work Center مشرف.
- `/supervisor/debts/aging` + `/supervisor/debts` — تحليل تكميلي (لا ازدواج).
- `mockApi.customers.list/getById` مع فلترة النطاق ✅.
- عدم وجود أي Delete للعميل ✅ (السياسة محفوظة).

## 8. أولوية الإغلاق
1. **D4** (ledger) — يمس كل صفحة/رصيد (حرِج).
2. **D3** (فصل Target/Customer) — يمس نموذج البيانات والمسار (حرِج).
3. **D1+D2** (دمج الصفحات) — يمس التنقل والـ 360.
4. **D5** (الإسناد/الدين) — يعتمد على D3.
5. **D6** (تسميات) — تجميلي.