import { Truck, CheckCircle, XCircle, Warehouse, User } from "lucide-react";
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
import type { StockTransfer } from "@/types";

export function TeamInventoryTransfersPage() {
  const { stockTransfers, reps } = useTeamData();
  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? id;
  const inTransit = stockTransfers.filter((t) => t.status === "pending" || t.status === "in_transit");
  const completed = stockTransfers.filter((t) => t.status === "completed");

  const columns: Column<StockTransfer>[] = [
    { key: "number", header: "التحويل", priority: "primary", sortable: true, sortValue: (t) => t.number, render: (t) => <b className="num">{t.number}</b> },
    { key: "from", header: "المصدر", priority: "primary", render: (t) => t.fromWarehouseId ? <span className="muted">مستودع: {t.fromWarehouseId}</span> : <span className="muted">—</span> },
    { key: "to", header: "الوجهة", priority: "primary", render: (t) => t.toRepId ? repName(t.toRepId) : (t.toWarehouseId ? t.toWarehouseId : "مستودع") },
    { key: "items", header: "الكمية", numeric: true, priority: "secondary", render: (t) => <span className="num">{formatNumber(t.items.reduce((a, i) => a + i.qty, 0))}</span> },
    { key: "createdBy", header: "أنشاءها", priority: "secondary", render: (t) => <span>{t.createdBy}</span> },
    { key: "date", header: "التاريخ", priority: "secondary", sortable: true, sortValue: (t) => t.date, render: (t) => <span className="num">{formatDateShort(t.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (t) => (
      <Badge tone={t.status === "completed" ? "success" : t.status === "in_transit" ? "warning" : t.status === "cancelled" ? "danger" : "info"} dot>
        {t.status === "completed" ? "مكتمل" : t.status === "in_transit" ? "قيد النقل" : t.status === "pending" ? "بانتظار الاستلام" : t.status === "cancelled" ? "ملغي" : t.status}
      </Badge>
    ) },
    { key: "receivingRule", header: "إثبات الاستلام", priority: "secondary", render: () => (
      <Badge tone={supervisorPolicies.stockTransferPolicy.receivingRequired ? "success" : "neutral"} dot>
        {supervisorPolicies.stockTransferPolicy.receivingRequired ? "مطلوب" : "اختياري"}
      </Badge>
    ) },
    { key: "actions", header: "", priority: "primary", render: (t) => t.status === "pending" && supervisorPolicies.stockTransferPolicy.receivingRequired ? (
      <Button variant="ghost" size="sm" icon={<CheckCircle size={14} />} onClick={async () => { try { await mockApi.team.confirmTransfer(t.id); toast.success(`تم تأكيد استلام التحويل ${t.number}`); } catch { toast.error(`فشل تأكيد استلام التحويل ${t.number}`); } }}>تأكيد استلام</Button>
    ) : <span className="muted">—</span> },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "مخزون الفريق" }, { label: "التحويلات" }]}
        title="تحويلات المخزون"
        description={`التحويلات بين المناديب/المستودعات — الحد إعلام: ${supervisorPolicies.crossTerritoryAllowed ? "مسموح" : "محظور"}`}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="معلق/في النقل" value={String(inTransit.length)} hint="تحويل" icon={<Truck size={14} />} />
          <StatCard label="مكتمل" value={String(completed.length)} hint="تحويل" icon={<CheckCircle size={14} />} />
        </div>
        <Card title="قائمة التحويلات" subtitle="دورة: Supervisor review → Rep receiving">
          <DataTable columns={columns} rows={stockTransfers} rowKey={(t) => t.id} searchPlaceholder="بحث برقم التحويل..." searchKeys={(t) => `${t.number} ${t.createdBy}`} emptyTitle="لا توجد تحويلات" pageSize={10} />
        </Card>
      </div>
    </div>
  );
}
