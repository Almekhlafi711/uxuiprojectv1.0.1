import { useMemo, useState } from "react";
import { Send, CheckCircle2, AlertTriangle, Plus, Banknote } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { invoices } from "@/mock/sales";
import { todayCollections } from "@/mock/collections";
import { returnsByRep } from "@/mock/returns";
import { closingByRepDate, tripById, inventoryCountByRepDate, depositsByRep, tripExpensesByTrip } from "@/mock/repField";
import { repPolicies } from "@/config/repPolicies";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import { toast } from "@/store/ui";
import { formatMoney, formatQty, formatTime, formatDateShort } from "@/utils/format";
import { submitClosing as submitClosingService, registerExpense, submitDeposit } from "@/services/closing.service";
import { dataScopeOf } from "@/config/authority";
import type { DepositRequest, TripExpense } from "@/types";

const TODAY = "2026-08-14";

export function DailyClosingPage() {
  const { user } = useAuthStore();
  const me = user!;

  const closing = closingByRepDate(me.id, TODAY);
  const prevClosing = closingByRepDate(me.id, "2026-08-13");
  const trip = closing?.tripId ? tripById(closing.tripId) : undefined;
  const count = inventoryCountByRepDate(me.id, TODAY);
  const [deposits, setDeposits] = useState<DepositRequest[]>(depositsByRep(me.id));
  const [expenses, setExpenses] = useState<TripExpense[]>(trip ? tripExpensesByTrip(trip.id) : []);
  const [statusOverride, setStatusOverride] = useState<"submitted" | null>(null);

  const [active, setActive] = useState("overview");
  const [depositOpen, setDepositOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const [depAmount, setDepAmount] = useState("");
  const [depMethod, setDepMethod] = useState<"cash" | "transfer">("cash");
  const [depRef, setDepRef] = useState("");
  const [expType, setExpType] = useState<"fuel" | "parking" | "tolls" | "meals" | "phone" | "other">("fuel");
  const [expAmount, setExpAmount] = useState("");
  const [expPay, setExpPay] = useState<"cash" | "transfer" | "pos">("cash");
  const [expNote, setExpNote] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const effectiveStatus = statusOverride ?? closing?.status ?? "draft";

  const todaySales = useMemo(
    () => invoices.filter((i) => i.repId === me.id && i.date === TODAY && i.status === "completed"),
    [me.id]
  );
  const todayCollected = todayCollections().filter((c) => c.repId === me.id && c.status === "approved");
  const todayReturns = returnsByRep(me.id).filter((r) => r.date === TODAY);

  const salesTotal = todaySales.reduce((s, i) => s + i.net, 0);
  const collectedTotal = todayCollected.reduce((s, c) => s + c.amount, 0);
  const returnsTotal = todayReturns.reduce((s, r) => s + r.totalAmount, 0);
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingDeposits = deposits.filter((d) => d.status === "pending").reduce((s, d) => s + d.amount, 0);
  const variance = (closing?.actualCash ?? 0) - (closing?.expectedCash ?? 0);

  const maxExpense = repPolicies.expenses.maxWithoutApproval;

  const addDeposit = () => {
    const amount = Number(depAmount);
    if (!amount || amount <= 0) {
      toast.warning("أدخل مبلغاً صحيحاً");
      return;
    }

    const result = submitDeposit(
      { repId: me.id, amount, method: depMethod, toBoxId: "bx-sp-01", reference: depRef || undefined },
      { id: me.id, role: me.role, scope: dataScopeOf[me.role], owns: true }
    );

    if (!result.success) {
      toast.error("فشل إرسال الإيداع", result.reason ?? "خطأ غير معروف");
      return;
    }

    const rec: DepositRequest = {
      id: `dp-new-${Date.now()}`,
      number: `DEP-2026-00${20 + deposits.length}`,
      repId: me.id,
      amount,
      date: TODAY,
      toBoxId: "bx-sp-01",
      method: depMethod,
      reference: depRef || undefined,
      status: "pending",
    };
    setDeposits((d) => [rec, ...d]);
    setDepositOpen(false);
    setDepAmount("");
    setDepRef("");
    toast.success("أُرسل طلب تسليم النقدية", "سُجّلت الحركة في الأستاذ وانتظار اعتماد المشرف");
  };

  const addExpense = () => {
    const amount = Number(expAmount);
    if (!amount || amount <= 0) {
      toast.warning("أدخل مبلغاً صحيحاً");
      return;
    }

    const result = registerExpense(
      { repId: me.id, tripId: trip?.id ?? "", type: expType, amount, paymentMethod: expPay, description: expNote || undefined },
      { id: me.id, role: me.role, scope: dataScopeOf[me.role], owns: true }
    );

    if (!result.success) {
      toast.error("فشل تسجيل المصروف", result.reason ?? "خطأ غير معروف");
      return;
    }

    const rec: TripExpense = {
      id: `ex-new-${Date.now()}`,
      number: `EXP-2026-00${40 + expenses.length}`,
      tripId: trip?.id ?? "",
      repId: me.id,
      date: TODAY,
      type: expType,
      amount,
      paymentMethod: expPay,
      note: expNote || undefined,
      status: amount > maxExpense ? "pending" : "pending",
    };
    setExpenses((e) => [rec, ...e]);
    setExpenseOpen(false);
    setExpAmount("");
    setExpNote("");
    toast.success("سُجل مصروف الجولة", amount > maxExpense ? "المبلغ يتجاوز السياسة — يتطلب اعتماداً" : "سُجل ضمن حدود السياسة + قيد في الأستاذ");
  };

  const submitClosing = () => {
    const result = submitClosingService(
      {
        repId: me.id,
        date: TODAY,
        actualCash: closing?.actualCash ?? 0,
        expectedCash: closing?.expectedCash ?? 0,
        salesCount: todaySales.length,
        collectionCount: todayCollected.length,
        returnCount: todayReturns.length,
        expenseTotal: expensesTotal,
        depositAmount: pendingDeposits,
        inventoryVarianceItems: [],
        notes: undefined,
      },
      { id: me.id, role: me.role, scope: dataScopeOf[me.role], owns: true }
    );

    if (!result.success) {
      toast.error("فشل إرسال الإقفال", result.reason ?? "خطأ غير معروف");
      return;
    }

    setStatusOverride("submitted");
    toast.success("أُرسل إقفال اليوم للمراجعة", "سُجّلت في الأستاذ — في انتظار اعتماد المشرف");
  };

  const tabs = [
    {
      key: "overview",
      label: "نظرة عامة",
      content: (
        <div className="stack">
          <div className="stat-grid">
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مبيعات اليوم</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatMoney(salesTotal)}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{todaySales.length} فاتورة</div></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تحصيل اليوم</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{formatMoney(collectedTotal)}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{todayCollected.length} سند</div></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مرتجعات اليوم</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{formatMoney(returnsTotal)}</b></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مصروفات الجولة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-danger)" }}>{formatMoney(expensesTotal)}</b></div></Card>
          </div>

          <Card title="حالة الإقفال" subtitle={closing?.number ?? "إقفال اليوم — مسودة"}>
            <div className="card-body stack-sm">
              <div className="flex-between">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>رقم الإقفال</span>
                <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{closing?.number ?? "—"}</b>
              </div>
              <div className="flex-between">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الحالة</span>
                <StatusBadge status={effectiveStatus} />
              </div>
              <div className="flex-between">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الجولة</span>
                <span style={{ fontSize: "var(--font-size-sm)" }}>{trip ? `${trip.number} · بداية ${formatTime(trip.startTime)}` : "—"}</span>
              </div>
              {variance !== 0 && (
                <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                  <AlertTriangle size={16} />
                  <div>
                    <div className="alert-title">فرق نقدية {variance > 0 ? "+" : ""}{formatMoney(variance)}</div>
                    <div>النقدية الفعلية {formatMoney(closing?.actualCash ?? 0)} مقابل المتوقع {formatMoney(closing?.expectedCash ?? 0)}.</div>
                  </div>
                </div>
              )}
              {variance === 0 && (
                <div className="alert alert-success" style={{ marginBottom: 0 }}>
                  <CheckCircle2 size={16} />
                  <div><div className="alert-title">لا يوجد فرق نقدية</div><div>النقدية مطابقة تماماً.</div></div>
                </div>
              )}
            </div>
          </Card>

          {prevClosing && (
            <Card title="إقفال الأمس" subtitle={`${prevClosing.number} · ${prevClosing.approvedBy ?? "—"}`}>
              <div className="card-body">
                <div className="flex-between">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الحالة</span>
                  <StatusBadge status={prevClosing.status} />
                </div>
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: "cash",
      label: "النقدية",
      content: (
        <div className="stack">
          <Card title="مطابقة النقدية">
            <div className="card-body stack-sm">
              <div className="flex-between">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>النقدية المتوقعة (تحصيل نقدي)</span>
                <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatMoney(closing?.expectedCash ?? 0)}</b>
              </div>
              <div className="flex-between">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>النقدية الفعلية (عَدّ الصندوق)</span>
                <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatMoney(closing?.actualCash ?? 0)}</b>
              </div>
              <div className="flex-between" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 8 }}>
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الفرق</span>
                <b className="num" style={{ fontSize: "var(--font-size-sm)", color: variance === 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                  {variance > 0 ? "+" : ""}{formatMoney(variance)}
                </b>
              </div>
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                رصيد الصندوق مشتق من الحركات ولا يُعدّل يدوياً — أي فرق يُعالج بحركة تسوية معتمدة.
              </div>
            </div>
          </Card>

          <Card title="تسليم النقدية للمشرف" actions={
            <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setDepositOpen(true)}>طلب تسليم</Button>
          }>
            <div className="card-body stack-sm">
              {pendingDeposits > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                  <AlertTriangle size={16} />
                  <div>لديك تسليمات قيد الاعتماد بمبلغ {formatMoney(pendingDeposits)}</div>
                </div>
              )}
              {deposits.length === 0 && <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد تسليمات.</div>}
              {deposits.map((d) => (
                <div key={d.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                  <div>
                    <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{d.number}</b>
                    <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{d.method === "cash" ? "نقدي" : "تحويل"} {d.reference ? `· ${d.reference}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatMoney(d.amount)}</b>
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: "inventory",
      label: "المخزون",
      content: (
        <Card title="جرد مخزون السيارة" subtitle={count?.number ?? "لا يوجد جرد لليوم"}>
          <div className="card-body">
            {!count || count.items.length === 0 ? (
              <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد بنود جرد — ابدأ جرداً من مخزون السيارة.</div>
            ) : (
              <div className="stack-sm">
                <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>المنتج</th>
                        <th className="numeric">النظامي</th>
                        <th className="numeric">الفعلي</th>
                        <th className="numeric">الفرق</th>
                        <th>ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {count.items.map((it) => (
                        <tr key={it.productId}>
                          <td>{it.productName}</td>
                          <td className="numeric num">{formatQty(it.systemQty)}</td>
                          <td className="numeric num">{formatQty(it.physicalQty)}</td>
                          <td className="numeric num" style={{ color: it.variance === 0 ? "var(--color-success)" : "var(--color-danger)", fontWeight: 600 }}>
                            {it.variance > 0 ? "+" : ""}{formatQty(it.variance)}
                          </td>
                          <td>{it.reason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="alert alert-info" style={{ marginBottom: 0 }}>
                  وفق السياسة، ينتج عن فرق الجرد حركة تسوية تلقائية على مخزون السيارة.
                </div>
              </div>
            )}
          </div>
        </Card>
      ),
    },
    {
      key: "expenses",
      label: "المصروفات",
      content: (
        <Card title="مصروفات الجولة" actions={
          <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setExpenseOpen(true)}>إضافة مصروف</Button>
        }>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              حد المصروف بدون اعتماد وفق السياسة: {formatMoney(maxExpense)} — ما زاد يتطلب موافقة المشرف.
            </div>
            {expenses.length === 0 && <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد مصروفات مسجلة.</div>}
            {expenses.map((e) => (
              <div key={e.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                <div>
                  <b style={{ fontSize: "var(--font-size-sm)" }}>{e.type === "fuel" ? "وقود" : e.type === "parking" ? "مواقف" : e.type === "tolls" ? "رسوم طرق" : e.type === "meals" ? "وجبات" : e.type === "phone" ? "اتصالات" : "أخرى"}</b>
                  {e.note && <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{e.note}</div>}
                  <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{e.number}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatMoney(e.amount)}</b>
                  <StatusBadge status={e.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ),
    },
    {
      key: "submit",
      label: "الإرسال",
      content: (
        <Card title="إرسال إقفال اليوم">
          <div className="card-body stack-sm">
            <div className="alert alert-warning" style={{ marginBottom: 0 }}>
              <b>قبل الإرسال تأكد من:</b>
              <div className="stack-sm" style={{ marginTop: 8 }}>
                <div className="flex-between"><span style={{ fontSize: "var(--font-size-sm)" }}>مطابقة النقدية (العد الفعلي)</span><CheckCircle2 size={16} style={{ color: "var(--color-success)" }} /></div>
                <div className="flex-between"><span style={{ fontSize: "var(--font-size-sm)" }}>تسليم النقدية للمشرف / اعتمادها</span>{pendingDeposits > 0 ? <AlertTriangle size={16} style={{ color: "var(--color-warning)" }} /> : <CheckCircle2 size={16} style={{ color: "var(--color-success)" }} />}</div>
                <div className="flex-between"><span style={{ fontSize: "var(--font-size-sm)" }}>جرد مخزون السيارة ومراجعة الفروق</span><CheckCircle2 size={16} style={{ color: "var(--color-success)" }} /></div>
                <div className="flex-between"><span style={{ fontSize: "var(--font-size-sm)" }}>تسجيل مصروفات الجولة</span><CheckCircle2 size={16} style={{ color: "var(--color-success)" }} /></div>
              </div>
            </div>
            <Textarea label="ملاحظات الإقفال" rows={3} value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="أي ملاحظات على فروق النقدية أو المخزون..." />
            <Button variant="primary" icon={<Send size={15} />} onClick={submitClosing} disabled={effectiveStatus === "submitted"}>
              {effectiveStatus === "submitted" ? "تم الإرسال" : "إرسال الإقفال"}
            </Button>
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              يُدرج الإقفال في قائمة المزامنة ويظهر للمشرف للاعتماد.
            </div>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "إقفال اليوم" }]}
        title="إقفال اليوم"
        description={`مطابقة النقدية والمخزون وتسليم النقدية — ${formatDateShort(TODAY)}`}
      />

      <Tabs tabs={tabs} active={active} onChange={setActive} />

      <Modal open={depositOpen} onClose={() => setDepositOpen(false)} title="طلب تسليم نقدية للمشرف" footer={<>
        <Button variant="secondary" onClick={() => setDepositOpen(false)}>إلغاء</Button>
        <Button variant="primary" icon={<Banknote size={15} />} onClick={addDeposit}>إرسال الطلب</Button>
      </>}>
        <div className="form-grid">
          <div className="field-span-6">
            <Input label="المبلغ (ر.س)" type="number" min={1} value={depAmount} onChange={(e) => setDepAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="field-span-6">
            <Select label="طريقة التسليم" value={depMethod} onChange={(e) => setDepMethod(e.target.value as typeof depMethod)} options={[
              { value: "cash", label: "نقدي" },
              { value: "transfer", label: "تحويل بنكي" },
            ]} />
          </div>
          <div className="field-span-12">
            <Input label="مرجع التحويل (إن وُجد)" value={depRef} onChange={(e) => setDepRef(e.target.value)} className="num" />
          </div>
          <div className="field-span-12">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              يُقيّد المبلغ على صندوق المشرف بعد الاعتماد، ويُنشأ سجل نقدية تلقائياً.
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title="إضافة مصروف جولة" footer={<>
        <Button variant="secondary" onClick={() => setExpenseOpen(false)}>إلغاء</Button>
        <Button variant="primary" icon={<Plus size={15} />} onClick={addExpense}>تسجيل</Button>
      </>}>
        <div className="form-grid">
          <div className="field-span-6">
            <Select label="النوع" value={expType} onChange={(e) => setExpType(e.target.value as typeof expType)} options={[
              { value: "fuel", label: "وقود" },
              { value: "parking", label: "مواقف" },
              { value: "tolls", label: "رسوم طرق" },
              { value: "meals", label: "وجبات" },
              { value: "phone", label: "اتصالات" },
              { value: "other", label: "أخرى" },
            ]} />
          </div>
          <div className="field-span-6">
            <Input label="المبلغ (ر.س)" type="number" min={1} value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="field-span-6">
            <Select label="طريقة الدفع" value={expPay} onChange={(e) => setExpPay(e.target.value as typeof expPay)} options={[
              { value: "cash", label: "نقدي" },
              { value: "transfer", label: "تحويل" },
              { value: "pos", label: "POS" },
            ]} />
          </div>
          <div className="field-span-12">
            <Textarea label="ملاحظة" rows={2} value={expNote} onChange={(e) => setExpNote(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
