import { useMemo, useState } from "react";
import { Plus, HandCoins, FileText, Calculator } from "lucide-react";
import { collections } from "@/mock/collections";
import { customers } from "@/mock/customers";
import { invoices } from "@/mock/sales";
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
import { createCollection } from "@/services/collections.service";
import { getCustomerBalance } from "@/services/ledger";
import { dataScopeOf } from "@/config/authority";
import type { Collection, Invoice } from "@/types";

const methodLabels: Record<string, string> = {
  cash: "نقدي",
  transfer: "تحويل بنكي",
  pos: "POS",
  check: "شيك",
};

const paymentStatusLabels: Record<string, string> = {
  paid: "مسدد",
  partial: "مسدد جزئياً",
  unpaid: "غير مسدد",
};

interface InvoiceAllocation {
  invoiceId: string;
  allocatedAmount: number;
}

export function CollectionsPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.collections.list());
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [open, setOpen] = useState(false);

  const scope = getDataScope(user);
  const isRep = user?.role === "REPRESENTATIVE";
  const canCreate = can("collections.create", user?.role ?? "REPRESENTATIVE");

  const myCustomers = useMemo(() => {
    if (!scope) return [];
    return customers.filter((c) => {
      if (!canAccessCustomer(scope, c)) return false;
      const bal = getCustomerBalance(c.id);
      return bal.balance > 0;
    });
  }, [scope]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (isRep) rows = rows.filter((r) => r.repId === user!.id);
    if (methodFilter) rows = rows.filter((r) => r.method === methodFilter);
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (dateFrom) rows = rows.filter((r) => r.date >= dateFrom);
    if (dateTo) rows = rows.filter((r) => r.date <= dateTo);
    return rows;
  }, [data, isRep, user?.id, methodFilter, statusFilter, dateFrom, dateTo]);

  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const pending = filtered.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);

  const columns: Column<Collection>[] = [
    { key: "number", header: "السند", sortable: true, sortValue: (r) => r.number, priority: "primary", render: (r) => <b className="num">{r.number}</b> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "customer", header: "العميل", sortable: true, sortValue: (r) => customers.find((c) => c.id === r.customerId)?.name ?? "—", priority: "primary", render: (r) => customers.find((c) => c.id === r.customerId)?.name ?? "—" },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => users.find((u) => u.id === r.repId)?.name ?? "—", priority: "secondary", render: (r) => users.find((u) => u.id === r.repId)?.name ?? "—" },
    { key: "method", header: "طريقة السداد", priority: "secondary", render: (r) => <Badge tone={r.method === "check" ? "warning" : r.method === "cash" ? "success" : "info"}>{methodLabels[r.method] ?? r.method}</Badge> },
    { key: "amount", header: "المبلغ", numeric: true, sortable: true, sortValue: (r) => r.amount, priority: "primary", render: (r) => <span className="num" style={{ fontWeight: 600 }}>{formatMoney(r.amount)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
  ];

  // Modal state
  const [step, setStep] = useState<"customer" | "invoices" | "confirm">("customer");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "pos" | "check">("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [autoAllocate, setAutoAllocate] = useState(true);

  const selectedCustomer = myCustomers.find((c) => c.id === selectedCustomerId);
  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter((i) => i.customerId === selectedCustomer.id && i.paymentStatus !== "paid" && i.repId === user?.id);
  }, [selectedCustomer, user?.id]);

  const totalOutstanding = customerInvoices.reduce((s, i) => s + (i.net - i.paid), 0);
  const enteredAmount = Number(amount) || 0;
  const allocatedTotal = allocations.reduce((s, a) => s + a.allocatedAmount, 0);
  const remainingToAllocate = enteredAmount - allocatedTotal;

  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setStep("invoices");
    // Auto-allocate on customer select
    const invs = invoices.filter((i) => i.customerId === customerId && i.paymentStatus !== "paid" && i.repId === user?.id);
    const alloc: InvoiceAllocation[] = [];
    let remaining = enteredAmount;
    for (const inv of invs) {
      const due = inv.net - inv.paid;
      const allocAmt = Math.min(due, remaining);
      if (allocAmt > 0) {
        alloc.push({ invoiceId: inv.id, allocatedAmount: allocAmt });
        remaining -= allocAmt;
      }
      if (remaining <= 0) break;
    }
    setAllocations(alloc);
  };

  const handleBackToCustomer = () => {
    setStep("customer");
    setSelectedCustomerId("");
    setAllocations([]);
  };

  const updateAllocation = (invoiceId: string, value: number) => {
    const clamped = Math.max(0, Math.min(value, customerInvoices.find((i) => i.id === invoiceId)?.net ?? 0));
    setAllocations((prev) => prev.map((a) => (a.invoiceId === invoiceId ? { ...a, allocatedAmount: clamped } : a)));
  };

  const goToConfirm = () => {
    if (enteredAmount <= 0) {
      toast.warning("أدخل مبلغاً صحيحاً");
      return;
    }
    if (allocatedTotal !== enteredAmount) {
      toast.warning("يجب توزيع المبلغ بالكامل على الفواتير", `المتبقي للتوزيع: ${formatMoney(remainingToAllocate)}`);
      return;
    }
    if (method === "check" && !reference.trim()) {
      toast.warning("أدخل رقم الشيك كمرجع");
      return;
    }
    if (method === "transfer" && !reference.trim()) {
      toast.warning("أدخل مرجع التحويل البنكي");
      return;
    }
    setStep("confirm");
  };

  const submitCollection = () => {
    if (!selectedCustomer || enteredAmount <= 0 || !user) return;

    const result = createCollection(
      {
        customerId: selectedCustomer.id,
        repId: user.id,
        amount: enteredAmount,
        method,
        invoiceIds: allocations.filter((a) => a.allocatedAmount > 0).map((a) => a.invoiceId),
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
      toast.error("فشل إنشاء سند التحصيل", result.reason ?? "خطأ غير معروف");
      return;
    }

    toast.success("تم إنشاء سند التحصيل", `قيمة ${formatMoney(enteredAmount)} على ${selectedCustomer.name} — ${methodLabels[method]}`);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setStep("customer");
    setSelectedCustomerId("");
    setAmount("");
    setMethod("cash");
    setReference("");
    setNotes("");
    setAllocations([]);
    setAutoAllocate(true);
  };

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "التحصيل" }]}
        title="التحصيل من العملاء"
        description={`إجمالي ${formatMoney(total)} · قيد الاعتماد ${formatMoney(pending)}`}
        actions={
          canCreate ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => { resetForm(); setOpen(true); }}>سند تحصيل جديد</Button>
          ) : null
        }
      >
        <div className="stat-grid">
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي المحصل</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatMoney(total)}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>قيد الاعتماد</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{formatMoney(pending)}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>عدد السندات</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{filtered.length}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>نقداً</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{formatMoney(filtered.filter((r) => r.method === "cash").reduce((s, r) => s + r.amount, 0))}</b></div></Card>
        </div>

        <FilterBar>
          <Select
            label="طريقة السداد"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            placeholder="الكل"
            options={Object.entries(methodLabels).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="الكل"
            options={[
              { value: "pending", label: "قيد الاعتماد" },
              { value: "approved", label: "معتمد" },
              { value: "rejected", label: "مرفوض" },
            ]}
          />
          <Input label="من تاريخ" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="إلى تاريخ" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث برقم السند أو العميل..."
        searchKeys={(r) => `${r.number} ${customers.find((c) => c.id === r.customerId)?.name ?? ""}`}
        exportFilename="collections"
        pageSize={12}
        emptyTitle="لا توجد سندات تحصيل مطابقة"
      />

      <Modal
        open={open}
        onClose={() => { if (step === "customer") setOpen(false); else handleBackToCustomer(); }}
        title={step === "customer" ? "سند تحصيل جديد — اختر العميل" : step === "invoices" ? "توزيع المبلغ على الفواتير" : "تأكيد السند"}
        size={step === "invoices" ? "xl" : "lg"}
        footer={
          step === "customer" ? (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button variant="primary" icon={<HandCoins size={15} />} onClick={() => {
                if (!selectedCustomerId) { toast.warning("اختر عميلاً"); return; }
                handleCustomerSelect(selectedCustomerId);
              }}>التالي</Button>
            </>
          ) : step === "invoices" ? (
            <>
              <Button variant="secondary" onClick={handleBackToCustomer}>رجوع</Button>
              <Button variant="primary" icon={<Calculator size={15} />} onClick={goToConfirm}>التالي</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep("invoices")}>رجوع</Button>
              <Button variant="primary" icon={<HandCoins size={15} />} onClick={submitCollection}>إرسال السند</Button>
            </>
          )
        }
      >
        {step === "customer" && (
          <div className="form-grid">
            <div className="field-span-12">
              <Select
                label="العميل"
                placeholder="اختر عميلاً لديه رصيد مستحق"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                options={myCustomers.map((c) => ({ value: c.id, label: `${c.name} — رصيد ${formatMoney(getCustomerBalance(c.id).balance)}`, sublabel: c.code }))}
              />
            </div>
            {selectedCustomer && (
              <div className="field-span-12">
                <Card title="معلومات العميل">
                  <div className="card-body info-grid">
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الرصيد المستحق</span><b className="num" style={{ fontSize: "var(--font-size-lg)", color: "var(--color-warning)" }}>{formatMoney(getCustomerBalance(selectedCustomer.id).balance)}</b></div>
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الحد الائتماني</span><b className="num">{formatMoney(selectedCustomer.creditLimit)}</b></div>
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>شروط الدفع</span><Badge tone={selectedCustomer.paymentTerms === "cash" ? "success" : "info"}>{selectedCustomer.paymentTerms === "cash" ? "نقدي" : `آجل ${selectedCustomer.paymentTerms.replace("credit_", "")} يوم`}</Badge></div>
                    <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الفواتير غير المسددة</span><b className="num">{customerInvoices.length} · {formatMoney(totalOutstanding)}</b></div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {step === "invoices" && selectedCustomer && (
          <div className="stack">
            <SectionBlock title="معلومات السند">
              <div className="card-body form-grid">
                <div className="field-span-6">
                  <Input label="المبلغ الإجمالي (ر.س)" type="number" min={1} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="field-span-6">
                  <Select label="طريقة السداد" value={method} onChange={(e) => setMethod(e.target.value as typeof method)} options={[
                    { value: "cash", label: "نقدي" },
                    { value: "transfer", label: "تحويل بنكي" },
                    { value: "pos", label: "POS" },
                    { value: "check", label: "شيك" },
                  ]} />
                </div>
                {(method === "transfer" || method === "check") && (
                  <div className="field-span-6">
                    <Input label={method === "transfer" ? "مرجع التحويل" : "رقم الشيك"} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === "transfer" ? "مثال: SR-123456" : "مثال: CH-789012"} className="num" />
                  </div>
                )}
                <div className="field-span-12">
                  <Textarea label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية..." rows={2} />
                </div>
              </div>
            </SectionBlock>

            <SectionBlock title={`الفواتير المستحقة (${customerInvoices.length} فاتورة · إجمالي مستحق ${formatMoney(totalOutstanding)})`}>
              <div className="card-body">
                <div className="alert alert-info" style={{ marginBottom: "var(--space-3)" }}>
                  المبلغ المدخل: <b className="num">{formatMoney(enteredAmount)}</b> · الموزع: <b className="num" style={{ color: remainingToAllocate === 0 ? "var(--color-success)" : "var(--color-warning)" }}>{formatMoney(allocatedTotal)}</b> · المتبقي للتوزيع: <b className="num" style={{ color: remainingToAllocate > 0 ? "var(--color-danger)" : "var(--color-success)" }}>{formatMoney(Math.max(0, remainingToAllocate))}</b>
                </div>
                {customerInvoices.length === 0 ? (
                  <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد فواتير مستحقة لهذا العميل</div>
                ) : (
                  <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>الفاتورة</th>
                          <th className="numeric">التاريخ</th>
                          <th className="numeric">الإجمالي</th>
                          <th className="numeric">المدفوع</th>
                          <th className="numeric">المستحق</th>
                          <th className="numeric">التوزيع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerInvoices.map((inv) => {
                          const alloc = allocations.find((a) => a.invoiceId === inv.id);
                          const due = inv.net - inv.paid;
                          return (
                            <tr key={inv.id}>
                              <td>
                                <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{inv.invoiceNumber}</b>
                                <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{paymentStatusLabels[inv.paymentStatus]}</div>
                              </td>
                              <td className="numeric"><span className="num">{formatDateShort(inv.date)}</span></td>
                              <td className="numeric"><span className="num">{formatMoney(inv.net)}</span></td>
                              <td className="numeric"><span className="num">{formatMoney(inv.paid)}</span></td>
                              <td className="numeric"><span className="num" style={{ fontWeight: 600, color: due > 0 ? "var(--color-warning)" : "var(--color-success)" }}>{formatMoney(due)}</span></td>
                              <td className="numeric">
                                <input
                                  type="number"
                                  min={0}
                                  max={due}
                                  step={0.01}
                                  value={alloc?.allocatedAmount ?? 0}
                                  onChange={(e) => updateAllocation(inv.id, Number(e.target.value) || 0)}
                                  style={{ width: 100 }}
                                  className="input num"
                                  aria-label={`توزيع على ${inv.invoiceNumber}`}
                                />
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
          </div>
        )}

        {step === "confirm" && selectedCustomer && (
          <div className="stack">
            <SectionBlock title="ملخص السند">
              <div className="card-body stack-sm">
                <div className="flex-between"><span className="muted">العميل</span><b>{selectedCustomer.name}</b></div>
                <div className="flex-between"><span className="muted">المبلغ</span><b className="num" style={{ fontSize: "var(--font-size-lg)", color: "var(--color-primary)" }}>{formatMoney(enteredAmount)}</b></div>
                <div className="flex-between"><span className="muted">طريقة السداد</span><Badge tone={method === "cash" ? "success" : method === "transfer" ? "info" : method === "pos" ? "warning" : "neutral"}>{methodLabels[method]}</Badge></div>
                {reference && <div className="flex-between"><span className="muted">المرجع</span><span className="num">{reference}</span></div>}
                {notes && <div className="flex-between"><span className="muted">ملاحظات</span><span>{notes}</span></div>}
              </div>
            </SectionBlock>

            <SectionBlock title="توزيع المبلغ على الفواتير">
              <div className="card-body">
                <div className="stack-sm">
                  {allocations.map((alloc) => {
                    const inv = invoices.find((i) => i.id === alloc.invoiceId);
                    return inv ? (
                      <div key={alloc.invoiceId} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 6 }}>
                        <div>
                          <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{inv.invoiceNumber}</b>
                          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>مستحق: {formatMoney(inv.net - inv.paid)}</div>
                        </div>
                        <b className="num" style={{ fontSize: "var(--font-size-sm)", color: "var(--color-success)" }}>{formatMoney(alloc.allocatedAmount)}</b>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </SectionBlock>

            <div className="alert alert-success" style={{ marginBottom: 0 }}>
              <HandCoins size={16} />
              <div>
                <div className="alert-title">سيتم إنشاء السند وإرساله للاعتماد</div>
                <div>النقدي يُضاف لصندوقك فوراً. التحويلات والشيكات تتطلب تحقق المشرف.</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}