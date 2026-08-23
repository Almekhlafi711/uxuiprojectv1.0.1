import { useMemo, useState } from "react";
import { Plus, CheckCircle2, XCircle, ClipboardList } from "lucide-react";
import { users } from "@/mock/users";
import { products } from "@/mock/products";
import { territories } from "@/mock/organization";
import { targets } from "@/mock/targets";
import { TODAY } from "@/config/date";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatMoney, formatNumber, formatDateShort } from "@/utils/format";
import type { Status } from "@/types";

interface SupervisorPlan {
  id: string;
  supervisorId: string;
  territoryId: string;
  period: "daily" | "weekly" | "monthly" | "yearly";
  status: Status;
  startDate: string;
  endDate: string;
  salesTarget: number;
  collectionTarget: number;
  visitCountTarget: number;
  createdAt: string;
}

interface QuantityTargetLine {
  id: string;
  supervisorId: string;
  productName: string;
  productId: string;
  quantity: number;
  unit: "unit" | "carton";
  period: "daily" | "weekly" | "monthly" | "yearly";
  status: Status;
}

const supervisorPlans: SupervisorPlan[] = [
  { id: "sp-001", supervisorId: "u-sp-01", territoryId: "t-01", period: "monthly", status: "approved", startDate: "2026-08-01", endDate: "2026-08-31", salesTarget: 350000, collectionTarget: 280000, visitCountTarget: 200, createdAt: "2026-07-25" },
  { id: "sp-002", supervisorId: "u-sp-02", territoryId: "t-02", period: "monthly", status: "approved", startDate: "2026-08-01", endDate: "2026-08-31", salesTarget: 320000, collectionTarget: 250000, visitCountTarget: 185, createdAt: "2026-07-25" },
  { id: "sp-003", supervisorId: "u-sp-03", territoryId: "t-04", period: "monthly", status: "under_review", startDate: "2026-08-01", endDate: "2026-08-31", salesTarget: 280000, collectionTarget: 220000, visitCountTarget: 170, createdAt: "2026-07-28" },
  { id: "sp-004", supervisorId: "u-sp-01", territoryId: "t-01", period: "weekly", status: "approved", startDate: "2026-08-11", endDate: "2026-08-17", salesTarget: 87500, collectionTarget: 70000, visitCountTarget: 50, createdAt: "2026-08-10" },
  { id: "sp-005", supervisorId: "u-sp-02", territoryId: "t-02", period: "weekly", status: "draft", startDate: "2026-08-18", endDate: "2026-08-24", salesTarget: 80000, collectionTarget: 62500, visitCountTarget: 46, createdAt: "2026-08-14" },
  { id: "sp-006", supervisorId: "u-sp-01", territoryId: "t-03", period: "daily", status: "approved", startDate: TODAY, endDate: TODAY, salesTarget: 15000, collectionTarget: 12000, visitCountTarget: 12, createdAt: TODAY },
  { id: "sp-007", supervisorId: "u-sp-03", territoryId: "t-05", period: "yearly", status: "under_review", startDate: "2026-01-01", endDate: "2026-12-31", salesTarget: 3200000, collectionTarget: 2500000, visitCountTarget: 2000, createdAt: "2026-01-05" },
  { id: "sp-008", supervisorId: "u-sp-02", territoryId: "t-02", period: "daily", status: "approved", startDate: TODAY, endDate: TODAY, salesTarget: 13500, collectionTarget: 10500, visitCountTarget: 11, createdAt: TODAY },
  { id: "sp-009", supervisorId: "u-sp-03", territoryId: "t-04", period: "weekly", status: "approved", startDate: "2026-08-11", endDate: "2026-08-17", salesTarget: 70000, collectionTarget: 55000, visitCountTarget: 42, createdAt: "2026-08-10" },
  { id: "sp-010", supervisorId: "u-sp-01", territoryId: "t-01", period: "monthly", status: "draft", startDate: "2026-09-01", endDate: "2026-09-30", salesTarget: 380000, collectionTarget: 300000, visitCountTarget: 210, createdAt: "2026-08-15" },
];

const quantityLines: QuantityTargetLine[] = [
  { id: "qt-001", supervisorId: "u-sp-01", productName: "مشروب غازي كولا 330مل", productId: "p-001", quantity: 500, unit: "carton", period: "monthly", status: "approved" },
  { id: "qt-002", supervisorId: "u-sp-01", productName: "عصير مانجو 1 لتر", productId: "p-005", quantity: 200, unit: "carton", period: "monthly", status: "approved" },
  { id: "qt-003", supervisorId: "u-sp-02", productName: "مشروب غازي برتقال 330مل", productId: "p-002", quantity: 350, unit: "carton", period: "monthly", status: "approved" },
  { id: "qt-004", supervisorId: "u-sp-02", productName: "مياه معدنية 1.5 لتر", productId: "p-008", quantity: 280, unit: "carton", period: "monthly", status: "under_review" },
  { id: "qt-005", supervisorId: "u-sp-03", productName: "بسكويت شاي 400 جرام", productId: "p-014", quantity: 150, unit: "carton", period: "monthly", status: "approved" },
  { id: "qt-006", supervisorId: "u-sp-03", productName: "حليب طازج 1 لتر", productId: "p-017", quantity: 180, unit: "carton", period: "monthly", status: "draft" },
  { id: "qt-007", supervisorId: "u-sp-01", productName: "مشروب غازي ليمون 330مل", productId: "p-003", quantity: 120, unit: "unit", period: "weekly", status: "approved" },
  { id: "qt-008", supervisorId: "u-sp-02", productName: "أرز بسمتي 5 كجم", productId: "p-009", quantity: 80, unit: "carton", period: "weekly", status: "approved" },
];

const supervisorId = (id: string) => users.find((u) => u.id === id)?.name ?? id;
const territoryName = (id: string) => territories.find((t) => t.id === id)?.name ?? id;

const periodLabel = (p: string) => p === "daily" ? "يومي" : p === "weekly" ? "أسبوعي" : p === "monthly" ? "شهري" : "سنوي";

const comparisonData = [
  { supervisorId: "u-sp-01", targetSales: 350000, actualSales: 275000, targetVisits: 200, actualVisits: 162 },
  { supervisorId: "u-sp-02", targetSales: 320000, actualSales: 210000, targetVisits: 185, actualVisits: 140 },
  { supervisorId: "u-sp-03", targetSales: 280000, actualSales: 195000, targetVisits: 170, actualVisits: 128 },
];

export function SupervisorPlansPage() {
  const [tab, setTab] = useState("plans");
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [createTargetOpen, setCreateTargetOpen] = useState(false);
  const { data: targetsData, refetch } = useData(() => mockApi.targets.list());

  const supervisors = useMemo(() => users.filter((u) => u.role === "SUPERVISOR"), []);

  const supervisorPlans = useMemo(() => {
    if (!targetsData) return [];
    return targetsData.filter((t) => t.ownerType === "supervisor").map((t) => ({
      id: t.id,
      supervisorId: t.ownerId,
      territoryId: "",
      period: t.period,
      status: t.status,
      startDate: t.startDate,
      endDate: t.endDate,
      salesTarget: t.salesAmount,
      collectionTarget: t.collectionAmount,
      visitCountTarget: t.visitsCount,
      createdAt: t.createdAt,
    }));
  }, [targetsData]);

  const stats = useMemo(() => {
    const activePlans = supervisorPlans.filter((p) => p.status === "approved").length;
    const approvedTargets = supervisorPlans.filter((p) => p.status === "approved").length;
    const avgAchievement = comparisonData.length > 0
      ? Math.round(comparisonData.reduce((s, d) => s + Math.round((d.actualSales / d.targetSales) * 100), 0) / comparisonData.length)
      : 0;
    return {
      totalSupervisors: supervisors.length,
      activePlans,
      approvedTargets,
      avgAchievement,
    };
  }, [supervisors.length, supervisorPlans]);

  const filteredPlans = useMemo(() => {
    let rows = supervisorPlans;
    if (periodFilter) rows = rows.filter((p) => p.period === periodFilter);
    if (statusFilter) rows = rows.filter((p) => p.status === statusFilter);
    return rows;
  }, [periodFilter, statusFilter]);

  const filteredLines = useMemo(() => {
    let rows = quantityLines;
    if (periodFilter) rows = rows.filter((l) => l.period === periodFilter);
    if (statusFilter) rows = rows.filter((l) => l.status === statusFilter);
    return rows;
  }, [periodFilter, statusFilter]);

  const planColumns: Column<SupervisorPlan>[] = [
    { key: "supervisor", header: "المشرف", sortable: true, sortValue: (p) => supervisorId(p.supervisorId), priority: "primary", render: (p) => <b>{supervisorId(p.supervisorId)}</b> },
    { key: "territory", header: "المنطقة", priority: "secondary", render: (p) => <Badge tone="info">{territoryName(p.territoryId)}</Badge> },
    { key: "period", header: "الفترة", priority: "primary", render: (p) => <Badge tone="warning">{periodLabel(p.period)}</Badge> },
    { key: "status", header: "الحالة", priority: "primary", render: (p) => <StatusBadge status={p.status} /> },
    { key: "startDate", header: "من", priority: "secondary", render: (p) => <span className="num">{formatDateShort(p.startDate)}</span> },
    { key: "endDate", header: "إلى", priority: "secondary", render: (p) => <span className="num">{formatDateShort(p.endDate)}</span> },
    { key: "sales", header: "هدف المبيعات", numeric: true, sortable: true, sortValue: (p) => p.salesTarget, priority: "primary", render: (p) => <span className="num">{formatMoney(p.salesTarget)}</span> },
    { key: "actions", header: "إجراء", priority: "primary", render: (p) => (
      <div className="flex gap-2">
        {p.status === "under_review" && (
          <>
            <Button variant="ghost" size="sm" icon={<CheckCircle2 size={14} />} onClick={async () => { try { await mockApi.targets.approve(p.id); refetch(); toast.success(`تم اعتماد خطة ${supervisorId(p.supervisorId)}`); } catch { toast.error("فشل الاعتماد"); } }}>اعتماد</Button>
            <Button variant="ghost" size="sm" icon={<XCircle size={14} />} onClick={async () => { try { await mockApi.targets.reject(p.id); refetch(); toast.success(`تم رفض خطة ${supervisorId(p.supervisorId)}`); } catch { toast.error("فشل الرفض"); } }}>رفض</Button>
          </>
        )}
        {p.status !== "under_review" && (
          <Badge tone={p.status === "approved" ? "success" : "neutral"}>{p.status === "approved" ? "معتمدة" : "مسودة"}</Badge>
        )}
      </div>
    ) },
  ];

  const lineColumns: Column<QuantityTargetLine>[] = [
    { key: "supervisor", header: "المشرف / الفريق", sortable: true, sortValue: (l) => supervisorId(l.supervisorId), priority: "primary", render: (l) => <b>{supervisorId(l.supervisorId)}</b> },
    { key: "product", header: "المنتج", priority: "primary", render: (l) => l.productName },
    { key: "quantity", header: "الكمية", numeric: true, sortable: true, sortValue: (l) => l.quantity, priority: "primary", render: (l) => <span className="num">{formatNumber(l.quantity)}</span> },
    { key: "unit", header: "الوحدة", priority: "secondary", render: (l) => <Badge tone="info">{l.unit === "carton" ? "كرتون" : "وحدة"}</Badge> },
    { key: "period", header: "الفترة", priority: "secondary", render: (l) => periodLabel(l.period) },
    { key: "status", header: "الحالة", priority: "primary", render: (l) => <StatusBadge status={l.status} /> },
  ];

  const tabs: TabItem[] = [
    {
      key: "plans",
      label: "خطط المشرفين",
      count: filteredPlans.length,
      content: (
        <DataTable
          columns={planColumns}
          rows={filteredPlans}
          rowKey={(p) => p.id}
          searchPlaceholder="بحث باسم المشرف..."
          searchKeys={(p) => supervisorId(p.supervisorId)}
          exportFilename="supervisor-plans"
          pageSize={10}
          emptyTitle="لا توجد خطط مطابقة"
        />
      ),
    },
    {
      key: "targets",
      label: "الأهداف الكمية",
      count: filteredLines.length,
      content: (
        <DataTable
          columns={lineColumns}
          rows={filteredLines}
          rowKey={(l) => l.id}
          searchPlaceholder="بحث باسم المنتج..."
          searchKeys={(l) => `${supervisorId(l.supervisorId)} ${l.productName}`}
          exportFilename="quantity-targets"
          pageSize={10}
          emptyTitle="لا توجد أهداف كمية مطابقة"
        />
      ),
    },
    {
      key: "comparison",
      label: "مقارنة الأداء",
      content: (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>المشرف</th>
                <th>هدف المبيعات</th>
                <th>المبيعات الفعلية</th>
                <th>نسبة الإنجاز</th>
                <th>هدف الزيارات</th>
                <th>الزيارات الفعلية</th>
                <th>نسبة إنجاز الزيارات</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((d) => {
                const salesPct = Math.round((d.actualSales / d.targetSales) * 100);
                const visitsPct = Math.round((d.actualVisits / d.targetVisits) * 100);
                return (
                  <tr key={d.supervisorId}>
                    <td style={{ fontWeight: 500 }}>{supervisorId(d.supervisorId)}</td>
                    <td className="num">{formatMoney(d.targetSales)}</td>
                    <td className="num">{formatMoney(d.actualSales)}</td>
                    <td style={{ minWidth: 160 }}>
                      <Progress value={salesPct} tone={salesPct >= 100 ? "success" : salesPct >= 70 ? "warning" : "danger"} label={`${salesPct}%`} />
                    </td>
                    <td className="num">{formatNumber(d.targetVisits)}</td>
                    <td className="num">{formatNumber(d.actualVisits)}</td>
                    <td style={{ minWidth: 160 }}>
                      <Progress value={visitsPct} tone={visitsPct >= 100 ? "success" : visitsPct >= 70 ? "warning" : "danger"} label={`${visitsPct}%`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الأهداف والمستهدفات" }, { label: "خطط وأهداف المشرفين" }]}
        title="خطط وأهداف المشرفين"
        description="وضع خطط سير وأهداف للمشرفين يومية/أسبوعية/شهرية/سنوية"
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setCreatePlanOpen(true)}>
            خطة جديدة
          </Button>
        }
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي المشرفين</span>
              <b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{stats.totalSupervisors}</b>
            </div>
          </Card>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الخطط النشطة</span>
              <b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{stats.activePlans}</b>
            </div>
          </Card>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الأهداف المعتمدة</span>
              <b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{stats.approvedTargets}</b>
            </div>
          </Card>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>متوسط الإنجاز</span>
              <b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{stats.avgAchievement}%</b>
            </div>
          </Card>
        </div>

        <FilterBar>
          <Select
            label="الفترة"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            placeholder="الكل"
            options={[
              { value: "daily", label: "يومي" },
              { value: "weekly", label: "أسبوعي" },
              { value: "monthly", label: "شهري" },
              { value: "yearly", label: "سنوي" },
            ]}
          />
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="الكل"
            options={[
              { value: "approved", label: "معتمدة" },
              { value: "under_review", label: "قيد المراجعة" },
              { value: "draft", label: "مسودة" },
            ]}
          />
        </FilterBar>
      </StickyPageHeader>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <Modal open={createPlanOpen} title="إنشاء خطة مشرف جديدة" size="md" onClose={() => setCreatePlanOpen(false)}>
        <CreatePlanForm
          supervisors={supervisors}
          onSubmit={(data) => {
            refetch();
            toast.success(`تم إنشاء خطة للمشرف ${data.supervisor}`);
            setCreatePlanOpen(false);
          }}
          onCancel={() => setCreatePlanOpen(false)}
        />
      </Modal>

      <Modal open={createTargetOpen} title="إضافة هدف كمي جديد" size="md" onClose={() => setCreateTargetOpen(false)}>
        <CreateTargetForm
          supervisors={supervisors}
          onSubmit={(data) => {
            toast.success(`تم إنشاء هدف كمي: ${data.product} × ${data.quantity}`);
            setCreateTargetOpen(false);
          }}
          onCancel={() => setCreateTargetOpen(false)}
        />
      </Modal>
    </div>
  );
}

function CreatePlanForm({ supervisors, onSubmit, onCancel }: {
  supervisors: { id: string; name: string }[];
  onSubmit: (data: { supervisor: string }) => void;
  onCancel: () => void;
}) {
  const [supervisor, setSupervisor] = useState(supervisors[0]?.id ?? "");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState(TODAY);
  const [endDate, setEndDate] = useState("");
  const [salesTarget, setSalesTarget] = useState("");
  const [collectionTarget, setCollectionTarget] = useState("");
  const [visitTarget, setVisitTarget] = useState("");

  return (
    <div className="stack" style={{ gap: 12 }}>
      <Select
        label="المشرف"
        value={supervisor}
        onChange={(e) => setSupervisor(e.target.value)}
        options={supervisors.map((s) => ({ value: s.id, label: s.name }))}
        required
      />
      <Select
        label="نوع الفترة"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        options={[
          { value: "daily", label: "يومي" },
          { value: "weekly", label: "أسبوعي" },
          { value: "monthly", label: "شهري" },
          { value: "yearly", label: "سنوي" },
        ]}
      />
      <div className="form-grid">
        <div className="field-span-6">
          <Input label="تاريخ البداية" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div className="field-span-6">
          <Input label="تاريخ النهاية" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        <div className="field-span-4">
          <Input label="هدف المبيعات (ر.س)" type="number" min={0} placeholder="0" value={salesTarget} onChange={(e) => setSalesTarget(e.target.value)} />
        </div>
        <div className="field-span-4">
          <Input label="هدف التحصيل (ر.س)" type="number" min={0} placeholder="0" value={collectionTarget} onChange={(e) => setCollectionTarget(e.target.value)} />
        </div>
        <div className="field-span-4">
          <Input label="عدد الزيارات المستهدفة" type="number" min={0} placeholder="0" value={visitTarget} onChange={(e) => setVisitTarget(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>إلغاء</Button>
        <Button variant="primary" size="sm" icon={<ClipboardList size={14} />} onClick={() => onSubmit({ supervisor })}>إنشاء الخطة</Button>
      </div>
    </div>
  );
}

function CreateTargetForm({ supervisors, onSubmit, onCancel }: {
  supervisors: { id: string; name: string }[];
  onSubmit: (data: { product: string; quantity: number }) => void;
  onCancel: () => void;
}) {
  const [supervisor, setSupervisor] = useState(supervisors[0]?.id ?? "");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<"unit" | "carton">("carton");
  const [period, setPeriod] = useState("monthly");

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="stack" style={{ gap: 12 }}>
      <Select
        label="المشرف / الفريق"
        value={supervisor}
        onChange={(e) => setSupervisor(e.target.value)}
        options={supervisors.map((s) => ({ value: s.id, label: s.name }))}
        required
      />
      <Select
        label="المنتج"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        options={products.slice(0, 12).map((p) => ({ value: p.id, label: p.name }))}
        required
      />
      <div className="form-grid">
        <div className="field-span-6">
          <Input label="الكمية" type="number" min={1} placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div className="field-span-6">
          <Select
            label="الوحدة"
            value={unit}
            onChange={(e) => setUnit(e.target.value as "unit" | "carton")}
            options={[
              { value: "carton", label: "كرتون" },
              { value: "unit", label: "وحدة" },
            ]}
          />
        </div>
      </div>
      <Select
        label="الفترة"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        options={[
          { value: "daily", label: "يومي" },
          { value: "weekly", label: "أسبوعي" },
          { value: "monthly", label: "شهري" },
          { value: "yearly", label: "سنوي" },
        ]}
      />
      {selectedProduct && (
        <div className="alert alert-info" style={{ marginBottom: 0 }}>
          المنتج المحدد: {selectedProduct.name} — الوصفة: {selectedProduct.packSize}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>إلغاء</Button>
        <Button variant="primary" size="sm" onClick={() => onSubmit({ product: selectedProduct?.name ?? "", quantity: Number(quantity) || 0 })}>إضافة الهدف</Button>
      </div>
    </div>
  );
}
