import { useState, useEffect, useMemo } from "react";
import { UserCheck, Users, MapPin, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Modal } from "@/components/ui/Modal";
import { DataTable } from "@/components/data-table/DataTable";
import type { Column } from "@/components/data-table/DataTable";
import { useAuthStore } from "@/store/auth";
import { can } from "@/config/permissions";
import { organizationService } from "@/services/organization.service";
import { reps, supervisors } from "@/mock/users";
import { territories } from "@/mock/organization";
import { customers } from "@/mock/customers";
import type { CustomerAssignment } from "@/types";
import { toast } from "@/store/ui";

export function CustomerAssignmentPage() {
  const { user } = useAuthStore();
  const canManage = can("organization.manage", user?.role ?? "GENERAL_MANAGER");
  const [assignments, setAssignments] = useState<CustomerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [assignRep, setAssignRep] = useState("");
  const [assignTerritory, setAssignTerritory] = useState("");
  const [assignSupervisor, setAssignSupervisor] = useState("");
  const [assignReason, setAssignReason] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      setAssignments(await organizationService.getCustomerAssignments());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const activeAssignments = useMemo(() => assignments.filter(a => a.status === "active"), [assignments]);
  const unassignedCustomers = useMemo(() => {
    const assignedIds = new Set(activeAssignments.map(a => a.customerId));
    return customers.filter(c => !assignedIds.has(c.id));
  }, [activeAssignments]);

  const allCustomers = useMemo(() => {
    return customers.map(c => {
      const activeA = activeAssignments.find(a => a.customerId === c.id);
      return { ...c, assignment: activeA ?? null, isAssigned: !!activeA };
    });
  }, [activeAssignments]);

  const filtered = useMemo(() => {
    let list = [...allCustomers];
    if (territoryFilter !== "all") list = list.filter(c => c.territoryId === territoryFilter);
    if (statusFilter === "unassigned") list = list.filter(c => !c.isAssigned);
    if (statusFilter === "assigned") list = list.filter(c => c.isAssigned);
    return list;
  }, [allCustomers, territoryFilter, statusFilter]);

  function handleBulkAssign() {
    if (selectedCustomerIds.length === 0) { toast.error("يرجى تحديد عملاء على الأقل"); return; }
    setAssignModal(true);
  }

  async function confirmAssign() {
    if (!assignRep || !assignTerritory || !assignSupervisor || !assignReason.trim()) {
      toast.error("يرجى ملء جميع الحقول"); return;
    }
    try {
      const actor = user?.id ?? "system";
      if (selectedCustomerIds.length === 1) {
        await organizationService.assignCustomerToRep(selectedCustomerIds[0], assignRep, assignTerritory, assignSupervisor, assignReason, actor);
      } else {
        await organizationService.bulkAssignCustomers(selectedCustomerIds, assignRep, assignTerritory, assignSupervisor, assignReason, actor);
      }
      toast.success(`تم تعيين ${selectedCustomerIds.length} عميل بنجاح`);
      setAssignModal(false);
      setSelectedCustomerIds([]);
      setAssignRep(""); setAssignTerritory(""); setAssignSupervisor(""); setAssignReason("");
      await loadData();
    } catch (err: any) { toast.error(err.message ?? "فشل التعيين"); }
  }

  function toggleCustomer(id: string) {
    setSelectedCustomerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    if (selectedCustomerIds.length === filtered.length) setSelectedCustomerIds([]);
    else setSelectedCustomerIds(filtered.map(c => c.id));
  }

  const columns: Column<typeof filtered[0]>[] = [
    {
      key: "select", header: "",
      render: (r) => (
        <input type="checkbox" checked={selectedCustomerIds.includes(r.id)} onChange={() => toggleCustomer(r.id)}
          className="w-4 h-4 rounded border-[var(--color-neutral-300)]" />
      ),
    },
    {
      key: "name", header: "العميل",
      render: (r) => (
        <div>
          <div className="font-medium text-sm">{r.name}</div>
          <div className="text-xs muted">{r.code}</div>
        </div>
      ),
    },
    {
      key: "isAssigned", header: "الحالة",
      render: (r) => r.isAssigned ? (
        <Badge tone="success"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle size={11} /> معيّن لـ {r.assignment?.repName}</span></Badge>
      ) : (
        <Badge tone="danger"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><AlertTriangle size={11} /> غير معيّن</span></Badge>
      ),
    },
    {
      key: "territoryId", header: "المنطقة",
      render: (r) => <span className="text-sm">{territories.find(t => t.id === r.territoryId)?.name ?? "—"}</span>,
    },
    { key: "balance", header: "الرصيد", render: (r) => <span className="text-sm font-mono">{r.balance.toLocaleString("ar-SA")}</span> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={32} className="animate-spin mx-auto mb-4" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المبيعات والتوزيع", path: "/customers" }, { label: "إدارة الهيكل والتوزيع", path: "/organization/dashboard" }, { label: "تعيين العملاء" }]}
        title="تعيين العملاء"
        description="تعيين العملاء للمندوبين وإعادة التوزيع"
        actions={
          canManage && selectedCustomerIds.length > 0 ? (
            <Button variant="primary" icon={<UserCheck size={15} />} onClick={handleBulkAssign}>
              تعيين ({selectedCustomerIds.length})
            </Button>
          ) : null
        }
      />

      <div className="grid-4 mb-6">
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-sales)" }}>{customers.length}</div>
          <div className="text-sm muted">إجمالي العملاء</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-field)" }}>{activeAssignments.length}</div>
          <div className="text-sm muted">العملاء المعيّنون</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--color-danger)" }}>{unassignedCustomers.length}</div>
          <div className="text-sm muted">غير المعيّنين</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-inventory)" }}>{selectedCustomerIds.length}</div>
          <div className="text-sm muted">المحدّدون حالياً</div>
        </Card>
      </div>

      <Card>
        <FilterBar>
          <Select label="المنطقة" value={territoryFilter} onChange={(e) => setTerritoryFilter(e.target.value)}
            options={[{ value: "all", label: "جميع المناطق" }, ...territories.map(t => ({ value: t.id, label: t.name }))]} />
          <Select label="الحالة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: "all", label: "الجميع" }, { value: "assigned", label: "معيّن" }, { value: "unassigned", label: "غير معيّن" }]} />
        </FilterBar>
        <div className="px-4 py-2 border-b border-[var(--color-neutral-100)]">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={selectedCustomerIds.length === filtered.length && filtered.length > 0} onChange={toggleAll}
              className="w-4 h-4 rounded border-[var(--color-neutral-300)]" />
            تحديد الكل ({filtered.length})
          </label>
        </div>
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} searchable searchPlaceholder="بحث بالاسم..."
          searchKeys={(r) => `${r.name} ${r.code}`} pageSize={10} />
      </Card>

      {/* ─── Modal التعيين ─── */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title={`تعيين ${selectedCustomerIds.length} عميل`}>
        <div className="form-grid">
          <div className="field-span-6">
            <Select label="المندوب" value={assignRep} onChange={(e) => setAssignRep(e.target.value)}
              options={[{ value: "", label: "اختر المندوب..." }, ...reps.filter(r => r.status === "active").map(r => ({ value: r.id, label: r.name }))]} />
          </div>
          <div className="field-span-6">
            <Select label="المنطقة" value={assignTerritory} onChange={(e) => { setAssignTerritory(e.target.value); setAssignSupervisor(""); }}
              options={[{ value: "", label: "اختر المنطقة..." }, ...territories.map(t => ({ value: t.id, label: t.name }))]} />
          </div>
          <div className="field-span-6">
            <Select label="المشرف" value={assignSupervisor} onChange={(e) => setAssignSupervisor(e.target.value)}
              options={[{ value: "", label: "اختر المشرف..." }, ...supervisors.filter(s => s.status === "active").map(s => ({ value: s.id, label: s.name }))]} />
          </div>
          <div className="field-span-6">
            <Input label="سبب التعيين" placeholder="سبب التعيين..." value={assignReason} onChange={(e) => setAssignReason(e.target.value)} />
          </div>
        </div>
        <div className="page-actions mt-4">
          <Button variant="secondary" onClick={() => setAssignModal(false)}>إلغاء</Button>
          <Button variant="primary" icon={<UserCheck size={15} />} onClick={confirmAssign}>تأكيد التعيين</Button>
        </div>
      </Modal>
    </div>
  );
}
