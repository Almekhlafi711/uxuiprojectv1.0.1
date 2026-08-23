import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Users, UserCheck, History } from "lucide-react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Drawer } from "@/components/ui/Drawer";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable } from "@/components/data-table/DataTable";
import type { Column } from "@/components/data-table/DataTable";
import { useAuthStore } from "@/store/auth";
import { organizationService } from "@/services/organization.service";
import { territories } from "@/mock/organization";
import type { RepresentativeAssignment, CustomerAssignment } from "@/types";
import { formatDate } from "@/utils/format";

export function AssignmentHistoryPage() {
  const { user } = useAuthStore();
  const [repAssignments, setRepAssignments] = useState<RepresentativeAssignment[]>([]);
  const [custAssignments, setCustAssignments] = useState<CustomerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("rep");
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<RepresentativeAssignment | CustomerAssignment | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        organizationService.getRepAssignments(),
        organizationService.getCustomerAssignments(),
      ]);
      setRepAssignments(r);
      setCustAssignments(c);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const filteredReps = useMemo(() => {
    let list = [...repAssignments];
    if (territoryFilter !== "all") list = list.filter(a => a.territoryId === territoryFilter);
    if (statusFilter !== "all") list = list.filter(a => a.status === statusFilter);
    return list;
  }, [repAssignments, territoryFilter, statusFilter]);

  const filteredCustomers = useMemo(() => {
    let list = [...custAssignments];
    if (territoryFilter !== "all") list = list.filter(a => a.territoryId === territoryFilter);
    if (statusFilter !== "all") list = list.filter(a => a.status === statusFilter);
    return list;
  }, [custAssignments, territoryFilter, statusFilter]);

  const repColumns: Column<RepresentativeAssignment>[] = [
    { key: "repName", header: "المندوب", render: (r) => <span className="font-medium text-sm">{r.repName}</span> },
    { key: "territoryName", header: "المنطقة", render: (r) => <span className="text-sm">{r.territoryName}</span> },
    { key: "supervisorName", header: "المشرف", render: (r) => <span className="text-sm">{r.supervisorName}</span> },
    { key: "branchName", header: "الفرع", render: (r) => <span className="text-sm">{r.branchName}</span> },
    { key: "status", header: "الحالة", render: (r) => <Badge tone={r.status === "active" ? "success" : "neutral"}>{r.status === "active" ? "نشط" : " سابق"}</Badge> },
    { key: "assignedAt", header: "التاريخ", render: (r) => <span className="text-xs muted">{formatDate(r.assignedAt)}</span> },
  ];

  const custColumns: Column<CustomerAssignment>[] = [
    { key: "customerName", header: "العميل", render: (r) => <div><div className="font-medium text-sm">{r.customerName}</div><div className="text-xs muted">{r.customerCode}</div></div> },
    { key: "repName", header: "المندوب", render: (r) => <span className="text-sm">{r.repName}</span> },
    { key: "territoryName", header: "المنطقة", render: (r) => <span className="text-sm">{r.territoryName}</span> },
    { key: "status", header: "الحالة", render: (r) => <Badge tone={r.status === "active" ? "success" : "neutral"}>{r.status === "active" ? "نشط" : " سابق"}</Badge> },
    { key: "assignedAt", header: "التاريخ", render: (r) => <span className="text-xs muted">{formatDate(r.assignedAt)}</span> },
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
        crumbs={[{ label: "المبيعات والتوزيع", path: "/customers" }, { label: "إدارة الهيكل والتوزيع", path: "/organization/dashboard" }, { label: "سجل التعيينات" }]}
        title="سجل التعيينات"
        description="سجل كامل بجميع تعيينات ونقل المندوبين والعملاء"
      />

      <div className="grid-3 mb-6">
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-sales)" }}>{repAssignments.length}</div>
          <div className="text-sm muted">سجل تعيين مندوبين</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-field)" }}>{custAssignments.length}</div>
          <div className="text-sm muted">سجل تعيين عملاء</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-inventory)" }}>{repAssignments.filter(a => a.status === "released").length + custAssignments.filter(a => a.status === "released").length}</div>
          <div className="text-sm muted">سجلات تاريخية</div>
        </Card>
      </div>

      <Card>
        <FilterBar>
          <Select label="المنطقة" value={territoryFilter} onChange={(e) => setTerritoryFilter(e.target.value)}
            options={[{ value: "all", label: "جميع المناطق" }, ...territories.map(t => ({ value: t.id, label: t.name }))]} />
          <Select label="الحالة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: "all", label: "الجميع" }, { value: "active", label: "نشط" }, { value: "released", label: " سابق" }]} />
        </FilterBar>
        <Tabs
          tabs={[
            { key: "rep", label: `المندوبين (${filteredReps.length})`, content: (
              <DataTable columns={repColumns} rows={filteredReps} rowKey={(r) => r.id} searchable searchPlaceholder="بحث..." searchKeys={(r) => `${r.repName} ${r.territoryName}`} onRowClick={(r) => setSelectedItem(r)} pageSize={10} />
            )},
            { key: "customer", label: `العملاء (${filteredCustomers.length})`, content: (
              <DataTable columns={custColumns} rows={filteredCustomers} rowKey={(r) => r.id} searchable searchPlaceholder="بحث..." searchKeys={(r) => `${r.customerName} ${r.repName}`} onRowClick={(r) => setSelectedItem(r)} pageSize={10} />
            )},
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </Card>

      <Drawer open={!!selectedItem} onClose={() => setSelectedItem(null)} title="تفاصيل التعيين" width="480px">
        {selectedItem && (
          <div className="form-grid">
            {"customerId" in selectedItem ? (
              <>
                <div className="field-span-6"><label className="form-label">العميل</label><div className="font-medium">{(selectedItem as CustomerAssignment).customerName}</div><div className="text-xs muted">{(selectedItem as CustomerAssignment).customerCode}</div></div>
                <div className="field-span-6"><label className="form-label">الحالة</label><Badge tone={selectedItem.status === "active" ? "success" : "neutral"}>{selectedItem.status === "active" ? "نشط" : " سابق"}</Badge></div>
                <div className="field-span-6"><label className="form-label">المندوب</label><span>{(selectedItem as CustomerAssignment).repName}</span></div>
                <div className="field-span-6"><label className="form-label">المنطقة</label><span>{(selectedItem as CustomerAssignment).territoryName}</span></div>
              </>
            ) : (
              <>
                <div className="field-span-6"><label className="form-label">المندوب</label><div className="font-medium">{(selectedItem as RepresentativeAssignment).repName}</div></div>
                <div className="field-span-6"><label className="form-label">الحالة</label><Badge tone={selectedItem.status === "active" ? "success" : "neutral"}>{selectedItem.status === "active" ? "نشط" : " سابق"}</Badge></div>
                <div className="field-span-6"><label className="form-label">المنطقة</label><span>{(selectedItem as RepresentativeAssignment).territoryName}</span></div>
                <div className="field-span-6"><label className="form-label">المشرف</label><span>{(selectedItem as RepresentativeAssignment).supervisorName}</span></div>
                <div className="field-span-6"><label className="form-label">الفرع</label><span>{(selectedItem as RepresentativeAssignment).branchName}</span></div>
                <div className="field-span-6"><label className="form-label">الفريق</label><span>{(selectedItem as RepresentativeAssignment).teamName ?? "—"}</span></div>
              </>
            )}
            <div className="field-span-12"><label className="form-label">سبب التعيين</label><p className="text-sm">{selectedItem.reason}</p></div>
            {selectedItem.notes && <div className="field-span-12"><label className="form-label">ملاحظات</label><p className="text-sm muted">{selectedItem.notes}</p></div>}
            <div className="field-span-6"><label className="form-label">تاريخ التعيين</label><span className="text-sm">{formatDate(selectedItem.assignedAt)}</span></div>
            <div className="field-span-6"><label className="form-label">بواسطة</label><span className="text-sm">{selectedItem.assignedByName}</span></div>
            {selectedItem.releasedAt && (
              <>
                <div className="field-span-6"><label className="form-label">تاريخ الإطلاق</label><span className="text-sm">{formatDate(selectedItem.releasedAt)}</span></div>
                <div className="field-span-6"><label className="form-label">بواسطة</label><span className="text-sm">{selectedItem.releasedByName}</span></div>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
