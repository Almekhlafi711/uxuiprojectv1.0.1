# خطة التطوير المحدثة — بناءً على الوثيقة المرجعية 0.2

## المبدأ الأساسي
**النظام ERP قابل للتهيئة** — الوظائف مشتركة، سياسات قابلة للتهيئة، صلاحيات، بيانات، حالات استثنائية.

---

## المرحلة 0: إصلاح البيانات (2-3 أيام)

### 0.1 إنشاء ملف التاريخ الموحد
**الملف:** `src/config/date.ts`
```typescript
export const TODAY = "2026-08-19";
export const CURRENT_MONTH = "2026-08";
```
**السبب:** التاريخ ثابت في 6+ ملفات مختلفة

### 0.2 إصلاح `src/mock/users.ts`
| التعديل | التفاصيل |
|---------|---------|
| دور `u-acc-01` | تغيير من `GENERAL_MANAGER` إلى `FINANCE` |
| إضافة `avatarColor` | لكل المستخدمين الـ 20 |
| إضافة `territoryId` | لكل مندوب |
| إضافة `status` | "active" / "inactive" / "suspended" |

### 0.3 إصلاح `src/mock/commission.ts`
| التعديل | التفاصيل |
|---------|---------|
| أسماء المندوبين | مطابقة مع `users.ts` |
| تواريخ | إصلاح 2026-09-01 → 2026-08-15 |
| حد المكافأة | إصلاح `qualifies: true` مع `metricValue: 0.95 < 1.0` |

### 0.4 إصلاح `src/mock/supervisor.ts`
| التعديل | التفاصيل |
|---------|---------|
| أسماء العملاء | مطابقة مع `customers.ts` |
| إضافة `custodyRepNotes` | بيانات ملاحظات العهد |

### 0.5 توسيع `src/mock/repField.ts`
**المطلوب:** بيانات لـ 7 مناديب (حالياً لـ 1 فقط)
- `dailyPlans` لكل مندوب
- `trips` لكل مندوب
- `dailyClosings` لكل مندوب
- `depositRequests` لكل مندوب
- `loadingOrders` لكل مندوب
- `inventoryCounts` لكل مندوب

### 0.6 إصلاح `src/mock/inventory.ts`
| التعديل | التفاصيل |
|---------|---------|
| إضافة مخزون `wh-02` و `wh-03` | حالياً `wh-01` فقط |
| إضافة مخزون `u-rp-07` | حالياً 6 مناديب فقط |
| إضافة طلب جرد | `draft` status |

---

## المرحلة 1: الكيانات المفقودة (5-7 أيام)

### 1.1 إنشاء `src/types/stockBalance.ts`
**المطلوب:** `StockBalance` ككيان مستقل
```typescript
interface StockBalance {
  id: string;
  warehouseId: string;       // "wh-01" أو "van-rp-01"
  productId: string;
  quantity: number;           // = حركات داخلة - حركات خارجة
  lastMovementId: string;    // آخر حركة أثرت على الرصيد
  lastUpdatedAt: string;
}
```
**المبدأ:** `الرصيد = ناتج الحركات` — لا يُعدّل يدوياً

### 1.2 إنشاء `src/types/cashSettlement.ts`
**المطلوب:** `CashSettlement` ككيان مستقل
```typescript
interface CashSettlement {
  id: string;
  cashBoxId: string;
  repId: string;
  period: string;             // "2026-08-19"
  expectedBalance: number;
  actualBalance: number;
  variance: number;
  status: "draft" | "submitted" | "approved" | "flagged";
  approvedBy?: string;
  notes?: string;
}
```

### 1.3 إنشاء `src/types/responsibleAssignment.ts`
**المطلوب:** تتبع المسؤول عن الرصيد
```typescript
interface ResponsibleAssignment {
  id: string;
  repId: string;
  stockType: "vehicle" | "mobile" | "shared";
  vehicleId?: string;
  startDate: string;
  endDate?: string;
  status: "active" | "completed" | "transferred";
}
```

### 1.4 إنشاء `src/types/attachment.ts`
**المطلوب:** كيان المرفقات
```typescript
interface Attachment {
  id: string;
  entityType: "message" | "approval" | "return" | "custody" | "visit";
  entityId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}
```

### 1.5 إنشاء `src/types/discountRequest.ts`
**المطلوب:** طلب الخصم ككيان مستقل
```typescript
interface DiscountRequest {
  id: string;
  repId: string;
  customerId: string;
  invoiceId?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "returned";
  reviewedBy?: string;
  reviewedAt?: string;
}
```

### 1.6 إنشاء `src/types/organizationConfig.ts`
**المطلوب:** إعدادات المؤسسة
```typescript
interface OrganizationConfig {
  // نموذج المخزون
  stockResponsibility: "representative" | "vehicle" | "both";
  vehicleAssignment: "fixed" | "temporary" | "optional";
  stockCarryForward: "allowed" | "not_allowed";
  
  // نموذج التسوية
  dailyClosing: "required" | "optional" | "periodic";
  cashClosing: "required" | "optional";
  physicalCount: "every_day" | "periodic" | "on_exception";
  
  // نموذج الاعتماد
  loadingApproval: "supervisor" | "warehouse" | "sales_manager" | "multi_level";
  stockRequestApproval: "supervisor" | "warehouse" | "sales_manager";
  transferReceiving: "receiver_approval" | "auto_receive";
  returnInspection: "required" | "optional";
  
  // حدود مالية
  maxCashBoxBalance: number;
  maxDiscountWithoutApproval: number;
  maxCreditLimit: number;
}
```

---

## المرحلة 2: إصلاح العمليات (7-10 أيام)

### 2.1 تحويل Toast → State Mutations في `mockApi.ts`

**العمليات المطلوب تحويلها:**

| الصفحة | العملية الحالية | العملية المطلوبة |
|--------|----------------|-----------------|
| `VanInventoryPage` | `toast.success` | حفظ العد الفعلي في `inventoryCounts` |
| `CustodyPage` | `toast.success` (معطوب) | حفظ التسليم في `custodyRecords` |
| `StockRequestsPage` | `toast.success` | إضافة طلب جديد في `stockRequests` |
| `ReceivingPage` | `toast.success` | استلام فعلي + تحديث `vanStock` |
| `LoadingPage` | حفظ محلي فقط | ربط بـ `vanStock` الفعلي |
| `CashBoxPage` | `toast.success` | حفظ في `cashMovements` |
| `DailyClosingPage` | status override محلي | حفظ في `dailyClosings` |
| `MessagesPage` | hardcoded | حفظ في `conversations` shared |

### 2.2 ربط `StockBalance` مع `StockMovement`

**المبدأ:** `الرصيد = ناتج الحركات`
```typescript
function calculateStockBalance(warehouseId: string, productId: string): number {
  const movements = stockMovements.filter(
    m => m.warehouseId === warehouseId && m.productId === productId
  );
  return movements.reduce((balance, m) => {
    if (m.type === "inbound" || m.type === "adjustment_in") return balance + m.quantity;
    if (m.type === "outbound" || m.type === "adjustment_out") return balance - m.quantity;
    return balance;
  }, 0);
}
```

### 2.3 ربط `CashBoxBalance` مع `CashMovement`

**المبدأ:** `الرصيد = ناتج الحركات`
```typescript
function calculateCashBoxBalance(cashBoxId: string): number {
  const movements = cashMovements.filter(m => m.cashBoxId === cashBoxId);
  return movements.reduce((balance, m) => {
    if (m.type === "collection" || m.type === "deposit") return balance + m.amount;
    if (m.type === "expense" || m.type === "transfer_out") return balance - m.amount;
    return balance;
  }, 0);
}
```

### 2.4 إنشاء `receiveTransfer()` حقيقية

**المطلوب:** عند استلام التحويل:
1. تحديث `stockTransfers.status` → "received"
2. إضافة `stockMovement` للوارد
3. تحديث `vanStock` للمستلم
4. تسجيل `auditLog`

### 2.5 إنشاء `submitDiscountRequest()` حقيقية

**المطلوب:** عند إنشاء طلب خصم:
1. إنشاء `discountRequest` جديد
2. إنشاء `approvalRequest` مرتبط
3. ربط بـ workflow الاعتماد

### 2.6 إنشاء `submitCustodyObjection()` حقيقية

**المطلوب:** عند الاعتراض على عهدة:
1. إنشاء `custodyObjection` جديد
2. إنشاء `approvalRequest` مرتبط
3. إرسال إشعار للمشرف

---

## المرحلة 3: نموذج التهيئة (7-10 أيام)

### 3.1 إنشاء `src/config/organizationConfig.ts`
**الملف:** إعدادات المؤسسة القابلة للتهيئة
- دعم 3 نماذج تشغيل (A/B/C/D)
- تحميل الإعدادات من `localStorage` أو default

### 3.2 إنشاء `src/config/policyEngine.ts`
**المحرك:** يقرأ الإعدادات ويطبقها على العمليات
```typescript
function shouldRequireDailyClosing(): boolean {
  return organizationConfig.dailyClosing === "required";
}

function shouldRequireLoadingApproval(): boolean {
  return organizationConfig.loadingApproval !== "auto";
}
```

### 3.3 تحديث `supervisorPolicies.ts`
**التحديث:** ربط بـ `organizationConfig` بدلاً من القيم الثابتة

### 3.4 إنشاء `src/components/guards/PolicyGuard.tsx`
**المكون:** يتحقق من السياسة قبل تنفيذ عملية
```tsx
<PolicyGuard policy="dailyClosing" action="submit">
  <SubmitClosingButton />
</PolicyGuard>
```

---

## المرحلة 4: التحسينات البصرية (3-5 أيام)

### 4.1 إعادة ترتيب modules
**التغيير:** 8 أقسام → 7 أقسام
- نقل العهد والأصول → الإدارة
- فصل التقارير كقسم مستقل

### 4.2 Color coding للأيقونات
**ال的变化:** كل قسم بلون خاص
- المبيعات: أزرق (#2f6fa8)
- المخزون: برتقالي (#c2700e)
- الميدان: أخضر (#2f7d4f)
- المالية: بنفسجي (#7c3aed)
- الإدارة: رمادي (#64748b)

### 4.3 Quick Actions في Header
**المكون:** زر "+" لإضافة سريعة
- عميل جديد
- فاتورة جديدة
- سند تحصيل
- مرتجع

### 4.4 Command Palette (Ctrl+K)
**المكون:** نافذة بحث شاملة
- بحث عن عميل
- بحث عن فاتورة
- بحث عن منتج
- أوامر سريعة

---

## المرحلة 5: التصدير والتحليلات (5-7 أيام)

### 5.1 تصدير CSV فعلي
**الملف:** `src/utils/export.ts`
```typescript
function exportToCSV(data: any[], filename: string): void {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
```

### 5.2 تصدير PDF
**الملف:** `src/utils/pdfExport.ts`
- استخدام `jspdf` أو `pdfmake`
- تقارير مبيعات، تحصيلات، جرد

### 5.3 رسوم بيانية للمشرف
**الصفحات المطلوبة:**
- أداء الفريق (Bar chart)
- ترتيب المناديب (Leaderboard)
- مقارنة الأهداف (Progress bars)

### 5.4 إصلاح GM Dashboard
**الإصلاح:**
- نسبة المرتجعات: حساب فعلي بدلاً من "0.8%" ثابت
- نسبة تنفيذ الزيارات: حساب فعلي بدلاً من "92%" ثابت

---

## المرحلة 6: المتابعة اللحظية (5-7 أيام)

### 6.1 خريطة حقيقية (Leaflet)
**الملف:** `src/components/maps/LeafletMap.tsx`
- استخدام OpenStreetMap (مجاني)
- عرض مواقع المناديب
- خطوط المسار

### 6.2 Geolocation API للمندوب
**الملف:** `src/services/gpsService.ts`
```typescript
function startTracking(): void {
  navigator.geolocation.watchPosition(
    (position) => {
      updateGpsLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: Date.now()
      });
    },
    (error) => console.error(error),
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
  );
}
```

### 6.3 محاكاة WebSocket للمتابعة
**الملف:** `src/services/realtimeService.ts`
- محاكاة تحديثات المواقع كل 30 ثانية
- كشف انحراف المسار

### 6.4 كشف انحراف المسار الفعلي
**الخوارزمية:**
1. حساب المسافة بين الموقع الحالي وأقرب نقطة في المسار
2. إذا تجاوزت الحد → إشعار للمشرف

---

## ملخص مراحل التطوير

| المرحلة | المدة | المحتوى | الأولوية |
|---------|-------|---------|---------|
| 0 | 2-3 أيام | إصلاح البيانات | 🔴 |
| 1 | 5-7 أيام | الكيانات المفقودة | 🔴 |
| 2 | 7-10 أيام | إصلاح العمليات | 🔴 |
| 3 | 7-10 أيام | نموذج التهيئة | 🟡 |
| 4 | 3-5 أيام | التحسينات البصرية | 🟡 |
| 5 | 5-7 أيام | التصدير والتحليلات | 🟡 |
| 6 | 5-7 أيام | المتابعة اللحظية | 🟢 |
| **المجموع** | **34-49 يوم عمل** | | |

---

## الفجوات المكتشفة من الوثيقة

| # | الفجوة | المرحلة | الأولوية |
|---|--------|---------|---------|
| 1 | لا يوجد `StockBalance` ككيان مستقل | 1 | 🔴 |
| 2 | لا يوجد `CashBoxBalance` كحساب مستقل | 2 | 🔴 |
| 3 | لا يوجد `ResponsibleAssignment` | 1 | 🔴 |
| 4 | لا يوجد `CashSettlement` ككيان مستقل | 1 | 🟡 |
| 5 | لا يوجد `Attachment` ككيان | 1 | 🟡 |
| 6 | المراسلات وهمية | 2 | 🔴 |
| 7 | طلب الخصم ليس ككيان مستقل | 1 | 🟡 |
| 8 | لا يوجد فرق بين "طلب" و"تحويل مباشر" | 2 | 🟡 |
| 9 | اعتراض العهد مفقود | 2 | 🟡 |
| 10 | النظام ليس Configurable كفاية | 3 | 🔴 |
| 11 | لا يوجد `OrganizationConfig` | 3 | 🔴 |
| 12 | لا يوجد `PolicyEngine` | 3 | 🔴 |

---

## التحديث على المراحل السابقة

**المرحلة 0 (معادلة):**
- إضافة: `date.ts` موحد
- تحديث: `users.ts` مع `territoryId` و `status`
- تحديث: `repField.ts` لـ 7 مناديب

**المرحلة 1 (جديدة):**
- `StockBalance` — كيان مستقل
- `CashSettlement` — كيان مستقل
- `ResponsibleAssignment` — كيان مستقل
- `Attachment` — كيان مستقل
- `DiscountRequest` — كيان مستقل

**المرحلة 2 (محدثة):**
- تحويل Toast → State Mutations
- ربط `StockBalance` مع `StockMovement`
- ربط `CashBoxBalance` مع `CashMovement`
- `receiveTransfer()` حقيقية
- `submitDiscountRequest()` حقيقية

**المرحلة 3 (جديدة):**
- `OrganizationConfig` — إعدادات المؤسسة
- `PolicyEngine` — محرك السياسات
- تحديث `supervisorPolicies` ليكون Configurable

**المرحلة 4-6 (متشابهة مع التحسينات):**
- إعادة ترتيب modules
- تصدير CSV/PDF
- خريطة حقيقية
- متابعة لحظية
