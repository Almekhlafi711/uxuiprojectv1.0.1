import { useState, useEffect, useMemo } from "react";
import { Users, MapPin, UserCheck, AlertTriangle, RefreshCw, Eye, UserX, Building2, Shield } from "lucide-react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Drawer } from "@/components/ui/Drawer";
import { DataTable } from "@/components/data-table/DataTable";
import type { Column } from "@/components/data-table/DataTable";
import { useAuthStore } from "@/store/auth";
import { can } from "@/config/permissions";
import { organizationService } from "@/services/organization.service";
import { reps, supervisors } from "@/mock/users";
import { territories, teams, branches } from "@/mock/organization";
import { customers } from "@/mock/customers";
import type { RepresentativeAssignment } from "@/types";
import { formatDate } from "@/utils/format";

export function RepManagementPage() {
  const { user } = useAuthStore();
  const canManage = can("organization.manage", user?.role ?? "GENERAL_MANAGER");
  const [assignments, setAssignments] = useState<RepresentativeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRep, setSelectedRep] = useState<RepresentativeAssignment | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await organizationService.getRepAssignments();
      setAssignments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = [...assignments];
    if (territoryFilter !== "all") list = list.filter(a => a.territoryId === territoryFilter);
    if (statusFilter !== "all") list = list.filter(a => a.status === statusFilter);
    return list;
  }, [assignments, territoryFilter, statusFilter]);

  const activeReps = assignments.filter(a => a.status === "active");
  const suspendedReps = assignments.filter(a => a.status === "released");
  const repsWithoutTerritory = reps.filter(r => !activeReps.some(a => a.repId === r.id));

  const columns: Column<RepresentativeAssignment>[] = [
    {
      key: "repName", header: "المندوب",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--section-sales)] bg-opacity-10 flex items-center justify-center">
            <Users size={14} style={{ color: "var(--section-sales)" }} />
          </div>
          <div>
            <div className="font-medium text-sm">{r.repName}</div>
            <div className="text-xs muted">{r.repId}</div>
          </div>
        </div>
      ),
    },
    {
      key: "territoryName", header: "المنطقة",
      render: (r) => (
        <div className="flex items-center gap-1">
          <MapPin size={12} style={{ color: "var(--section-field)" }} />
          <span className="text-sm">{r.territoryName}</span>
        </div>
      ),
    },
    {
      key: "supervisorName", header: "المشرف",
      render: (r) => <span className="text-sm">{r.supervisorName}</span>,
    },
    {
      key: "branchName", header: "الفرع",
      render: (r) => (
        <div className="flex items-center gap-1">
          <Building2 size={12} className="muted" />
          <span className="text-sm">{r.branchName}</span>
        </div>
      ),
    },
    {
      key: "customerCount", header: "العملاء",
      render: (r) => {
        const count = customers.filter(c => c.repId === r.repId).length;
        return <Badge tone="info">{count}</Badge>;
      },
    },
    {
      key: "status", header: "الحالة",
      render: (r) => (
        <Badge tone={r.status === "active" ? "success" : "neutral"}>
          {r.status === "active" ? "نشط" : " سابق"}
        </Badge>
      ),
    },
    {
      key: "assignedAt", header: "تاريخ التعيين",
      render: (r) => <span className="text-xs muted">{formatDate(r.assignedAt)}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={32} className="animate-spin mx-auto mb-4" style={{ color: "var(--color-primary)" }} />
        <p className="muted">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المبيعات والتوزيع", path: "/customers" }, { label: "إدارة الهيكل والتوزيع", path: "/organization/dashboard" }, { label: "المندوبون" }]}
        title="إدارة المندوبين"
        description="عرض وإدارة تعيينات المندوبين في المناطق"
        actions={
          canManage ? (
            <Button variant="primary" icon={<Users size={15} />} onClick={() => {}}>
              إضافة مندوب
            </Button>
          ) : null
        }
      />

      {/* ─── KPIs ─── */}
      <div className="grid-4 mb-6">
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-sales)" }}>{activeReps.length}</div>
          <div className="text-sm muted">المندوبون النشطون</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-inventory)" }}>{suspendedReps.length}</div>
          <div className="text-sm muted">المُوقفون مؤقتاً</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--color-danger)" }}>{repsWithoutTerritory.length}</div>
          <div className="text-sm muted">بدون منطقة</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-field)" }}>{territories.length}</div>
          <div className="text-sm muted">المناطق</div>
        </Card>
      </div>

      {/* ─── جدول المندوبين ─── */}
      <Card>
        <FilterBar>
          <Select
            label="المنطقة"
            value={territoryFilter}
            onChange={(e) => setTerritoryFilter(e.target.value)}
            options={[
              { value: "all", label: "جميع المناطق" },
              ...territories.map(t => ({ value: t.id, label: t.name })),
            ]}
          />
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "الجميع" },
              { value: "active", label: "نشط" },
              { value: "released", label: " سابق" },
            ]}
          />
        </FilterBar>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          searchable
          searchPlaceholder="بحث بالاسم أو المنطقة..."
          searchKeys={(r) => `${r.repName} ${r.territoryName} ${r.supervisorName}`}
          onRowClick={(r) => setSelectedRep(r)}
          pageSize={10}
          emptyTitle="لا يوجد مندوبون"
          emptyDescription="لم يتم تعيين أي مندوب بعد"
        />
      </Card>

      {/* ─── Drawer تفاصيل المندوب ─── */}
      <Drawer open={!!selectedRep} onClose={() => setSelectedRep(null)} title={`تفاصيل المندوب — ${selectedRep?.repName ?? ""}`} width="480px">
        {selectedRep && (
          <div className="stack">
            <div className="form-grid">
              <div className="field-span-6">
                <label className="form-label">المندوب</label>
                <div className="font-medium">{selectedRep.repName}</div>
                <div className="text-xs muted">{selectedRep.repId}</div>
              </div>
              <div className="field-span-6">
                <label className="form-label">الحالة</label>
                <Badge tone={selectedRep.status === "active" ? "success" : "neutral"}>
                  {selectedRep.status === "active" ? "نشط" : " سابق"}
                </Badge>
              </div>
              <div className="field-span-6">
                <label className="form-label">المنطقة</label>
                <div className="flex items-center gap-1">
                  <MapPin size={12} style={{ color: "var(--section-field)" }} />
                  <span>{selectedRep.territoryName}</span>
                </div>
              </div>
              <div className="field-span-6">
                <label className="form-label">المشرف</label>
                <div className="flex items-center gap-1">
                  <Shield size={12} className="muted" />
                  <span>{selectedRep.supervisorName}</span>
                </div>
              </div>
              <div className="field-span-6">
                <label className="form-label">الفرع</label>
                <div className="flex items-center gap-1">
                  <Building2 size={12} className="muted" />
                  <span>{selectedRep.branchName}</span>
                </div>
              </div>
              <div className="field-span-6">
                <label className="form-label">الفريق</label>
                <span>{selectedRep.teamName ?? "—"}</span>
              </div>
              <div className="field-span-6">
                <label className="form-label">عدد العملاء</label>
                <Badge tone="info">{customers.filter(c => c.repId === selectedRep.repId).length} عميل</Badge>
              </div>
              <div className="field-span-12">
                <label className="form-label">سبب التعيين</label>
                <p className="text-sm">{selectedRep.reason}</p>
              </div>
              {selectedRep.notes && (
                <div className="field-span-12">
                  <label className="form-label">ملاحظات</label>
                  <p className="text-sm muted">{selectedRep.notes}</p>
                </div>
              )}
              <div className="field-span-6">
                <label className="form-label">تاريخ التعيين</label>
                <span className="text-sm">{formatDate(selectedRep.assignedAt)}</span>
              </div>
              <div className="field-span-6">
                <label className="form-label">تم التعيين بواسطة</label>
                <span className="text-sm">{selectedRep.assignedByName}</span>
              </div>
              {selectedRep.releasedAt && (
                <>
                  <div className="field-span-6">
                    <label className="form-label">تاريخ الإيقاف</label>
                    <span className="text-sm">{formatDate(selectedRep.releasedAt)}</span>
                  </div>
                  <div className="field-span-6">
                    <label className="form-label">تم الإيقاف بواسطة</label>
                    <span className="text-sm">{selectedRep.releasedByName}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
