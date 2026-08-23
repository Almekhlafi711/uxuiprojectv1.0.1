import { useMemo, useState } from "react";
import { Plus, CheckCircle2, XCircle, Eye } from "lucide-react";
import { customers } from "@/mock/customers";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatDateShort } from "@/utils/format";
import { can } from "@/config/permissions";
import type { RoutePlan } from "@/types";

const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const statusTabs = [
  { value: "", label: "الكل" },
  { value: "approved", label: "معتمدة" },
  { value: "under_review", label: "قيد المراجعة" },
  { value: "draft", label: "مسودة" },
];

export function RoutesPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.routes.list());
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [detailPlan, setDetailPlan] = useState<RoutePlan | null>(null);
  const [localPlans, setLocalPlans] = useState<RoutePlan[]>([]);

  const repName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? id;
  const isRep = user?.role === "REPRESENTATIVE";
  const isSM = user?.role === "SALES_MANAGER";
  const canCreate = can("routes.create", user?.role ?? "SUPERVISOR");

  const allPlans = localPlans.length > 0 ? localPlans : (data ?? []);

  const stats = useMemo(() => {
    const plans = isRep ? allPlans.filter((r) => r.repId === user.id) : allPlans;
    return {
      total: plans.length,
      approved: plans.filter((r) => r.status === "approved").length,
      underReview: plans.filter((r) => r.status === "under_review").length,
      draft: plans.filter((r) => r.status === "draft").length,
    };
  }, [allPlans, isRep, user?.id]);

  const filtered = useMemo(() => {
    let rows = isRep ? allPlans.filter((r) => r.repId === user.id) : allPlans;
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [allPlans, isRep, user?.id, statusFilter]);

  const handleApprove = (plan: RoutePlan) => {
    setLocalPlans((prev) => {
      const source = prev.length > 0 ? prev : (data ?? []);
      return source.map((r) => r.id === plan.id ? { ...r, status: "approved" as const, approvedBy: user?.name } : r);
    });
    toast.success(`تم اعتماد الخطة: ${plan.name}`);
  };

  const handleReject = (plan: RoutePlan) => {
    setLocalPlans((prev) => {
      const source = prev.length > 0 ? prev : (data ?? []);
      return source.map((r) => r.id === plan.id ? { ...r, status: "draft" as const } : r);
    });
    toast.success(`تم رفض الخطة: ${plan.name}`);
  };

  const columns: Column<RoutePlan>[] = [
    { key: "name", header: "خطة السير", sortable: true, sortValue: (r) => r.name, priority: "primary", render: (r) => <div style={{ fontWeight: 500 }}>{r.name}</div> },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => repName(r.repId), priority: "primary", render: (r) => repName(r.repId) },
    {
      key: "days",
      header: "أيام الزيارات",
      priority: "secondary",
      render: (r) => (
        <div className="stack-xs">
          {r.visitDays.map((d) => (
            <span key={d} className="num" style={{ fontSize: "var(--font-size-sm)" }}>{dayNames[d - 1]}</span>
          ))}
        </div>
      ),
    },
    { key: "customers", header: "عدد العملاء", numeric: true, sortable: true, sortValue: (r) => r.customers.length, priority: "secondary", render: (r) => <span className="num">{r.customers.length}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", header: "تاريخ الإنشاء", sortable: true, sortValue: (r) => r.createdAt, priority: "optional", render: (r) => <span className="num">{formatDateShort(r.createdAt)}</span> },
    ...(isSM ? [{
      key: "actions",
      header: "إجراء",
      priority: "primary" as const,
      render: (r: RoutePlan) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={(e) => { e.stopPropagation(); setDetailPlan(r); }}>عرض</Button>
          {r.status === "under_review" && <>
            <Button variant="ghost" size="sm" icon={<CheckCircle2 size={14} />} onClick={(e) => { e.stopPropagation(); handleApprove(r); }}>اعتماد</Button>
            <Button variant="ghost" size="sm" icon={<XCircle size={14} />} onClick={(e) => { e.stopPropagation(); handleReject(r); }}>رفض</Button>
          </>}
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "خطط السير" }]}
        title="خطط السير"
        description="خطط الزيارات اليومية للمناديب عبر المناطق"
        actions={
          canCreate ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>خطة سير جديدة</Button>
          ) : null
        }
      >

      <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي الخطط</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{stats.total}</b></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>معتمدة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{stats.approved}</b></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>قيد المراجعة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{stats.underReview}</b></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مسودة</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{stats.draft}</b></div></Card>
      </div>

      <FilterBar>
        <div className="filter-tabs">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              className={`filter-tab ${statusFilter === tab.value ? "active" : ""}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
              {tab.value === "" && <Badge tone="neutral">{stats.total}</Badge>}
              {tab.value === "approved" && <Badge tone="success">{stats.approved}</Badge>}
              {tab.value === "under_review" && <Badge tone="warning">{stats.underReview}</Badge>}
              {tab.value === "draft" && <Badge tone="neutral">{stats.draft}</Badge>}
            </button>
          ))}
        </div>
      </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث باسم الخطة أو المندوب..."
        searchKeys={(r) => `${r.name} ${repName(r.repId)}`}
        exportFilename="route-plans"
        pageSize={10}
        emptyTitle="لا توجد خطط سير مطابقة"
        onRowClick={(r) => setDetailPlan(r)}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="خطة سير جديدة"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => { toast.success("تم حفظ المسودة — أرسلها للمراجعة والاعتماد"); setOpen(false); }}>حفظ كمسودة</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-6">
            <Select label="المندوب" placeholder="اختر مندوباً" options={users.filter((u) => u.role === "REPRESENTATIVE").map((u) => ({ value: u.id, label: u.name }))} />
          </div>
          <div className="field-span-6">
            <Select label="المنطقة" placeholder="اختر منطقة" options={[{ value: "t-01", label: "شمال الرياض" }, { value: "t-02", label: "جنوب الرياض" }, { value: "t-04", label: "جدة" }]} />
          </div>
          <div className="field-span-12">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              بعد الاختيار، تُرتب زيارات العملاء بأقصر مسار ويُراجع الانحراف المتوقع تلقائياً.
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detailPlan}
        onClose={() => setDetailPlan(null)}
        title={detailPlan?.name ?? ""}
        footer={<>
          {isSM && detailPlan?.status === "under_review" && <>
            <Button variant="secondary" icon={<XCircle size={14} />} onClick={() => { handleReject(detailPlan!); setDetailPlan(null); }}>رفض</Button>
            <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={() => { handleApprove(detailPlan!); setDetailPlan(null); }}>اعتماد</Button>
          </>}
          {(!isSM || detailPlan?.status !== "under_review") && <Button variant="secondary" onClick={() => setDetailPlan(null)}>إغلاق</Button>}
        </>}
      >
        {detailPlan && (
          <div>
            <div className="form-grid" style={{ marginBottom: "var(--space-4)" }}>
              <div className="field-span-6">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المندوب</span>
                <div style={{ fontWeight: 500 }}>{repName(detailPlan.repId)}</div>
              </div>
              <div className="field-span-6">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المنطقة</span>
                <div><Badge tone="info">{detailPlan.territoryId}</Badge></div>
              </div>
              <div className="field-span-6">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الحالة</span>
                <div><StatusBadge status={detailPlan.status} /></div>
              </div>
              <div className="field-span-6">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تاريخ الإنشاء</span>
                <div className="num">{formatDateShort(detailPlan.createdAt)}</div>
              </div>
              <div className="field-span-12">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>أيام الزيارات</span>
                <div className="flex gap-2" style={{ marginTop: "var(--space-1)" }}>
                  {detailPlan.visitDays.map((d) => <Badge key={d} tone="info">{dayNames[d - 1]}</Badge>)}
                </div>
              </div>
            </div>

            <div style={{ fontWeight: 600, marginBottom: "var(--space-2)" }}>جدول العملاء ({detailPlan.customers.length})</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "right" }}>
                    <th style={{ padding: "var(--space-2)" }}>#</th>
                    <th style={{ padding: "var(--space-2)" }}>العميل</th>
                    <th style={{ padding: "var(--space-2)" }}>أيام الزيارة</th>
                  </tr>
                </thead>
                <tbody>
                  {detailPlan.customers.map((rc) => (
                    <tr key={rc.customerId} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                      <td style={{ padding: "var(--space-2)" }} className="num">{rc.order}</td>
                      <td style={{ padding: "var(--space-2)" }}>{customerName(rc.customerId)}</td>
                      <td style={{ padding: "var(--space-2)" }}>
                        <div className="flex gap-1">
                          {rc.visitDays.map((d) => <Badge key={d} tone="neutral">{dayNames[d - 1]}</Badge>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}