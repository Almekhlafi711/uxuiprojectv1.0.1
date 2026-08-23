# CUSTOMER_WORKFLOW.md — مسارات العمل والاعتماد (Module 01)

التاريخ: 2026-08-18 · الحالة: **تحليل**
المبدأ الجوهري: **لا تُرمّز أي سلسلة اعتماد** (لا REP→SUP→SM→GM قسرية). كل مسار يُقرأ من **PolicyConfig**
قابل للتكوين، وكل انتقال حساس ينتج: **حالة جديدة + حدث تدقيق + مستند مرجعي**.

## 1. دورة حياة المستهدف → العميل النشط
```
TargetCustomer: draft → submitted → under_review → approved → converted
                                              │ (approved) → Customer.active
                                              └ (rejected) → draft (مع سبب + سجل)
```
| الانتقال | المُنفِّذ (قابل للتكوين) | الفعل المطلوب |
|----------|--------------------------|---------------|
| draft → submitted | REP (صاحب المستهدف) | إرسال كامل البيانات + مرفقات |
| submitted → under_review | النظام | تسجيل وقت الإرسال |
| under_review → approved | SUP **أو** SM (حسب Policy) | إنشاء `Customer` + `CustomerAssignment` (active) |
| under_review → rejected | SUP/SM | سبب + إرجاع للمندوب |
| approved → converted | النظام | فتح ملف العميل + ربط `targetId` |

## 2. دورة حياة العميل (Customer Status)
```
target → active → suspended ──→ active (إعادة تفعيل بمعتمَد)
         │             └──→ inactive (مؤقت)
         └──→ closed (لا حذف؛ إنهاء الإسناد + منع معاملات جديدة)
```
- **لا حذف أبداً** لعميل له معاملات مالية (سياسة النظام).
- الإيقاف: مراجعة إلزامية (مخزون/صندوق/عهدة) قبل التنفيذ → `CustomerSuspension` + `history`.
- إعادة التفعيل: اعتماد حسب السياسة.

## 3. تحويل العميل بين المناديب (Customer Transfer)
```
pending → approved → executed  (أو rejected)
```
| الانتقال | المُنفِّذ | الناتج المطلوب |
|----------|----------|----------------|
| إنشاء طلب | SUP (ضمن فريقه) أو SM | `CustomerTransferRecord` (pending) + سبب |
| pending → approved | SUP/SM حسب السياسة | تحديث record + `approvedBy` |
| approved → executed | النظام عند تاريخ الفعالية | `CustomerAssignment` (old→ended, new→active) + `DebtResponsibility` مسجّلة |

- **DebtResponsibility**: `previous_rep | new_rep | policy` (موجود في `supervisorPolicies.customerTransfer` كقيمة **Configurable** ✅).
- يجب تحويلها إلى **سجل مؤرَّخ** في الـ transfer (وليس مجرد سياسة جارية)، مع الإبقاء على سجل المسؤولية لكل فترة.

## 4. رفع/تعديل الحد الائتماني
| الحالة | المعالجة | التصنيف |
|--------|----------|---------|
| طلب رفع | يجب مروره بمسار اعتماد **قابل للتكوين بالسقف** | **Workflow** |
| سقف منخفض (≤ ConfigValue) | SUP يعتمد | Configurable |
| سقف أعلى | SM (أو SM+GM) يعتمد حسب PolicyConfig | Configurable |
| التنفيذ | `creditLimit` يتحدث مع `AuditLog` + سبب | Workflow |

> القاعدة الحالية (المكتوبة في الـ rep 360): تجاوز الحد يمنع البيع الآجل ✅ — لكن **تغيير الحد نفسه** بلا اعتماد ⚠️ (L3).

## 5. الإيقاف والتعطيل وإعادة التفعيل
- الإيقاف: SUP يطلب (أو يعتمد ضمن فريقه) → فحص مخزون/صندوق/عهدة → تنفيذ + `CustomerSuspension` + history.
- إعادة التفعيل: بمعتمَد (SUP/SM حسب السياسة).

## 6. سياسات مشتقة (تُضبط من PolicyConfig لا من الكود)
| القاعدة | القيمة | التصنيف |
|---------|--------|---------|
| من يعتمد المستهدف | `[SUP]` أو `[SM]` | Configurable |
| سلسلة اعتماد الائتمان | `[SUP→SM]` أو `[SM]` أو `[SM→GM]` | Configurable |
| مسؤولية الدين عند التحويل | `previous_rep | new_rep | policy` | Policy |
| سقف موافقة SUP | رقم (مثلاً 20,000) | Configurable |
| من يمكنه التحويل | `[SUP, SM]` (ليس GM حصراً) | Configurable |
| إيقاف/تفعيل | `[SUP, SM]` | Configurable |

## 7. القواعد التي لا تتغير (Hard Rules — من الوثائق)
1. لا حذف لعميل بمعاملات مالية.
2. الأرصدة والأعمار **مشتقة** من الدفتر (`ledger.ts`) لا مخزّنة.
3. كل انتقال حساس → حالة + تدقيق + مستند.
4. 403 لمن يتجاوز نطاقه (لا إخفاء فقط).
5. المراجعة قبل الإيقاف إلزامية (مخزون/صندوق/عهدة).

## 8. سجل التدقيق المطلوب لكل عملية
| العملية | AuditEvent | Document |
|---------|-----------|----------|
| تحويل مستهدف → عميل | entity=Target, action=converted | Customer + CustomerAssignment |
| تعديل بيانات | entity=Customer, action=updated | (diff للحقول) |
| رفع الائتمان | entity=Customer, action=credit_change | سبب + المعتمِد |
| تحويل مندوب | entity=Customer, action=transferred | CustomerTransferRecord + assignments |
| إيقاف/تفعيل | entity=Customer, action=suspended/restored | CustomerSuspension |
| محاولة وصول مرفوضة | entity=Customer, action=unauthorized_access | — (تسجيل أمني)