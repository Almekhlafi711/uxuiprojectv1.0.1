import { Link } from "react-router-dom";
import { MapPin, Wifi, WifiOff, Clock, PackageCheck, BarChart3 } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { MockMap, type MapMarker } from "@/components/maps/MockMap";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { LoadingState } from "@/components/ui/States";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { formatNumber } from "@/utils/format";
import { routeDeviation } from "@/mock/gps";
import type { User } from "@/types";

const toXY = (lat: number, lng: number) => ({
  x: Number(((lng - 46.55) / (46.75 - 46.55)) * 100) || 0,
  y: 100 - Number(((lat - 21.3) / (24.9 - 21.3)) * 100) || 0,
});

interface GpsRow {
  rep: User;
  location: { lat: number; lng: number; updatedAt: string; speed?: number } | undefined;
  deviation: { status: string; deviationKm: number; lastCheck: string; locationName: string } | undefined;
  offline: boolean;
  inField: boolean;
}

export function TeamGpsPage() {
  const { reps, gps, trips, visits, customers, statByRep } = useTeamData();
  const { SYSTEM_TODAY: today } = { SYSTEM_TODAY: supervisorPolicies.activePeriod.currentMonth };
  const rows: GpsRow[] = (reps ?? []).map((rep) => {
    const location = gps.find((g) => g.userId === rep.id);
    const deviation = routeDeviation.find((d) => d.userId === rep.id);
    const now = new Date(today + "T10:35:00");
    const lastUpdate = location?.updatedAt ? new Date(location.updatedAt) : undefined;
    const offline = !lastUpdate || now.getTime() - lastUpdate.getTime() > supervisorPolicies.gps.offlineAfterMinutes * 60 * 1000;
    const inField = (trips ?? []).some((t) => t.repId === rep.id && t.date === supervisorPolicies.activePeriod.currentMonth && (t.status === "in_progress" || t.status === "paused"));
    return { rep, location, deviation, offline, inField };
  });

  const markers: MapMarker[] = rows.map((r) => ({
    id: r.rep.id,
    ...toXY(r.location?.lat ?? 24.8, r.location?.lng ?? 46.65),
    label: r.rep.name,
    kind: "rep",
    sublabel: r.offline ? "غير متصل" : r.deviation?.status === "deviation" ? "ينحرف عن المسار" : r.inField ? "في الميدان" : "خامض",
  }));

  const columns: Column<GpsRow>[] = [
    { key: "rep", header: "المندوب", priority: "primary", render: (r) => <b>{r.rep.name}</b> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => (
      r.offline ? <Badge tone="danger" dot>غير متصل</Badge> : r.deviation?.status === "deviation" ? <Badge tone="warning" dot>يحرك عن المسار</Badge>
      : r.inField ? <Badge tone="success" dot>في الميدان</Badge> : <Badge tone="neutral" dot>خامض</Badge>
    ) },
    { key: "location", header: "آخر موقع", priority: "secondary", render: (r) => <span className="muted">{r.location ? r.location.updatedAt : "—"}</span> },
    { key: "deviation", header: "الانحراف", priority: "secondary", render: (r) => r.deviation ? <span className="num">{r.deviation.deviationKm} كم</span> : <span className="muted">—</span> },
    { key: "actions", header: "", priority: "primary", render: (r) => (
      <Link to={`/supervisor/team/${r.rep.id}`}><Badge tone="neutral">عرض</Badge></Link>
    ) },
  ];

  const onlineReps = rows.filter((r) => !r.offline).length;
  const deviationReps = rows.filter((r) => r.deviation?.status === "deviation").length;
  const offlineReps = rows.filter((r) => r.offline).length;
  const inFieldReps = rows.filter((r) => r.inField).length;

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "المتابعة الميدانية" }, { label: "خريطة الفريق" }]}
        title="متابعة موقع الفريق"
        description="مواقع المناديب الحية والمتزامنة — نطاق الفريق فقط"
        quickActions={
          <div className="quick-actions">
            <StatCard label="متصلون" value={String(onlineReps)} icon={<Wifi size={14} />} />
            <StatCard label="خارج التغطية" value={String(offlineReps)} icon={<WifiOff size={14} />} />
            <StatCard label="يحركون عن المسار" value={String(deviationReps)} icon={<MapPin size={14} />} />
            <StatCard label="في الميدان" value={String(inFieldReps)} icon={<PackageCheck size={14} />} />
          </div>
        }
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="مواقع المناديب" subtitle={`إخلاء للكرتين — آخر تحديث ${supervisorPolicies.gps.intervalMinutes} دقيقة`}>
          <MockMap
            markers={markers}
            height={420}
            legend={[
              { label: "متصل", color: "var(--color-success)" },
              { label: "غير متصل", color: "var(--color-danger)" },
              { label: "يحرك عن المسار", color: "var(--color-warning)" },
            ]}
          />
        </Card>
        <Card title="جدول المتابعة" subtitle="حالة كل مندوب">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.rep.id}
            searchPlaceholder="بحث باسم المندوب..."
            searchKeys={(r) => r.rep.name}
            emptyTitle="لا يوجد مندوبون"
            pageSize={8}
          />
        </Card>
      </div>
    </div>
  );
}
