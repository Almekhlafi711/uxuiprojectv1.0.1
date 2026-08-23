import { useMemo } from "react";
import { Warehouse, Truck, Package } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { formatNumber, formatDateShort } from "@/utils/format";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import type { StockTransfer, VanStock, StockRequest } from "@/types";

export function TeamInventoryPage() {
  const { reps, trips, stockRequests, stockTransfers, vanStock, warehouseStock, loadingOrders } = useTeamData();

  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? "—";
  const activeTrips = useMemo(() => trips.filter((t) => t.status === "in_progress" || t.status === "paused"), [trips]);

  const totalUnits = (vanStock ?? []).reduce((a, v) => a + v.items.reduce((x, i) => x + i.qty, 0), 0);
  const warehouseUnits = (warehouseStock ?? []).reduce((a, v) => a + v.available, 0);
  const pendingTransfers = (stockTransfers ?? []).filter((t) => t.status === "pending" || t.status === "in_transit").length;
  const pendingRequests = (stockRequests ?? []).filter((r) => r.status === "pending").length;
  const pendingLoading = (loadingOrders ?? []).filter((l) => l.status === "pending").length;

  const stockColumns: Column<VanStock>[] = [
    { key: "rep", header: "المندوب", sortable: true, sortValue: (v) => repName(v.repId), priority: "primary", render: (v) => <b>{repName(v.repId)}</b> },
    { key: "items", header: "عدد الأصناف", numeric: true, sortable: true, sortValue: (v) => v.items.length, priority: "primary", render: (v) => <span className="num">{formatNumber(v.items.length)}</span> },
    { key: "units", header: "إجمالي الوحدات", numeric: true, sortable: true, sortValue: (v) => v.items.reduce((a, i) => a + i.qty, 0), priority: "primary", render: (v) => <span className="num">{formatNumber(v.items.reduce((a, i) => a + i.qty, 0))}</span> },
    { key: "updated", header: "آخر تحديث", priority: "secondary", render: (v) => <span className="num">{formatDateShort(v.updatedAt)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (v) => (
      <Badge tone={activeTrips.some((t) => t.repId === v.repId) ? "success" : "neutral"} dot>{activeTrips.some((t) => t.repId === v.repId) ? "في الميدان" : "متاح"}</Badge>
    ) },
  ];

  const transferColumns: Column<StockTransfer>[] = [
    { key: "number", header: "التحويل", sortable: true, sortValue: (t) => t.number, priority: "primary", render: (t) => <b className="num">{t.number}</b> },
    { key: "to", header: "الوجهة", priority: "primary", render: (t) => t.toRepId ? repName(t.toRepId) : (t.toWarehouseId ?? "مستودع") },
    { key: "items", header: "الأصناف", numeric: true, priority: "secondary", render: (t) => <span className="num">{formatNumber(t.items.reduce((a, i) => a + i.qty, 0))}</span> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (t) => t.date, priority: "secondary", render: (t) => <span className="num">{formatDateShort(t.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (t) => (
      <Badge tone={t.status === "completed" ? "success" : t.status === "in_transit" ? "warning" : t.status === "cancelled" ? "danger" : "neutral"} dot>
        {t.status === "completed" ? "مكتمل" : t.status === "in_transit" ? "قيد النقل" : t.status === "pending" ? "بانتظار الاستلام" : t.status === "cancelled" ? "ملغي" : "مسودة"}
      </Badge>
    ) },
  ];

  const requestColumns: Column<StockRequest>[] = [
    { key: "number", header: "الطلب", sortable: true, sortValue: (r) => r.number, priority: "primary", render: (r) => <b className="num">{r.number}</b> },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => repName(r.repId), priority: "primary", render: (r) => repName(r.repId) },
    { key: "items", header: "الكمية", numeric: true, priority: "secondary", render: (r) => <span className="num">{formatNumber(r.items.reduce((a, i) => a + i.qty, 0))}</span> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "secondary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => (
      <Badge tone={r.status === "approved" ? "success" : r.status === "pending" ? "warning" : r.status === "rejected" ? "danger" : "neutral"} dot>
        {r.status === "approved" ? "معتمد" : r.status === "pending" ? "قيد المراجعة" : r.status === "rejected" ? "مرفوض" : "مسودة"}
      </Badge>
    ) },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "مخزون الفريق" }]}
        title="مخزون الفريق"
        description={`سياسة التحويلات: ${supervisorPolicies.stockTransferPolicy.receivingRequired ? "تتطلب تأكيد استلام المندوب" : "دون تأكيد استلام"} — التحويلات عبر المناطق داخل الفريق ${supervisorPolicies.crossTerritoryAllowed ? "مسموحة" : "ممنوعة"} — الحد الأقصى للمعاملة: ${supervisorPolicies.stockTransferPolicy.quantityLimitPerTransaction} وحدة`}
      />

      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="وحدات بالمخزون المتنقل" value={formatNumber(totalUnits)} hint="وحدة" icon={<Warehouse size={14} />} />
          <StatCard label="تحويلات معلقة" value={String(pendingTransfers)} hint="تحويل" icon={<Truck size={14} />} />
          <StatCard label="طلبات بضاعة معلقة" value={String(pendingRequests)} hint="طلب" icon={<Package size={14} />} />
          <StatCard label="استلامات معلقة" value={String(pendingLoading)} hint="استلام" icon={<Package size={14} />} />
        </div>

          <Card title="الوحدات بالمخزون المتنقل" subtitle="مخزون المناديل">
          <DataTable
            columns={stockColumns}
            rows={vanStock ?? []}
            rowKey={(v) => v.repId}
            loading={false}
            emptyTitle="لا توجد بيانات مخزون متنقل"
            pageSize={8}
          />
        </Card>

        <Card title="التحويلات" subtitle={`بيانات المستودع: ${formatNumber(warehouseUnits)} وحدة`}>
          <DataTable
            columns={transferColumns}
            rows={stockTransfers ?? []}
            rowKey={(t) => t.id}
            loading={false}
            emptyTitle="لا توجد تحويلات"
            pageSize={8}
          />
        </Card>

        <Card title="طلبات البضاعة">
          <DataTable
            columns={requestColumns}
            rows={stockRequests ?? []}
            rowKey={(r) => r.id}
            loading={false}
            emptyTitle="لا توجد طلبات بضاعة"
            pageSize={8}
          />
        </Card>
      </div>
    </div>
  );
}
