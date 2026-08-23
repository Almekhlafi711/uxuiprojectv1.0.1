import { Link } from "react-router-dom";
import { Users, ShoppingCart, HandCoins, WifiOff, TrendingDown } from "lucide-react";
import { useTeamData, type RepStat } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/States";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { formatMoney, formatNumber } from "@/utils/format";

export function TeamPerformancePage() {
  const { reps, repsLoading, statByRep, totals } = useTeamData();

  const columns: Column<RepStat>[] = [
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => r.rep.name, priority: "primary", render: (r) => (
      <Link to={`/supervisor/team/${r.rep.id}`} style={{ fontWeight: 600 }}>{r.rep.name}</Link>
    ) },
    { key: "sales", header: "مبيعات اليوم", numeric: true, sortable: true, sortValue: (r) => r.todaySales, priority: "primary", render: (r) => <span className="num">{formatMoney(r.todaySales)}</span> },
    { key: "targetSales", header: "هدف المبيعات", numeric: true, sortable: true, sortValue: (r) => r.targetSales, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.targetSales)}</span> },
    { key: "salesPct", header: "الإنجاز", numeric: true, sortable: true, sortValue: (r) => r.targetSales > 0 ? Math.round((r.todaySales / r.targetSales) * 100) : 0, priority: "primary", render: (r) => {
      const pct = r.targetSales > 0 ? Math.round((r.todaySales / r.targetSales) * 100) : 0;
      return <Badge tone={pct >= 80 ? "success" : pct >= 50 ? "warning" : "danger"} dot>{formatNumber(pct)}%</Badge>;
    } },
    { key: "collections", header: "تحصيل اليوم", numeric: true, sortable: true, sortValue: (r) => r.todayCollections, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.todayCollections)}</span> },
    { key: "visits", header: "الزيارات", numeric: true, sortable: true, sortValue: (r) => r.completedVisits, priority: "secondary", render: (r) => <span className="num">{formatNumber(r.completedVisits)} / {formatNumber(r.todayPlannedVisits)}</span> },
    { key: "field", header: "الحالة", priority: "primary", render: (r) => {
      if (r.offline) return <Badge tone="danger" dot>خارج التغطية</Badge>;
      if (r.isInField) return <Badge tone="success" dot>في الميدان</Badge>;
      return <Badge tone="neutral">غير نشط</Badge>;
    } },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "فريقي", path: "/supervisor/team" }, { label: "الأداء" }]}
        title="أداء الفريق"
        description="متابعة المبيعات، التحصيل والزيارات — نطاق فريقك فقط"
      />
      {repsLoading ? <LoadingState label="جارٍ تحميل بيانات الأداء..." /> : (
        <div className="stack" style={{ gap: "var(--space-4)" }}>
          <div className="stat-grid">
            <StatCard label="مبيعات الفريق" value={formatMoney(totals.todaySales)} hint={`هدف: ${formatMoney(totals.targetSales)}`} icon={<ShoppingCart size={14} />} />
            <StatCard label="تحصيل الفريق" value={formatMoney(totals.todayCollections)} hint={`هدف: ${formatMoney(totals.targetCollections)}`} icon={<HandCoins size={14} />} />
            <StatCard label="زيارات مكتملة" value={`${formatNumber(totals.completed)} / ${formatNumber(totals.planned)}`} icon={<TrendingDown size={14} />} />
            <StatCard label="خارج التغطية" value={String(totals.offline)} hint="مندوب" icon={<WifiOff size={14} />} />
          </div>
          <Card title="أداء المناديب" subtitle="ترتيب حسب المبيعات اليوم">
            <DataTable
              columns={columns}
              rows={reps.map((r) => statByRep.get(r.id)).filter((s): s is RepStat => !!s)}
              rowKey={(r) => r.rep.id}
              searchPlaceholder="بحث باسم المندوب..."
              searchKeys={(r) => r.rep.name}
              initialSort={{ key: "salesPct", dir: "desc" }}
              emptyTitle="لا يوجد مندوبون"
              pageSize={10}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
