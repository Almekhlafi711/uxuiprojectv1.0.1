import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, UserPlus, Edit3 } from "lucide-react";
import { customers, customerTypeLabels } from "@/mock/customers";
import { users } from "@/mock/users";
import { territories } from "@/mock/organization";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input, SearchableSelect } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { CustomerForm } from "./CustomerForm";
import { formatMoney, formatNumber, formatDateShort } from "@/utils/format";
import { can } from "@/config/permissions";
import { useAuthStore } from "@/store/auth";
import { getDataScope, canAccessTerritory, visibleUsers } from "@/services/scope";
import type { Customer } from "@/types";
import { getAllCustomerBalances } from "@/services/ledger";

export function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.customers.list());

  const [territoryFilter, setTerritoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [repFilter, setRepFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const scope = getDataScope(user);
  const isRep = user?.role === "REPRESENTATIVE";
  const visibleReps = scope ? visibleUsers(scope).filter((u) => u.role === "REPRESENTATIVE") : [];
  const visibleTerritories = scope ? territories.filter((t) => canAccessTerritory(scope, t)) : territories;

  const balanceMap = new Map(getAllCustomerBalances().map((b) => [b.customerId, b.balance]));

  const repName = (id?: string) => users.find((u) => u.id === id)?.name ?? "—";
  const territoryName = (id?: string) => territories.find((t) => t.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((c) => {
      if (territoryFilter && c.territoryId !== territoryFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (repFilter && c.repId !== repFilter) return false;
      if (typeFilter && c.type !== typeFilter) return false;
      if (dateFrom && c.lastVisitAt && c.lastVisitAt < dateFrom) return false;
      if (dateTo && c.lastVisitAt && c.lastVisitAt > dateTo) return false;
      return true;
    });
  }, [data, territoryFilter, statusFilter, repFilter, typeFilter, dateFrom, dateTo]);

  const canCreate = can("customers.create", user?.role ?? "REPRESENTATIVE");

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "العميل",
      sortable: true,
      sortValue: (r) => r.name,
      priority: "primary",
      render: (r) => (
        <Link to={`/customers/${r.id}`} style={{ fontWeight: 600, color: "var(--color-text)" }} onClick={(e) => e.stopPropagation()}>
          {r.name}
        </Link>
      ),
    },
    { key: "territory", header: "المنطقة", sortable: true, sortValue: (r) => territoryName(r.territoryId), priority: "secondary", render: (r) => <span className="muted">{territoryName(r.territoryId)}</span> },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => repName(r.repId), priority: "secondary", render: (r) => repName(r.repId) },
    { key: "phone", header: "الهاتف", priority: "optional", render: (r) => <span className="num" style={{ direction: "ltr", display: "inline-block" }}>{r.phone}</span> },
    { key: "type", header: "النوع", sortable: true, sortValue: (r) => customerTypeLabels[r.type], priority: "secondary", render: (r) => <Badge tone="neutral">{customerTypeLabels[r.type]}</Badge> },
    { key: "balance", header: "الرصيد", numeric: true, sortable: true, sortValue: (r) => (balanceMap.get(r.id) ?? 0), priority: "primary", render: (r) => { const b = balanceMap.get(r.id) ?? 0; return <span className="num" style={{ fontWeight: 600, color: b > 0 ? (b > r.creditLimit ? "var(--color-danger)" : "var(--color-warning)") : "var(--color-text)" }}>{formatMoney(b)}</span>; } },
    { key: "creditLimit", header: "الحد الائتماني", numeric: true, sortable: true, sortValue: (r) => r.creditLimit, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.creditLimit)}</span> },
    { key: "lastVisit", header: "آخر زيارة", sortable: true, sortValue: (r) => r.lastVisitAt ?? "", priority: "secondary", render: (r) => (r.lastVisitAt ? <span className="num">{formatDateShort(r.lastVisitAt)}</span> : <span className="faint">—</span>) },
    { key: "status", header: "الحالة", sortable: true, sortValue: (r) => r.status, priority: "primary", render: (r) => (
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <StatusBadge status={r.status} />
          {r.targetFlag && <Badge tone="primary">مستهدف</Badge>}
        </span>
      ) },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: isRep ? "عملائي" : "العملاء" }]}
        title={isRep ? "عملائي" : "قائمة العملاء"}
        description={`إجمالي العملاء: ${formatNumber(data?.length ?? 0)} · ${formatNumber(data?.filter((c) => c.status === "active").length ?? 0)} نشط`}
        actions={
          canCreate && (
            <Button variant="primary" onClick={() => setCreateOpen(true)} icon={<UserPlus size={16} />}>
              إضافة عميل جديد
            </Button>
          )
        }
      >

      <FilterBar>
        {isRep ? (
          <>
            <span className="filter-chip">المنطقة: <b>{territoryName(user?.territoryId)}</b></span>
            <span className="filter-chip">المندوب: <b>{repName(user?.id)}</b></span>
          </>
        ) : (
          <>
            <SearchableSelect
              label="المنطقة"
              value={territoryFilter}
              onChange={setTerritoryFilter}
              placeholder="كل المناطق"
              options={visibleTerritories.map((t) => ({ value: t.id, label: t.name }))}
            />
            <SearchableSelect
              label="المندوب"
              value={repFilter}
              onChange={setRepFilter}
              placeholder="كل المناديب"
              options={visibleReps.map((u) => ({ value: u.id, label: u.name }))}
            />
          </>
        )}
        <Select
          label="الحالة"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "active", label: "نشط" },
            { value: "inactive", label: "غير نشط" },
            { value: "overdue", label: "متأخر" },
            { value: "suspended", label: "موقوف" },
            { value: "pending", label: "مستهدف / قيد الانتظار" },
          ]}
          placeholder="كل الحالات"
        />
        <Select
          label="النوع"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={Object.entries(customerTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
          placeholder="كل الأنواع"
        />
        <Input label="آخر زيارة من" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input label="إلى" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        {(territoryFilter || statusFilter || repFilter || typeFilter || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            onClick={() => {
              setTerritoryFilter("");
              setStatusFilter("");
              setRepFilter("");
              setTypeFilter("");
              setDateFrom("");
              setDateTo("");
            }}
          >
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
        searchable
        searchPlaceholder="بحث بالاسم، الرمز، الهاتف..."
        searchKeys={(r) => `${r.name} ${r.code} ${r.phone} ${repName(r.repId)} ${territoryName(r.territoryId)}`}
        onRowClick={(r) => navigate(`/customers/${r.id}`)}
        exportable
        exportFilename="customers"
        pageSize={12}
        toolbarActions={
          <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>
            إجمالي الأرصدة: <b className="num">{formatMoney(filtered.reduce((s, c) => s + (balanceMap.get(c.id) ?? 0), 0))}</b>
          </span>
        }
        emptyTitle="لا يوجد عملاء مطابقون"
        emptyDescription="جرّب تعديل معايير التصفية أو أضف عميلاً جديداً."
      />

      <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="إضافة عميل جديد" width="560px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={() => setCreateOpen(false)}>حفظ العميل</Button>
          </>
        }
      >
        <CustomerForm onSaved={() => { setCreateOpen(false); refetch(); }} />
      </Drawer>
    </div>
  );
}