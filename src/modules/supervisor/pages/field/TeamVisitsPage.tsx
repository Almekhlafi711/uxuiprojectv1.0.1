import { useState } from "react";
import { CalendarCheck, Clock, ShieldCheck, XCircle } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { mockApi } from "@/services/mockApi";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select, Textarea, Input } from "@/components/ui/FormControls";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { supervisorPolicies, SYSTEM_TIME } from "@/config/supervisorPolicies";
import { formatNumber, formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import type { Visit, Customer } from "@/types";

export function TeamVisitsPage() {
  const { reps, visits, customers, dailyPlans } = useTeamData();
  const today = supervisorPolicies.activePeriod.currentMonth;
  const [rescheduleOpen, setRescheduleOpen] = useState<Visit | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");

  const todayVisits = visits.filter((v) => v.date === today);

  const columns: Column<Visit>[] = [
    { key: "rep", header: "المندوب", priority: "primary", render: (v) => {
      const rep = reps.find((r) => r.id === v.repId);
      return <b>{rep?.name ?? v.repId}</b>;
    } },
    { key: "customer", header: "العميل", priority: "primary", sortable: true, sortValue: (v) => customers.find((c) => c.id === v.customerId)?.name ?? "", render: (v) => {
      const c = customers.find((c) => c.id === v.customerId);
      return c ? (<b style={{ fontWeight: 600 }}>{c.name}</b>) : <span className="muted">{v.customerId}</span>;
    } },
    { key: "plannedTime", header: "الوقت المخطط", priority: "secondary", render: (v) => <span className="num">{v.checkInAt ?? "—"}</span> },
    { key: "result", header: "النتيجة", priority: "primary", render: (v) => (
      <Badge tone={v.result === "visited" || v.result === "completed" ? "success" : v.result === "not_found" ? "warning" : v.result === "closed" ? "neutral" : "danger"} dot>
        {v.result === "visited" || v.result === "completed" ? "تمت" : v.result === "not_found" ? "غير موجود" : v.result === "closed" ? "مغلق" : v.result === "no_sale" ? "بدون بيع" : v.result}
      </Badge>
    ) },
    { key: "status", header: "الحالة", priority: "secondary", render: (v) => {
      const planEntry = dailyPlans.find((p) => p.repId === v.repId && p.date === v.date)?.entries.find((e) => e.customerId === v.customerId);
      const planned = planEntry?.plannedTime ?? v.checkInAt;
      const now = SYSTEM_TIME.slice(0, 5);
      const late = planned && now > planned && v.result !== "visited" && v.result !== "completed";
      return late ? <Badge tone="danger" dot>متأخر</Badge> : <Badge tone="neutral">مخطط</Badge>;
    } },
    { key: "actions", header: "", priority: "primary", render: (v) => v.result === "not_found" || !v.checkInAt ? (
      <Button variant="ghost" size="sm" icon={<Clock size={14} />} onClick={() => setRescheduleOpen(v)}>إعادة جدولة</Button>
    ) : <span className="muted">—</span> },
  ];

  const handleReschedule = async () => {
    if (!rescheduleOpen || !newDate) { return; }
    try {
      await mockApi.team.rescheduleVisit(rescheduleOpen.id, newDate, newTime || undefined, reason || undefined);
      toast.success(`تمت جدولة إعادة زيارة للعميل ${rescheduleOpen.customerId}`);
      setRescheduleOpen(null);
    } catch {
      toast.error("فشل إعادة الجدولة");
    }
  };

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "المتابعة الميدانية" }, { label: "الزيارات" }]}
        title="زيارات اليوم"
        description={`زيارات المناديب ليوم ${formatDateShort(today)} — تتبع التنفيذ والاستكمال`}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="الزيارات" subtitle={`مكتملة: ${formatNumber(todayVisits.filter((v) => v.result === "visited" || v.result === "completed").length)} / ${formatNumber(todayVisits.length)}`}>
          <DataTable
            columns={columns}
            rows={todayVisits}
            rowKey={(v) => v.id}
            searchPlaceholder="بحث بالعميل أو المندوب..."
            searchKeys={(v) => `${customers.find((c) => c.id === v.customerId)?.name ?? ""} ${reps.find((r) => r.id === v.repId)?.name ?? ""}`}
            emptyTitle="لا توجد زيارات اليوم"
            pageSize={10}
          />
        </Card>
      </div>

      <Modal open={rescheduleOpen !== null} title="إعادة جدولة الزيارة" size="md" onClose={() => setRescheduleOpen(null)}>
        {rescheduleOpen && (
          <div className="stack" style={{ gap: 12 }}>
            <div><b>{customers.find((c) => c.id === rescheduleOpen.customerId)?.name ?? rescheduleOpen.customerId}</b></div>
            <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المندوب: {reps.find((r) => r.id === rescheduleOpen.repId)?.name ?? rescheduleOpen.repId}</div>
            <Input label="تاريخ الزيارة الجديدة" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
            <Input label="الوقت (اختياري)" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            <Textarea label="السبب" value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="لماذا تمت إعادة الجدولة؟..." />
            <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>تُرسل التحديثات إلى خطة اليوم للمندوب.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setRescheduleOpen(null)}>إلغاء</Button>
              <Button variant="primary" size="sm" onClick={handleReschedule}>حفظ وإعادة الجدولة</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
