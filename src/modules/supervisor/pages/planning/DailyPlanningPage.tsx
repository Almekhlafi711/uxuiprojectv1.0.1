import { useState } from "react";
import { Calendar, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { formatNumber, formatDateShort } from "@/utils/format";
import type { DailyPlan, DailyPlanEntry, User } from "@/types";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export function DailyPlanningPage() {
  const { reps, dailyPlans, visits, customers, statByRep } = useTeamData();
  const [selectedDate, setSelectedDate] = useState("2026-08-14");
  const [currentMonth, setCurrentMonth] = useState(7); // August (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026);

  const planForDate = (repId: string, date: string) => dailyPlans.find((p) => p.repId === repId && p.date === date);

  const today = new Date(selectedDate);
  const dayName = DAYS[today.getDay()];
  const monthName = MONTHS[currentMonth];
  const dayNumber = today.getDate();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays: { date: string; day: number; currentMonth: boolean }[] = [];
  for (let i = 0; i < firstDay; i++) {
    const prev = new Date(currentYear, currentMonth, 0 - i).getDate();
    calendarDays.push({ date: new Date(currentYear, currentMonth - 1, prev).toISOString().split("T")[0], day: prev, currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ date: new Date(currentYear, currentMonth, d).toISOString().split("T")[0], day: d, currentMonth: true });
  }

  const visitProgress = (repId: string, date: string) => {
    const plan = planForDate(repId, date);
    const planned = plan?.entries.length ?? 0;
    const completed = visits.filter((v) => v.repId === repId && v.date === date && (v.result === "visited" || v.result === "completed")).length;
    return { planned, completed };
  };

  const columns: Column<typeof reps[0] & { progress: string; planStatus: string; gps: string }>[] = [
    { key: "rep", header: "المندوب", priority: "primary", render: (r: any) => <b>{r.name}</b> },
    { key: "territory", header: "المنطقة", priority: "secondary", render: (r: any) => <span className="muted">{r.territoryId}</span> },
    { key: "progress", header: "تقدم اليوم", priority: "primary", render: (r: any) => r.progress },
    { key: "planStatus", header: "الحالة", priority: "primary", render: (r: any) => r.planStatus },
    { key: "gps", header: "GPS", priority: "secondary", render: (r: any) => <Badge tone={r.gps === "online" ? "success" : r.gps === "offline" ? "danger" : "neutral"} dot>{r.gps}</Badge> },
  ];

  const rows = reps.map((r) => {
    const vp = visitProgress(r.id, selectedDate);
    const plan = planForDate(r.id, selectedDate);
    const stat = statByRep.get(r.id);
    return {
      ...r,
      progress: `${formatNumber(vp.completed)} / ${formatNumber(vp.planned)}`,
      planStatus: plan ? (plan.status === "approved" ? "معتمد" : plan.status === "pending" ? "معلق" : plan.status) : "غير مخطط",
      gps: stat?.offline ? "offline" : stat?.isInField ? "online" : "idle",
    };
  });

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "التخطيط" }, { label: "جداول اليوم" }]}
        title="جداول عمل اليوم"
        description={`${dayName} ${dayNumber} ${monthName} ${currentYear} — جداول مناديبي الفريق`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => setCurrentMonth((m) => (m <= 0 ? 11 : m - 1))}>الشهر السابق</Button>
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>{monthName} {currentYear}</span>
            <Button variant="ghost" size="sm" icon={<ChevronRight size={14} />} onClick={() => setCurrentMonth((m) => (m >= 11 ? 0 : m + 1))}>الشهر التالي</Button>
          </div>
        }
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="التقويم" subtitle="اختر يومًا لعرض الجداول">
          <div className="table-wrap" style={{ maxWidth: "100%" }}>
            <table className="data-table" style={{ fontSize: "var(--font-size-xs)" }}>
              <thead>
                <tr>
                  {["أحد", "إثن", "ثلاث", "أربع", "خميس", "جمع", "سبت"].map((d) => <th key={d} style={{ textAlign: "center" }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil((calendarDays.length + firstDay) / 7) }).map((_, weekIdx) => (
                  <tr key={weekIdx}>
                    {Array.from({ length: 7 }).map((_, dayIdx) => {
                      const cellIdx = weekIdx * 7 + dayIdx;
                      const cell = calendarDays[cellIdx - firstDay];
                      if (!cell) return <td key={dayIdx} style={{ height: 40 }} />;
                      const isToday = cell.date === selectedDate;
                      return (
                        <td key={dayIdx} style={{ textAlign: "center", height: 40, padding: 4 }}>
                          <button
                            className={`btn ${isToday ? "active" : ""}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              background: isToday ? "var(--color-brand)" : cell.currentMonth ? "var(--color-surface-2)" : undefined,
                              color: isToday ? "var(--color-on-brand)" : cell.currentMonth ? undefined : "var(--color-text-faint)",
                              fontSize: "var(--font-size-xs)",
                              padding: 4,
                              cursor: cell.currentMonth ? "pointer" : "default",
                            }}
                            onClick={() => cell.currentMonth && setSelectedDate(cell.date)}
                          >
                            {cell.day}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={`خطط ${selectedDate}`} subtitle={`${reps.length} مندوب`}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            searchPlaceholder="بحث باسم المندوب..."
            searchKeys={(r) => r.name}
            emptyTitle="لا يوجد مندوبون"
            pageSize={10}
            onRowClick={(r) => {
              const plan = planForDate(r.id, selectedDate);
              if (plan) {
                window.open(`/supervisor/team/${r.id}`, "_blank");
              }
            }}
          />
        </Card>
      </div>
    </div>
  );
}
