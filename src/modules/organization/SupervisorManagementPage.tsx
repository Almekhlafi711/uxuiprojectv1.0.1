import { useState, useMemo } from "react";
import { UserCog, MapPin, Users, Building2, Eye } from "lucide-react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Drawer } from "@/components/ui/Drawer";
import { DataTable } from "@/components/data-table/DataTable";
import type { Column } from "@/components/data-table/DataTable";
import { useAuthStore } from "@/store/auth";
import { can } from "@/config/permissions";
import { supervisors } from "@/mock/users";
import { territories, teams, branches } from "@/mock/organization";
import { customers } from "@/mock/customers";
import type { User } from "@/types";

type EnrichedSup = User & { supTerritories: typeof territories; supTeams: typeof teams; repCount: number; customerCount: number };

export function SupervisorManagementPage() {
  const { user } = useAuthStore();
  const canManage = can("organization.manage", user?.role ?? "GENERAL_MANAGER");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<EnrichedSup | null>(null);

  const enriched = useMemo<EnrichedSup[]>(() => {
    return supervisors.map(s => {
      const supTerritories = territories.filter(t => t.supervisorId === s.id);
      const supTeams = teams.filter(t => t.supervisorId === s.id);
      const repCount = supTerritories.reduce((sum, t) => sum + t.repIds.length, 0);
      const customerCount = customers.filter(c => c.supervisorId === s.id).length;
      return { ...s, supTerritories, supTeams, repCount, customerCount };
    });
  }, []);

  const filtered = useMemo(() => {
    let list = [...enriched];
    if (branchFilter !== "all") list = list.filter(s => s.branchId === branchFilter);
    if (statusFilter !== "all") list = list.filter(s => s.status === statusFilter);
    return list;
  }, [enriched, branchFilter, statusFilter]);

  const activeCount = supervisors.filter(s => s.status === "active").length;
  const totalReps = enriched.reduce((sum, s) => sum + s.repCount, 0);
  const totalCustomers = enriched.reduce((sum, s) => sum + s.customerCount, 0);

  const columns: Column<EnrichedSup>[] = [
    {
      key: "name", header: "المشرف",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--section-field)] bg-opacity-10 flex items-center justify-center">
            <UserCog size={14} style={{ color: "var(--section-field)" }} />
          </div>
          <div>
            <div className="font-medium text-sm">{r.name}</div>
            <div className="text-xs muted">{r.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "supTerritories", header: "المناطق",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.supTerritories.map(t => <Badge key={t.id} tone="info">{t.name}</Badge>)}
        </div>
      ),
    },
    { key: "repCount", header: "المندوبون", render: (r) => <Badge tone="info">{r.repCount}</Badge> },
    { key: "customerCount", header: "العملاء", render: (r) => <Badge tone="success">{r.customerCount}</Badge> },
    {
      key: "status", header: "الحالة",
      render: (r) => <Badge tone={r.status === "active" ? "success" : "danger"}>{r.status === "active" ? "نشط" : "معلّق"}</Badge>,
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المبيعات والتوزيع", path: "/customers" }, { label: "إدارة الهيكل والتوزيع", path: "/organization/dashboard" }, { label: "المشرفون" }]}
        title="إدارة المشرفين"
        description="عرض وإدارة المشرفين وفرقهم"
      />

      <div className="grid-4 mb-6">
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-field)" }}>{activeCount}</div>
          <div className="text-sm muted">المشرفون النشطون</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-sales)" }}>{totalReps}</div>
          <div className="text-sm muted">إجمالي المندوبين</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-inventory)" }}>{totalCustomers}</div>
          <div className="text-sm muted">إجمالي العملاء</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{teams.length}</div>
          <div className="text-sm muted">الفرق</div>
        </Card>
      </div>

      <Card>
        <FilterBar>
          <Select label="الفرع" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
            options={[{ value: "all", label: "جميع الفروع" }, ...branches.map(b => ({ value: b.id, label: b.name }))]} />
          <Select label="الحالة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: "all", label: "الجميع" }, { value: "active", label: "نشط" }, { value: "suspended", label: "معلّق" }]} />
        </FilterBar>
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} searchable searchPlaceholder="بحث بالاسم..."
          searchKeys={(r) => `${r.name} ${r.supTerritories.map(t => t.name).join(" ")}`} onRowClick={(r) => setSelected(r)} pageSize={10} />
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={`تفاصيل المشرف — ${selected?.name ?? ""}`} width="480px">
        {selected && (
          <div className="stack">
            <div className="form-grid">
              <div className="field-span-6">
                <label className="form-label">المشرف</label>
                <div className="font-medium">{selected.name}</div>
                <div className="text-xs muted">{selected.id}</div>
              </div>
              <div className="field-span-6">
                <label className="form-label">الحالة</label>
                <Badge tone={selected.status === "active" ? "success" : "danger"}>{selected.status === "active" ? "نشط" : "معلّق"}</Badge>
              </div>
              <div className="field-span-12">
                <label className="form-label">المناطق</label>
                <div className="flex flex-wrap gap-1">
                  {selected.supTerritories.map(t => <Badge key={t.id} tone="info">{t.name}</Badge>)}
                </div>
              </div>
              <div className="field-span-12">
                <label className="form-label">الفرق</label>
                <div className="flex flex-wrap gap-1">
                  {selected.supTeams.map(t => <Badge key={t.id} tone="neutral">{t.name}</Badge>)}
                </div>
              </div>
              <div className="field-span-6">
                <label className="form-label">عدد المندوبين</label>
                <Badge tone="info">{selected.repCount}</Badge>
              </div>
              <div className="field-span-6">
                <label className="form-label">عدد العملاء</label>
                <Badge tone="success">{selected.customerCount}</Badge>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
