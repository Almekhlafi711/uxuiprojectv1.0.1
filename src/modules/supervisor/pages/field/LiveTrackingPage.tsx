import { useState, useEffect } from "react";
import { RefreshCw, Wifi, WifiOff, MapPin } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { MockMap, type MapMarker } from "@/components/maps/MockMap";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { LoadingState } from "@/components/ui/States";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { supervisorPolicies, SYSTEM_TIME } from "@/config/supervisorPolicies";
import { formatNumber } from "@/utils/format";
import { routeDeviation } from "@/mock/gps";
import type { User } from "@/types";

const SYNC_THRESHOLD_MIN = supervisorPolicies.gps.offlineAfterMinutes;

const toXY = (lat: number, lng: number) => ({
  x: Number(((lng - 46.55) / (46.75 - 46.55)) * 100) || 0,
  y: 100 - Number(((lat - 21.3) / (24.9 - 21.3)) * 100) || 0,
});

interface LiveRow {
  rep: User;
  lat?: number;
  lng?: number;
  updatedAt?: string;
  speed?: number;
  syncState: "live" | "synced" | "offline";
  deviationKm: number;
}

export function LiveTrackingPage() {
  const { reps, gps } = useTeamData();
  const now = new Date(`2026-08-14T${SYSTEM_TIME}`);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const rows: LiveRow[] = (reps ?? []).map((rep) => {
    const loc = gps.find((g) => g.userId === rep.id);
    const dev = routeDeviation.find((d) => d.userId === rep.id);
    let syncState: LiveRow["syncState"] = "offline";
    if (loc?.updatedAt) {
      const last = new Date(loc.updatedAt);
      const mins = (now.getTime() - last.getTime()) / 60000;
      syncState = mins < 2 ? "live" : mins < SYNC_THRESHOLD_MIN ? "synced" : "offline";
    }
    return {
      rep, lat: loc?.lat, lng: loc?.lng, updatedAt: loc?.updatedAt, speed: loc?.speed,
      syncState, deviationKm: dev?.deviationKm ?? 0,
    };
  });

  const markers: MapMarker[] = rows.map((r) => ({
    id: r.rep.id,
    ...toXY(r.lat ?? 24.8, r.lng ?? 46.65),
    label: r.rep.name.split(" ")[0],
    kind: "rep",
    sublabel: r.syncState === "live" ? "LIVE" : r.syncState === "synced" ? "متزامن" : "غير متصل",
  }));

  const columns: Column<LiveRow>[] = [
    { key: "rep", header: "المندوب", priority: "primary", render: (r) => <b>{r.rep.name}</b> },
    { key: "sync", header: "حالة الاتصال", priority: "primary", render: (r) => {
      const color = r.syncState === "live" ? "success" : r.syncState === "synced" ? "warning" : "danger";
      const label = r.syncState === "live" ? "LIVE" : r.syncState === "synced" ? "Last Synced" : "Offline";
      return <Badge tone={color} dot>{label} · {r.updatedAt ?? "—"}</Badge>;
    } },
    { key: "speed", header: "السرعة", numeric: true, priority: "secondary", render: (r) => <span className="num">{r.speed ?? 0} كم/س</span> },
    { key: "deviation", header: "الانحراف", numeric: true, priority: "secondary", render: (r) => <span className="num">{formatNumber(r.deviationKm)} كم</span> },
    { key: "view", header: "", priority: "secondary", render: (r) => (
      <Button variant="ghost" size="sm" onClick={() => window.open(`/supervisor/team/${r.rep.id}`, "_blank")}>عرض</Button>
    ) },
  ];

  const liveCount = rows.filter((r) => r.syncState === "live").length;
  const syncedCount = rows.filter((r) => r.syncState === "synced").length;
  const offlineCount = rows.filter((r) => r.syncState === "offline").length;

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "المتابعة الميدانية" }, { label: "المواقع الحية" }]}
        title="التتبع اللحظي"
        description={`LIVE مقابل Last Synced — فاصل التحديث: ${supervisorPolicies.gps.intervalMinutes} دقيقة (الآن: ${now.toTimeString().slice(0, 8)})`}
        actions={<Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => setTick((t) => t + 1)}>تحديث</Button>}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="LIVE" value={String(liveCount)} icon={<Wifi size={14} />} />
          <StatCard label="Last Synced" value={String(syncedCount)} icon={<MapPin size={14} />} />
          <StatCard label="Offline" value={String(offlineCount)} icon={<WifiOff size={14} />} />
        </div>
        <Card title="خريطة المتابعة اللحظية" subtitle="LIVE = تحديث خلال آخر 2دقيقة | Last Synced = خلال 30دقيقة | Offline = لم يرسل">
          <MockMap markers={markers} height={420} />
        </Card>
        <Card title="جدول الحالة" subtitle="التفعيل التلقائي كل دقيقة">
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.rep.id} emptyTitle="لا يوجد مندوبون" pageSize={8} />
        </Card>
      </div>
    </div>
  );
}
