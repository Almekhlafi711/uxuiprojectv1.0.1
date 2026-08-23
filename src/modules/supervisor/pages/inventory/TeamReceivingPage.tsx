import { ClipboardCheck, PackageCheck, CheckCircle, XCircle } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { mockApi } from "@/services/mockApi";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { toast } from "@/store/ui";
import { formatNumber, formatDateShort } from "@/utils/format";
import type { LoadingOrder } from "@/types";

export function TeamReceivingPage() {
  const { loadingOrders, reps } = useTeamData();
  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? id;
  const pending = loadingOrders.filter((l) => l.status === "pending" || l.status === "in_progress");
  const completed = loadingOrders.filter((l) => l.status === "completed");

  const columns: Column<LoadingOrder>[] = [
    { key: "number", header: "رقم الاستلام", priority: "primary", sortable: true, sortValue: (l) => l.number, render: (l) => <b className="num">{l.number}</b> },
    { key: "rep", header: "المندوب", priority: "primary", render: (l) => <span>{repName(l.repId)}</span> },
    { key: "items", header: "الأصناف", numeric: true, priority: "secondary", render: (l) => <span className="num">{formatNumber(l.items.length)}</span> },
    { key: "qty", header: "الكمية (متوقع/مستلم)", numeric: true, priority: "primary", render: (l) => {
      const expected = l.items.reduce((a, i) => a + i.expectedQty, 0);
      const received = l.items.reduce((a, i) => a + i.receivedQty, 0);
      const damaged = l.items.filter((i) => i.condition === "damaged").length;
      return <span className="num">{received} / {expected}{damaged > 0 ? ` (${damaged} تالف)` : ""}</span>;
    } },
    { key: "date", header: "التاريخ", priority: "secondary", sortable: true, sortValue: (l) => l.date, render: (l) => <span className="num">{formatDateShort(l.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (l) => (
      <Badge tone={l.status === "completed" ? "success" : l.status === "in_progress" ? "warning" : l.status === "cancelled" ? "danger" : "info"} dot>
        {l.status === "completed" ? "مكتمل" : l.status === "in_progress" ? "قيد الاستلام" : l.status === "pending" ? "معلق" : l.status === "cancelled" ? "ملغي" : l.status}
      </Badge>
    ) },
    { key: "actions", header: "", priority: "primary", render: (l) => l.status === "pending" ? (
      <Button variant="ghost" size="sm" icon={<CheckCircle size={14} />} onClick={async () => { try { await mockApi.team.approveLoadingOrder(l.id); toast.success(`تم إغلاق أمر الاستلام ${l.number}`); } catch { toast.error(`فشل إغلاق أمر الاستلام ${l.number}`); } }}>إغلاق</Button>
    ) : <span className="muted">—</span> },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "مخزون الفريق" }, { label: "عمليات الاستلام" }]}
        title="عمليات استلام المندوبين"
        description="توثيق وإغلاق عمليات الاستلام — مراجعة الكمية المستلمة مقابل المتوقعة (تضمين الأصناف التالفة)"
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="قيد الاستلام" value={String(pending.length)} hint="أمر" icon={<ClipboardCheck size={14} />} />
          <StatCard label="مكتملة" value={String(completed.length)} hint="أمر" icon={<PackageCheck size={14} />} />
        </div>
        <Card title="عمليات الاستلام" subtitle="Supervisor يراجع التسليمات">
          <DataTable columns={columns} rows={loadingOrders} rowKey={(l) => l.id} searchPlaceholder="بحث برقم الأمر أو المندوب..." searchKeys={(l) => `${l.number} ${repName(l.repId)}`} emptyTitle="لا توجد عمليات استلام" pageSize={10} />
        </Card>
      </div>
    </div>
  );
}
