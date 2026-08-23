import { useState } from "react";
import { MapPin, Clock } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { formatNumber, formatDateShort } from "@/utils/format";
import { routeDeviation } from "@/mock/gps";
import { toast } from "@/store/ui";
import type { Trip } from "@/types";

export function TeamTripsPage() {
  const { reps, trips, customers, dailyPlans, statByRep } = useTeamData();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const ongoingTrips = trips.filter((t) => t.status === "in_progress" || t.status === "paused");
  const allTrips = trips;
  const selectedTrip = selectedTripId ? allTrips.find((t) => t.id === selectedTripId) ?? null : null;

  const columns: Column<Trip>[] = [
    { key: "rep", header: "المندوب", priority: "primary", render: (t) => {
      const rep = reps.find((r) => r.id === t.repId);
      return <b>{rep?.name ?? t.repId}</b>;
    } },
    { key: "date", header: "التاريخ", priority: "primary", render: (t) => <span className="num">{formatDateShort(t.date)}</span> },
    { key: "vehicle", header: "المركبة", priority: "secondary", render: (t) => t.vehicle ? `${t.vehicle.model} (${t.vehicle.plate})` : "—" },
    { key: "distance", header: "المسافة", numeric: true, sortable: true, sortValue: (t) => t.distanceKm ?? 0, priority: "secondary", render: (t) => <span className="num">{formatNumber(t.distanceKm ?? 0)} كم</span> },
    { key: "time", header: "بداية", priority: "secondary", render: (t) => <span className="num">{t.startTime ?? ""} — {t.endTime ?? "جارٍ الإكمال"}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (t) => (
      <Badge tone={t.status === "in_progress" ? "warning" : t.status === "completed" ? "success" : "neutral"} dot>{t.status === "in_progress" ? "جاري" : t.status === "completed" ? "مكتمل" : t.status}</Badge>
    ) },
    { key: "sync", header: "المزامنة", priority: "primary", render: (t) => (
      <Badge tone={t.syncState === "synced" ? "success" : "warning"} dot>{t.syncState === "synced" ? "متزامن" : "بانتظار المزامنة"}</Badge>
    ) },
    { key: "actions", header: "", priority: "primary", render: (t) => (
      <Button variant="ghost" size="sm" icon={<MapPin size={14} />} onClick={() => setSelectedTripId(t.id)}>عرض</Button>
    ) },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "المتابعة الميدانية" }, { label: "الجولات" }]}
        title="جولات المناديب"
        description={`جولات نشطة اليوم: ${ongoingTrips.length} — نطاق الفريق`}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="الجولات الجارية" subtitle="المندوب في الميدان">
          <DataTable columns={columns} rows={ongoingTrips} rowKey={(t) => t.id} searchPlaceholder="بحث باسم المندوب..." searchKeys={(t) => reps.find((r) => r.id === t.repId)?.name ?? ""} emptyTitle="لا توجد جولات نشطة" pageSize={8} />
        </Card>

        {ongoingTrips.length > 0 && (
          <Card title="ملخص الجولات الجارية">
            <div className="stat-grid">
              {ongoingTrips.map((trip) => {
                const rep = reps.find((r) => r.id === trip.repId);
                const dev = routeDeviation.find((d) => d.userId === trip.repId);
                return (
                  <div key={trip.id} style={{ padding: "var(--space-3)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{rep?.name ?? "—"}</div>
                    <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>جولة {trip.number} — {formatNumber(trip.distanceKm ?? 0)} كم</div>
                    <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>GPS: {trip.gpsEnabled ? "مفعل" : "معطل"} · بدأ: {trip.startTime ?? "—"}</div>
                    {dev && dev.status === "deviation" && (
                      <span style={{ color: "var(--color-warning)", fontSize: "var(--font-size-xs)" }}>⚠ انحراف: {dev.deviationKm} كم</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <Modal open={!!selectedTrip} onClose={() => setSelectedTripId(null)} title={selectedTrip ? `تفاصيل الجولة ${selectedTrip.number}` : ""} size="lg">
        {selectedTrip && (() => {
          const rep = reps.find((r) => r.id === selectedTrip.repId);
          const plan = dailyPlans.find((p) => p.repId === selectedTrip.repId && p.date === selectedTrip.date);
          const plannedVisitCount = plan?.entries.length ?? 0;
          return (
            <div className="stack" style={{ gap: "var(--space-4)" }}>
              <div className="form-grid">
                <div className="field-span-6">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المندوب</span>
                  <div style={{ fontWeight: 600 }}>{rep?.name ?? selectedTrip.repId}</div>
                </div>
                <div className="field-span-6">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الحالة</span>
                  <div><Badge tone={selectedTrip.status === "in_progress" ? "warning" : "success"} dot>{selectedTrip.status === "in_progress" ? "جاري" : selectedTrip.status === "completed" ? "مكتمل" : selectedTrip.status}</Badge></div>
                </div>
                <div className="field-span-4">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>التاريخ</span>
                  <div className="num">{formatDateShort(selectedTrip.date)}</div>
                </div>
                <div className="field-span-4">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المسافة</span>
                  <div className="num">{formatNumber(selectedTrip.distanceKm ?? 0)} كم</div>
                </div>
                <div className="field-span-4">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المزامنة</span>
                  <div><Badge tone={selectedTrip.syncState === "synced" ? "success" : "warning"} dot>{selectedTrip.syncState === "synced" ? "متزامن" : "بانتظار المزامنة"}</Badge></div>
                </div>
                <div className="field-span-6">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المركبة</span>
                  <div>{selectedTrip.vehicle ? `${selectedTrip.vehicle.model} — ${selectedTrip.vehicle.plate}` : "—"}</div>
                </div>
                <div className="field-span-6">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>زمن القيادة</span>
                  <div className="num">{selectedTrip.startTime ?? "—"} → {selectedTrip.endTime ?? "جارٍ..."}</div>
                </div>
                <div className="field-span-6">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>GPS</span>
                  <div>{selectedTrip.gpsEnabled ? "مفعل" : "معطل"}</div>
                </div>
                <div className="field-span-6">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الزيارات المخططة</span>
                  <div className="num">{plannedVisitCount}</div>
                </div>
              </div>

              {plan && plan.entries.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "var(--space-2)", fontSize: "var(--font-size-sm)" }}>جدول الزيارات</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "right" }}>
                        <th style={{ padding: "var(--space-2)" }}>العميل</th>
                        <th style={{ padding: "var(--space-2)" }}>الوقت</th>
                        <th style={{ padding: "var(--space-2)" }}>النوع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.entries.map((e, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                          <td style={{ padding: "var(--space-2)" }}>{customers.find((c) => c.id === e.customerId)?.name ?? e.customerId}</td>
                          <td style={{ padding: "var(--space-2)" }} className="num">{e.plannedTime ?? "—"}</td>
                          <td style={{ padding: "var(--space-2)" }}>{e.status === "completed" ? "مكتمل" : e.status === "pending" ? "مخطط" : e.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={() => setSelectedTripId(null)}>إغلاق</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
