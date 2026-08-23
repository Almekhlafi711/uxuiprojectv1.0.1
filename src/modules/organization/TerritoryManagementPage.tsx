import { useMemo, useState } from "react";
import { MapPin, Plus, Pencil, Users, UserCheck, Trash2, ArrowLeftRight } from "lucide-react";
import { territories as initialTerritories, branches } from "@/mock/organization";
import { users } from "@/mock/users";
import { customers } from "@/mock/customers";
import { TODAY } from "@/config/date";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, SectionBlock } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input, Select, SearchableSelect } from "@/components/ui/FormControls";
import { Tabs } from "@/components/ui/Tabs";
import { toast } from "@/store/ui";
import type { Territory } from "@/types";

type TerritoryRow = Territory & { _branchName: string; _supervisorName: string; _repCount: number; _customerCount: number; _active: boolean };

function buildRows(territories: Territory[]): TerritoryRow[] {
  return territories.map((t) => {
    const branch = branches.find((b) => b.id === t.branchId);
    const sup = users.find((u) => u.id === t.supervisorId);
    return {
      ...t,
      _branchName: branch?.name ?? "—",
      _supervisorName: sup?.name ?? "لم يُسند",
      _repCount: t.repIds.length,
      _customerCount: customers.filter((c) => c.territoryId === t.id).length,
      _active: true,
    };
  });
}

const supervisorOptions = users.filter((u) => u.role === "SUPERVISOR" && u.status === "active").map((u) => ({ value: u.id, label: u.name, sublabel: u.email }));
const repOptions = users.filter((u) => u.role === "REPRESENTATIVE" && u.status === "active").map((u) => ({ value: u.id, label: u.name, sublabel: u.email }));
const branchOptions = branches.map((b) => ({ value: b.id, label: b.name }));

export function TerritoryManagementPage() {
  const [territories, setTerritories] = useState<Territory[]>(initialTerritories);
  const [branchFilter, setBranchFilter] = useState("");
  const [tab, setTab] = useState("territories");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TerritoryRow | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Territory | null>(null);
  const [assignCustomerId, setAssignCustomerId] = useState("");
  const [assignToTerritoryId, setAssignToTerritoryId] = useState("");

  const rows = useMemo(() => buildRows(territories), [territories]);
  const filtered = useMemo(() => {
    if (!branchFilter) return rows;
    return rows.filter((r) => r.branchId === branchFilter);
  }, [rows, branchFilter]);

  const totalReps = territories.reduce((sum, t) => sum + t.repIds.length, 0);
  const totalCustomers = territories.reduce((sum, t) => sum + t.customerCount, 0);
  const customersWithNoTerritory = customers.filter((c) => !c.territoryId).length;

  const columns: Column<TerritoryRow>[] = [
    {
      key: "name", header: "اسم المنطقة", sortable: true, sortValue: (r) => r.name, priority: "primary",
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MapPin size={15} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
          <span style={{ fontWeight: 500 }}>{r.name}</span>
        </div>
      ),
    },
    { key: "branch", header: "الفرع", sortable: true, sortValue: (r) => r._branchName, priority: "primary", render: (r) => <Badge tone="info">{r._branchName}</Badge> },
    { key: "supervisor", header: "المشرف", sortable: true, sortValue: (r) => r._supervisorName, priority: "primary", render: (r) => <span>{r._supervisorName}</span> },
    { key: "reps", header: "عدد المناديب", sortable: true, sortValue: (r) => r._repCount, numeric: true, priority: "optional", render: (r) => <span className="num">{r._repCount}</span> },
    { key: "customers", header: "عدد العملاء", sortable: true, sortValue: (r) => r._customerCount, numeric: true, priority: "optional", render: (r) => <span className="num">{r._customerCount}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => r.supervisorId ? <Badge tone="success" dot>نشط</Badge> : <Badge tone="warning" dot>بدون مشرف</Badge> },
    {
      key: "actions", header: "", priority: "primary",
      render: (r) => (
        <div style={{ display: "flex", gap: 4 }}>
          <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => setEditTarget(r)} aria-label="تعديل" />
          <Button variant="ghost" size="sm" icon={<ArrowLeftRight size={13} />} onClick={() => { setAssignTarget(r); setAssignCustomerId(""); setAssignToTerritoryId(""); setAssignOpen(true); }} aria-label="إسناد عميل" />
          <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => {
            setTerritories((prev) => prev.filter((t) => t.id !== r.id));
            toast.success("تم الحذف", `تم حذف منطقة "${r.name}"`);
          }} aria-label="حذف" />
        </div>
      ),
    },
  ];

  function handleCreateTerritory() {
    const newId = `t-${String(territories.length + 1).padStart(2, "0")}`;
    const nameInput = document.getElementById("create-name") as HTMLInputElement | null;
    const branchInput = document.getElementById("create-branch") as HTMLSelectElement | null;
    const supInput = document.getElementById("create-supervisor") as HTMLSelectElement | null;

    const name = nameInput?.value?.trim();
    const branchId = branchInput?.value;
    const supervisorId = supInput?.value;

    if (!name || !branchId) {
      toast.error("خطأ", "يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const newTerritory: Territory = {
      id: newId,
      name,
      branchId,
      supervisorId: supervisorId || undefined,
      repIds: [],
      customerCount: 0,
    };

    setTerritories((prev) => [...prev, newTerritory]);
    toast.success("تم الإنشاء", `تم إنشاء منطقة "${name}" بنجاح`);
    setCreateOpen(false);
  }

  function handleEditTerritory() {
    if (!editTarget) return;
    const nameInput = document.getElementById("edit-name") as HTMLInputElement | null;
    const branchInput = document.getElementById("edit-branch") as HTMLSelectElement | null;
    const supInput = document.getElementById("edit-supervisor") as HTMLSelectElement | null;

    const name = nameInput?.value?.trim() || editTarget.name;
    const branchId = branchInput?.value || editTarget.branchId;
    const supervisorId = supInput?.value || undefined;

    setTerritories((prev) =>
      prev.map((t) => (t.id === editTarget.id ? { ...t, name, branchId, supervisorId } : t))
    );
    toast.success("تم التعديل", `تم تعديل منطقة "${name}" بنجاح`);
    setEditTarget(null);
  }

  function handleAssignCustomer() {
    if (!assignCustomerId || !assignToTerritoryId) {
      toast.error("خطأ", "يرجى اختيار العميل والمنطقة");
      return;
    }
    setTerritories((prev) =>
      prev.map((t) => {
        if (t.id === assignToTerritoryId) {
          return { ...t, customerCount: t.customerCount + 1 };
        }
        return t;
      })
    );
    toast.success("تم الإسناد", "تم إسناد العميل للمنطقة بنجاح");
    setAssignOpen(false);
  }

  const tabItems = [
    {
      key: "territories",
      label: `المناطق (${territories.length})`,
      content: (
        <>
          <FilterBar>
            <Select
              label="الفرع"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              placeholder="كل الفروع"
              options={branchOptions}
            />
          </FilterBar>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r) => r.id}
            searchPlaceholder="بحث بالاسم..."
            searchKeys={(r) => `${r.name} ${r._branchName} ${r._supervisorName}`}
            exportFilename="territories"
            pageSize={10}
            emptyTitle="لا توجد مناطق"
          />
        </>
      ),
    },
    {
      key: "supervisors",
      label: "نطاق المشرفين",
      content: (
        <div className="stack">
          {supervisorOptions.map((sup) => {
            const supUser = users.find((u) => u.id === sup.value);
            const assignedTerritories = territories.filter((t) => t.supervisorId === sup.value);
            return (
              <Card key={sup.value} title={sup.label} subtitle={sup.sublabel} actions={
                <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => toast.info("تعديل النطاق", "يمكنك تعديل نطاق المشرف من خلال تعديل المنطقة")}>
                  تعديل النطاق
                </Button>
              }>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {assignedTerritories.length > 0 ? (
                    assignedTerritories.map((t) => (
                      <Badge key={t.id} tone="info">{t.name}</Badge>
                    ))
                  ) : (
                    <span className="faint" style={{ fontSize: "var(--font-size-sm)" }}>لم تُسند منطقة بعد</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ),
    },
    {
      key: "assignment",
      label: "إسناد العملاء",
      content: (
        <Card title="إسناد / نقل عميل" subtitle="اختر العميل والمنطقة المطلوبة">
          <div className="form-grid">
            <div className="field-span-6">
              <Select
                label="العميل"
                value={assignCustomerId}
                onChange={(e) => setAssignCustomerId(e.target.value)}
                placeholder="اختر العميل..."
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div className="field-span-6">
              <Select
                label="المنطقة"
                value={assignToTerritoryId}
                onChange={(e) => setAssignToTerritoryId(e.target.value)}
                placeholder="اختر المنطقة..."
                options={territories.map((t) => ({ value: t.id, label: t.name }))}
              />
            </div>
            <div className="field-span-12" style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
              <Button variant="primary" icon={<UserCheck size={14} />} onClick={handleAssignCustomer}>
                تأكيد الإسناد
              </Button>
            </div>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "إدارة المناطق" }]}
        title="إدارة المناطق"
        description="إنشاء وتعديل المناطق وتوزيع المشرفين وإسناد العملاء"
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
            منطقة جديدة
          </Button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="إجمالي المناطق" value={String(territories.length)} icon={<MapPin size={16} />} hint={TODAY} />
        <StatCard label="إجمالي المناديب" value={String(totalReps)} icon={<Users size={16} />} hint="موزّعون" />
        <StatCard label="إجمالي العملاء" value={String(totalCustomers)} icon={<UserCheck size={16} />} hint="في المناطق" />
        <StatCard label="عملاء بدون منطقة" value={String(customersWithNoTerritory)} icon={<ArrowLeftRight size={16} />} hint="بانتظار الإسناد" />
      </div>

      <Tabs tabs={tabItems} active={tab} onChange={setTab} />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="منطقة جديدة"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleCreateTerritory}>إنشاء المنطقة</Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field-span-12">
            <Input id="create-name" label="اسم المنطقة" placeholder="مثال: شمال الرياض" required />
          </div>
          <div className="field-span-12">
            <Select id="create-branch" label="الفرع" options={branchOptions} placeholder="اختر الفرع..." required />
          </div>
          <div className="field-span-12">
            <SearchableSelect label="المشرف" value="" onChange={() => {}} options={supervisorOptions} placeholder="اختر المشرف..." />
          </div>
          <div className="field-span-12">
            <SearchableSelect label="المناديب" value="" onChange={() => {}} options={repOptions} placeholder="اختر المناديب..." />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`تعديل — ${editTarget?.name ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>إلغاء</Button>
            <Button variant="primary" onClick={handleEditTerritory}>حفظ التعديلات</Button>
          </>
        }
      >
        {editTarget && (
          <div className="form-grid">
            <div className="field-span-12">
              <Input id="edit-name" label="اسم المنطقة" defaultValue={editTarget.name} required />
            </div>
            <div className="field-span-12">
              <Select id="edit-branch" label="الفرع" defaultValue={editTarget.branchId} options={branchOptions} />
            </div>
            <div className="field-span-12">
              <SearchableSelect label="المشرف" value={editTarget.supervisorId ?? ""} onChange={(v) => setEditTarget({ ...editTarget, supervisorId: v })} options={supervisorOptions} placeholder="اختر المشرف..." />
            </div>
            <div className="field-span-12">
              <SearchableSelect label="المناديب" value={editTarget.repIds[0] ?? ""} onChange={() => {}} options={repOptions} placeholder="اختر المناديب..." />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={`إسناد عميل — ${assignTarget?.name ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleAssignCustomer}>تأكيد الإسناد</Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field-span-12">
            <Select
              label="العميل"
              value={assignCustomerId}
              onChange={(e) => setAssignCustomerId(e.target.value)}
              placeholder="اختر العميل..."
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
          </div>
          <div className="field-span-12">
            <Select
              label="المنطقة"
              value={assignToTerritoryId || assignTarget?.id || ""}
              onChange={(e) => setAssignToTerritoryId(e.target.value)}
              options={territories.map((t) => ({ value: t.id, label: t.name }))}
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
