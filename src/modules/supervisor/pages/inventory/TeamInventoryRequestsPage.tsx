import { PackageCheck, CheckCircle, XCircle } from "lucide-react";
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
import type { StockRequest } from "@/types";

export function TeamInventoryRequestsPage() {
  const { stockRequests, reps, statByRep } = useTeamData();
  const pending = stockRequests.filter((r) => r.status === "pending");

  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? id;

  const columns: Column<StockRequest>[] = [
    { key: "number", header: "الرقم", priority: "primary", sortable: true, sortValue: (r) => r.number, render: (r) => <b className="num">{r.number}</b> },
    { key: "rep", header: "المندوب", priority: "primary", render: (r) => <span>{repName(r.repId)}</span> },
    { key: "items", header: "الكمية", priority: "secondary", numeric: true, sortable: true, sortValue: (r) => r.items.reduce((a, i) => a + i.qty, 0), render: (r) => <span className="num">{formatNumber(r.items.reduce((a, i) => a + i.qty, 0))}</span> },
    { key: "date", header: "التاريخ", priority: "secondary", sortable: true, sortValue: (r) => r.date, render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => (
      <Badge tone={r.status === "approved" ? "success" : r.status === "pending" ? "warning" : r.status === "rejected" ? "danger" : "neutral"} dot>
        {r.status === "approved" ? "معتمد" : r.status === "pending" ? "قيد المراجعة" : r.status === "rejected" ? "مرفوض" : r.status}
      </Badge>
    ) },
    { key: "actions", header: "", priority: "primary", render: (r) => r.status === "pending" ? (
        <Button variant="ghost" size="sm" icon={<CheckCircle size={14} />} onClick={async () => { try { await mockApi.team.approveStockRequest(r.id); toast.success(`تمت الموافقة على طلب ${r.number}`); } catch { toast.error(`فشل الموافقة على طلب ${r.number}`); } }}>موافقة</Button>
    ) : <span className="muted">—</span> },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "مخزون الفريق" }, { label: "طلبات البضاعة" }]}
        title="طلبات البضاعة"
        description={`المشرف يراجع ويوافق طلبات البضاعة — الحد الأقصى/معاملة: ${supervisorPolicies.stockTransferPolicy.quantityLimitPerTransaction} وحدة`}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="طلبات معلقة" value={String(pending.length)} hint="طلب" icon={<PackageCheck size={14} />} />
          <StatCard label="إجمالي الطلبات" value={String(stockRequests.length)} hint="طلب" icon={<PackageCheck size={14} />} />
        </div>
        <Card title="طلبات البضاعة" subtitle="مراجعة واعتماد">
          <DataTable columns={columns} rows={stockRequests} rowKey={(r) => r.id} searchPlaceholder="بحث برقم الطلب أو المندوب..." searchKeys={(r) => `${r.number} ${repName(r.repId)}`} emptyTitle="لا توجد طلبات بضاعة" pageSize={10} />
        </Card>
        <Card title="سياسة المراجعة">
          <ul style={{ display: "grid", gap: 6, fontSize: "var(--font-size-sm)", paddingLeft: 20 }}>
            <li>المراجعة تأتي قبل الموافقة النهائية.</li>
            <li>التحويلات بين المناطق داخل الفريق: ${supervisorPolicies.crossTerritoryAllowed ? "مسموحة" : "محمية"} — الحظر على المندوب يُلغي العملية.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
