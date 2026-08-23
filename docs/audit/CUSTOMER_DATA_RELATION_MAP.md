# CUSTOMER_DATA_RELATION_MAP.md — خريطة العلاقات البياناتية (Module 01)

التاريخ: 2026-08-18 · الحالة: **تحليل**
المبدأ: كل علاقة تُقرأ من مصدر واحد للحقيقة؛ الأرصدة مشتقة لا مخزّنة.

## 1. الكيانات الأساسية والمقترحة
| الكيان | الحالة | المفاتيح | المصدر |
|--------|--------|----------|--------|
| `Customer` | موجود | `id, code, territoryId, repId, supervisorId` | `src/mock/customers.ts` |
| `TargetOrganization` (TargetCustomer) | موجود | `id, requestedById, supervisorId, territoryId` | `src/mock/repField.ts` |
| `CustomerTransferRecord` | موجود | `id, customerId, previousRepId, newRepId` | `src/mock/supervisor.ts` |
| `CustomerSuspension` | موجود | `id, customerId, suspendedBy` | `src/mock/supervisor.ts` |
| `CustomerAssignment` | **مقترح** | `id, customerId, repId, startAt, endAt?, status` | جديد |
| `DebtResponsibility` | **مقترح كسجل** | `id, customerId, repId, periodFrom, periodTo, type` | جديد |
| `CustomerLedgerEntry` | موجود | `entityType=customer, entityId, debit/credit` | `src/mock/ledger.ts` |

## 2. علاقات الوثائق بالعميل (القراءة في 360)
| المستند | العلاقة | الاتجاه | المصدر الحالي |
|---------|---------|---------|----------------|
| `Invoice` | customerId → 1:N | العميل → فواتيره | `invoicesByCustomer(id)` |
| `Collection` | customerId → 1:N | العميل → سنداته | `collections.filter(c.customerId===id)` |
| `ReturnRecord` | customerId → 1:N | العميل → مرتجعاته | `returns.filter(r.customerId===id)` |
| `Visit` | customerId → 1:N | العميل → زياراته | `visitsByCustomer(id)` |
| `RoutePlan` | customerId → N:M | العميل → مساراته | **غير معروض** |
| `Conversation` | participants → N:M | العميل → مراسلاته | **غير معروض** |
| `AuditLog` | entity=Customer, entityId | العميل → سجل تدقيقه | `auditLogs.filter(l.entity==="Customer"...)` |
| `Target` (KPI) | ownerId → rep/territory | العميل مرتبط بإنجاز صاحبه | `mock/targets.ts` |
| `Attachment` | entityId → customer/target | مستندات | `attachments` (Target فقط) |

## 3. مصدر الأرصدة — مشتق لا مخزّن ⚠️ (Conflict C1)
```
balance(customer) = Σ(ledger.debit) − Σ(ledger.credit)
                   = invoices(completed) − collections(approved) − returns(approved)
```
- **الحقيقة**: `src/mock/ledger.ts` (Phase F) يحسب `getCustomerBalance(id)`.
- **الواقع الحالي**: `customers.ts` يحوي حقل `balance` **مخزّناً يدوياً**، وكل الصفحات (360 العام/المندوب، الجداول)
  تقرأ `customer.balance` مباشرة. → مصدران غير متطابقين. **القرار**: حذف الاعتماد على الحقل المخزّن وجعل القراءة من ledger فقط
  (أو إعادة حساب الحقل كعرض مشتق أثناء قراءة mockApi.customers.list/getById).
- `creditLimit` يبقى **مخزّناً** (قيمة أساسية يُضبط بموافقة) — مشتق فقط `utilization = balance/creditLimit`.

## 4. خريطة الإسناد (حالياً vs المطلوب)
```
الآن:  Customer.repId (قيمة واحدة فقط)   ← يفقد التاريخ
المطلوب:
       CustomerAssignment (1:N)          ← سجل كامل active/ended
       Customer ──has──> Assignment(repId, startAt, endAt)
       Transfer ──produces──> Assignment(old=ended, new=active) + DebtResponsibility
```
- التحويل الحالي يعدّل `repId` ضمنياً لكن لا يسجل `endAt` للإسناد القديم (C3).

## 5. خريطة مسؤولية الدين
```
الآن: supervisorPolicies.customerTransfer.debtResponsibility (قيمة جارية واحدة)
المطلوب: DebtResponsibility سجل لكل فترة: {customerId, repId, from, to, type}
  type: previous_rep | new_rep | policy (حسب التكوين)
- تُستخدم في: أعمار الديون (أي مندوب يتحمل مستحقات الفترة)، التحصيل، تقارير المسؤولية.
```

## 6. نطاق الوصول (DataScope) — العلاقة تُقيَّد عند القراءة
| المنظور | الشرط (canAccessCustomer) |
|---------|----------------------------|
| REP (self) | `c.repId === me` |
| SUP (team) | `c.repId===me || c.supervisorId===me || c.territoryId===myTerritory` |
| SM (branch) | كل عملاء الفرع |
| GM/FIN/AUD (network/read) | الكل |
- كل `mockApi.customers.*` يُفلتر بـ `canAccessCustomer` ✅ (list/getById).
- **ثغرة**: `customers.suspensions` لا يُفلتر بالنطاق (يرجع كله في النطاق team) ⚠️ (C8).

## 7. مخطط التبعية (Dependency Graph) للوحدة
```
            ┌──────────── TargetOrganization ────(converted)──→ Customer
            │                     │                              │
            │                  assigned to                  has (1:N)
            │                     ▼                              ▼
         CustomerAssignment ◄── Transfer ◄─── Customer ──→ LedgerEntries (derived)
            │                     │                              │
            │              DebtResponsibility ──(per period)──→ aging/buckets
            │                                                    ▲
            └── Suspension ◄────────── CustomersPage/360 ◄───────┘
                                  │
                                  ▼
                          (sales/collections/returns/visits/routes/comms/audit)
```