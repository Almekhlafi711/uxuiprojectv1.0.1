import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Phone, Pencil, ArrowLeft, AlertTriangle, Navigation, HandCoins, Plus } from "lucide-react";
import { customers, customerTypeLabels } from "@/mock/customers";
import { invoicesByCustomer } from "@/mock/sales";
import { collections } from "@/mock/collections";
import { visitsByCustomer, visitResultLabels } from "@/mock/visits";
import { returns } from "@/mock/returns";
import { users } from "@/mock/users";
import { territories } from "@/mock/organization";
import { auditLogs } from "@/mock/admin";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Progress";
import { formatMoney, formatDate, formatDateShort, formatNumber } from "@/utils/format";
import { getCustomerBalance } from "@/services/ledger";
import type { Customer } from "@/types";

export function Customer360Page() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const { data: customer, loading, error, refetch } = useData<Customer>(
    () =>
      mockApi.customers.getById(id ?? "").then((c) => {
        if (!c) throw new Error("العميل غير موجود");
        return c;
      }),
    [id]
  );

  const customerBalance = customer ? getCustomerBalance(customer.id) : null;

  const content = useMemo(() => {
    if (!customer) return null;
    const sales = invoicesByCustomer(customer.id);
    const customerCollections = collections.filter((c) => c.customerId === customer.id);
    const customerVisits = visitsByCustomer(customer.id);
    const customerReturns = returns.filter((r) => r.customerId === customer.id);
    const rep = users.find((u) => u.id === customer.repId);
    const supervisor = users.find((u) => u.id === customer.supervisorId);
    const territory = territories.find((t) => t.id === customer.territoryId);
    const totalSales = sales.filter((s) => s.status === "completed").reduce((s, i) => s + i.net, 0);
    const totalCollections = customerCollections.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0);
    const creditUsage = customer.creditLimit > 0 ? Math.round(((customerBalance?.balance ?? 0) / customer.creditLimit) * 100) : 0;

    return { sales, customerCollections, customerVisits, customerReturns, rep, supervisor, territory, totalSales, totalCollections, creditUsage };
  }, [customer]);

  if (loading) return <LoadingState label="جارٍ تحميل بيانات العميل..." />;
  if (error || !customer || !content) return <ErrorState message={error ?? "العميل غير موجود"} onRetry={refetch} />;

  const { sales, customerCollections, customerVisits, customerReturns, rep, supervisor, territory, totalSales, totalCollections, creditUsage } = content;

  const tabs = [
    {
      key: "overview",
      label: "نظرة عامة",
      content: (
        <div className="grid-2-1">
          <div className="stack">
            <Card title="المعلومات الأساسية">
              <dl className="dl">
                <dt>رمز العميل</dt><dd className="num" style={{ direction: "ltr", textAlign: "right" }}>{customer.code}</dd>
                <dt>النوع</dt><dd>{customerTypeLabels[customer.type]}</dd>
                <dt>الهاتف</dt><dd className="num" style={{ direction: "ltr", textAlign: "right" }}>{customer.phone}</dd>
                <dt>العنوان</dt><dd>{customer.address}</dd>
                <dt>شروط الدفع</dt>
                <dd>
                  {customer.paymentTerms === "cash" ? "نقدي" : customer.paymentTerms === "credit_7" ? "آجل 7 أيام" : customer.paymentTerms === "credit_15" ? "آجل 15 يوم" : "آجل 30 يوم"}
                </dd>
                <dt>تاريخ الإنشاء</dt><dd>{formatDate(customer.createdAt)}</dd>
                <dt>آخر زيارة</dt><dd>{customer.lastVisitAt ? formatDate(customer.lastVisitAt) : "لم تتم أي زيارة"}</dd>
                <dt>عدد الزيارات</dt><dd className="num">{customer.visitedCount}</dd>
              </dl>
            </Card>
            <Card title="الإسناد">
              <dl className="dl">
                <dt>المندوب</dt><dd>{rep?.name ?? "—"}</dd>
                <dt>المشرف</dt><dd>{supervisor?.name ?? "—"}</dd>
                <dt>المنطقة</dt><dd>{territory?.name ?? "—"}</dd>
                <dt>الفرع</dt><dd>{territory ? territories.find((t) => t.id === territory.id)?.branchId === "b-01" ? "الفرع الرئيسي — الرياض" : "فرع جدة" : "—"}</dd>
              </dl>
            </Card>
            <Card title="أحدث النشاط">
              <div className="stack-sm">
                {customerVisits.slice(0, 4).map((v) => (
                  <div key={v.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                    <div>
                      <b style={{ fontSize: "var(--font-size-sm)" }}>{formatDateShort(v.date)}</b>
                      <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}> · {v.checkInAt ?? "—"} إلى {v.checkOutAt ?? "—"}</span>
                      <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{v.outcome ?? v.notes}</div>
                    </div>
                    <Badge tone="neutral">{visitResultLabels[v.result]}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="stack">
            <Card title="الوضع المالي">
              <div className="stack-sm">
                <div className="flex-between">
                  <span className="muted">الرصيد الحالي</span>
                  <b className="num" style={{ color: (customerBalance?.balance ?? 0) > 0 ? "var(--color-warning)" : "var(--color-success)" }}>{formatMoney((customerBalance?.balance ?? 0))}</b>
                </div>
                <div className="flex-between">
                  <span className="muted">الحد الائتماني</span>
                  <b className="num">{formatMoney(customer.creditLimit)}</b>
                </div>
                <div>
                  <div className="flex-between mb-2">
                    <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>استهلاك الحد</span>
                    <span className="num" style={{ fontWeight: 600 }}>{creditUsage}%</span>
                  </div>
                  <div className="progress" style={{ width: "100%" }}>
                    <div style={{ width: `${Math.min(creditUsage, 100)}%`, background: creditUsage >= 90 ? "var(--color-danger)" : creditUsage >= 70 ? "var(--color-warning)" : "var(--color-success)" }} />
                  </div>
                </div>
                {(customerBalance?.balance ?? 0) > customer.creditLimit && (
                  <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: "var(--font-size-sm)" }}>الرصيد يتجاوز الحد الائتماني — العمليات الآجلة تتطلب موافقة</span>
                  </div>
                )}
              </div>
            </Card>
            <Card title="المبيعات مقابل التحصيل" subtitle="كل الفترات">
              <div className="stack-sm">
                <div className="flex-between">
                  <span className="muted">إجمالي المبيعات</span>
                  <b className="num">{formatMoney(totalSales)}</b>
                </div>
                <div className="flex-between">
                  <span className="muted">إجمالي التحصيل</span>
                  <b className="num">{formatMoney(totalCollections)}</b>
                </div>
                <div className="flex-between">
                  <span className="muted">صافي الذمم</span>
                  <b className="num">{formatMoney((customerBalance?.balance ?? 0))}</b>
                </div>
              </div>
            </Card>
            {customer.notes && (
              <Card title="ملاحظات">
                <p className="muted" style={{ fontSize: "var(--font-size-sm)" }}>{customer.notes}</p>
              </Card>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "sales",
      label: "المبيعات",
      count: sales.length,
      content: <SalesHistory customer={customer} sales={sales} balance={customerBalance?.balance ?? 0} />,
    },
    {
      key: "collections",
      label: "التحصيل",
      count: customerCollections.length,
      content: <CollectionsHistory collections={customerCollections} />,
    },
    {
      key: "visits",
      label: "الزيارات",
      count: customerVisits.length,
      content: <VisitsHistory visits={customerVisits} />,
    },
    {
      key: "returns",
      label: "المرتجعات",
      count: customerReturns.length,
      content: <ReturnsHistory returns={customerReturns} />,
    },
    {
      key: "activity",
      label: "سجل النشاط",
      content: <AuditHistory customer={customer} />,
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "العملاء", path: "/customers" }, { label: customer.name }]}
        title={customer.name}
        description={`${customer.code} · ${customerTypeLabels[customer.type]} · ${territory?.name ?? ""}`}
        actions={
          <>
            <Link to={`/rep/visit/${customer.id}`} className="btn btn-secondary" style={{ textDecoration: "none" }}>
              <Navigation size={15} /> زيارة
            </Link>
            <Link to="/collections" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              <HandCoins size={15} /> تحصيل
            </Link>
            <Link to={`/sales/new?customer=${customer.id}`} className="btn btn-primary" style={{ textDecoration: "none" }}>
              <Plus size={15} /> عملية بيع جديدة
            </Link>
          </>
        }
      />

      <div className="customer-hero">
        <div className="hero-main">
          <Avatar name={customer.name} size="lg" />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "var(--font-size-xl)" }}>{customer.name}</h2>
              <StatusBadge status={customer.status} />
              {customer.targetFlag && <Badge tone="primary">عميل مستهدف</Badge>}
            </div>
            <div className="muted" style={{ fontSize: "var(--font-size-sm)", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Phone size={12} /> <span className="num" style={{ direction: "ltr" }}>{customer.phone}</span></span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {customer.address}</span>
              <span className="faint">المندوب: {rep?.name}</span>
            </div>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span className="hs-label">الرصيد</span><span className="hs-value num" style={{ color: (customerBalance?.balance ?? 0) > 0 ? "var(--color-warning)" : "var(--color-success)" }}>{formatMoney((customerBalance?.balance ?? 0))}</span></div>
          <div className="hero-stat"><span className="hs-label">الحد الائتماني</span><span className="hs-value num">{formatMoney(customer.creditLimit)}</span></div>
          <div className="hero-stat"><span className="hs-label">إجمالي المبيعات</span><span className="hs-value num">{formatMoney(totalSales)}</span></div>
          <div className="hero-stat"><span className="hs-label">الزيارات</span><span className="hs-value num">{formatNumber(customer.visitedCount)}</span></div>
        </div>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
    </div>
  );
}

function SalesHistory({ sales, customer, balance }: { sales: ReturnType<typeof invoicesByCustomer>; customer: Customer; balance: number }) {
  return (
    <Card title="فواتير العميل" subtitle={`${formatNumber(sales.length)} فاتورة`} actions={<Link to="/sales" style={{ fontSize: "var(--font-size-sm)" }}>كل المبيعات ←</Link>}>
      <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-priority-primary">الفاتورة</th>
              <th className="col-priority-primary">التاريخ</th>
              <th className="col-priority-secondary">النوع</th>
              <th className="numeric col-priority-primary">الإجمالي</th>
              <th className="numeric col-priority-secondary">المدفوع</th>
              <th className="numeric col-priority-secondary">المتبقي</th>
              <th className="col-priority-primary">حالة الدفع</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((i) => (
              <tr key={i.id}>
                <td><Link to={`/sales/${i.id}`} className="num" style={{ fontWeight: 600 }}>{i.invoiceNumber}</Link></td>
                <td className="num">{formatDateShort(i.date)}</td>
                <td>{i.type === "cash" ? "نقدي" : "آجل"}</td>
                <td className="numeric num">{formatMoney(i.net)}</td>
                <td className="numeric num">{formatMoney(i.paid)}</td>
                <td className="numeric num" style={{ color: i.net - i.paid > 0 ? "var(--color-warning)" : "inherit" }}>{formatMoney(i.net - i.paid)}</td>
                <td><StatusBadge status={i.paymentStatus} /></td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-faint)" }}>لا توجد فواتير لهذا العميل</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card-footer flex-between">
        <span className="muted">إجمالي فواتير مكتملة: {formatMoney(sales.filter((s) => s.status === "completed").reduce((s, i) => s + i.net, 0))}</span>
        <span className="muted">الرصيد المستحق لصالحنا: {formatMoney(balance)}</span>
      </div>
    </Card>
  );
}

function CollectionsHistory({ collections: list }: { collections: typeof collections }) {
  return (
    <Card title="سندات القبض">
      <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-priority-primary">السند</th>
              <th className="col-priority-primary">التاريخ</th>
              <th className="col-priority-secondary">طريقة الدفع</th>
              <th className="numeric col-priority-primary">المبلغ</th>
              <th className="col-priority-secondary">المندوب</th>
              <th className="col-priority-primary">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td className="num" style={{ fontWeight: 600 }}>{c.number}</td>
                <td className="num">{formatDateShort(c.date)}</td>
                <td>{{ cash: "نقدي", transfer: "تحويل", pos: "POS", check: "شيك" }[c.method]}</td>
                <td className="numeric num" style={{ fontWeight: 600, color: "var(--color-success)" }}>{formatMoney(c.amount)}</td>
                <td>{users.find((u) => u.id === c.repId)?.name ?? "—"}</td>
                <td><StatusBadge status={c.status} /></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-faint)" }}>لا توجد سندات قبض</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function VisitsHistory({ visits: list }: { visits: ReturnType<typeof visitsByCustomer> }) {
  return (
    <Card title="سجل الزيارات">
      <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-priority-primary">التاريخ</th>
              <th className="col-priority-primary">الوقت</th>
              <th className="col-priority-secondary">مخطط</th>
              <th className="col-priority-primary">النتيجة</th>
              <th className="col-priority-secondary">الناتج</th>
              <th className="col-priority-optional">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id}>
                <td className="num">{formatDateShort(v.date)}</td>
                <td className="num">{v.checkInAt ?? "—"} – {v.checkOutAt ?? "—"}</td>
                <td>{v.planned ? <Badge tone="info">مخطط</Badge> : <Badge tone="warning">إضافية</Badge>}</td>
                <td><Badge tone={v.result === "completed" ? "success" : v.result === "not_found" ? "danger" : "neutral"}>{visitResultLabels[v.result]}</Badge></td>
                <td className="muted">{v.outcome ?? "—"}</td>
                <td className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{v.notes ?? "—"}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-faint)" }}>لا توجد زيارات مسجلة</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ReturnsHistory({ returns: list }: { returns: typeof returns }) {
  return (
    <Card title="المرتجعات">
      <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-priority-primary">المرتجع</th>
              <th className="col-priority-primary">التاريخ</th>
              <th className="col-priority-secondary">الفاتورة المرجعية</th>
              <th className="col-priority-primary">الحالة</th>
              <th className="numeric col-priority-primary">القيمة</th>
              <th className="col-priority-secondary">السبب</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td className="num" style={{ fontWeight: 600 }}>{r.number}</td>
                <td className="num">{formatDateShort(r.date)}</td>
                <td className="num">{invoicesByCustomer(r.customerId).find((i) => i.id === r.invoiceId)?.invoiceNumber ?? r.invoiceId}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="numeric num">{formatMoney(r.totalAmount)}</td>
                <td className="muted" style={{ fontSize: "var(--font-size-sm)" }}>{r.reason}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-faint)" }}>لا توجد مرتجعات</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AuditHistory({ customer }: { customer: Customer }) {
  const logs = auditLogs.filter((l) => l.entity === "Customer" && l.entityId === customer.id);
  return (
    <Card title="سجل التدقيق" subtitle="تغييرات حساسة على ملف العميل">
      {logs.length === 0 ? (
        <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد عمليات تدقيق مسجلة لهذا العميل</div>
      ) : (
        <div className="timeline">
          {logs.map((l) => (
            <div key={l.id} className="timeline-item">
              <div className="timeline-rail">
                <span className="timeline-dot done" />
                <span className="timeline-line" />
              </div>
              <div className="timeline-content">
                <div className="timeline-title">{l.action} — {l.entity}</div>
                <div className="timeline-meta">
                  <span>{l.actor}</span>
                  <span>{formatDate(l.at.slice(0, 10))}</span>
                </div>
                {l.reason && <div className="timeline-note">{l.reason}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}