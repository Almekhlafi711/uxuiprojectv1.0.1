# CUSTOMER_MODULE_AUDIT.md — تدقيق وحدة العملاء (Module 01)

التاريخ: 2026-08-18 · الحالة: **تحليل — بدون تعديل كود**
المرجع: Chapter 3 v1.0 (§3.8, §3.12, §3.13, §3.31) + Chapter 4 + منهجية ERP المؤسسية
(Module → Purpose → Work Center → Transactions → Master Data → Documents → Workflow → Status → Impact → Roles → KPIs → Exceptions → Audit Trail).

> التصنيف المعتمد لكل قاعدة: **Configurable** (إعداد مؤسسي قابل للتغيير) / **Policy** (سياسة تُضبط بمعتمَد) /
> **Workflow** (مسار اعتماد) / **Business Decision** (قرار تجاري بحت يُوثَّق). لا نُخترع قاعدة غير موجودة في الوثائق.

---

## 1. Module
**Module: Customer Management (Module 01)** — إدارة ملف العميل ودورة حياته من استهداف إلى تعامل جارٍ،
مع فصل صريح بين **TargetCustomer (مستهدف)** و **Customer (نشط)** و **CustomerAssignment (إسناد)**
و **DebtResponsibility (مسؤولية الدين)**.

## 2. Purpose
ضمان: كل عميل له سجل واحد كامل (Customer 360) قابل للتدقيق، لا حذف لأي عميل له معاملات مالية،
الأرصدة والأعمار **مشتقة** من الدفتر وليست مخزّنة، وكل تغيير حساس يمر بمسار اعتماد + حدث تدقيق + مستند ذي صلة.

## 3. Work Centers (مراكز العمل)

| Work Center | من يستخدمه | الصفحة الحالية |
|-------------|------------|----------------|
| WC-CUS-01 ملف العميل (Customer Master) | REP / SUP / SM / GM / FIN | `/customers/:id` (عام) + `/rep/customer/:id` (مندوب) |
| WC-CUS-02 قائمة العملاء / البحث | REP / SUP / SM / GM | `/customers` + `/rep/customers` |
| WC-CUS-03 إدارة المستهدفين (Target) | REP (إدخال) / SUP (مراجعة) / SM (اعتماد) | `/rep/targets-org` + `/supervisor/customers/targets` |
| WC-CUS-04 الإسناد والتحويل | SUP (فريق) / SM | `/supervisor/planning/assignments` + `/supervisor/customers/transfers` |
| WC-CUS-05 الإيقاف والتعطيل | SUP / SM | `/supervisor/customers/suspended` |
| WC-CUS-06 الديون والأعمار | SUP / SM / FIN / GM | `/supervisor/debts/aging` + `/supervisor/debts` |
| WC-CUS-07 تعديل البيانات والائتمان | SM / GM | **غير موجود كمسار كامل** (زر «تعديل» بلا إجراء) |

## 4. Master Data (البيانات الأساسية)
| كيان | النوع | المصدر | ملاحظة |
|------|-------|--------|--------|
| `Customer` | أساسي | `src/mock/customers.ts` | يخلط بين Customer و Target (سجلات `status:"pending"` + `targetFlag`) |
| `TargetOrganization` | مستهدف | `src/mock/repField.ts` | مسار موازٍ منفصل عن Customer |
| `CustomerTransferRecord` | تحويل | `src/mock/supervisor.ts` | موجود + له auditTrail ✅ |
| `CustomerSuspension` | إيقاف | `src/mock/supervisor.ts` | موجود + له history ✅ |
| `CustomerAssignment` | إسناد (نشط/منتهي) | **غير موجود** | يجب إضافته؛ النموذج الحالي `repId` واحد فقط |
| `DebtResponsibility` | مسؤولية الدين | `supervisorPolicies.customerTransfer.debtResponsibility` | موجود كقيمة Configurable ✅ لكن ليس ككيان سجلّي |

## 5. Transactions (المعاملات)
| معاملة | الحالة الحالية | التصنيف |
|--------|----------------|---------|
| إنشاء عميل جديد | `CustomerForm` يكتب مباشرة (لا يسجّل منشئ/مصدر) | **Workflow** (Target→Approval→Convert ثم Active) |
| تعديل بيانات العميل | زر «تعديل» بلا `onClick` في 360 العام | **Configurable** (حقول قابلة للتعديل بصلاحية) |
| رفع/خفض الحد الائتماني | `CustomerForm` يضبط `creditLimit` مباشرة | **Workflow** (لا يُعتمد؛ انظر §7) |
| تغيير شروط الدفع | عبر `paymentTerms` مباشرة | **Workflow** (تأثير على التدفق النقدي) |
| تحويل العميل لمندوب آخر | wizard يحفظ Toast فقط (لا سجل حقيقي) | **Workflow** (pending→approved→executed) |
| إيقاف/تعطيل عميل | سجل ثابت في Suspensions ✅ | **Workflow** (مراجعة مخزون/صندوق/عهدة قبل التنفيذ) |
| إعادة تفعيل | موجود في الحالة لكن بلا إجراء | **Workflow** |
| حذف عميل | **غير موجود في الكود** ✅ (لا حذف) | Policy |
| التحصيل/البيع/المرتجع/الزيارة | صفحات منفصلة مرتبطة بـ customerId | (ترتبط في 360 بالقراءة) |

## 6. Documents (المستندات المرتبطة)
| مستند | المرجع | حالة الربط في 360 |
|-------|--------|------------------|
| فاتورة مبيعات `Invoice` | `src/mock/sales.ts` | يُعرض ✅ |
| سند قبض `Collection` | `src/mock/collections.ts` | يُعرض ✅ |
| مرتجع `ReturnRecord` | `src/mock/returns.ts` | يُعرض ✅ |
| زيارة `Visit` | `src/mock/visits.ts` | يُعرض ✅ |
| سجل تدقيق `AuditLog` | `src/mock/admin.ts` | يُعرض ✅ |
| مسار/خطة `RoutePlan` | — | **غير معروض** (مطلوب في الـ 14 قسماً) |
| مراسلات `Conversation` | — | **غير معروض** |
| مستندات/مرفقات | `attachments` في TargetOrganization فقط | **غير معروض** للعميل النشط |

## 7. Workflow & Status (المسارات والحالات) — ملخص
| العملية | الحالة الحالية | المطلوب | التصنيف |
|---------|----------------|---------|---------|
| مستهدف → عميل | `TargetOrganization` (draft/under_review/approved/rejected/converted) + سجلات `status:"pending"` متوازية | مسار واحد: **draft → submitted → under_review → approved → converted → active** | **Workflow** (قابل للتكوين: من يعتمد) |
| دورة حياة العميل | `Status` = active/inactive/overdue/suspended/pending | Target→Active + Suspended/Inactive/Closed. **لا حذف أبداً** | Policy |
| رفع الحد الائتماني | بلا اعتماد | مسار اعتماد قابل للتكوين (SUP أو SM حسب سقف المبلغ) | **Workflow** |
| التحويل | SUP يحوّل بلا اعتماد | pending → approved → executed مع **CustomerAssignment** و**DebtResponsibility** مسجّلة | **Workflow** |
| الإيقاف | SUP يسجّل مباشرة | مراجعة (مخزون/صندوق/عهدة) ثم تنفيذ + إعادة تفعيل بمعتمَد | **Workflow** |

## 8. Status (حالات الكيان)

**TargetCustomer:** `draft → submitted → under_review → approved → rejected → converted`
**Customer:** `target → active → suspended / inactive → closed` (closed: لا حذف، إنهاء الإسناد، صفر عمليات جديدة)
**CustomerAssignment:** `active → ended`
**CustomerTransferRecord:** `pending → approved → executed | rejected`

## 9. Impact (التأثير على الأنظمة الأخرى)
- **Sales/Collections/Returns/Visits**: ترتبط بـ `customerId` — تعرض تاريخياً في 360.
- **Ledger (Phase F)**: الأرصدة **مشتقة** من `ledger.ts` — لكن صفحات العملاء ما زالت تقرأ `customer.balance` المخزّن ⚠️ **تعارض** (انظر §11).
- **Targets/KPI**: `Target` تحسب الإنجاز من invoices/collections/visits.
- **Archive**: أرشفة مستندات العميل عبر `canAccessArchive`.

## 10. Roles (الأدوار والصلاحيات المعنية)
| الدور | النطاق | الصلاحيات الحالية |
|-------|--------|-------------------|
| REP | self | `customers.view` فقط (لا إنشاء/تعديل) |
| SUP | team | `customers.view, customers.transfer, customers.deactivate` |
| SM | branch | `customers.*` + `credit.approve` + `discount.approve` |
| GM | network | كل `customers.*` |
| FIN/AUD | read/people | `customers.view` + `customer_ledger.view` |
| SYS | system | كل شيء |

**قرارات المستخدم (لا تُخترع قواعد):**
- مسار الاعتماد **غير مقيد بسلسلة REP→SUP→SM→GM** — قابل للتكوين.
- رفع الحد الائتماني **ليس حصراً على GM** — مسار قابل للتكوين (سقوف بالمبلغ).
- تحويل العميل **ليس حصراً على GM** — SUP/SM يتحملون وفق السياسة.
- فصل كيانات: Customer / TargetCustomer / CustomerAssignment / DebtResponsibility.
- الاحتفاظ بتاريخ الإسناد وتاريخ مسؤولية الدين.
- العميل ذو المعاملات المالية **لا يُحذف أبداً**.

## 11. الثغرات والتعارضات (Gaps & Conflicts)
| ID | الوصف | الخطورة | مرجع الوثائق |
|----|-------|---------|--------------|
| **C1** | `customer.balance` **مخزّن** في mock بينما ledger.ts (Phase F) يحسب أرصدة مشتقة — المصدران غير متطابقين | **حرِج** | §3.31 / المستخدم: الأرصدة مشتقة |
| **C2** | `Customer` و `TargetCustomer` مخلوطان في `customers.ts` (`status:"pending"` + `targetFlag`) + مسار `TargetOrganization` موازٍ منفصل | **حرِج** | F5 / المستخدم: فصل الكيانات |
| **C3** | لا يوجد كيان `CustomerAssignment` (لا تاريخ إسناد، لا انتهاء إسناد) | **عالي** | المستخدم: إسناد + تاريخ |
| **C4** | تعديل العميل والائتمان بلا مسار/إجراء (زر «تعديل» ميت، لا `/customers/:id/edit` فعال) | **عالي** | M3 / L3 |
| **C5** | 360 لا يعرض: قسم الائتمان، أعمار الديون، المسارات، المراسلات، المرفقات، موافقات | **عالي** | المستخدم: 14 قسماً |
| **C6** | نسختان من CustomersPage و Customer360Page (عام/مندوب) | **متوسط** | M5 / المستخدم: لا صفحات مكررة |
| **C7** | التحويل wizard لا يكتب سجلاً حقيقياً (Toast فقط) | **عالي** | المستخدم: تاريخ + مستند |
| **C8** | `suspensions` في `mockApi` بلا فلترة نطاق (يرجع كل الفريق بلا تحقق) | **متوسط** | §3.8 DataScope |
| **C9** | `TargetsPage` (المستهدفات KPI) و `TargetOrganizationsPage` (المستهدفون org) اسمان متشابهان — افصل التسمية في الواجهة | **منخفض** | وضوح UX |

## 12. KPIs (مؤشرات الوحدة)
- عدد العملاء النشطين / النسبة من المستهدفين المحوّلين.
- استهلاك الحد الائتماني (Credit Utilization %) وعدد حالات تجاوز الحد.
- توزيع أعمار الديون (Not Due / 1-30 / 31-60 / 61-90 / >90).
- متوسط فترة التحصيل، ومعدل الزيارات لكل عميل.
- عدد عمليات التحويل/الإيقاف مع مدة دورة الاعتماد.

## 13. Exceptions (الاستثناءات والخطأ)
| الحالة | السلوك المطلوب |
|--------|----------------|
| تجاوز الحد الائتماني | منع البيع الآجل؛ السماح نقدي فقط أو تحصيل أولاً (موجود ✅ في rep 360) |
| عميل معلّق/مغلق | منع إنشاء فواتير/طلبات جديدة |
| تحويل بمستحقات غير محصّلة | تسجيل `DebtResponsibility` وفق السياسة (previous/new/policy) |
| محاولة حذف عميل بمعاملات | **رفض النظام** + رسالة (غير موجودة — التطبيق لا يوفر delete أصلاً) |
| الوصول المباشر بالرابط إلى عميل خارج النطاق | 403 (موجود ✅ عبر `canAccessCustomer` في 360 المندوب) |

## 14. Audit Trail (سجل التدقيق)
- كل عملية حساسة (إنشاء/تعديل/ائتمان/تحويل/إيقاف/تفعيل) تنتج: **حدث حالة (state change) + حدث تدقيق (`AuditLog`) + مستند ذي صلة (transfer/suspension record)**.
- السجل الحالي يقرأ `auditLogs` في 360 ✅ لكن لا تُكتب أحداث من النماذج نفسها (إنشاء/تحويل/ائتمان).
- إلزامي: من يستطيع، متى، من، ماذا، السبب، الـ reference.

## 15. الخلاصة
تحتاج الوحدة إلى: (1) توحيد مصدر الأرصدة على `ledger.ts`، (2) فصل TargetCustomer عن Customer مع مسار تحويل واحد،
(3) إضافة CustomerAssignment + DebtResponsibility ككيانات سجلّية، (4) تكوين مسارات الاعتماد بدلاً من الترميز،
(5) توسيع 360 إلى 14 قسماً، (6) دمج النسختين المكررتين. **كل ذلك بعد إغلاق التحليل والموافقة.**