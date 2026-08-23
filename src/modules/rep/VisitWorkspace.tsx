import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MapPin, Phone, Building2, ShoppingCart, HandCoins, Undo2, NotebookPen,
  AlertTriangle, ShieldAlert, ShieldCheck, CheckCircle2, Store,
} from "lucide-react";
import { customers } from "@/mock/customers";
import { visitsByCustomer } from "@/mock/visits";
import { invoicesByCustomer } from "@/mock/sales";
import { collectionsByRep, todayCollections } from "@/mock/collections";
import { returnsByRep } from "@/mock/returns";
import { repPolicies } from "@/config/repPolicies";
import { useAuthStore } from "@/store/auth";
import { getDataScope, canAccessCustomer } from "@/services/scope";
import { evaluateCredit } from "@/services/credit";
import { EmptyState } from "@/components/ui/States";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Breadcrumbs } from "@/components/ui/PageHeader";
import { Card, SectionBlock } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/FormControls";
import { Timeline, type TimelineStep } from "@/components/ui/Progress";
import { toast } from "@/store/ui";
import { mockApi } from "@/services/mockApi";
import { formatMoney, formatDateShort, formatTime } from "@/utils/format";

const TODAY = "2026-08-14";

const resultOptions = [
  { value: "visited", label: "تمت الزيارة" },
  { value: "not_found", label: "غير موجود" },
  { value: "closed", label: "المحل مغلق" },
  { value: "no_sale", label: "زيارة بدون بيع" },
  { value: "completed", label: "زيارة مكتملة" },
];

export function VisitWorkspace() {
  const { customerId = "" } = useParams();
  const { user } = useAuthStore();
  const me = user!;
  const navigate = useNavigate();

  const [checkedIn, setCheckedIn] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [result, setResult] = useState<"visited" | "not_found" | "closed" | "no_sale" | "completed">("visited");
  const [outcome, setOutcome] = useState("");
  const [finished, setFinished] = useState(false);
  const [visitLoading, setVisitLoading] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  const scope = getDataScope(user);
  const denied = !!customer && !!scope && !canAccessCustomer(scope, customer);
  const visits = visitsByCustomer(customerId);
  const invoices = invoicesByCustomer(customerId);
  const collections = todayCollections().filter((c) => c.customerId === customerId);
  const returns = returnsByRep(me.id).filter((r) => r.customerId === customerId);
  const latestVisit = visits[0];

  const creditEval = customer ? evaluateCredit({ customerId: customer.id, amount: 0 }) : null;
  const creditPct = creditEval ? Math.min(100, (creditEval.balance / Math.max(1, customer!.creditLimit)) * 100) : 0;
  const creditDanger = creditEval ? creditEval.verdict === "BLOCK" : false;
  const creditWarn = creditEval ? creditEval.verdict === "WARN" || creditEval.verdict === "APPROVAL_REQUIRED" : false;

  const timelineSteps = useMemo<TimelineStep[]>(() => {
    const steps: TimelineStep[] = [
      { label: "تسجيل الوصول (Check-in)", status: checkedIn || finished ? "done" : "current", meta: "التقاط الموقع الحالي" },
      { label: "أعمال الزيارة", status: finished ? "done" : checkedIn ? "current" : "pending", meta: "بيع / تحصيل / مرتجع / ملاحظة" },
      { label: "تسجيل الخروج (Check-out)", status: finished ? "done" : "pending", meta: "نتيجة الزيارة" },
    ];
    return steps;
  }, [checkedIn, finished]);

  const checkIn = async () => {
    const latestVisitId = latestVisit?.id;
    if (!latestVisitId) return;
    setVisitLoading(true);
    try {
      await mockApi.rep.checkIn(latestVisitId);
      setCheckedIn(true);
      toast.success("تم تسجيل الوصول", `تم التقاط الموقع عند ${customer?.name ?? "العميل"}`);
    } catch {
      toast.error("فشل تسجيل الوصول", "حدث خطأ أثناء محاولة تسجيل الوصول");
    } finally {
      setVisitLoading(false);
    }
  };

  const checkOut = async () => {
    const latestVisitId = latestVisit?.id;
    if (!latestVisitId) return;
    setVisitLoading(true);
    try {
      await mockApi.rep.checkOut(latestVisitId, result, outcome || undefined);
      setFinished(true);
      setCheckoutOpen(false);
      toast.success("تم تسجيل الخروج", `النتيجة: ${resultOptions.find((r) => r.value === result)?.label ?? ""}`);
      setCheckedIn(false);
    } catch {
      toast.error("فشل تسجيل الخروج", "حدث خطأ أثناء محاولة تسجيل الخروج");
    } finally {
      setVisitLoading(false);
    }
  };

  if (denied) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "خطة اليوم", path: "/rep/plan" }, { label: "زيارة" }]} />
        <EmptyState
          title="غير مصرح — هذا العميل خارج نطاقك"
          description="لا يمكنك عرض بيانات عميل غير مُسنَد إليك."
          action={<Button variant="primary" size="sm" onClick={() => navigate("/rep/plan")}>العودة للخطة</Button>}
        />
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "الزيارة", path: "/rep/plan" }, { label: "غير موجود" }]} />
        <Card>المنشأة غير موجودة.</Card>
      </div>
    );
  }

  const toSale = () => navigate("/sales/new", { state: { customerId: customer.id } });

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "خطة اليوم", path: "/rep/plan" }, { label: customer.name }]}
        title={customer.name}
        description={`${customer.code} · ${customer.type === "wholesaler" ? "موزع جملة" : customer.type === "supermarket" ? "سوبر ماركت" : customer.type === "restaurant" ? "مطعم/كافيه" : customer.type === "kiosk" ? "كشك" : "تموينات"} · ${customer.address}`}
        actions={!finished ? (
          <Button
            variant={checkedIn ? "danger-solid" : "primary"}
            icon={checkedIn ? <CheckCircle2 size={15} /> : <MapPin size={15} />}
            onClick={() => (checkedIn ? setCheckoutOpen(true) : checkIn())}
            loading={visitLoading}
            disabled={visitLoading}
          >
            {checkedIn ? "إنهاء الزيارة" : "تسجيل الوصول"}
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => navigate("/rep/plan")}>العودة للخطة</Button>
        )}
      />

      <div className="stack">
        <Card title="معلومات المنشأة">
          <div className="card-body">
            <div className="info-grid">
              <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الهاتف</span><b style={{ fontSize: "var(--font-size-sm)" }}>{customer.phone}</b></div>
              <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>شروط الدفع</span><Badge tone="info">{customer.paymentTerms === "cash" ? "نقدي" : `آجل ${customer.paymentTerms.replace("credit_", "")} يوم`}</Badge></div>
              <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>آخر زيارة</span><b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{customer.lastVisitAt ? formatDateShort(customer.lastVisitAt) : "—"}</b></div>
              <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>عدد الزيارات</span><b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{customer.visitedCount}</b></div>
              {customer.legalName && <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الاسم القانوني</span><b style={{ fontSize: "var(--font-size-sm)" }}>{customer.legalName}</b></div>}
              {customer.taxNumber && <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الرقم الضريبي</span><b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{customer.taxNumber}</b></div>}
              {customer.contactPerson && (
                <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>جهة الاتصال</span><b style={{ fontSize: "var(--font-size-sm)" }}>{customer.contactPerson.name} · {customer.contactPerson.jobTitle} · {customer.contactPerson.phone}</b></div>
              )}
            </div>
          </div>
        </Card>

        {creditDanger && (
          <div className="alert alert-danger">
            <ShieldAlert size={17} />
            <div>
              <div className="alert-title">الحد الائتماني مستنفد — البيع الآجل محظور حسب السياسة</div>
              <div>الرصيد الحالي {formatMoney(creditEval?.balance ?? 0)} من حد {formatMoney(customer?.creditLimit ?? 0)}. يمكن التحصيل أو البيع النقدي.</div>
            </div>
          </div>
        )}
        {creditWarn && (
          <div className="alert alert-warning">
            <AlertTriangle size={17} />
            <div>
              <div className="alert-title">تجاوز {repPolicies.credit.warnAtPercent}% من الحد الائتماني</div>
              <div>الرصيد الحالي {formatMoney(creditEval?.balance ?? 0)} ({creditPct.toFixed(0)}%). يُرجى تحصيل جزء قبل البيع الآجل.</div>
            </div>
          </div>
        )}
        {!creditDanger && !creditWarn && (
          <div className="alert alert-success">
            <ShieldCheck size={17} />
            <div>
              <div className="alert-title">الحد الائتماني متاح</div>
              <div>الرصيد {formatMoney(creditEval?.balance ?? 0)} من {formatMoney(customer?.creditLimit ?? 0)} — البيع الآجل مسموح.</div>
            </div>
          </div>
        )}

        <Card title="سير الزيارة">
          <div className="card-body">
            <Timeline steps={timelineSteps} />
          </div>
        </Card>

        {checkedIn && !finished && (
          <>
            <SectionBlock title="أعمال الزيارة">
              <div className="card-body">
                <div className="quick-actions" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                  <Button variant="primary" icon={<ShoppingCart size={15} />} onClick={toSale} disabled={creditDanger}>
                    بيع جديد{creditDanger ? " (نقدي فقط)" : ""}
                  </Button>
                  <Button variant="secondary" icon={<HandCoins size={15} />} onClick={() => navigate("/collections")}>تسجيل تحصيل</Button>
                  <Button variant="secondary" icon={<Undo2 size={15} />} onClick={() => navigate("/returns")}>مرتجع</Button>
                  <Button variant="secondary" icon={<NotebookPen size={15} />} onClick={() => { toast.info("تم حفظ الملاحظة", "أُضيفت ملاحظة الزيارة للعميل"); }}>ملاحظة</Button>
                </div>
              </div>
            </SectionBlock>

            {latestVisit?.distanceFromRoute ? (
              <div className="alert alert-warning">
                <AlertTriangle size={17} />
                <div>
                  <div className="alert-title">انحراف عن المسار</div>
                  <div>المسافة عن المسار المخطط: {latestVisit.distanceFromRoute} كم — الزيارة خارج خطة اليوم.</div>
                </div>
              </div>
            ) : null}
          </>
        )}

        {finished && (
          <div className="alert alert-success">
            <CheckCircle2 size={17} />
            <div>
              <div className="alert-title">تم إغلاق الزيارة</div>
              <div>النتيجة: {resultOptions.find((r) => r.value === result)?.label}{outcome ? ` — ${outcome}` : ""}</div>
            </div>
          </div>
        )}

        <Card title="سجل اليوم مع المنشأة">
          <div className="card-body">
            <div className="stack-sm">
              {visits.length === 0 && invoices.length === 0 && collections.length === 0 && returns.length === 0 && (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد أنشطة مسجلة بعد.</div>
              )}
              {visits.slice(0, 3).map((v) => (
                <div key={v.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Store size={14} />
                    <span style={{ fontSize: "var(--font-size-sm)" }}>زيارة {formatDateShort(v.date)} {v.checkInAt ? `· دخول ${formatTime(v.checkInAt)}` : ""}</span>
                  </div>
                  <Badge tone={v.result === "completed" ? "success" : v.result === "not_found" || v.result === "closed" ? "warning" : "info"} dot>{v.outcome ?? "تمت"}</Badge>
                </div>
              ))}
              {invoices.slice(0, 3).map((i) => (
                <div key={i.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Building2 size={14} />
                    <span style={{ fontSize: "var(--font-size-sm)" }}>{i.invoiceNumber}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatMoney(i.net)}</b>
                    <StatusBadge status={i.paymentStatus} />
                  </div>
                </div>
              ))}
              {collections.slice(0, 3).map((c) => (
                <div key={c.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <HandCoins size={14} />
                    <span style={{ fontSize: "var(--font-size-sm)" }}>{c.number}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatMoney(c.amount)}</b>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="إنهاء الزيارة — تسجيل الخروج" footer={<>
        <Button variant="secondary" onClick={() => setCheckoutOpen(false)}>إلغاء</Button>
        <Button variant="primary" icon={<CheckCircle2 size={15} />} onClick={checkOut} loading={visitLoading} disabled={visitLoading}>حفظ النتيجة</Button>
      </>}>
        <div className="form-grid">
          <div className="field-span-12">
            <Select label="نتيجة الزيارة" value={result} onChange={(e) => setResult(e.target.value as typeof result)} options={resultOptions} />
          </div>
          <div className="field-span-12">
            <input
              className="input"
              placeholder="ملخص الزيارة (اختياري)"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
