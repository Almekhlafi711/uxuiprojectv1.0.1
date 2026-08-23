# CUSTOMER_ROLE_SCOPE_MATRIX.md — مصفوفة الأدوار ونطاق البيانات (Module 01)

التاريخ: 2026-08-18 · الحالة: **تحليل**
المبدأ: **Permission** (ماذا يفعل) × **Data Scope** (على مَن) × **Route Guard** (من يصل) × **View** (ما يرى).

## 1. أعمدة الحماية الثلاثة (تُطبَّق معاً في كل شاشة)
1. **Route Guard**: `PermissionRoute permission="customers.view"` (يمنع الوصول المباشر بالرابط).
2. **Data Scope**: `canAccessCustomer(scope, c)` / `getDataScope(user)` — fail-closed (لا بيانات خارج النطاق).
3. **View/Data**: الفلاتر والتفاصيل تُبنى على نفس نطاق البيانات.

## 2. نطاق كل دور (ScopeType)
| الدور | ScopeType | من يرى (Work Center) |
|-------|-----------|----------------------|
| REPRESENTATIVE | `self` | عملاء `repId === me` فقط |
| SUPERVISOR | `team` | عملاء فريقي (`supervisorId`/`territoryId` متطابق) + كل المناديب المباشرين |
| SALES_MANAGER | `branch` | كل عملاء الفرع |
| GENERAL_MANAGER | `network` | كل العملاء |
| FINANCE/AUDITOR | `read`/`people` | قراءة كل العملاء + `customer_ledger.view` |
| SYSTEM_ADMIN | `system` | كل شيء |
| DISTRIBUTION_OFFICER | `entity`/`network` | عملاء كيانه |
| DISTRIBUTOR | `entity` | عملاء كيانه فقط |

## 3. مصفوفة الإجراءات (Action × Role) — وفق الصلاحيات الحالية `authority.ts`
| الإجراء | Perm | REP | SUP | SM | GM | FIN | AUD | SYS |
|---------|------|-----|-----|----|----|-----|-----|-----|
| عرض قائمة/ملف | customers.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| إنشاء عميل (نشط مباشرة) | customers.create | — | — | ✅ | ✅ | — | — | ✅ |
| تعديل بيانات | customers.edit | — | — | ✅ | ✅ | — | — | ✅ |
| تحويل بين مناديب | customers.transfer | — | ✅ | ✅ | ✅ | — | — | ✅ |
| تعطيل/إيقاف | customers.deactivate | — | ✅ | ✅ | ✅ | — | — | ✅ |
| إسناد/إعادة تعيين | customers.assign | — | — | ✅ | ✅ | — | — | ✅ |
| رفع الحد الائتماني | credit.approve | — | — | ✅ | ✅ | — | — | ✅ |
| اعتماد الخصم | discount.approve | — | — | ✅ | ✅ | — | — | ✅ |
| عرض دفتر/أرصدة | customer_ledger.view | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| مراجعة المستهدفين | targets.approve | — | — | ✅ | ✅ | — | — | ✅ |
| إنشاء/تعديل مستهدف | targets.org.create | ✅ | ✅ | ✅ | ✅ | — | — | ✅ |
| عرض المستهدفين | targets.org.view | ✅ | ✅ | ✅ | ✅ | — | — | ✅ |

> **قرارات مستخدم صريحة (تُلزم التصميم):**
> - الائتمان: ليس حصراً على GM — المسار قابل للتكوين حسب السقف (SUP لسقف منخفض، SM/SM+GM لسقف أعلى).
> - التحويل: ليس حصراً على GM — SUP يتحمل ضمن نطاق فريقه، مع حفظ `CustomerAssignment` + `DebtResponsibility`.
> - سلسلة الاعتماد ليست REP→SUP→SM→GM قسرية — تُقرأ من `PolicyConfig` (قابلة للتكوين).

## 4. تمييز الواجهة حسب الدور (Field-Level Visibility)
| الحقل | REP | SUP | SM+ | ملاحظة |
|-------|-----|-----|-----|--------|
| الرصيد/الحد الائتماني | ✅ (قراءة) | ✅ | ✅ | لا يعدّل REP |
| السجل التجاري/الضريبي (B2B) | ✅ (يحتاجه للبيع) | ✅ | ✅ | حسّاس — أظهره لقراءة فقط |
| شروط الدفع | ✅ قراءة | ✅ | ✅ تعديل | |
| مسؤولية الدين عند التحويل | — | ✅ | ✅ | سياسة قابلة للتكوين |
| سجل التدقيق | — | ✅ | ✅ | REP يرى نشاطه هو فقط |
| المرفقات/الوثائق | ✅ إضافة | ✅ | ✅ | |

## 5. نقاط إجبارية (Non-Negotiables)
- لا صفحة منفصلة لكل وظيفة؛ الصفحة الواحدة تتفرع بالأدوار (Module+Views+Actions).
- أي مستخدم يفتح رابط عميل خارج نطاقه → **403** (لا يُخفى فقط، يُمنع).
- Data Access ثابت في الخدمة (`mockApi.customers.list` يفلتر بـ `canAccessCustomer`) وليس فقط في الواجهة.
- REP لا يملك `customers.create` — إنشاؤه لعميل يمر عبر **Target** → اعتماد → تحويل.