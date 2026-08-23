import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Trash2, CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck, Clock, ScanLine, PackageCheck } from "lucide-react";
import { customers } from "@/mock/customers";
import { products } from "@/mock/products";
import { vanStock } from "@/mock/inventory";
import { dailyPlanByRepDate, activeTripByRep } from "@/mock/repField";
import { useAuthStore } from "@/store/auth";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card, SectionBlock } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, Select, Input, Textarea } from "@/components/ui/FormControls";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatMoney, formatNumber, formatTime } from "@/utils/format";
import { can } from "@/config/permissions";
import { getDataScope, canAccessCustomer } from "@/services/scope";
import { repPolicies } from "@/config/repPolicies";
import { getCustomerBalance } from "@/services/ledger";
import { evaluateCredit, type CreditVerdict } from "@/services/credit";
import { createInvoice } from "@/services/sales.service";
import { dataScopeOf } from "@/config/authority";
import { findByBarcode, feedback as barcodeFeedback, persistIndex } from "@/services/barcode.service";
import { BarcodeScanner } from "@/components/ui/BarcodeScanner";
import type { Customer } from "@/types";

interface CartLine {
  productId: string;
  qty: number;
  price: number;
  discountRate: number;
  discountApprovalNeeded?: boolean;
}

interface DiscountApprovalRequest {
  id: string;
  type: "line" | "overall";
  productId?: string;
  requestedRate: number;
  maxAllowedRate: number;
  amount: number;
  reason: string;
}

export function NewSalePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const initialCustomerId = (location.state as { customerId?: string; visitId?: string } | null)?.customerId ?? "";
  const initialVisitId = (location.state as { customerId?: string; visitId?: string } | null)?.visitId ?? "";

  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [saleType, setSaleType] = useState<"cash" | "credit">("cash");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "pos">("cash");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [overallDiscountReason, setOverallDiscountReason] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [creditWarning, setCreditWarning] = useState(false);
  const [discountApprovals, setDiscountApprovals] = useState<DiscountApprovalRequest[]>([]);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<DiscountApprovalRequest | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lastScanInfo, setLastScanInfo] = useState<string | null>(null);

  const scope = getDataScope(user);
  const scopedCustomers = useMemo(() => (scope ? customers.filter((c) => canAccessCustomer(scope, c)) : []), [scope]);

  const customer = scopedCustomers.find((c) => c.id === customerId);
  const customerBalance = customerId ? getCustomerBalance(customerId).balance : 0;
  const myVan = vanStock.find((v) => v.repId === user?.id);
  const canCreate = can("sales.create", user?.role ?? "REPRESENTATIVE");
  const canPost = can("sales.post", user?.role ?? "REPRESENTATIVE");

  const plan = dailyPlanByRepDate(user!.id, "2026-08-14");
  const activeTrip = activeTripByRep(user!.id);
  const activeVisit = initialVisitId ? plan?.entries.find((e) => e.visitId === initialVisitId) : null;

  const stockQty = (productId: string) => myVan?.items.find((i) => i.productId === productId)?.qty ?? 0;

  const maxLineDiscount = repPolicies.discount.maxRateWithoutApproval;
  const maxOverallDiscountAmount = repPolicies.discount.approvalThresholdAmount;

  // Barcode — Expert: وحدة + كرتون + مسح متكرر = +1
  const addLine = (productId: string, qtyToAdd: number = 1) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const available = stockQty(productId);
    const existing = cart.find((l) => l.productId === productId);
    const currentQty = existing?.qty ?? 0;
    const desired = currentQty + qtyToAdd;
    if (desired > available) {
      barcodeFeedback(false);
      toast.warning(`الكمية تتجاوز المتاح`, `${p.name} — متوفر ${available} فقط`);
      if (existing) {
        // نقرب للحد الأقصى
        setCart((c) => c.map((l) => (l.productId === productId ? { ...l, qty: available } : l)));
      }
      return;
    }
    if (existing) {
      setCart((c) => c.map((l) => (l.productId === productId ? { ...l, qty: desired } : l)));
    } else {
      setCart((c) => [...c, { productId, qty: qtyToAdd, price: p.sellPrice, discountRate: p.discountRate }]);
    }
    barcodeFeedback(true);
  };

  const handleBarcodeScan = (raw: string) => {
    persistIndex();
    const res = findByBarcode(raw);
    if (!res) {
      barcodeFeedback(false);
      setLastScanInfo(`باركود غير معروف: ${raw}`);
      toast.error("باركود غير معروف", `الكود ${raw} لا يطابق أي منتج أو كرتون — سياسة الشركة`);
      return;
    }
    const { product, type, units } = res;
    addLine(product.id, units);
    setLastScanInfo(`${type === "carton" ? "كرتون" : "وحدة"}: ${product.name} × ${units} — كود ${raw}`);
    toast.success(type === "carton" ? `تمت إضافة كرتون` : `تمت إضافة منتج`, `${product.name} × ${units}`);
  };

  const onBarcodeInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (barcodeInput.trim()) {
        handleBarcodeScan(barcodeInput.trim());
        setBarcodeInput("");
      }
    }
  };

  const updateQty = (productId: string, qty: number) => {
    const max = stockQty(productId);
    const clamped = Math.max(0, Math.min(qty, max));
    setCart((c) => (clamped === 0 ? c.filter((l) => l.productId !== productId) : c.map((l) => (l.productId === productId ? { ...l, qty: clamped } : l))));
  };

  const updateDiscount = (productId: string, rate: number) => {
    const needsApproval = rate > maxLineDiscount;
    if (needsApproval) {
      const p = products.find((x) => x.id === productId);
      const line = cart.find((l) => l.productId === productId);
      if (line) {
        const approval: DiscountApprovalRequest = {
          id: `da-${Date.now()}`,
          type: "line",
          productId,
          requestedRate: rate,
          maxAllowedRate: maxLineDiscount,
          amount: line.price * line.qty * (rate - maxLineDiscount) / 100,
          reason: "",
        };
        setPendingApproval(approval);
        setApprovalOpen(true);
        return;
      }
    }
    setCart((c) => c.map((l) => (l.productId === productId ? { ...l, discountRate: Math.min(rate, 15), discountApprovalNeeded: needsApproval } : l)));
  };

  const updateOverallDiscount = (amount: number) => {
    const needsApproval = amount > maxOverallDiscountAmount;
    if (needsApproval && amount > 0) {
      const approval: DiscountApprovalRequest = {
        id: `da-${Date.now()}`,
        type: "overall",
        requestedRate: 0,
        maxAllowedRate: 0,
        amount,
        reason: "",
      };
      setPendingApproval(approval);
      setApprovalOpen(true);
      return;
    }
    setOverallDiscount(Math.max(0, amount));
  };

  const confirmDiscountApproval = () => {
    if (!pendingApproval) return;
    if (pendingApproval.type === "line" && pendingApproval.productId) {
      setCart((c) => c.map((l) => (l.productId === pendingApproval.productId ? { ...l, discountRate: pendingApproval.requestedRate, discountApprovalNeeded: true } : l)));
    } else if (pendingApproval.type === "overall") {
      setOverallDiscount(pendingApproval.amount);
      setOverallDiscountReason(pendingApproval.reason);
    }
    setDiscountApprovals((d) => [...d, { ...pendingApproval, reason: pendingApproval.reason }]);
    setApprovalOpen(false);
    setPendingApproval(null);
    toast.info("تم تسجيل طلب الخصم للمراجعة", "سيتم اعتماد الخصم من المشرف قبل تنفيذ الفاتورة");
  };

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty * (1 - l.discountRate / 100), 0), [cart]);
  const total = Math.max(0, subtotal - overallDiscount);

  const saleAmount = saleType === "credit" ? total : 0;
  const creditEval = saleType === "credit" && customer
    ? evaluateCredit({ customerId, amount: total, repId: user?.id })
    : null;
  const projectedBalance = customerBalance + saleAmount;
  const exceedsLimit = creditEval ? creditEval.verdict === "BLOCK" || creditEval.verdict === "WARN" : projectedBalance > (customer?.creditLimit ?? 0);
  const totalUnits = cart.reduce((s, l) => s + l.qty, 0);

  const hasPendingApprovals = discountApprovals.length > 0;

  const submit = () => {
    if (!customerId) {
      toast.warning("اختر العميل أولاً");
      return;
    }
    if (cart.length === 0) {
      toast.warning("أضف منتجاً واحداً على الأقل");
      return;
    }
    if (saleType === "credit" && creditEval) {
      if (creditEval.verdict === "BLOCK") {
        toast.error("تم رفض البيع", creditEval.reasons.join("، ") || "تجاوز الحد الائتماني");
        return;
      }
      if (creditEval.verdict === "APPROVAL_REQUIRED") {
        setCreditWarning(true);
        return;
      }
      // ALLOW | WARN proceed to confirmation
    }
    if (hasPendingApprovals) {
      toast.warning("يوجد طلبات خصم معلقة", "يجب اعتماد الخصومات من المشرف قبل إتمام البيع");
      return;
    }
    setSubmitOpen(true);
  };

  const confirmSubmit = () => {
    if (!user) return;
    setSubmitOpen(false);

    const result = createInvoice(
      {
        customerId,
        repId: user.id,
        items: cart.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          price: l.price,
          discountRate: l.discountRate,
        })),
        saleType,
        paymentMethod,
        overallDiscount,
        notes,
      },
      {
        id: user.id,
        role: user.role,
        scope: dataScopeOf[user.role],
        owns: true,
      }
    );

    if (!result.success) {
      toast.error("لا يمكن إكمال البيع", result.reason ?? "خطأ غير معروف");
      return;
    }

    toast.success(`تم إنشاء الفاتورة بنجاح`, `قيمة ${formatMoney(total)} — خصم من مخزون السيارة`);
    navigate("/sales");
  };

  if (!canCreate) {
    return (
      <div>
        <StickyPageHeader crumbs={[{ label: "المبيعات", path: "/sales" }, { label: "بيع جديد" }]} title="بيع جديد" />
        <Alert variant="warning" title="لا تملك صلاحية إنشاء عمليات بيع">
          تواصل مع المشرف لتفعيل الصلاحية.
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المبيعات", path: "/sales" }, { label: "عملية بيع جديدة" }]}
        title="عملية بيع جديدة"
        description={activeVisit ? `زيارة: ${activeVisit.customerId} — ${formatTime(activeVisit.plannedTime)}` : "اختر العميل، أضف المنتجات، تحقق من الائتمان ثم اعتمد العملية"}
        actions={
          <Link to="/sales" className="btn btn-ghost" style={{ textDecoration: "none" }}>
            رجوع للقائمة
          </Link>
        }
      />

      {activeVisit && (
        <div className="alert alert-info" style={{ marginBottom: "var(--space-4)" }}>
          <Clock size={16} />
          <div>
            <div className="alert-title">زيارة نشطة مرتبطة</div>
            <div>هذه الفاتورة ستُربط بالزيارة <b>{activeVisit.visitId}</b> المخططة في {formatTime(activeVisit.plannedTime)}</div>
          </div>
        </div>
      )}

      <div className="grid-2-1">
        <div className="stack">
          <SectionBlock title="1. العميل">
            <div className="card-body">
              <SearchableSelect
                label="اختر العميل"
                required
                value={customerId}
                onChange={setCustomerId}
                placeholder="ابحث عن عميل..."
                options={scopedCustomers
                  .filter((c) => c.status === "active" || c.id === customerId)
                  .map((c) => ({ value: c.id, label: c.name, sublabel: c.code }))}
              />
              {customer && (
                <div className="stack-sm mt-4">
                  <div className="flex-between">
                    <span className="muted">الرصيد الحالي</span>
                     <b className="num">{formatMoney(customerBalance)}</b>
                  </div>
                  <div className="flex-between">
                    <span className="muted">الحد الائتماني</span>
                    <b className="num">{formatMoney(customer.creditLimit)}</b>
                  </div>
                  {customer.status === "overdue" && (
                    <Alert variant="danger" title="عميل متأخر السداد">
                      الرصيد المتأخر: {formatMoney(customerBalance)} — العمليات الآجلة تحتاج موافقة المشرف.
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </SectionBlock>

          <SectionBlock title="2. المنتجات" actions={<span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>المتوفر = مخزون سيارتك · سياسة الشركة: الكرتون له باركود</span>}>
            <div className="card-body">
              {/* Expert: باركود أولاً — كاميرا + بلوتوث HID + إدخال يدوي */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
                <Input
                  label="مسح باركود (وحدة / كرتون)"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={onBarcodeInputKey}
                  placeholder="امسح بالكاميرا أو القارئ البلوتوث ثم Enter — أو اكتب SKU/باركود"
                />
                <Button variant="primary" icon={<ScanLine size={16} />} onClick={() => setScannerOpen(true)} style={{ height: 36, marginBottom: 2 }}>مسح بالكاميرا</Button>
              </div>
              {lastScanInfo && (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-success)", background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", borderRadius: 6, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <PackageCheck size={14} /> {lastScanInfo}
                </div>
              )}
              <div style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-faint)", marginBottom: 8 }}>مسح وحدة يضيف 1، مسح كرتون يضيف {`{unitsPerCarton}`} تلقائياً. المسح المتكرر لنفس المنتج = زيادة الكمية +1.</div>
              <SearchableSelect
                label="أو اختر يدوياً من القائمة"
                value=""
                onChange={(v) => v && addLine(v, 1)}
                placeholder="ابحث عن منتج وأضفه..."
                options={products
                  .filter((p) => p.status === "active")
                  .map((p) => ({
                    value: p.id,
                    label: p.name,
                    sublabel: `${p.code} · ${formatMoney(p.sellPrice)} · متوفر ${formatNumber(stockQty(p.id))} · ${p.barcode ?? ""}${p.barcodeCarton ? ` | كرتون ${p.barcodeCarton.slice(-4)}` : ""}`,
                  }))}
              />
              {cart.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", marginTop: "var(--space-4)" }}>
                  لم تتم إضافة أي منتجات بعد — ابدأ بالبحث عن منتج أعلاه.
                </div>
              ) : (
                <div className="table-wrap" style={{ marginTop: "var(--space-4)", border: "none", boxShadow: "none" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th className="numeric">السعر</th>
                        <th className="numeric">الكمية</th>
                        <th className="numeric">الخصم %</th>
                        <th className="numeric">الإجمالي</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((l) => {
                        const p = products.find((x) => x.id === l.productId);
                        const stock = stockQty(l.productId);
                        return (
                          <tr key={l.productId}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{p?.name}</div>
                              <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>متوفر: {formatNumber(stock)}</div>
                            </td>
                            <td className="numeric num">{formatMoney(l.price)}</td>
                            <td className="numeric">
                              <input
                                type="number"
                                min={1}
                                max={stock}
                                value={l.qty}
                                onChange={(e) => updateQty(l.productId, Number(e.target.value))}
                                style={{ width: 72 }}
                                className="input"
                                aria-label="الكمية"
                              />
                              {l.qty >= stock && <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الحد الأقصى</div>}
                            </td>
                            <td className="numeric">
                              <input
                                type="number"
                                min={0}
                                max={15}
                                step={0.5}
                                value={l.discountRate}
                                onChange={(e) => updateDiscount(l.productId, Number(e.target.value))}
                                style={{ width: 72 }}
                                className="input"
                                aria-label="نسبة الخصم"
                              />
                              {l.discountApprovalNeeded && (
                                <Badge tone="warning" dot>يحتاج اعتماد</Badge>
                              )}
                            </td>
                            <td className="numeric num" style={{ fontWeight: 600 }}>{formatMoney(l.price * l.qty * (1 - l.discountRate / 100))}</td>
                            <td className="actions-cell">
                              <button className="btn-icon danger" onClick={() => setCart((c) => c.filter((x) => x.productId !== l.productId))} aria-label="حذف">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SectionBlock>

          <SectionBlock title="3. الدفع والاعتماد">
            <div className="card-body">
              <div className="form-grid">
                <div className="field-span-4">
                  <Select
                    label="نوع البيع"
                    value={saleType}
                    onChange={(e) => setSaleType(e.target.value as "cash" | "credit")}
                    options={[
                      { value: "cash", label: "بيع نقدي" },
                      { value: "credit", label: "بيع آجل" },
                    ]}
                  />
                </div>
                {saleType === "cash" && (
                  <div className="field-span-4">
                    <Select
                      label="طريقة السداد"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as "cash" | "transfer" | "pos")}
                      options={[
                        { value: "cash", label: "نقدي" },
                        { value: "transfer", label: "تحويل بنكي" },
                        { value: "pos", label: "جهاز POS" },
                      ]}
                    />
                  </div>
                )}
                <div className="field-span-4">
                  <Input label="خصم على الفاتورة (ر.س)" type="number" min={0} value={overallDiscount} onChange={(e) => updateOverallDiscount(Number(e.target.value))} />
                </div>
                {overallDiscount > 0 && (
                  <div className="field-span-12">
                    <Alert variant="warning" title="خصم استثنائي على الفاتورة">
                      {overallDiscount > maxOverallDiscountAmount ? "يتجاوز الحد المسموح — سيُنشأ طلب اعتماد" : "ضمن الحد المسموح"}
                    </Alert>
                  </div>
                )}
                {overallDiscount > maxOverallDiscountAmount && (
                  <div className="field-span-12">
                    <Textarea label="سبب الخصم الاستثنائي (مطلوب للاعتماد)" value={overallDiscountReason} onChange={(e) => setOverallDiscountReason(e.target.value)} placeholder="مثال: عرض ترويجي، منافسة، عميل استراتيجي..." />
                  </div>
                )}
                <div className="field-span-12">
                  <Textarea label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية على الفاتورة..." />
                </div>
              </div>
            </div>
          </SectionBlock>
        </div>

        <div className="stack">
          <Card title="ملخص العملية">
            <div className="stack-sm">
              <div className="flex-between">
                <span className="muted">عدد الأصناف</span>
                <b className="num">{cart.length}</b>
              </div>
              <div className="flex-between">
                <span className="muted">الكمية الإجمالية</span>
                <b className="num">{formatNumber(totalUnits)}</b>
              </div>
              <div className="flex-between">
                <span className="muted">المجموع بعد خصومات الأصناف</span>
                <b className="num">{formatMoney(subtotal)}</b>
              </div>
              <div className="flex-between">
                <span className="muted">خصم الفاتورة</span>
                <b className="num" style={{ color: overallDiscount > maxOverallDiscountAmount ? "var(--color-danger)" : "var(--color-warning)" }}>- {formatMoney(overallDiscount)}</b>
              </div>
              <div className="flex-between" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 8 }}>
                <b>الإجمالي النهائي</b>
                <b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-primary)" }}>{formatMoney(total)}</b>
              </div>
              {saleType === "credit" && customer && (
                <>
                  <div className="flex-between">
                    <span className="muted">رصيد العميل بعد الفاتورة</span>
                    <b className="num" style={{ color: exceedsLimit ? "var(--color-danger)" : "var(--color-warning)" }}>{formatMoney(projectedBalance)}</b>
                  </div>
                  <div className="flex-between">
                    <span className="muted">الحد الائتماني</span>
                    <b className="num">{formatMoney(customer.creditLimit)}</b>
                  </div>
                  {exceedsLimit && (
                    <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                      <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: "var(--font-size-sm)" }}>
                        تجاوز حد ائتماني — العملية ستدخل سير اعتماد المشرف ومدير المبيعات.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card title="أثر العملية">
            <div className="stack-sm">
              <div className="flex-between">
                <span className="muted">المخزون</span>
                <Badge tone="info">↓ خصم من مخزون السيارة</Badge>
              </div>
              <div className="flex-between">
                <span className="muted">ذمة العميل</span>
                <Badge tone={saleType === "credit" ? "warning" : "success"}>{saleType === "credit" ? "↑ تزيد" : "بدون تغيير"}</Badge>
              </div>
              <div className="flex-between">
                <span className="muted">الصندوق</span>
                <Badge tone={saleType === "cash" ? "success" : "neutral"}>{saleType === "cash" ? `↑ ${paymentMethod === "cash" ? "نقداً" : paymentMethod === "transfer" ? "تحويل" : "POS"}` : "بدون تأثير"}</Badge>
              </div>
              <div className="flex-between">
                <span className="muted">الربحية</span>
                <Badge tone="success">↑ تُحتسب تلقائياً</Badge>
              </div>
              {hasPendingApprovals && (
                <div className="flex-between">
                  <span className="muted">خصومات معلقة</span>
                  <Badge tone="warning" dot>{discountApprovals.length} طلب اعتماد</Badge>
                </div>
              )}
            </div>
          </Card>

          <Button variant="primary" size="lg" onClick={submit} icon={<CheckCircle2 size={17} />} disabled={cart.length === 0 || !customerId || hasPendingApprovals}>
            {hasPendingApprovals ? "بانتظار اعتماد الخصومات" : `اعتماد الفاتورة — ${formatMoney(total)}`}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onConfirm={confirmSubmit}
        title="تأكيد إنشاء الفاتورة"
        message={`سيتم إنشاء فاتورة بقيمة ${formatMoney(total)} على ${customer?.name} ${saleType === "credit" ? "بأجل" : "نقداً"}، وخصم ${formatNumber(totalUnits)} وحدة من مخزون سيارتك.`}
        confirmLabel="إنشاء الفاتورة"
      />

      <Modal
        open={creditWarning}
        onClose={() => setCreditWarning(false)}
        title="تجاوز حد ائتماني"
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setCreditWarning(false)}>رجوع</Button>
          <Button variant="primary" onClick={() => { setCreditWarning(false); setSubmitOpen(true); }}>إرسال لطلب الاعتماد</Button>
        </>}
      >
        <div className="stack-sm">
          <Alert variant="danger" title="الرصيد المتوقع يتجاوز الحد الائتماني">
            <b className="num">{formatMoney(projectedBalance)}</b> مقابل حد <b className="num">{formatMoney(customer?.creditLimit ?? 0)}</b>
          </Alert>
          <p className="muted" style={{ fontSize: "var(--font-size-sm)" }}>
            سيُنشأ طلب اعتماد تجاوز ائتماني تلقائياً، ولن تُنفذ العملية إلا بعد الموافقة.
          </p>
        </div>
      </Modal>

      <Modal
        open={approvalOpen}
        onClose={() => { setApprovalOpen(false); setPendingApproval(null); }}
        title={pendingApproval?.type === "line" ? "طلب اعتماد خصم صنف" : "طلب اعتماد خصم فاتورة"}
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => { setApprovalOpen(false); setPendingApproval(null); }}>إلغاء</Button>
          <Button variant="primary" icon={<ShieldCheck size={15} />} onClick={confirmDiscountApproval}>إرسال للاعتماد</Button>
        </>}
      >
        {pendingApproval && (
          <div className="stack-sm">
            <Alert variant="warning" title={pendingApproval.type === "line" ? "نسبة الخصم تتجاوز الحد المسموح" : "مبلغ الخصم يتجاوز الحد المسموح"}>
              {pendingApproval.type === "line" ? (
                <>
                  المطلوب: <b>{pendingApproval.requestedRate}%</b> · المسموح: <b>{pendingApproval.maxAllowedRate}%</b> · فرق القيمة: <b className="num">{formatMoney(pendingApproval.amount)}</b>
                </>
              ) : (
                <>
                  المبلغ المطلوب: <b className="num">{formatMoney(pendingApproval.amount)}</b> · الحد المسموح: <b className="num">{formatMoney(maxOverallDiscountAmount)}</b>
                </>
              )}
            </Alert>
            <Textarea label="سبب طلب الخصم (مطلوب)" value={pendingApproval.reason} onChange={(e) => setPendingApproval({ ...pendingApproval, reason: e.target.value })} placeholder="مثال: عرض ترويجي، منافسة، عميل استراتيجي، طلب مشرف..." rows={3} />
            <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>سيتم مراجعة الطلب من المشرف قبل تنفيذ الفاتورة.</div>
          </div>
        )}
      </Modal>

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} />
    </div>
  );
}