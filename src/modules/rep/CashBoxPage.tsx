import { useState } from "react";
import { Search, Banknote, DollarSign, Send, AlertTriangle, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { cashBoxes } from "@/mock/cash";
import { collections } from "@/mock/collections";
import { depositsByRep, closingByRepDate } from "@/mock/repField";
import { getCashBoxBalance } from "@/services/ledger";
import { useAuthStore } from "@/store/auth";
import { submitDeposit } from "@/services/closing.service";
import { dataScopeOf } from "@/config/authority";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { formatMoney, formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import { mockApi } from "@/services/mockApi";
import type { DepositRequest, DailyClosing } from "@/types";

const methodLabels: Record<string, string> = {
  cash: "نقدي",
  transfer: "تحويل بنكي",
  pos: "POS",
  check: "شيك",
};

const methodTones: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  cash: "success",
  transfer: "info",
  pos: "warning",
  check: "neutral",
};

export function CashBoxPage() {
  const { user } = useAuthStore();
  const me = user!;

  const myBox = cashBoxes.find((b) => b.ownerId === me.id);
  const myDeposits: DepositRequest[] = depositsByRep(me.id).sort((a: DepositRequest, b: DepositRequest) => b.date.localeCompare(a.date));
  const myCollections = collections.filter((c) => c.repId === me.id && c.status === "approved").sort((a, b) => b.date.localeCompare(a.date));
  const todayClosing = closingByRepDate(me.id, "2026-08-14");

  const [tab, setTab] = useState<"overview" | "movements" | "deposits" | "reconcile">("overview");
  const [depositOpen, setDepositOpen] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [depMethod, setDepMethod] = useState<"cash" | "transfer">("cash");
  const [depRef, setDepRef] = useState("");
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");

  const cashBalance = myBox ? getCashBoxBalance(myBox.id).balance : 0;
  const cashIn = myCollections.filter((c) => c.method === "cash").reduce((s, c) => s + c.amount, 0);
  const cashOut = myDeposits.filter((d: DepositRequest) => d.method === "cash" && d.status === "approved").reduce((s: number, d: DepositRequest) => s + d.amount, 0);
  const pendingDeposits = myDeposits.filter((d: DepositRequest) => d.status === "pending").reduce((s: number, d: DepositRequest) => s + d.amount, 0);
  const variance = todayClosing ? (todayClosing.actualCash ?? 0) - (todayClosing.expectedCash ?? 0) : 0;

  const [depositLoading, setDepositLoading] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);

  function renderOverview() {
    return (
      <div className="grid-2-1">
        <div className="stack">
          <Card title="ملخص حركة الصندوق">
            <div className="card-body stack-sm">
              <div className="stat-grid" style={{ marginBottom: "var(--space-3)" }}>
                <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>رصيد الصندوق الحالي</span><b className="num" style={{ fontSize: "var(--font-size-2xl)", color: "var(--color-primary)" }}>{formatMoney(cashBalance)}</b></div></Card>
                <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إيداعات نقدية (داخلة)</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{formatMoney(cashIn)}</b></div></Card>
                <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تسليمات للمشرف (خارجة)</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-danger)" }}>{formatMoney(cashOut)}</b></div></Card>
                <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>قيد التسليم للمشرف</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{formatMoney(pendingDeposits)}</b></div></Card>
              </div>

              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <Banknote size={16} />
                <div>
                  <div className="alert-title">قاعدة رصيد الصندوق</div>
                  <div>الرصيد ناتج آلياً من (التحصيلات النقدية المعتمدة - التسليمات المعتمدة للمشرف ± تسويات العجز/الفائض). لا يمكن إدخال رصيد يدوي.</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title="آخر الحركات النقدية">
            <div className="card-body stack-sm">
              {[...myCollections.slice(0, 3), ...myDeposits.slice(0, 3)]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 5)
                .map((m) => {
                  const isCollection = "invoiceIds" in m;
                  return (
                    <div key={m.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isCollection ? <DollarSign size={14} style={{ color: "var(--color-success)" }} /> : <Send size={14} style={{ color: "var(--color-danger)" }} />}
                        <div>
                          <b style={{ fontSize: "var(--font-size-sm)" }}>{isCollection ? `سند ${m.number}` : `تسليم ${m.number}`}</b>
                          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{formatDateShort(m.date)} · {isCollection ? methodLabels[m.method] : m.method === "cash" ? "نقدي" : "تحويل"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <b className="num" style={{ fontSize: "var(--font-size-sm)", color: isCollection ? "var(--color-success)" : "var(--color-danger)" }}>{isCollection ? "+" : "-"}{formatMoney(m.amount)}</b>
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>

          <Card title="صندوق المشرف (معلوماتية)" subtitle={myBox?.id ?? "—"}>
            <div className="card-body info-grid">
              <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الصندوق</span><b style={{ fontSize: "var(--font-size-sm)" }}>{myBox?.name ?? "—"}</b></div>
              <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>آخر تسليم معتمد</span><span className="num">{myDeposits.find((d: DepositRequest) => d.status === "approved")?.date ?? "—"}</span></div>
              <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>إجمالي ما سلمته هذا الشهر</span><b className="num">{formatMoney(myDeposits.filter((d: DepositRequest) => d.status === "approved" && d.date.startsWith("2026-08")).reduce((s: number, d: DepositRequest) => s + d.amount, 0))}</b></div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  function renderMovements() {
    const allMovements = [
      ...myCollections.map((c) => ({ ...c, type: "collection" as const, direction: "in" as const })),
      ...myDeposits.map((d: DepositRequest) => ({ ...d, type: "deposit" as const, direction: "out" as const })),
    ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

    return (
      <div>
        <FilterBar>
          <Input label="البحث" placeholder="رقم، مبلغ..." value="" onChange={() => {}} icon={<Search size={16} />} />
          <Select label="النوع" value="" onChange={() => {}} placeholder="الكل" options={[
            { value: "collection", label: "تحصيلات" },
            { value: "deposit", label: "تسليمات" },
          ]} />
          <Select label="طريقة السداد" value="" onChange={() => {}} placeholder="الكل" options={[
            { value: "cash", label: "نقدي" },
            { value: "transfer", label: "تحويل" },
            { value: "pos", label: "POS" },
            { value: "check", label: "شيك" },
          ]} />
        </FilterBar>

        <DataTable
          columns={[
            { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
            { key: "number", header: "الرقم", priority: "primary", render: (r) => <b className="num">{r.number}</b> },
            { key: "type", header: "النوع", priority: "primary", render: (r) => "invoiceIds" in r ? <Badge tone="success" dot>تحصيل</Badge> : <Badge tone="danger" dot>تسليم</Badge> },
            { key: "method", header: "الطريقة", priority: "secondary", render: (r) => <Badge tone={methodTones[r.method] || "neutral"}>{methodLabels[r.method]}</Badge> },
            { key: "amount", header: "المبلغ", numeric: true, sortable: true, sortValue: (r) => r.amount, priority: "primary", render: (r) => <span className="num" style={{ fontWeight: 600, color: "invoiceIds" in r ? "var(--color-success)" : "var(--color-danger)" }}>{"invoiceIds" in r ? "+" : "-"}{formatMoney(r.amount)}</span> },
            { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={allMovements}
          rowKey={(r) => r.id}
          searchPlaceholder="بحث سريع..."
          searchKeys={(r) => `${r.number} ${r.method}`}
          exportFilename="cash-movements"
          pageSize={15}
          emptyTitle="لا توجد حركات نقدية"
        />
      </div>
    );
  }

  function renderDeposits() {
    const addDeposit = async () => {
      const amount = Number(depAmount);
      if (!amount || amount <= 0) { toast.warning("أدخل مبلغاً صحيحاً"); return; }
      if (amount > cashBalance) { toast.warning("المبلغ يتجاوز رصيد الصندوق", `الرصيد: ${formatMoney(cashBalance)}`); return; }
      if (depMethod === "transfer" && !depRef.trim()) { toast.warning("أدخل مرجع التحويل"); return; }
      setDepositLoading(true);
      try {
        await mockApi.rep.createDeposit({ repId: me.id, amount, method: depMethod, date: "2026-08-14", toBoxId: "bx-main", reference: depRef || undefined });
        toast.success("أُرسل طلب تسليم النقدية للمشرف", `قيمة ${formatMoney(amount)} — ${depMethod === "cash" ? "نقدي" : "تحويل"}`);
        setDepositOpen(false);
        setDepAmount("");
        setDepRef("");
      } catch {
        toast.error("فشل إرسال الطلب", "حدث خطأ أثناء إرسال طلب التسليم");
      } finally {
        setDepositLoading(false);
      }
    };

    const depositCols: Column<DepositRequest>[] = [
      { key: "number", header: "السند", priority: "primary", render: (r) => <b className="num">{r.number}</b> },
      { key: "date", header: "التاريخ", priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
      { key: "method", header: "طريقة التسليم", priority: "secondary", render: (r) => <Badge tone={methodTones[r.method] || "neutral"}>{methodLabels[r.method]}</Badge> },
      { key: "amount", header: "المبلغ", numeric: true, priority: "primary", render: (r) => <span className="num" style={{ fontWeight: 600, color: "var(--color-danger)" }}>{formatMoney(r.amount)}</span> },
      { key: "reference", header: "المرجع", priority: "optional", render: (r) => r.reference ? <span className="num" style={{ direction: "ltr" }}>{r.reference}</span> : "—" },
      { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
    ];

    return (
      <div className="stack">
        <Card title="تسليم النقدية للمشرف" actions={<Button size="sm" variant="primary" icon={<Send size={13} />} onClick={() => setDepositOpen(true)}>طلب تسليم جديد</Button>}>
          <div className="card-body stack-sm">
            {pendingDeposits > 0 && (
              <div className="alert alert-warning" style={{ marginBottom: "var(--space-3)" }}>
                <AlertTriangle size={16} />
                <div>لديك تسليمات قيد الاعتماد بمبلغ {formatMoney(pendingDeposits)} — لا يمكنك طلب تسليم جديد إلا بعد اعتماد السابقة.</div>
              </div>
            )}
            {myDeposits.length === 0 ? (
              <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد تسليمات مسجلة</div>
            ) : (
              <DataTable
                columns={depositCols}
                rows={myDeposits}
                rowKey={(r) => r.id}
                pageSize={12}
                emptyTitle="لا توجد تسليمات"
              />
            )}
          </div>
        </Card>

        <Modal open={depositOpen} onClose={() => setDepositOpen(false)} title="طلب تسليم نقدية للمشرف" footer={<>
          <Button variant="secondary" onClick={() => setDepositOpen(false)}>إلغاء</Button>
          <Button variant="primary" icon={<Send size={15} />} onClick={addDeposit} loading={depositLoading} disabled={depositLoading}>إرسال الطلب</Button>
        </>}>
          <div className="form-grid">
            <div className="field-span-6">
              <Input label="المبلغ (ر.س)" type="number" min={1} step={0.01} value={depAmount} onChange={(e) => setDepAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="field-span-6">
              <Select label="طريقة التسليم" value={depMethod} onChange={(e) => setDepMethod(e.target.value as typeof depMethod)} options={[
                { value: "cash", label: "نقدي" },
                { value: "transfer", label: "تحويل بنكي" },
              ]} />
            </div>
            <div className="field-span-12">
              <Input label="مرجع التحويل (مطلوب للتحويلات)" value={depRef} onChange={(e) => setDepRef(e.target.value)} className="num" placeholder={depMethod === "transfer" ? "مثال: SR-123456" : "اختياري" } />
            </div>
            <div className="field-span-12">
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <Banknote size={16} />
                <div>يُقيّد المبلغ على صندوق المشرف بعد الاعتماد، وينقص من رصيد صندوقك فوراً.</div>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  function renderReconcile() {
    const doReconcile = async () => {
      const actual = Number(actualCash);
      if (isNaN(actual) || actual < 0) { toast.warning("أدخل المبلغ الفعلي الصحيح"); return; }
      setReconcileLoading(true);
      try {
        await mockApi.rep.submitClosing(todayClosing?.id ?? "");
        const varAmount = actual - (todayClosing?.expectedCash ?? 0);
        toast.success("تم تسجيل المطابقة", `النقدية الفعلية: ${formatMoney(actual)} · المتوقع: ${formatMoney(todayClosing?.expectedCash ?? 0)} · الفرق: ${varAmount > 0 ? "+" : ""}${formatMoney(varAmount)}`);
        setReconcileOpen(false);
        setActualCash("");
        setReconcileNotes("");
      } catch {
        toast.error("فشل تسجيل المطابقة", "حدث خطأ أثناء تسجيل مطابقة النقدية");
      } finally {
        setReconcileLoading(false);
      }
    };

    const closingCols: Column<DailyClosing>[] = [
      { key: "number", header: "رقم الإقفال", priority: "primary", render: (r) => <b className="num">{r.number}</b> },
      { key: "date", header: "التاريخ", priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
      { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
      { key: "expectedCash", header: "المتوقع", numeric: true, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.expectedCash)}</span> },
      { key: "actualCash", header: "الفعلي", numeric: true, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.actualCash)}</span> },
      { key: "variance", header: "الفرق", numeric: true, priority: "primary", render: (r) => <span className="num" style={{ color: r.cashVariance === 0 ? "var(--color-success)" : r.cashVariance > 0 ? "var(--color-success)" : "var(--color-danger)" }}>{r.cashVariance > 0 ? "+" : ""}{formatMoney(r.cashVariance)}</span> },
    ];

    return (
      <div className="stack">
        <Card title="مطابقة النقدية اليومية" subtitle={`إقفال ${formatDateShort("2026-08-14")}`}>
          <div className="card-body stack-sm">
            <div className="stat-grid" style={{ marginBottom: "var(--space-3)" }}>
              <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>النقدية المتوقعة (تحصيل نقدي)</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatMoney(todayClosing?.expectedCash ?? cashIn)}</b></div></Card>
              <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>النقدية الفعلية (عَدّ الصندوق)</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatMoney(todayClosing?.actualCash ?? 0)}</b></div></Card>
              <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الفرق</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: variance === 0 ? "var(--color-success)" : variance > 0 ? "var(--color-success)" : "var(--color-danger)" }}>{variance > 0 ? "+" : ""}{formatMoney(variance)}</b></div></Card>
            </div>

            {todayClosing && (
              <div className="alert" style={{ marginBottom: "var(--space-3)", background: variance === 0 ? "var(--color-success-bg)" : variance > 0 ? "var(--color-success-bg)" : "var(--color-danger-bg)", borderColor: variance === 0 ? "var(--color-success)" : variance > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                {variance === 0 ? <CheckCircle2 size={16} /> : variance > 0 ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <div>
                  <div className="alert-title">{variance === 0 ? "لا يوجد فرق نقدية" : variance > 0 ? "فائض نقدي" : "عجز نقدي"}</div>
                  <div>النقدية الفعلية {formatMoney(todayClosing.actualCash ?? 0)} مقابل المتوقع {formatMoney(todayClosing.expectedCash ?? 0)}. {variance !== 0 ? "يُعالج الفرق بحركة تسوية معتمدة." : "الصندوق مطابق تماماً."}</div>
                </div>
              </div>
            )}

            <Button variant="primary" icon={<RotateCcw size={15} />} onClick={() => setReconcileOpen(true)} disabled={!!todayClosing && todayClosing.status !== "draft"}>
              {todayClosing && todayClosing.status !== "draft" ? "الإقفال مرسل/معتمد" : "إجراء المطابقة وتسجيل الفرق"}
            </Button>
          </div>
        </Card>

        <Card title="سجل الإقفالات">
          <div className="card-body">
            {todayClosing ? (
              <DataTable
                columns={closingCols}
                rows={[todayClosing]}
                rowKey={(r) => r.id}
                pageSize={10}
                emptyTitle="لا توجد إقفالات"
              />
            ) : (
              <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لم تقم بأي إقفال بعد اليوم</div>
            )}
          </div>
        </Card>

        <Modal open={reconcileOpen} onClose={() => setReconcileOpen(false)} title="إجراء مطابقة النقدية" footer={<>
          <Button variant="secondary" onClick={() => setReconcileOpen(false)}>إلغاء</Button>
          <Button variant="primary" icon={<CheckCircle2 size={15} />} onClick={doReconcile} loading={reconcileLoading} disabled={reconcileLoading}>حفظ المطابقة</Button>
        </>}>
          <div className="form-grid">
            <div className="field-span-6">
              <Input label="النقدية الفعلية (بعد العَدّ)" type="number" min={0} step={0.01} value={actualCash} onChange={(e) => setActualCash(e.target.value)} placeholder="0.00" />
            </div>
            <div className="field-span-12">
              <Textarea label="ملاحظات على الفرق (إن وجد)" value={reconcileNotes} onChange={(e) => setReconcileNotes(e.target.value)} placeholder="سبب الفائض/العجز: كسر، خطأ عد، تسوية..." rows={3} />
            </div>
            <div className="field-span-12">
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <AlertTriangle size={16} />
                <div>أي فرق يُعالج بحركة تسوية معتمدة من المشرف. رصيد الصندوق مشتق من الحركات ولا يُعدل يدوياً.</div>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  const tabs = [
    {
      key: "overview",
      label: "نظرة عامة",
      content: renderOverview(),
    },
    {
      key: "movements",
      label: "الحركات",
      content: renderMovements(),
    },
    {
      key: "deposits",
      label: "تسليم النقدية للمشرف",
      content: renderDeposits(),
    },
    {
      key: "reconcile",
      label: "المطابقة والإقفال",
      content: renderReconcile(),
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الصندوق والتسويات" }]}
        title="صندوق التحصيل والتسويات"
        description="رصيد الصندوق ينتج من الحركات (تحصيلات - تسليمات ± تسويات) — لا تعديل يدوي"
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>رصيد الصندوق</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-primary)" }}>{formatMoney(cashBalance)}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تحصيلات نقدية اليوم</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{formatMoney(cashIn)}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>قيد التسليم للمشرف</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{formatMoney(pendingDeposits)}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الفرق النقدي اليوم</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: variance === 0 ? "var(--color-success)" : variance > 0 ? "var(--color-success)" : "var(--color-danger)" }}>{variance > 0 ? "+" : ""}{formatMoney(variance)}</b></div></Card>
        </div>
      </StickyPageHeader>

      <Tabs tabs={tabs} active={tab} onChange={(k) => setTab(k as typeof tab)} />
    </div>
  );
}
