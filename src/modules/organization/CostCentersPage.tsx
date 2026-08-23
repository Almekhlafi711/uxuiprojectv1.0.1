import { useMemo, useState } from "react";
import { Plus, Building2, Pencil, Trash2, MapPin, Users } from "lucide-react";
import { users, reps } from "@/mock/users";
import { territories } from "@/mock/organization";
import { TODAY } from "@/config/date";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input, Select, Checkbox } from "@/components/ui/FormControls";
import { toast } from "@/store/ui";

type CostCenterType = "sales" | "distribution" | "warehouse" | "admin";

interface CostCenterRow {
  id: string;
  name: string;
  parentId: string;
  type: CostCenterType;
  status: "active" | "inactive";
  assignedTerritories: string[];
  assignedReps: string[];
}

const TYPE_LABELS: Record<CostCenterType, string> = {
  sales: "مبيعات",
  distribution: "توزيع",
  warehouse: "مخزون",
  admin: "إدارة عامة",
};

const TYPE_TONE: Record<CostCenterType, "success" | "info" | "warning" | "danger"> = {
  sales: "success",
  distribution: "info",
  warehouse: "warning",
  admin: "danger",
};

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "كل الأنواع" },
  { value: "sales", label: "مبيعات" },
  { value: "distribution", label: "توزيع" },
  { value: "warehouse", label: "مخزون" },
  { value: "admin", label: "إدارة عامة" },
];

const PARENT_OPTIONS = [
  { value: "dept-sales", label: "قسم المبيعات" },
  { value: "dept-distribution", label: "قسم التوزيع" },
  { value: "dept-warehouse", label: "قسم المخزون" },
  { value: "dept-admin", label: "الإدارة" },
];

const INITIAL_CENTERS: CostCenterRow[] = [
  {
    id: "cc-01",
    name: "مبيعات شمال الرياض",
    parentId: "dept-sales",
    type: "sales",
    status: "active",
    assignedTerritories: ["t-01", "t-03"],
    assignedReps: ["u-rp-01", "u-rp-02", "u-rp-07"],
  },
  {
    id: "cc-02",
    name: "مبيعات جنوب الرياض",
    parentId: "dept-sales",
    type: "sales",
    status: "active",
    assignedTerritories: ["t-02"],
    assignedReps: ["u-rp-03", "u-rp-04"],
  },
  {
    id: "cc-03",
    name: "توزيع عام",
    parentId: "dept-distribution",
    type: "distribution",
    status: "active",
    assignedTerritories: ["t-04", "t-05"],
    assignedReps: ["u-rp-05"],
  },
  {
    id: "cc-04",
    name: "مخزون المستودع الرئيسي",
    parentId: "dept-warehouse",
    type: "warehouse",
    status: "active",
    assignedTerritories: [],
    assignedReps: [],
  },
  {
    id: "cc-05",
    name: "إدارة عامة",
    parentId: "dept-admin",
    type: "admin",
    status: "active",
    assignedTerritories: [],
    assignedReps: [],
  },
  {
    id: "cc-06",
    name: "منطقة جدة",
    parentId: "dept-sales",
    type: "sales",
    status: "inactive",
    assignedTerritories: [],
    assignedReps: [],
  },
];

function getParentName(parentId: string): string {
  return PARENT_OPTIONS.find((p) => p.value === parentId)?.label ?? "—";
}

export function CostCentersPage() {
  const [centers, setCenters] = useState<CostCenterRow[]>(INITIAL_CENTERS);
  const [typeFilter, setTypeFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CostCenterRow | null>(null);

  const filtered = useMemo(() => {
    if (!typeFilter) return centers;
    return centers.filter((c) => c.type === typeFilter);
  }, [centers, typeFilter]);

  const activeCount = centers.filter((c) => c.status === "active").length;
  const totalTerritories = centers.reduce((sum, c) => sum + c.assignedTerritories.length, 0);
  const totalReps = centers.reduce((sum, c) => sum + c.assignedReps.length, 0);

  const columns: Column<CostCenterRow>[] = [
    {
      key: "name",
      header: "اسم المركز",
      sortable: true,
      sortValue: (r) => r.name,
      priority: "primary",
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={15} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
          <span style={{ fontWeight: 500 }}>{r.name}</span>
        </div>
      ),
    },
    { key: "parent", header: "القسم الأب", sortable: true, sortValue: (r) => getParentName(r.parentId), priority: "primary", render: (r) => <Badge tone="info">{getParentName(r.parentId)}</Badge> },
    { key: "type", header: "النوع", sortable: true, sortValue: (r) => TYPE_LABELS[r.type], priority: "primary", render: (r) => <Badge tone={TYPE_TONE[r.type]}>{TYPE_LABELS[r.type]}</Badge> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => r.status === "active" ? <Badge tone="success" dot>نشط</Badge> : <Badge tone="neutral" dot>موقوف</Badge> },
    { key: "territories", header: "المناطق", sortable: true, sortValue: (r) => r.assignedTerritories.length, numeric: true, priority: "optional", render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <MapPin size={12} style={{ color: "var(--color-text-faint)" }} />
        <span className="num">{r.assignedTerritories.length}</span>
      </div>
    ) },
    { key: "reps", header: "المناديب", sortable: true, sortValue: (r) => r.assignedReps.length, numeric: true, priority: "optional", render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Users size={12} style={{ color: "var(--color-text-faint)" }} />
        <span className="num">{r.assignedReps.length}</span>
      </div>
    ) },
    {
      key: "actions",
      header: "",
      priority: "primary",
      render: (r) => (
        <div style={{ display: "flex", gap: 4 }}>
          <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => setEditTarget(r)} aria-label="تعديل" />
          <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => {
            setCenters((prev) => prev.filter((c) => c.id !== r.id));
            toast.success("تم الحذف", `تم حذف مركز التكلفة "${r.name}"`);
          }} aria-label="حذف" />
        </div>
      ),
    },
  ];

  function handleCreate() {
    const nameInput = document.getElementById("cc-name") as HTMLInputElement | null;
    const parentInput = document.getElementById("cc-parent") as HTMLSelectElement | null;
    const typeInput = document.getElementById("cc-type") as HTMLSelectElement | null;

    const name = nameInput?.value?.trim();
    const parentId = parentInput?.value;
    const type = typeInput?.value as CostCenterType;

    if (!name || !parentId || !type) {
      toast.error("خطأ", "يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const newId = `cc-${String(centers.length + 1).padStart(2, "0")}`;
    setCenters((prev) => [
      ...prev,
      { id: newId, name, parentId, type, status: "active", assignedTerritories: [], assignedReps: [] },
    ]);
    toast.success("تم الإنشاء", `تم إنشاء مركز التكلفة "${name}" بنجاح`);
    setCreateOpen(false);
  }

  function handleEdit() {
    if (!editTarget) return;
    const nameInput = document.getElementById("edit-name") as HTMLInputElement | null;
    const parentInput = document.getElementById("edit-parent") as HTMLSelectElement | null;
    const typeInput = document.getElementById("edit-type") as HTMLSelectElement | null;
    const activeCheckbox = document.getElementById("edit-active") as HTMLInputElement | null;

    const name = nameInput?.value?.trim() || editTarget.name;
    const parentId = parentInput?.value || editTarget.parentId;
    const type = (typeInput?.value || editTarget.type) as CostCenterType;
    const status = activeCheckbox?.checked ? "active" : "inactive";

    setCenters((prev) =>
      prev.map((c) => (c.id === editTarget.id ? { ...c, name, parentId, type, status } : c))
    );
    toast.success("تم التعديل", `تم تعديل مركز التكلفة "${name}" بنجاح`);
    setEditTarget(null);
  }

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "مراكز التكلفة" }]}
        title="مراكز التكلفة"
        description="إدارة مراكز التكلفة المرتبطة بالهيكل التشغيلي"
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
            مركز تكلفة جديد
          </Button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="إجمالي المراكز" value={String(centers.length)} icon={<Building2 size={16} />} hint={TODAY} />
        <StatCard label="مراكز نشطة" value={String(activeCount)} icon={<Building2 size={16} />} hint="جارية العمل" />
        <StatCard label="المناطق المُسندة" value={String(totalTerritories)} icon={<MapPin size={16} />} hint="مرتبطة بمراكز" />
        <StatCard label="المناديب المُنتمون" value={String(totalReps)} icon={<Users size={16} />} hint="موزّعون" />
      </div>

      <Card>
        <FilterBar>
          <Select
            label="النوع"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={TYPE_FILTER_OPTIONS}
          />
        </FilterBar>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          searchPlaceholder="بحث بالاسم..."
          searchKeys={(r) => `${r.name} ${getParentName(r.parentId)} ${TYPE_LABELS[r.type]}`}
          exportFilename="cost-centers"
          pageSize={10}
          emptyTitle="لا توجد مراكز تكلفة"
          emptyDescription="لم يتم العثور على مراكز تكلفة مطابقة لمعايير البحث الحالية."
        />
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="مركز تكلفة جديد"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleCreate}>إنشاء المركز</Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="field-span-12">
            <Input id="cc-name" label="اسم المركز" placeholder="مثال: مبيعات شمال الرياض" required />
          </div>
          <div className="field-span-6">
            <Select id="cc-parent" label="القسم الأب" options={PARENT_OPTIONS} placeholder="اختر القسم..." required />
          </div>
          <div className="field-span-6">
            <Select id="cc-type" label="النوع" options={TYPE_FILTER_OPTIONS.filter((o) => o.value !== "")} placeholder="اختر النوع..." required />
          </div>
          <div className="field-span-6">
            <Select
              label="المناطق"
              value=""
              onChange={() => {}}
              placeholder="اختر المناطق..."
              options={territories.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
          <div className="field-span-6">
            <Select
              label="المناديب"
              value=""
              onChange={() => {}}
              placeholder="اختر المناديب..."
              options={reps.map((r) => ({ value: r.id, label: r.name }))}
            />
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
            <Button variant="primary" onClick={handleEdit}>حفظ التعديلات</Button>
          </>
        }
      >
        {editTarget && (
          <div className="form-grid">
            <div className="field-span-12">
              <Input id="edit-name" label="اسم المركز" defaultValue={editTarget.name} required />
            </div>
            <div className="field-span-6">
              <Select id="edit-parent" label="القسم الأب" defaultValue={editTarget.parentId} options={PARENT_OPTIONS} />
            </div>
            <div className="field-span-6">
              <Select id="edit-type" label="النوع" defaultValue={editTarget.type} options={TYPE_FILTER_OPTIONS.filter((o) => o.value !== "")} />
            </div>
            <div className="field-span-6">
              <Checkbox
                id="edit-active"
                label="نشط"
                defaultChecked={editTarget.status === "active"}
              />
            </div>
            <div className="field-span-6">
              <Select
                label="المناطق"
                value=""
                onChange={() => {}}
                placeholder="اختر المناطق..."
                options={territories.map((t) => ({ value: t.id, label: t.name }))}
              />
            </div>
            <div className="field-span-6">
              <Select
                label="المناديب"
                value=""
                onChange={() => {}}
                placeholder="اختر المناديب..."
                options={reps.map((r) => ({ value: r.id, label: r.name }))}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
