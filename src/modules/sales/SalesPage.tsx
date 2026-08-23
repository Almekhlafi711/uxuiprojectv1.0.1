import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { invoices } from "@/mock/sales";
import { customers } from "@/mock/customers";
import { users } from "@/mock/users";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { formatMoney, formatDateShort, formatNumber } from "@/utils/format";
import { can } from "@/config/permissions";
import { useAuthStore } from "@/store/auth";
import { getDataScope, visibleUsers } from "@/services/scope";
import { newInvoices } from "@/store/transactions";
import type { Invoice } from "@/types";

export function SalesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.sales.list());

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [repFilter, setRepFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const scope = getDataScope(user);
  const isRep = user?.role === "REPRESENTATIVE";
  const visibleReps = scope ? visibleUsers(scope).filter((u) => u.role === "REPRESENTATIVE") : [];

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";
  const repName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const mockData = data ?? [];
    const txData = newInvoices();
    const all = [...txData, ...mockData.filter((m) => !txData.some((t) => t.id === m.id))];
    return all.filter((i) => {
      if (typeFilter && i.type !== typeFilter) return false;
      if (statusFilter && i.status !== statusFilter) return false;
      if (repFilter && i.repId !== repFilter) return false;
      if (dateFrom && i.date < dateFrom) return false;
      if (dateTo && i.date > dateTo) return false;
      return true;
    });
  }, [data, typeFilter, statusFilter, repFilter, dateFrom, dateTo]);

  const totals = filtered.reduce(
    (acc, i) => {
      acc.total += i.net;
      acc.paid += i.paid;
      return acc;
    },
    { total: 0, paid: 0 }
  );

  const canCreate = can("sales.create", user?.role ?? "REPRESENTATIVE");

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber",
      header: "الفاتورة",
      sortable: true,
      sortValue: (r) => r.number,
      priority: "primary",
      render: (r) => (
        <Link to={`/sales/${r.id}`} style={{ fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
          {r.invoiceNumber}
        </Link>
      ),
    },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    {
      key: "customer",
      header: "العميل",
      sortable: true,
      sortValue: (r) => customerName(r.customerId),
      priority: "primary",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{customerName(r.customerId)}</div>
          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{customers.find((c) => c.id === r.customerId)?.code}</div>
        </div>
      ),
    },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => repName(r.repId), priority: "secondary", render: (r) => repName(r.repId) },
    { key: "type", header: "النوع", priority: "secondary", render: (r) => (r.type === "cash" ? <Badge tone="success">نقدي</Badge> : <Badge tone="warning">آجل</Badge>) },
    { key: "net", header: "الإجمالي", numeric: true, sortable: true, sortValue: (r) => r.net, priority: "primary", render: (r) => <span className="num" style={{ fontWeight: 600 }}>{formatMoney(r.net)}</span> },
    { key: "paid", header: "المدفوع", numeric: true, sortable: true, sortValue: (r) => r.paid, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.paid)}</span> },
    { key: "due", header: "المتبقي", numeric: true, sortable: true, sortValue: (r) => r.net - r.paid, priority: "secondary", render: (r) => <span className="num" style={{ color: r.net - r.paid > 0 ? "var(--color-warning)" : "var(--color-success)" }}>{formatMoney(r.net - r.paid)}</span> },
    { key: "paymentStatus", header: "حالة الدفع", priority: "primary", render: (r) => <StatusBadge status={r.paymentStatus} /> },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المبيعات" }]}
        title="المبيعات والفواتير"
        description={`${formatNumber(filtered.length)} فاتورة · الإجمالي ${formatMoney(totals.total)} · المسدد ${formatMoney(totals.paid)}`}
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => navigate("/sales/new")} icon={<Plus size={15} />}>
              عملية بيع جديدة
            </Button>
          ) : null
        }
      >
        <FilterBar>
          <Select
            label="النوع"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="الكل"
            options={[
              { value: "cash", label: "نقدي" },
              { value: "credit", label: "آجل" },
            ]}
          />
          <Select
            label="حالة الدفع"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="الكل"
            options={[
              { value: "paid", label: "مسدد" },
              { value: "partial", label: "مسدد جزئياً" },
              { value: "unpaid", label: "غير مسدد" },
            ]}
          />
          {isRep ? (
            <span className="filter-chip">المندوب: <b>{repName(user?.id)}</b></span>
          ) : (
            <Select
              label="المندوب"
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              placeholder="الكل"
              options={visibleReps.map((u) => ({ value: u.id, label: u.name }))}
            />
          )}
          <Input label="من تاريخ" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="إلى تاريخ" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          {(typeFilter || statusFilter || repFilter || dateFrom || dateTo) && (
            <Button variant="ghost" onClick={() => { setTypeFilter(""); setStatusFilter(""); setRepFilter(""); setDateFrom(""); setDateTo(""); }}>
              مسح الفلاتر
            </Button>
          )}
        </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث برقم الفاتورة أو العميل..."
        searchKeys={(r) => `${r.invoiceNumber} ${r.number} ${customerName(r.customerId)}`}
        onRowClick={(r) => navigate(`/sales/${r.id}`)}
        exportFilename="sales-invoices"
        pageSize={12}
        emptyTitle="لا توجد فواتير مطابقة"
        toolbarActions={
          <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>
            المبيعات: <b className="num">{formatMoney(totals.total)}</b> · المسدد: <b className="num">{formatMoney(totals.paid)}</b>
          </span>
        }
      />
    </div>
  );
}