import { useMemo, useState } from "react";
import { MapPin, WifiOff, Send } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/FormControls";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { MockMap } from "@/components/maps/MockMap";
import { formatNumber, timeAgo } from "@/utils/format";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { routeDeviation } from "@/mock/gps";
import { toast } from "@/store/ui";
import type { GpsLocation } from "@/types";

export function FieldMonitoringPage() {
  const { reps, repsLoading, gps, today } = useTeamData();
  const { data: tripExpenses } = useData(() => mockApi.team.tripExpenses());
  const { data: closings } = useData(() => mockApi.team.dailyClosings());
  const [repFilter, setRepFilter] = useState("");

  const rows = useMemo(() => {
    const allowed = repFilter ? reps.filter((r) => r.id === repFilter) : reps;
    return allowed.map((rep) => {
      const gpsRow = (gps ?? []).find((g) => g.userId === rep.id);
      const dev = routeDeviation.find((d) => d.userId === rep.id);
      const offline = !gpsRow || !gpsRow.updatedAt || new Date(gpsRow.updatedAt).getTime() < Date.now() - supervisorPolicies.gps.offlineAfterMinutes * 60 * 1000;
      return { rep, gpsRow, dev, offline };
    });
  }, [reps, gps, repFilter]);

  const offlineCount = rows.filter((r) => r.offline).length;
  const deviationCount = rows.filter((r) => !r.offline && r.dev?.status === "deviation").length;
  const onlineCount = rows.filter((r) => !r.offline).length;

  const pendingExpenses = useMemo(() => (tripExpenses ?? []).filter((e) => e.status === "pending"), [tripExpenses]);
  const pendingClosings = useMemo(() => (closings ?? []).filter((c) => c.status === "draft"), [closings]);

  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? "—";

  const columns: Column<{ rep: (typeof reps)[number]; gpsRow?: GpsLocation; dev?: { status: string; deviationKm?: number }; offline: boolean }>[] = [
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => r.rep.name, priority: "primary", render: (r) => <b>{r.rep.name}</b> },
    { key: "status", header: "حالة GPS", priority: "primary", render: (r) => {
      if (r.offline) return <Badge tone="danger" dot>خارج التغطية</Badge>;
      if (r.dev?.status === "deviation") return <Badge tone="warning" dot>انحراف عن المسار</Badge>;
      if (r.dev?.status === "on_route") return <Badge tone="success" dot>ضمن المسار</Badge>;
      return <Badge tone="neutral">غير نشط</Badge>;
    } },
    { key: "last", header: "آخر تحديث", sortable: true, sortValue: (r) => r.gpsRow?.updatedAt ?? "", priority: "primary", render: (r) => (
      <span className="num">{r.gpsRow?.updatedAt ? timeAgo(r.gpsRow.updatedAt) : "—"}</span>
    ) },
    { key: "coords", header: "الإحداثيات", priority: "optional", render: (r) => (
      <span className="num" style={{ direction: "ltr", display: "inline-block", fontSize: "var(--font-size-xs)" }}>
        {r.gpsRow ? `${r.gpsRow.lat.toFixed(4)}, ${r.gpsRow.lng.toFixed(4)}` : "—"}
      </span>
    ) },
    { key: "speed", header: "السرعة", numeric: true, sortable: true, sortValue: (r) => r.gpsRow?.speed ?? 0, priority: "secondary", render: (r) => <span className="num">{formatNumber(r.gpsRow?.speed ?? 0)} كم/س</span> },
    { key: "sync", header: "التزامن", priority: "secondary", render: (r) => {
      if (r.offline) return <Badge tone="danger">غير متزامن</Badge>;
      if (r.gpsRow?.updatedAt && new Date(r.gpsRow.updatedAt).getTime() > Date.now() - 5 * 60 * 1000) {
        return <Badge tone="success">متزامن</Badge>;
      }
      return <Badge tone="warning">مؤجل</Badge>;
    } },
  ];

  const markers = rows
    .filter((r) => r.gpsRow)
    .map((r) => ({
      id: r.rep.id,
      x: Math.min(95, Math.max(5, ((r.gpsRow!.lng - 39) / 7.8) * 100)),
      y: Math.min(95, Math.max(5, ((24.95 - r.gpsRow!.lat) / 3.45) * 100)),
      label: r.rep.name,
      kind: "rep" as const,
      sublabel: r.offline ? "خارج التغطية" : r.dev?.status === "deviation" ? "انحراف عن المسار" : "ضمن المسار",
    }));

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "المتابعة الميدانية" }]}
        title="متابعة الفريق الميدانية"
        description={`تحديث كل ${supervisorPolicies.gps.intervalMinutes} دقيقة — المناديب خارج التغطية أكثر من ${supervisorPolicies.gps.offlineAfterMinutes} دقيقة يتم تمييزهم تلقائياً`}
      />

      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="متصّلون" value={String(onlineCount)} hint="مندوب" icon={<MapPin size={14} />} />
          <StatCard label="خارج التغطية" value={String(offlineCount)} hint="مندوب" icon={<WifiOff size={14} />} />
          <StatCard label="انحراف عن المسار" value={String(deviationCount)} hint="مندوب" icon={<MapPin size={14} />} />
          <StatCard label="مصروفات بانتظار الاعتماد" value={String(pendingExpenses.length)} hint="مصروف" icon={<Send size={14} />} />
        </div>

        <Card title="خريطة المتابعة اللحظية" subtitle={`${rows.filter((r) => r.gpsRow).length} نقطة متاحة`}>
          <MockMap markers={markers} height={window.innerWidth < 768 ? 300 : 380} />
          <div className="muted" style={{ fontSize: "var(--font-size-xs)", marginTop: 8 }}>
            خريطة توضيحية — المواقع والانحرافات تجريبية لأغراض العرض.
          </div>
        </Card>

        <Card title="حالة المناديب الميدانية" subtitle={`اليوم: ${today}`}>
          <FilterBar>
            <Select
              label="المندوب"
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              placeholder="الكل"
              options={reps.map((r) => ({ value: r.id, label: r.name }))}
            />
          </FilterBar>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.rep.id}
            loading={repsLoading}
            searchPlaceholder="بحث باسم المندوب..."
            searchKeys={(r) => r.rep.name}
            emptyTitle="لا يوجد مندوبون"
            pageSize={10}
          />
        </Card>

        <Card title="ملخص إقفالات اليوم" subtitle={`مسودات الإقفال المعلقة: ${formatNumber(pendingClosings.length)}`}>
          {pendingClosings.length === 0 ? (
            <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد إقفالات بانتظار الاعتماد.</div>
          ) : (
            <div className="list-group">
              {pendingClosings.map((c) => (
                <div key={c.id} className="list-group-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{repName(c.repId)}</div>
                    <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{c.number} · متوقع {formatNumber(c.expectedCash)} ر.س</div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={async () => { try { await mockApi.team.approveClosing(c.id); toast.success("تم اعتماد الإقفال — يُرسل للتحصيل"); } catch { toast.error("فشل اعتماد الإقفال"); } }}>اعتماد</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
