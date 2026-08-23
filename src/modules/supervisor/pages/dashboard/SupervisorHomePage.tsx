import { Link } from "react-router-dom";
import {
  Users,
  ShoppingCart,
  HandCoins,
  MapPin,
  WifiOff,
  FileCheck2,
  CalendarCheck,
  Wallet,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { can } from "@/config/permissions";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { unifiedQuickActions } from "@/config/dashboardActions";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/States";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { useTeamData, type RepStat } from "@/modules/supervisor/hooks/useTeamData";
import { formatMoney, formatNumber } from "@/utils/format";

export function SupervisorHomePage() {
  const { user } = useAuthStore();
  const role = user?.role ?? "SUPERVISOR";
  const { reps, repsLoading, statByRep, totals, today, approvals, supervisorAlerts } = useTeamData();

  const pendingWorkflows = approvals
    .filter((a) => ["pending", "submitted", "under_review"].includes(a.status))
    .slice(0, 5);

  const visitRatio = totals.planned > 0 ? Math.round((totals.completed / totals.planned) * 100) : 0;
  const collectionRatio = totals.targetCollections > 0 ? Math.round((totals.todayCollections / totals.targetCollections) * 100) : 0;

  const columns: Column<RepStat>[] = [
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => r.rep.name, priority: "primary", render: (r) => (
      <Link to={`/supervisor/team/${r.rep.id}`} style={{ fontWeight: 600 }}>{r.rep.name}</Link>
    ) },
    { key: "visits", header: "الزيارات", numeric: true, sortable: true, sortValue: (r) => r.completedVisits, priority: "primary", render: (r) => (
      <span className="num">{formatNumber(r.completedVisits)} / {formatNumber(r.todayPlannedVisits)}</span>
    ) },
    { key: "sales", header: "مبيعات اليوم", numeric: true, sortable: true, sortValue: (r) => r.todaySales, priority: "primary", render: (r) => <span className="num">{formatMoney(r.todaySales)}</span> },
    { key: "collections", header: "تحصيل اليوم", numeric: true, sortable: true, sortValue: (r) => r.todayCollections, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.todayCollections)}</span> },
    { key: "field", header: "الحالة الميدانية", priority: "primary", render: (r) => {
      if (r.offline) return <Badge tone="danger" dot>خارج التغطية</Badge>;
      if (r.isInField) return <Badge tone="success" dot>في الميدان</Badge>;
      return <Badge tone="neutral">غير نشط</Badge>;
    } },
    { key: "closing", header: "إقفال اليوم", priority: "secondary", render: (r) => {
      if (r.closingStatus === "done") return <Badge tone="success">مكتمل</Badge>;
      if (r.closingStatus === "draft") return <Badge tone="warning">مسودة</Badge>;
      return <Badge tone="neutral">لم يُرسل</Badge>;
    } },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "لوحة المشرف" }]}
        title="لوحة المشرف"
        description="نظرة لحظية على فريقك: المبيعات، التحصيل، المتابعة الميدانية والاعتمادات"
      />
      {/* العمليات السريعة الموحدة — مثبتة برأس الصفحة */}
      <DashboardQuickActions actions={unifiedQuickActions} sticky />

      {repsLoading ? (
        <LoadingState label="جارٍ تحميل بيانات الفريق..." />
      ) : (
        <div className="stack" style={{ gap: "var(--space-4)" }}>
          <div className="stat-grid">
            <StatCard label="حجم الفريق" value={String(totals.teamSize)} hint="مندوب" icon={<Users size={14} />} />
            <StatCard label="مبيعات اليوم" value={formatMoney(totals.todaySales)} hint={`مستهدف الشهر: ${formatMoney(totals.targetSales)}`} icon={<ShoppingCart size={14} />} />
            <StatCard label="تحصيل اليوم" value={formatMoney(totals.todayCollections)} hint={`نسبة التحصيل: ${formatNumber(collectionRatio)}%`} icon={<HandCoins size={14} />} />
            <StatCard label="زيارات مكتملة" value={`${formatNumber(totals.completed)} / ${formatNumber(totals.planned)}`} hint={`نسبة الإنجاز: ${formatNumber(visitRatio)}%`} icon={<CalendarCheck size={14} />} />
            <StatCard label="في الميدان حالياً" value={String(totals.inField)} hint="مندوب" icon={<MapPin size={14} />} />
            <StatCard label="خارج التغطية" value={String(totals.offline)} hint="مندوب — تنبيه GPS" icon={<WifiOff size={14} />} />
            <StatCard label="متأخر/مسار منحرف" value={String(totals.lateReps)} hint="تنبيه تشغيلي" icon={<AlertCircle size={14} />} />
          </div>

          <Card
            title="فريق اليوم"
            subtitle={`تحديث لحظي — ${today}`}
            actions={<Link to="/supervisor/team"><Button variant="ghost" icon={<ArrowLeft size={14} />}>عرض التفاصيل</Button></Link>}
          >
            <DataTable
              columns={columns}
              rows={reps.map((r) => statByRep.get(r.id)).filter((s): s is RepStat => !!s)}
              rowKey={(r) => r.rep.id}
              searchPlaceholder="بحث باسم المندوب..."
              searchKeys={(r) => r.rep.name}
              emptyTitle="لا يوجد مندوبون في فريقك"
              pageSize={8}
            />
          </Card>

          <Card title="طلبات الاعتماد في انتظار المراجعة" subtitle={`إجمالي معلق: ${formatNumber(totals.pendingApprovals)}`}>
            {pendingWorkflows.length === 0 ? (
              <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد طلبات معلقة حالياً.</div>
            ) : (
              <div className="list-group">
                {pendingWorkflows.map((a) => (
                  <div key={a.id} className="list-group-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{a.title}</div>
                      <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{a.number} · طلب من {a.requestedBy} · {a.date}</div>
                    </div>
                    <Badge tone={a.priority === "high" ? "danger" : a.priority === "normal" ? "warning" : "neutral"}>{a.status === "submitted" ? "مرسل" : a.status === "under_review" ? "قيد المراجعة" : "بانتظار الاعتماد"}</Badge>
                    <Link to="/supervisor/requests"><Button variant="ghost" size="sm">مراجعة</Button></Link>
                  </div>
                ))}
              </div>
            )}
            {can("supervisor.requests", role) && (
              <div style={{ marginTop: 12 }}>
                <Link to="/supervisor/requests"><Button variant="secondary" size="sm">عرض كل الطلبات</Button></Link>
              </div>
            )}
          </Card>

          {supervisorAlerts.length > 0 && (
            <Card title="تنبيهات التشغيل" subtitle={`إجمالي التنبيهات: ${supervisorAlerts.length}`}>
              <div className="list-group">
                {supervisorAlerts.slice(0, 5).map((a, i) => (
                  <div key={i} className="list-group-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{a.repName || "النظام"}</div>
                      <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{a.message}</div>
                    </div>
                    <Badge tone={a.severity === "high" ? "danger" : a.severity === "warning" ? "warning" : "neutral"}>{a.type}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
