import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Users, MapPin, ArrowLeftRight, CheckCircle, AlertTriangle } from "lucide-react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { DataTable } from "@/components/data-table/DataTable";
import type { Column } from "@/components/data-table/DataTable";
import { useAuthStore } from "@/store/auth";
import { can } from "@/config/permissions";
import { organizationService } from "@/services/organization.service";
import { reps, supervisors } from "@/mock/users";
import { territories, teams, branches } from "@/mock/organization";
import { customers } from "@/mock/customers";
import type { RepresentativeAssignment } from "@/types";
import { toast } from "@/store/ui";

export function RepReassignmentPage() {
  const { user } = useAuthStore();
  const canManage = can("organization.manage", user?.role ?? "GENERAL_MANAGER");
  const [assignments, setAssignments] = useState<RepresentativeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reassignModal, setReassignModal] = useState<{ open: boolean; rep?: RepresentativeAssignment }>({ open: false });
  const [newTerritory, setNewTerritory] = useState("");
  const [newSupervisor, setNewSupervisor] = useState("");
  const [reason, setReason] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      setAssignments(await organizationService.getRepAssignments());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    let list = [...assignments];
    if (territoryFilter !== "all") list = list.filter(a => a.territoryId === territoryFilter);
    if (statusFilter !== "all") list = list.filter(a => a.status === statusFilter);
    return list;
  }, [assignments, territoryFilter, statusFilter]);

  const activeReps = assignments.filter(a => a.status === "active");

  function handleReassign() {
    if (!reassignModal.rep || !newTerritory || !newSupervisor || !reason.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setConfirmDialog(true);
  }

  async function confirmReassign() {
    if (!reassignModal.rep) return;
    try {
      await organizationService.transferRepToTerritory(
        reassignModal.rep.repId, newTerritory, newSupervisor, reason, user?.id ?? "u-sm-01"
      );
      toast.success("تم نقل المندوب بنجاح");
      setReassignModal({ open: false });
      setConfirmDialog(false);
      setNewTerritory("");
      setNewSupervisor("");
      setReason("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message ?? "فشل النقل");
    }
  }

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
    { key: "territoryName", header: "المنطقة الحالية", render: (r) => <span className="text-sm">{r.territoryName}</span> },
    { key: "supervisorName", header: "المشرف الحالي", render: (r) => <span className="text-sm">{r.supervisorName}</span> },
    {
      key: "status", header: "الحالة",
      render: (r) => <Badge tone={r.status === "active" ? "success" : "neutral"}>{r.status === "active" ? "نشط" : " سابق"}</Badge>,
    },
    {
      key: "actions", header: "الإجراء",
      render: (r) => r.status === "active" ? (
        <Button variant="ghost" size="sm" icon={<ArrowLeftRight size={14} />} onClick={(e) => { e.stopPropagation(); setReassignModal({ open: true, rep: r }); }}>
          نقل
        </Button>
      ) : null,
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
        crumbs={[{ label: "المبيعات والتوزيع", path: "/customers" }, { label: "إدارة الهيكل والتوزيع", path: "/organization/dashboard" }, { label: "إعادة تعيين المندوبين" }]}
        title="إعادة تعيين المندوبين"
        description="نقل المندوبين بين المناطق والمشرفين"
      />

      <div className="grid-3 mb-6">
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-sales)" }}>{activeReps.length}</div>
          <div className="text-sm muted">المندوبون النشطون</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-field)" }}>{territories.length}</div>
          <div className="text-sm muted">المناطق المتاحة</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-inventory)" }}>{assignments.filter(a => a.status === "released").length}</div>
          <div className="text-sm muted">النقل السابق</div>
        </Card>
      </div>

      <Card>
        <FilterBar>
          <Select label="المنطقة" value={territoryFilter} onChange={(e) => setTerritoryFilter(e.target.value)}
            options={[{ value: "all", label: "جميع المناطق" }, ...territories.map(t => ({ value: t.id, label: t.name }))]} />
          <Select label="الحالة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: "all", label: "الجميع" }, { value: "active", label: "نشط" }, { value: "released", label: " سابق" }]} />
        </FilterBar>
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} searchable searchPlaceholder="بحث بالاسم..." searchKeys={(r) => `${r.repName} ${r.territoryName}`} pageSize={10} />
      </Card>

      {/* ─── Modal إعادة التعيين ─── */}
      <Modal open={reassignModal.open} onClose={() => setReassignModal({ open: false })} title={`نقل المندوب — ${reassignModal.rep?.repName ?? ""}`}>
        <div className="form-grid">
          <div className="field-span-6">
            <Select label="المنطقة الجديدة" value={newTerritory} onChange={(e) => { setNewTerritory(e.target.value); setNewSupervisor(""); }}
              options={[{ value: "", label: "اختر المنطقة..." }, ...territories.map(t => ({ value: t.id, label: t.name }))]} />
          </div>
          <div className="field-span-6">
            <Select label="المشرف الجديد" value={newSupervisor} onChange={(e) => setNewSupervisor(e.target.value)}
              options={[{ value: "", label: "اختر المشرف..." }, ...supervisors.map(s => ({ value: s.id, label: s.name }))]} />
          </div>
          <div className="field-span-12">
            <Input label="سبب النقل" placeholder="مثال: إعادة توزيع الحمل على المناطق..." value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="field-span-12">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              <AlertTriangle size={14} />
              <span>سيتم إصدار سجل تدقيق对此 عملية النقل</span>
            </div>
          </div>
        </div>
        <div className="page-actions mt-4">
          <Button variant="secondary" onClick={() => setReassignModal({ open: false })}>إلغاء</Button>
          <Button variant="primary" icon={<ArrowLeftRight size={15} />} onClick={handleReassign}>تأكيد النقل</Button>
        </div>
      </Modal>

      <ConfirmDialog open={confirmDialog} onClose={() => setConfirmDialog(false)} onConfirm={confirmReassign}
        title="تأكيد نقل المندوب" message={`هل أنت متأكد من نقل ${reassignModal.rep?.repName ?? ""} إلى منطقة جديدة؟`} danger />
    </div>
  );
}
