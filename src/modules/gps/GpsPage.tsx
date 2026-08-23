import { useMemo, useState } from "react";
import { MapPin, PauseCircle, CircleDot } from "lucide-react";
import { gpsLocations, routeDeviation, userByIdForGps } from "@/mock/gps";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { MockMap } from "@/components/maps/MockMap";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { toast } from "@/store/ui";
import { formatDateTime, formatNumber } from "@/utils/format";
import { can } from "@/config/permissions";
import type { GpsLocation } from "@/types";

const devStatusMeta: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  on_route: { label: "ضمن المسار", tone: "success" },
  deviation: { label: "انحراف عن المسار", tone: "warning" },
  offline: { label: "خارج التغطية", tone: "danger" },
};

export function GpsPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.gps.locations());
  const [repFilter, setRepFilter] = useState("");
  const [showSupervisors, setShowSupervisors] = useState(false);

  const isManager = user?.role === "GENERAL_MANAGER" || user?.role === "SALES_MANAGER";
  const teamReps = user?.role === "SUPERVISOR" ? users.filter((u) => u.role === "REPRESENTATIVE" && u.supervisorId === user.id) : [];

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (!isManager) {
      const allowed = user?.role === "SUPERVISOR" ? teamReps.map((r) => r.id) : [user?.id ?? ""];
      rows = rows.filter((g) => allowed.includes(g.userId));
    }
    if (repFilter) rows = rows.filter((g) => g.userId === repFilter);
    if (!showSupervisors) rows = rows.filter((g) => !g.userId.startsWith("u-sp-"));
    return rows;
  }, [data, isManager, user?.role, user?.id, teamReps, repFilter, showSupervisors]);

  const userName = (id: string) => userByIdForGps(id)?.name ?? users.find((u) => u.id === id)?.name ?? "—";
  const dev = (id: string) => routeDeviation.find((d) => d.userId === id);

  const columns: Column<GpsLocation>[] = [
    { key: "name", header: "الموظف", sortable: true, sortValue: (r) => userName(r.userId), priority: "primary", render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: dev(r.userId)?.status === "on_route" ? "var(--color-success)" : dev(r.userId)?.status === "deviation" ? "var(--color-warning)" : "var(--color-danger)", flexShrink: 0 }} />
        <b>{userName(r.userId)}</b>
      </div>
    ) },
    { key: "updatedAt", header: "آخر تحديث", sortable: true, sortValue: (r) => r.updatedAt, priority: "primary", render: (r) => <span className="num">{formatDateTime(r.updatedAt)}</span> },
    { key: "coords", header: "الإحداثيات", priority: "optional", render: (r) => <span className="num" style={{ direction: "ltr", display: "inline-block", fontSize: "var(--font-size-xs)" }}>{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</span> },
    { key: "speed", header: "السرعة (كم/س)", numeric: true, sortable: true, sortValue: (r) => r.speed ?? 0, priority: "secondary", render: (r) => <span className="num">{formatNumber(r.speed ?? 0)}</span> },
    { key: "deviation", header: "الانحراف", numeric: true, sortable: true, sortValue: (r) => dev(r.userId)?.deviationKm ?? 0, priority: "secondary", render: (r) => (
      <span className="num" style={{ color: (dev(r.userId)?.deviationKm ?? 0) > 1 ? "var(--color-warning)" : undefined }}>
        {formatNumber(dev(r.userId)?.deviationKm ?? 0)} كم
      </span>
    ) },    { key: "status", header: "الحالة", priority: "primary", render: (r) => {
      const m = devStatusMeta[dev(r.userId)?.status ?? "on_route"];
      return <Badge tone={m.tone} dot>{m.label}</Badge>;
    } },
  ];

  const markers = filtered
    .filter((g) => g.lat && g.lng)
    .map((g) => ({
      id: g.userId,
      x: Math.min(95, Math.max(5, ((g.lng - 39) / 7.8) * 100)),
      y: Math.min(95, Math.max(5, ((24.95 - g.lat) / 3.45) * 100)),
      label: userName(g.userId),
      kind: (g.userId.startsWith("u-sp-") ? "supervisor" : "rep") as "rep" | "supervisor",
      sublabel: devStatusMeta[dev(g.userId)?.status ?? "on_route"].label,
    }));

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "تتبع المواقع GPS" }]}
        title="تتبع المواقع GPS"
        description="المواقع اللحظية للمناديب والمشرفين والانحراف عن المسار"
        actions={
          <Button variant="secondary" icon={<MapPin size={15} />} onClick={() => { refetch(); toast.success("تم تحديث المواقع — آخر تحديث قبل لحظات"); }}>
            تحديث مباشر
          </Button>
        }
      >

      <FilterBar>
        <Select
          label="الموظف"
          value={repFilter}
          onChange={(e) => setRepFilter(e.target.value)}
          placeholder="الكل"
          options={filtered.map((g) => ({ value: g.userId, label: userName(g.userId) }))}
        />
        {isManager && (
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
            <label className="checkbox">
              <input type="checkbox" checked={showSupervisors} onChange={(e) => setShowSupervisors(e.target.checked)} />
              إظهار المشرفين
            </label>
          </div>
        )}
      </FilterBar>
      </StickyPageHeader>

      <div className="stack" style={{ gap: "var(--space-4)" }}>
      <Card title="خريطة التتبع اللحظي">
        <MockMap markers={markers} height={window.innerWidth < 768 ? 300 : 380} />
        <div className="muted" style={{ fontSize: "var(--font-size-xs)", marginTop: 8 }}>
          خريطة توضيحية — المواقع والانحرافات تجريبية لأغراض العرض.
        </div>
      </Card>

      <div className="stat-grid" style={{ margin: "var(--space-4) 0" }}>
        <StatCard label="ضمن المسار" value={String(filtered.filter((g) => dev(g.userId)?.status === "on_route").length)} hint="مندوب" icon={<CircleDot size={14} />} />
        <StatCard label="انحراف عن المسار" value={String(filtered.filter((g) => dev(g.userId)?.status === "deviation").length)} hint="مندوب" icon={<MapPin size={14} />} />
        <StatCard label="خارج التغطية" value={String(filtered.filter((g) => dev(g.userId)?.status === "offline").length)} hint="مندوب" icon={<PauseCircle size={14} />} />
      </div>
    </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.userId}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث بالاسم..."
        searchKeys={(r) => userName(r.userId)}
        exportFilename="gps-locations"
        pageSize={10}
        emptyTitle="لا توجد بيانات تتبع"
      />
    </div>
  );
}