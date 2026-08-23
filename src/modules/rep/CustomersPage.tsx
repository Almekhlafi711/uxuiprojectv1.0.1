import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Search, Filter, MapPin, Phone, Building2, AlertTriangle, ShieldCheck, TrendingUp, DollarSign, ArrowLeft, ShoppingCart } from "lucide-react";
import { customers } from "@/mock/customers";
import { invoices } from "@/mock/sales";
import { collections } from "@/mock/collections";
import { returnsByRep } from "@/mock/returns";
import { visitsByCustomer } from "@/mock/visits";
import { useAuthStore } from "@/store/auth";
import { getDataScope, canAccessCustomer } from "@/services/scope";
import { getCustomerBalance, getAllCustomerBalances } from "@/services/ledger";
import { repPolicies } from "@/config/repPolicies";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Breadcrumbs } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input, Select } from "@/components/ui/FormControls";
import { EmptyState } from "@/components/ui/States";
import { formatMoney, formatDateShort, formatNumber } from "@/utils/format";
import { toast } from "@/store/ui";
import type { Customer } from "@/types";

const typeLabels: Record<Customer["type"], string> = {
  retailer: "تموينات",
  wholesaler: "موزع جملة",
  supermarket: "سوبر ماركت",
  restaurant: "مطعم/كافيه",
  kiosk: "كشك",
};

export function CustomersPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const scope = getDataScope(user);
  const myCustomers = useMemo(() => scope ? customers.filter((c) => canAccessCustomer(scope, c)) : [], [scope]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<keyof Customer | "balance" | "visits">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let rows = myCustomers;
    if (search) rows = rows.filter((c) => c.name.includes(search) || c.code.includes(search) || c.phone.includes(search));
    if (typeFilter) rows = rows.filter((c) => c.type === typeFilter);
    if (statusFilter) rows = rows.filter((c) => c.status === statusFilter);
    rows = [...rows].sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [myCustomers, search, typeFilter, statusFilter, sortKey, sortDir]);

  const balances = useMemo(() => new Map(getAllCustomerBalances().map((b) => [b.customerId, b.balance])), []);

  const columns: Column<Customer>[] = [
    { key: "code", header: "الرقم", sortable: true, sortValue: (r) => r.code, priority: "primary", render: (r) => <b className="num">{r.code}</b> },
    { key: "name", header: "المنشأة", sortable: true, sortValue: (r) => r.name, priority: "primary", render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Building2 size={16} />
        <div>
          <b style={{ fontSize: "var(--font-size-sm)" }}>{r.name}</b>
          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{typeLabels[r.type]} · {r.territoryId}</div>
        </div>
      </div>
    ) },
    { key: "contact", header: "جهة الاتصال", priority: "secondary", render: (r) => r.contactPerson ? (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: "var(--font-size-sm)" }}>{r.contactPerson.name}</span>
        <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.contactPerson.jobTitle}</span>
      </div>
    ) : "—" },
    { key: "phone", header: "الهاتف", priority: "secondary", render: (r) => <span className="num" style={{ direction: "ltr" }}>{r.phone}</span> },
    { key: "balance", header: "الرصيد", numeric: true, sortable: true, sortValue: (r) => balances.get(r.id) ?? 0, priority: "primary", render: (r) => {
      const b = balances.get(r.id) ?? 0;
      return (
      <span className="num" style={{ fontWeight: 600, color: b > r.creditLimit ? "var(--color-danger)" : b > r.creditLimit * 0.9 ? "var(--color-warning)" : "var(--color-text)" }}>{formatMoney(b)}</span>
      );
    }},
    { key: "creditLimit", header: "الحد الائتماني", numeric: true, sortable: true, sortValue: (r) => r.creditLimit, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.creditLimit)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "إجراء", priority: "primary", render: (r) => (
      <span style={{ display: "inline-flex", gap: 6 }}>
        <Button size="sm" variant="ghost" icon={<MapPin size={13} />} onClick={() => navigate(`/rep/customer/${r.id}`)}>ملف العميل</Button>
        <Button size="sm" variant="primary" icon={<ShoppingCart size={13} />} onClick={() => navigate("/sales/new", { state: { customerId: r.id } })}>بيع</Button>
      </span>
    ) },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "العملاء" }]}
        title="عملائي"
        description={`${filtered.length} عميل ضمن نطاقك`}
        actions={
          <Button variant="secondary" onClick={() => navigate("/rep/plan")} icon={<ArrowLeft size={15} />}>العودة للخطة</Button>
        }
      >
        <FilterBar>
          <Input label="البحث" placeholder="اسم، رقم، هاتف..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
          <Select label="النوع" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} placeholder="الكل" options={[
            { value: "retailer", label: "تموينات" },
            { value: "wholesaler", label: "موزع جملة" },
            { value: "supermarket", label: "سوبر ماركت" },
            { value: "restaurant", label: "مطعم/كافيه" },
            { value: "kiosk", label: "كشك" },
          ]} />
          <Select label="الحالة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="الكل" options={[
            { value: "active", label: "نشط" },
            { value: "overdue", label: "متأخر" },
            { value: "suspended", label: "موقوف" },
            { value: "inactive", label: "غير نشط" },
          ]} />
        </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        searchPlaceholder="بحث سريع..."
        searchKeys={(r) => `${r.name} ${r.code} ${r.phone}`}
        exportFilename="my-customers"
        pageSize={12}
        emptyTitle="لا يوجد عملاء"
        emptyDescription="لا توجد عملاء مسندون إليك حالياً."
      />
    </div>
  );
}

export function Customer360Page() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const scope = getDataScope(user);
  const customer = customers.find((c) => c.id === id);
  const denied = !!customer && !!scope && !canAccessCustomer(scope, customer);

  if (denied || !customer) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "العملاء", path: "/rep/customers" }, { label: "غير موجود" }]} />
        <EmptyState
          title={denied ? "غير مصرح" : "العميل غير موجود"}
          description={denied ? "هذا العميل خارج نطاقك المسموح." : "لم يتم العثور على العميل."}
          action={<Button variant="primary" onClick={() => navigate("/rep/customers")}>عودة للعملاء</Button>}
        />
      </div>
    );
  }

  const myInvoices = invoices.filter((i) => i.customerId === customer.id && i.repId === user!.id);
  const myCollections = collections.filter((c) => c.customerId === customer.id && c.repId === user!.id);
  const myReturns = returnsByRep(user!.id).filter((r) => r.customerId === customer.id);
  const myVisits = visitsByCustomer(customer.id).filter((v) => v.repId === user!.id);

  const totalSales = myInvoices.reduce((s, i) => s + i.net, 0);
  const totalCollected = myCollections.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0);
  const totalReturns = myReturns.reduce((s, r) => s + r.totalAmount, 0);
  const outstanding = myInvoices.filter((i) => i.paymentStatus !== "paid").reduce((s, i) => s + (i.net - i.paid), 0);
  const customerBalance = getCustomerBalance(customer.id);
  const balance = customerBalance.balance;
  const creditPct = customer.creditLimit > 0 ? (balance / customer.creditLimit) * 100 : 0;

  const creditDanger = balance >= customer.creditLimit;
  const creditWarn = !creditDanger && creditPct >= repPolicies.credit.warnAtPercent;

  const recentActivity = useMemo(() => {
    const acts: { date: string; type: string; desc: string; amount?: number; ref?: string }[] = [];
    myInvoices.slice(0, 5).forEach((i) => acts.push({ date: i.date, type: "sale", desc: `فاتورة ${i.invoiceNumber}`, amount: i.net, ref: i.id }));
    myCollections.slice(0, 5).forEach((c) => acts.push({ date: c.date, type: "collection", desc: `سند ${c.number}`, amount: c.amount, ref: c.id }));
    myReturns.slice(0, 5).forEach((r) => acts.push({ date: r.date, type: "return", desc: `مرتجع ${r.number}`, amount: r.totalAmount, ref: r.id }));
    myVisits.slice(0, 5).forEach((v) => acts.push({ date: v.date, type: "visit", desc: `زيارة - ${v.outcome}`, ref: v.id }));
    return acts.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [myInvoices, myCollections, myReturns, myVisits]);

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "العملاء", path: "/rep/customers" }, { label: customer.name }]}
        title={customer.name}
        description={`${customer.code} · ${typeLabels[customer.type]} · ${customer.address}`}
        actions={
          <Button variant="secondary" onClick={() => navigate("/rep/customers")} icon={<ArrowLeft size={15} />}>عودة</Button>
        }
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
           <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الرصيد الحالي</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: creditDanger ? "var(--color-danger)" : creditWarn ? "var(--color-warning)" : "var(--color-text)" }}>{formatMoney(balance)}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>من حد {formatMoney(customer.creditLimit)} ({creditPct.toFixed(0)}%)</div></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مبيعات إجمالية</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatMoney(totalSales)}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>{myInvoices.length} فاتورة</div></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تحصيلات معتمدة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{formatMoney(totalCollected)}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>{myCollections.filter((c) => c.status === "approved").length} سند</div></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مستحق غير محصل</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{formatMoney(outstanding)}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مرتجعات</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatMoney(totalReturns)}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>{myReturns.length} مرتجع</div></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الزيارات</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{myVisits.length}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>مكتملة: {myVisits.filter((v) => v.result === "completed").length}</div></div></Card>
        </div>
      </StickyPageHeader>

      {creditDanger && (
        <div className="alert alert-danger" style={{ marginBottom: "var(--space-4)" }}>
          <ShieldCheck size={18} style={{ color: "var(--color-danger)" }} />
          <div>
            <div className="alert-title">الحد الائتماني مستنفد — البيع الآجل محظور</div>
            <div>الرصيد {formatMoney(balance)} تجاوز الحد {formatMoney(customer.creditLimit)}. يسمح بالبيع النقدي فقط أو تحصيل أولاً.</div>
          </div>
        </div>
      )}
      {creditWarn && !creditDanger && (
        <div className="alert alert-warning" style={{ marginBottom: "var(--space-4)" }}>
          <AlertTriangle size={18} />
          <div>
            <div className="alert-title">تجاوز 90% من الحد الائتماني</div>
            <div>الرصيد {formatMoney(balance)} ({creditPct.toFixed(0)}%). يرجى التحصيل قبل البيع الآجل.</div>
          </div>
        </div>
      )}

      <div className="grid-2-1">
        <div className="stack">
          <Card title="بيانات المنشأة (B2B)">
            <div className="card-body info-grid">
              {customer.legalName && <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الاسم القانوني</span><b style={{ fontSize: "var(--font-size-sm)" }}>{customer.legalName}</b></div>}
              {customer.commercialReg && <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>السجل التجاري</span><b className="num" style={{ fontSize: "var(--font-size-sm)", direction: "ltr" }}>{customer.commercialReg}</b></div>}
              {customer.taxNumber && <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الرقم الضريبي</span><b className="num" style={{ fontSize: "var(--font-size-sm)", direction: "ltr" }}>{customer.taxNumber}</b></div>}
              {customer.sector && <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>القطاع</span><b style={{ fontSize: "var(--font-size-sm)" }}>{customer.sector}</b></div>}
              {customer.city && <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>المدينة</span><b style={{ fontSize: "var(--font-size-sm)" }}>{customer.city}</b></div>}
              {customer.email && <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>البريد الإلكتروني</span><span className="num" style={{ fontSize: "var(--font-size-sm)", direction: "ltr" }}>{customer.email}</span></div>}
              <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>شروط الدفع</span><Badge tone={customer.paymentTerms === "cash" ? "success" : "info"}>{customer.paymentTerms === "cash" ? "نقدي" : `آجل ${customer.paymentTerms.replace("credit_", "")} يوم`}</Badge></div>
              <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>آخر زيارة</span><b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{customer.lastVisitAt ? formatDateShort(customer.lastVisitAt) : "—"}</b></div>
              <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>عدد الزيارات</span><b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{customer.visitedCount}</b></div>
            </div>
          </Card>

          {customer.contactPerson && (
            <Card title="جهة الاتصال">
              <div className="card-body info-grid">
                <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الاسم</span><b style={{ fontSize: "var(--font-size-sm)" }}>{customer.contactPerson.name}</b></div>
                <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>المسمى</span><span style={{ fontSize: "var(--font-size-sm)" }}>{customer.contactPerson.jobTitle}</span></div>
                <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الجوال</span><span className="num" style={{ fontSize: "var(--font-size-sm)", direction: "ltr" }}>{customer.contactPerson.phone}</span></div>
                {customer.contactPerson.email && <div><span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>البريد</span><span className="num" style={{ fontSize: "var(--font-size-sm)", direction: "ltr" }}>{customer.contactPerson.email}</span></div>}
              </div>
            </Card>
          )}

          <Card title="سجل النشاط الأخير" subtitle={`${recentActivity.length} عملية`}>
            <div className="card-body">
              {recentActivity.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد أنشطة مسجلة</div>
              ) : (
                <div className="stack-sm">
                  {recentActivity.map((a) => (
                    <div key={a.ref} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {a.type === "sale" && <TrendingUp size={14} style={{ color: "var(--color-primary)" }} />}
                        {a.type === "collection" && <DollarSign size={14} style={{ color: "var(--color-success)" }} />}
                        {a.type === "return" && <ArrowLeft size={14} style={{ color: "var(--color-warning)" }} />}
                        {a.type === "visit" && <MapPin size={14} style={{ color: "var(--color-info)" }} />}
                        <div>
                          <b style={{ fontSize: "var(--font-size-sm)" }}>{a.desc}</b>
                          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{formatDateShort(a.date)}</div>
                        </div>
                      </div>
                      {a.amount && <b className="num" style={{ fontSize: "var(--font-size-sm)", color: a.type === "collection" ? "var(--color-success)" : a.type === "return" ? "var(--color-warning)" : "var(--color-primary)" }}>{formatMoney(a.amount)}</b>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title="الفواتير" subtitle={`${myInvoices.length} فاتورة · مستحق ${formatMoney(outstanding)}`}>
            <div className="card-body">
              {myInvoices.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد فواتير</div>
              ) : (
                <div className="stack-sm">
                  {myInvoices.slice(0, 10).map((inv) => (
                    <div key={inv.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 6 }}>
                      <div>
                        <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{inv.invoiceNumber}</b>
                        <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{formatDateShort(inv.date)} · {inv.type === "cash" ? "نقدي" : "آجل"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatMoney(inv.net)}</b>
                        <StatusBadge status={inv.paymentStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card title="التحصيلات" subtitle={`${myCollections.filter((c) => c.status === "approved").length} معتمدة`}>
            <div className="card-body">
              {myCollections.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد تحصيلات</div>
              ) : (
                <div className="stack-sm">
                  {myCollections.slice(0, 10).map((col) => (
                    <div key={col.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 6 }}>
                      <div>
                        <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{col.number}</b>
                        <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{formatDateShort(col.date)} · {col.method === "cash" ? "نقدي" : col.method === "transfer" ? "تحويل" : "POS"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <b className="num" style={{ fontSize: "var(--font-size-sm)", color: "var(--color-success)" }}>{formatMoney(col.amount)}</b>
                        <StatusBadge status={col.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card title="المرتجعات" subtitle={`${myReturns.length} مرتجع`}>
            <div className="card-body">
              {myReturns.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد مرتجعات</div>
              ) : (
                <div className="stack-sm">
                  {myReturns.slice(0, 10).map((ret) => (
                    <div key={ret.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 6 }}>
                      <div>
                        <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{ret.number}</b>
                        <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{formatDateShort(ret.date)} · {ret.condition === "good" ? "سليم" : "تالف"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatMoney(ret.totalAmount)}</b>
                        <StatusBadge status={ret.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card title="الزيارات" subtitle={`${myVisits.length} زيارة · {myVisits.filter((v) => v.result === "completed").length} مكتملة`}>
            <div className="card-body">
              {myVisits.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد زيارات</div>
              ) : (
                <div className="stack-sm">
                  {myVisits.slice(0, 10).map((v) => (
                    <div key={v.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 6 }}>
                      <div>
                        <b style={{ fontSize: "var(--font-size-sm)" }}>{formatDateShort(v.date)}</b>
                        <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{v.checkInAt ? `دخول ${v.checkInAt}` : "—"} {v.checkOutAt ? `· خروج ${v.checkOutAt}` : ""}</div>
                      </div>
                      <Badge tone={v.result === "completed" ? "success" : v.result === "not_found" || v.result === "closed" ? "warning" : "info"} dot>{v.outcome}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}