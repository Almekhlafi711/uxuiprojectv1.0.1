import { useMemo, useState } from "react";
import { Plus, Undo2, Package, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { returns } from "@/mock/returns";
import { customers } from "@/mock/customers";
import { invoices } from "@/mock/sales";
import { products } from "@/mock/products";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input, Textarea } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Card, SectionBlock } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatMoney, formatDateShort, formatNumber } from "@/utils/format";
import { can } from "@/config/permissions";
import { getDataScope, canAccessCustomer } from "@/services/scope";
import { createReturn } from "@/services/returns.service";
import { dataScopeOf } from "@/config/authority";
import type { ReturnRecord, Invoice } from "@/types";

const reasonLabels: Record<string, string> = {
  expiry: "اقتراب الصلاحية",
  damage: "تلف أثناء النقل",
  excess: "فائض من الطلب",
  exchange: "استبدال بمنتجات أحدث",
  wrong_item: "منتج خاطئ",
  quality: "مشكلة جودة",
  other: "أخرى",
};

const conditionLabels: Record<string, string> = {
  good: "سليم — يعاد للمخزون",
  damaged: "تالف — يسجل كتلف",
};

interface ReturnLineInput {
  productId: string;
  qty: number;
  condition: "good" | "damaged";
  lineTotal: number;
}

export function ReturnsPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.returns.list());
  const [conditionFilter, setConditionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);

  const scope = getDataScope(user);
  const isRep = user?.role === "REPRESENTATIVE";
  const canCreate = can("returns.create", user?.role ?? "REPRESENTATIVE");

  const myCustomers = useMemo(() => {
    if (!scope) return [];
    return customers.filter((c) => canAccessCustomer(scope, c));
  }, [scope]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (isRep) rows = rows.filter((r) => r.repId === user!.id);
    if (conditionFilter) rows = rows.filter((r) => r.condition === conditionFilter);
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [data, isRep, user?.id, conditionFilter, statusFilter]);

  const total = filtered.reduce((s, r) => s + r.totalAmount, 0);

  const columns: Column<ReturnRecord>[] = [
    { key: "number", header: "المرتجع", sortable: true, sortValue: (r) => r.number, priority: "primary", render: (r) => <b className="num">{r.number}</b> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "customer", header: "العميل", sortable: true, sortValue: (r) => customers.find((c) => c.id === r.customerId)?.name ?? "—", priority: "primary", render: (r) => customers.find((c) => c.id === r.customerId)?.name ?? "—" },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => users.find((u) => u.id === r.repId)?.name ?? "—", priority: "secondary", render: (r) => users.find((u) => u.id === r.repId)?.name ?? "—" },
    { key: "invoice", header: "الفاتورة", priority: "optional", render: (r) => <span className="num" style={{ direction: "ltr", display: "inline-block" }}>{r.invoiceId}</span> },
    { key: "condition", header: "الحالة", priority: "primary", render: (r) => (r.condition === "good" ? <Badge tone="success">سليم</Badge> : <Badge tone="danger">تالف</Badge>) },
    {
      key: "items",
      header: "الأصناف",
      priority: "secondary",
      render: (r) => (
        <div className="stack-xs">
          {r.items.map((it) => (
            <div key={it.productId} style={{ fontSize: "var(--font-size-sm)" }}>
              {it.productName} × <b className="num">{formatNumber(it.qty)}</b> · {r.condition === "good" ? "سليم" : "تالف"}
            </div>
          ))}
        </div>
      ),
    },
    { key: "total", header: "القيمة", numeric: true, sortable: true, sortValue: (r) => r.totalAmount, priority: "primary", render: (r) => <span className="num" style={{ fontWeight: 600 }}>{formatMoney(r.totalAmount)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
  ];

  // Modal state
  const [step, setStep] = useState<"invoice" | "items" | "confirm">("invoice");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [reason, setReason] = useState("expiry");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReturnLineInput[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);
  const invoiceCustomer = selectedInvoice ? customers.find((c) => c.id === selectedInvoice.customerId) : null;
  const invoiceRep = selectedInvoice ? users.find((u) => u.id === selectedInvoice.repId) : null;

  const availableLines = useMemo(() => {
    if (!selectedInvoice) return [];
    return selectedInvoice.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        productName: item.productName,
        maxQty: item.qty,
        price: item.price,
        unit: product?.unit ?? "قطعة",
      };
    });
  }, [selectedInvoiceId]);

  const totalReturnAmount = lines.reduce((s, l) => s + l.lineTotal, 0);
  const hasDamagedItems = lines.some((l) => l.condition === "damaged");
  const needsApproval = hasDamagedItems || totalReturnAmount > 1000; // Policy threshold

  const handleInvoiceSelect = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setLines(
      availableLines.map((al) => ({
        productId: al.productId,
        qty: 0,
        condition: "good" as const,
        lineTotal: 0,
      }))
    );
    setStep("items");
  };

  const updateLineQty = (productId: string, qty: number) => {
    const max = availableLines.find((al) => al.productId === productId)?.maxQty ?? 0;
    const clamped = Math.max(0, Math.min(qty, max));
    setLines((prev) => prev.map((l) =>
      l.productId === productId ? { ...l, qty: clamped, lineTotal: clamped * l.lineTotal / (l.qty || 1) } : l
    ));
    // Recalculate lineTotal based on price
    setLines((prev) => prev.map((l) =>
      l.productId === productId
        ? { ...l, qty: clamped, lineTotal: clamped * (availableLines.find((al) => al.productId === productId)?.price ?? 0) }
        : l
    ));
  };

  const updateLineCondition = (productId: string, condition: "good" | "damaged") => {
    setLines((prev) => prev.map((l) => l.productId === productId ? { ...l, condition } : l));
  };

  const goToConfirm = () => {
    const hasItems = lines.some((l) => l.qty > 0);
    if (!hasItems) {
      toast.warning("أضف كمية واحدة على الأقل للمرتجع");
      return;
    }
    setStep("confirm");
  };

  const submitReturn = () => {
    if (!selectedInvoice || lines.filter((l) => l.qty > 0).length === 0 || !user) return;

    const result = createReturn(
      {
        invoiceId: selectedInvoice.id,
        customerId: selectedInvoice.customerId,
        repId: user.id,
        items: lines
          .filter((l) => l.qty > 0)
          .map((l) => ({
            productId: l.productId,
            qty: l.qty,
            price: availableLines.find((al) => al.productId === l.productId)?.price ?? 0,
            condition: l.condition,
          })),
        reason,
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
      toast.error("لا يمكن إنشاء المرتجع", result.reason ?? "خطأ غير معروف");
      return;
    }

    toast.success("تم إنشاء المرتجع", `قيمة ${formatMoney(totalReturnAmount)} — ${hasDamagedItems ? "يحتاج اعتماد (يوجد تالف)" : "سليم"} — في مراجعة مشرف`);
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setStep("invoice");
    setSelectedInvoiceId("");
    setReason("expiry");
    setNotes("");
    setLines([]);
    setPhotos([]);
  };

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المرتجعات" }]}
        title="مرتجعات العملاء"
        description={`إجمالي ${formatMoney(total)} عبر ${filtered.length} مرتجع`}
        actions={
          canCreate ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => { resetForm(); setOpen(true); }}>مرتجع جديد</Button>
          ) : null
        }
      >
        <FilterBar>
          <Select
            label="حالة المنتج"
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            placeholder="الكل"
            options={[
              { value: "good", label: "سليم" },
              { value: "damaged", label: "تالف" },
            ]}
          />
          <Select
            label="حالة الاعتماد"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="الكل"
            options={[
              { value: "pending", label: "قيد الانتظار" },
              { value: "approved", label: "معتمد" },
              { value: "rejected", label: "مرفوض" },
            ]}
          />
        </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث برقم المرتجع أو العميل..."
        searchKeys={(r) => `${r.number} ${customers.find((c) => c.id === r.customerId)?.name ?? ""}`}
        exportFilename="returns"
        pageSize={12}
        emptyTitle="لا توجد مرتجعات مطابقة"
      />

      <Card title="سياسة المرتجعات" className="mt-4">
        <div className="stack-sm">
          <div className="flex-between"><span className="muted">مرتجعات سليمة</span><Badge tone="success">تُعاد للمخزون تلقائياً</Badge></div>
          <div className="flex-between"><span className="muted">مرتجعات تالفة</span><Badge tone="danger">تسجل كتلف — تتطلب اعتماداً</Badge></div>
          <div className="flex-between"><span className="muted">الاستبدال</span><Badge tone="info">يُنشئ فاتورة بيع جديدة</Badge></div>
          <div className="flex-between"><span className="muted">{"القيمة > 1000 ر.س"}</span><Badge tone="warning">يتطلب اعتماد المشرف</Badge></div>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => { if (step === "invoice") setOpen(false); else if (step === "items") setStep("invoice"); else setStep("items"); }}
        title={step === "invoice" ? "مرتجع جديد — اختر الفاتورة" : step === "items" ? "تحديد الأصناف والكميات" : "تأكيد المرتجع"}
        size={step === "items" ? "xl" : "lg"}
        footer={
          step === "invoice" ? (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button variant="primary" icon={<Undo2 size={14} />} onClick={() => {
                if (!selectedInvoiceId) { toast.warning("اختر فاتورة"); return; }
                handleInvoiceSelect(selectedInvoiceId);
              }}>التالي</Button>
            </>
          ) : step === "items" ? (
            <>
              <Button variant="secondary" onClick={() => setStep("invoice")}>رجوع</Button>
              <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={goToConfirm}>التالي</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep("items")}>رجوع</Button>
              <Button variant="primary" icon={<Undo2 size={14} />} onClick={submitReturn}>إنشاء المرتجع</Button>
            </>
          )
        }
      >
        {step === "invoice" && (
          <div className="form-grid">
            <div className="field-span-12">
              <Select
                label="الفاتورة المصدر"
                placeholder="اختر فاتورة للعميل..."
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                options={invoices
                  .filter((inv) => {
                    if (inv.repId !== user?.id) return false;
                    if (inv.paymentStatus === "paid" && inv.type === "cash") return false; // Allow returns from credit invoices or partially paid
                    const customer = myCustomers.find((c) => c.id === inv.customerId);
                    return !!customer;
                  })
                  .map((inv) => {
                    const cust = myCustomers.find((c) => c.id === inv.customerId);
                    return { value: inv.id, label: `${inv.invoiceNumber} — ${cust?.name}`, sublabel: `${formatDateShort(inv.date)} · ${inv.type === "cash" ? "نقدي" : "آجل"} · ${formatMoney(inv.net)}` };
                  })}
              />
            </div>
            {selectedInvoice && invoiceCustomer && (
              <div className="field-span-12">
                <Card title="معلومات الفاتورة والعميل">
                  <div className="card-body info-grid">
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>العميل</span><b style={{ fontSize: "var(--font-size-sm)" }}>{invoiceCustomer.name}</b></div>
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>المندوب</span><span style={{ fontSize: "var(--font-size-sm)" }}>{invoiceRep?.name}</span></div>
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>تاريخ الفاتورة</span><span className="num">{formatDateShort(selectedInvoice.date)}</span></div>
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>نوع الفاتورة</span><Badge tone={selectedInvoice.type === "cash" ? "success" : "warning"}>{selectedInvoice.type === "cash" ? "نقدي" : "آجل"}</Badge></div>
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>إجمالي الفاتورة</span><b className="num">{formatMoney(selectedInvoice.net)}</b></div>
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>المدفوع</span><b className="num">{formatMoney(selectedInvoice.paid)}</b></div>
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>المتبقي</span><b className="num" style={{ color: "var(--color-warning)" }}>{formatMoney(selectedInvoice.net - selectedInvoice.paid)}</b></div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {step === "items" && selectedInvoice && (
          <div className="stack">
            <SectionBlock title="معلومات المرتجع">
              <div className="card-body form-grid">
                <div className="field-span-6">
                  <Select label="السبب" value={reason} onChange={(e) => setReason(e.target.value)} options={[
                    { value: "expiry", label: "اقتراب الصلاحية" },
                    { value: "damage", label: "تلف أثناء النقل" },
                    { value: "excess", label: "فائض من الطلب" },
                    { value: "exchange", label: "استبدال بمنتجات أحدث" },
                    { value: "wrong_item", label: "منتج خاطئ" },
                    { value: "quality", label: "مشكلة جودة" },
                    { value: "other", label: "أخرى" },
                  ]} />
                </div>
                <div className="field-span-12">
                  <Textarea label="ملاحظات إضافية" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="تفاصيل عن السبب، حالة التغليف، صور..." rows={3} />
                </div>
              </div>
            </SectionBlock>

            <SectionBlock title={`أصناف الفاتورة (${availableLines.length} صنف في الفاتورة)`}>
              <div className="card-body">
                {availableLines.length === 0 ? (
                  <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد أصناف في هذه الفاتورة</div>
                ) : (
                  <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>المنتج</th>
                          <th className="numeric">الوحدة</th>
                          <th className="numeric">الكمية في الفاتورة</th>
                          <th className="numeric">الكمية المرتجعة</th>
                          <th>الحالة</th>
                          <th className="numeric">قيمة السطر</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableLines.map((al) => {
                          const line = lines.find((l) => l.productId === al.productId);
                          const currentQty = line?.qty ?? 0;
                          const currentCondition = line?.condition ?? "good";
                          const linePrice = al.price;
                          const lineTotal = currentQty * linePrice;
                          return (
                            <tr key={al.productId}>
                              <td>
                                <div style={{ fontWeight: 500 }}>{al.productName}</div>
                              </td>
                              <td className="numeric"><Badge tone="neutral">{al.unit}</Badge></td>
                              <td className="numeric"><span className="num">{formatNumber(al.maxQty)}</span></td>
                              <td className="numeric">
                                <input
                                  type="number"
                                  min={0}
                                  max={al.maxQty}
                                  value={currentQty}
                                  onChange={(e) => updateLineQty(al.productId, Number(e.target.value) || 0)}
                                  style={{ width: 80 }}
                                  className="input num"
                                  aria-label={`كمية مرتجعة من ${al.productName}`}
                                />
                              </td>
                              <td style={{ width: 140 }}>
                                <Select
                                  value={currentCondition}
                                  onChange={(e) => updateLineCondition(al.productId, e.target.value as "good" | "damaged")}
                                  options={[
                                    { value: "good", label: "سليم" },
                                    { value: "damaged", label: "تالف" },
                                  ]}
                                />
                              </td>
                              <td className="numeric">
                                {currentQty > 0 ? <b className="num">{formatMoney(lineTotal)}</b> : <span className="faint">—</span>}
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

            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              <Package size={16} />
              <div>
                <div className="alert-title">ملخص المرتجع</div>
                <div>إجمالي الأصناف: <b>{lines.filter((l) => l.qty > 0).length}</b> · إجمالي الكمية: <b>{formatNumber(lines.reduce((s, l) => s + l.qty, 0))}</b> · القيمة: <b className="num">{formatMoney(totalReturnAmount)}</b>
                {hasDamagedItems && <span style={{ marginInlineStart: 12 }}><Badge tone="danger" dot>يوجد أصناف تالفة — يحتاج اعتماد</Badge></span>}
                {totalReturnAmount > 1000 && !hasDamagedItems && <span style={{ marginInlineStart: 12 }}><Badge tone="warning" dot>القيمة تتجاوز 1000 ر.س — يحتاج اعتماد</Badge></span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "confirm" && selectedInvoice && invoiceCustomer && (
          <div className="stack">
            <SectionBlock title="ملخص المرتجع">
              <div className="card-body stack-sm">
                <div className="flex-between"><span className="muted">العميل</span><b>{invoiceCustomer.name}</b></div>
                <div className="flex-between"><span className="muted">الفاتورة المصدر</span><b className="num">{selectedInvoice.invoiceNumber}</b></div>
                <div className="flex-between"><span className="muted">السبب</span><Badge tone="info">{reasonLabels[reason]}</Badge></div>
                <div className="flex-between"><span className="muted">إجمالي الأصناف</span><b>{lines.filter((l) => l.qty > 0).length}</b></div>
                <div className="flex-between"><span className="muted">إجمالي الكمية</span><b className="num">{formatNumber(lines.reduce((s, l) => s + l.qty, 0))}</b></div>
                <div className="flex-between"><span className="muted">القيمة الإجمالية</span><b className="num" style={{ fontSize: "var(--font-size-lg)", color: "var(--color-primary)" }}>{formatMoney(totalReturnAmount)}</b></div>
                {hasDamagedItems && (
                  <div className="flex-between"><span className="muted">الحالة</span><Badge tone="danger" dot>يوجد أصناف تالفة — يحتاج اعتماد المشرف</Badge></div>
                )}
                {totalReturnAmount > 1000 && !hasDamagedItems && (
                  <div className="flex-between"><span className="muted">الحالة</span><Badge tone="warning" dot>القيمة تتجاوز 1000 ر.س — يحتاج اعتماد المشرف</Badge></div>
                )}
                {notes && <div className="flex-between"><span className="muted">ملاحظات</span><span>{notes}</span></div>}
              </div>
            </SectionBlock>

            <SectionBlock title="تفاصيل الأصناف">
              <div className="card-body">
                <div className="stack-sm">
                  {lines.filter((l) => l.qty > 0).map((l) => {
                    const al = availableLines.find((a) => a.productId === l.productId);
                    return (
                      <div key={l.productId} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 6 }}>
                        <div>
                          <b style={{ fontSize: "var(--font-size-sm)" }}>{al?.productName}</b>
                          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{l.qty} × {formatMoney(al?.price ?? 0)} · {conditionLabels[l.condition]}</div>
                        </div>
                        <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatMoney(l.lineTotal)}</b>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionBlock>

            <div className="alert alert-success" style={{ marginBottom: 0 }}>
              <Undo2 size={16} />
              <div>
                <div className="alert-title">سيتم إنشاء المرتجع وإرساله للمراجعة</div>
                <div>السليم يعاد لمخزون السيارة تلقائياً. التالف يسجل كتلف ويحتاج اعتماد. ذمة العميل تُحدث بقيمة المرتجع.</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}