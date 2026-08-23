import { useMemo, useState } from "react";
import { Users, Activity, WifiOff, MapPin } from "lucide-react";
import { users, supervisors, reps } from "@/mock/users";
import { territories } from "@/mock/organization";
import { visits } from "@/mock/visits";
import { invoices } from "@/mock/sales";
import { customers } from "@/mock/customers";
import { gpsLocations, routeDeviation, userByIdForGps } from "@/mock/gps";
import { TODAY } from "@/config/date";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Progress } from "@/components/ui/Progress";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { formatMoney, formatNumber, formatDateTime } from "@/utils/format";

const supervisorName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
const repName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
const territoryName = (id: string) => territories.find((t) => t.id === id)?.name ?? id;

export function TrackingOverviewPage() {
  const [tab, setTab] = useState("map");

  const todayVisitsList = useMemo(() => visits.filter((v) => v.date === TODAY), []);

  const todayInvoices = useMemo(() => invoices.filter((i) => i.date === TODAY), []);

  const activeToday = useMemo(() => {
    const todayStr = TODAY;
    return [...supervisors, ...reps].filter((u) => {
      const last = u.lastActiveAt ?? "";
      return last.startsWith(todayStr);
    });
  }, []);

  const offlineCount = useMemo(() => {
    const todayStr = TODAY;
    return [...supervisors, ...reps].filter((u) => {
      const last = u.lastActiveAt ?? "";
      return !last.startsWith(todayStr);
    }).length;
  }, []);

  const avgVisitsToday = useMemo(() => {
    if (reps.length === 0) return 0;
    return Math.round(todayVisitsList.length / reps.length);
  }, [todayVisitsList.length]);

  const totalTracked = supervisors.length + reps.length;

  const supervisorActivity = useMemo(() => {
    return supervisors.map((sp) => {
      const territory = territories.find((t) => t.supervisorId === sp.id);
      const teamReps = reps.filter((r) => r.supervisorId === sp.id);
      const teamRepIds = teamReps.map((r) => r.id);
      const teamVisits = todayVisitsList.filter((v) => teamRepIds.includes(v.repId));
      const teamInvoices = todayInvoices.filter((i) => teamRepIds.includes(i.repId));
      const teamSales = teamInvoices.reduce((s, i) => s + i.total, 0);
      const gps = gpsLocations.find((g) => g.userId === sp.id);
      const dev = routeDeviation.find((d) => d.userId === sp.id);
      const todayStr = TODAY;
      const isActive = (sp.lastActiveAt ?? "").startsWith(todayStr);

      return {
        id: sp.id,
        name: sp.name,
        territory: territory?.name ?? "—",
        status: isActive ? "active" : "offline",
        lastCheckIn: gps?.updatedAt ?? sp.lastActiveAt ?? "—",
        todayVisits: teamVisits.length,
        teamSales,
        deviationStatus: dev?.status ?? "on_route",
      };
    });
  }, [todayVisitsList, todayInvoices]);

  const repActivity = useMemo(() => {
    return reps.map((rp) => {
      const sp = users.find((u) => u.id === rp.supervisorId);
      const gps = gpsLocations.find((g) => g.userId === rp.id);
      const dev = routeDeviation.find((d) => d.userId === rp.id);
      const todayStr = TODAY;
      const isActive = (rp.lastActiveAt ?? "").startsWith(todayStr);
      const rpVisits = todayVisitsList.filter((v) => v.repId === rp.id);
      const rpInvoices = todayInvoices.filter((i) => i.repId === rp.id);
      const rpSales = rpInvoices.reduce((s, i) => s + i.total, 0);
      const hasGps = !!gps;

      return {
        id: rp.id,
        name: rp.name,
        supervisor: sp?.name ?? "—",
        status: isActive ? "active" : "offline",
        lastCheckIn: gps?.updatedAt ?? rp.lastActiveAt ?? "—",
        todayVisits: rpVisits.length,
        todaySales: rpSales,
        gpsEnabled: hasGps,
        deviationStatus: dev?.status ?? "on_route",
      };
    });
  }, [todayVisitsList, todayInvoices]);

  const territoryCoverage = useMemo(() => {
    return territories.map((t) => {
      const sp = users.find((u) => u.id === t.supervisorId);
      const tCustomers = customers.filter((c) => c.territoryId === t.id && c.status === "active");
      const visitedToday = tCustomers.filter((c) =>
        todayVisitsList.some((v) => v.customerId === c.id)
      ).length;
      const coveragePct = tCustomers.length > 0 ? Math.round((visitedToday / tCustomers.length) * 100) : 0;

      return {
        id: t.id,
        name: t.name,
        supervisor: sp?.name ?? "—",
        totalCustomers: tCustomers.length,
        visitedToday,
        coveragePct,
      };
    });
  }, [todayVisitsList]);

  const mapMarkers = useMemo(() => {
    const markers: { id: string; x: number; y: number; label: string; kind: "supervisor" | "rep" | "customer"; sublabel?: string }[] = [];
    gpsLocations.forEach((g) => {
      const isSupervisor = g.userId.startsWith("u-sp-");
      const name = userByIdForGps(g.userId)?.name ?? g.userId;
      markers.push({
        id: g.userId,
        x: Math.min(95, Math.max(5, ((g.lng - 39) / 7.8) * 100)),
        y: Math.min(95, Math.max(5, ((24.95 - g.lat) / 3.45) * 100)),
        label: name,
        kind: isSupervisor ? "supervisor" : "rep",
        sublabel: routeDeviation.find((d) => d.userId === g.userId)?.status === "on_route" ? "ضمن المسار" : routeDeviation.find((d) => d.userId === g.userId)?.status === "deviation" ? "انحراف" : "غير نشط",
      });
    });
    return markers;
  }, []);

  const supColumns: Column<typeof supervisorActivity[number]>[] = [
    { key: "name", header: "المشرف", sortable: true, sortValue: (r) => r.name, priority: "primary", render: (r) => <b>{r.name}</b> },
    { key: "territory", header: "المنطقة", priority: "secondary", render: (r) => <Badge tone="info">{r.territory}</Badge> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <Badge tone={r.status === "active" ? "success" : "danger"} dot>{r.status === "active" ? "نشط" : "غير نشط"}</Badge> },
    { key: "lastCheckIn", header: "آخر تسجيل", sortable: true, sortValue: (r) => r.lastCheckIn, priority: "primary", render: (r) => <span className="num">{formatDateTime(r.lastCheckIn)}</span> },
    { key: "todayVisits", header: "زيارات اليوم", numeric: true, sortable: true, sortValue: (r) => r.todayVisits, priority: "primary", render: (r) => <span className="num">{formatNumber(r.todayVisits)}</span> },
    { key: "teamSales", header: "مبيعات الفريق", numeric: true, sortable: true, sortValue: (r) => r.teamSales, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.teamSales)}</span> },
    { key: "actions", header: "إجراء", priority: "primary", render: () => <Button variant="ghost" size="sm">عرض</Button> },
  ];

  const repColumns: Column<typeof repActivity[number]>[] = [
    { key: "name", header: "المندوب", sortable: true, sortValue: (r) => r.name, priority: "primary", render: (r) => <b>{r.name}</b> },
    { key: "supervisor", header: "المشرف", priority: "secondary", render: (r) => r.supervisor },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <Badge tone={r.status === "active" ? "success" : "danger"} dot>{r.status === "active" ? "نشط" : "غير نشط"}</Badge> },
    { key: "lastCheckIn", header: "آخر تسجيل", sortable: true, sortValue: (r) => r.lastCheckIn, priority: "primary", render: (r) => <span className="num">{formatDateTime(r.lastCheckIn)}</span> },
    { key: "todayVisits", header: "زيارات اليوم", numeric: true, sortable: true, sortValue: (r) => r.todayVisits, priority: "primary", render: (r) => <span className="num">{formatNumber(r.todayVisits)}</span> },
    { key: "todaySales", header: "مبيعات اليوم", numeric: true, sortable: true, sortValue: (r) => r.todaySales, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.todaySales)}</span> },
    { key: "gpsEnabled", header: "GPS", priority: "primary", render: (r) => <Badge tone={r.gpsEnabled ? "success" : "neutral"}>{r.gpsEnabled ? "مفعّل" : "معطّل"}</Badge> },
    { key: "actions", header: "إجراء", priority: "primary", render: () => <Button variant="ghost" size="sm">عرض</Button> },
  ];

  const coverageColumns: Column<typeof territoryCoverage[number]>[] = [
    { key: "name", header: "المنطقة", sortable: true, sortValue: (r) => r.name, priority: "primary", render: (r) => <b>{r.name}</b> },
    { key: "supervisor", header: "المشرف", priority: "secondary", render: (r) => r.supervisor },
    { key: "totalCustomers", header: "إجمالي العملاء", numeric: true, sortable: true, sortValue: (r) => r.totalCustomers, priority: "primary", render: (r) => <span className="num">{formatNumber(r.totalCustomers)}</span> },
    { key: "visitedToday", header: "زاروا اليوم", numeric: true, sortable: true, sortValue: (r) => r.visitedToday, priority: "primary", render: (r) => <span className="num">{formatNumber(r.visitedToday)}</span> },
    { key: "coveragePct", header: "نسبة التغطية", numeric: true, sortable: true, sortValue: (r) => r.coveragePct, priority: "primary", render: (r) => (
      <div style={{ minWidth: 140 }}>
        <Progress
          value={r.coveragePct}
          tone={r.coveragePct >= 70 ? "success" : r.coveragePct >= 40 ? "warning" : "danger"}
          label={`${r.coveragePct}%`}
        />
      </div>
    ) },
  ];

  const tabs: TabItem[] = [
    {
      key: "map",
      label: "خريطة الفريق",
      content: (
        <Card title="خريطة مواقع الفريق">
          <div className="mock-map" style={{ height: 380, position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            {mapMarkers.map((m) => (
              <div
                key={m.id}
                style={{
                  position: "absolute",
                  left: `${m.x}%`,
                  top: `${m.y}%`,
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: m.kind === "supervisor" ? "var(--color-warning)" : "var(--color-primary)",
                    border: "2px solid white",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text)", whiteSpace: "nowrap" }}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-warning)", border: "1px solid white" }} />
              مشرف
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-primary)", border: "1px solid white" }} />
              مندوب
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-bg)", border: "1px solid var(--color-border)" }} />
              عميل
            </div>
          </div>
          <div className="muted" style={{ fontSize: "var(--font-size-xs)", marginTop: 8 }}>
            خريطة توضيحية — مواقع الفريق التجريبية لأغراض العرض.
          </div>
        </Card>
      ),
    },
    {
      key: "supervisors",
      label: "نشاط المشرفين",
      count: supervisorActivity.length,
      content: (
        <DataTable
          columns={supColumns}
          rows={supervisorActivity}
          rowKey={(r) => r.id}
          searchPlaceholder="بحث باسم المشرف..."
          searchKeys={(r) => r.name}
          exportFilename="supervisor-activity"
          pageSize={10}
          emptyTitle="لا توجد بيانات نشاط"
        />
      ),
    },
    {
      key: "reps",
      label: "نشاط المناديب",
      count: repActivity.length,
      content: (
        <DataTable
          columns={repColumns}
          rows={repActivity}
          rowKey={(r) => r.id}
          searchPlaceholder="بحث باسم المندوب..."
          searchKeys={(r) => r.name}
          exportFilename="rep-activity"
          pageSize={10}
          emptyTitle="لا توجد بيانات نشاط"
        />
      ),
    },
    {
      key: "coverage",
      label: "تغطية المناطق",
      count: territoryCoverage.length,
      content: (
        <DataTable
          columns={coverageColumns}
          rows={territoryCoverage}
          rowKey={(r) => r.id}
          searchPlaceholder="بحث باسم المنطقة..."
          searchKeys={(r) => r.name}
          exportFilename="territory-coverage"
          pageSize={10}
          emptyTitle="لا توجد بيانات تغطية"
        />
      ),
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "GPS" }, { label: "تتبع المشرفين والمناديب" }]}
        title="تتبع المشرفين والمناديب"
        description="التتبع الجغرافي ومتابعة النشاط والأداء"
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <StatCard label="إجمالي المُتتبعين" value={String(totalTracked)} hint="مشرف + مندوب" icon={<Users size={14} />} />
          <StatCard label="نشطون حالياً" value={String(activeToday.length)} hint="اليوم" icon={<Activity size={14} />} />
          <StatCard label="غير نشطين" value={String(offlineCount)} hint="خارج النشاط" icon={<WifiOff size={14} />} />
          <StatCard label="متوسط الزيارات" value={String(avgVisitsToday)} hint="زيارة / مندوب" icon={<MapPin size={14} />} />
        </div>
      </StickyPageHeader>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />
    </div>
  );
}
