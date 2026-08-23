import { useState } from "react";
import { Link, Plus, CheckCircle2, XCircle } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { mockApi } from "@/services/mockApi";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/FormControls";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { toast } from "@/store/ui";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { formatNumber, formatDateShort } from "@/utils/format";
import type { DailyPlan, RoutePlan, Customer, User } from "@/types";

export function RoutePlansPage() {
  const { dailyPlans, customers, reps, targetOrganizations } = useTeamData();
  const [creating, setCreating] = useState(false);
  const [newRepId, setNewRepId] = useState("");
  const [newDate, setNewDate] = useState("2026-08-15");

  const todayPlans = dailyPlans.filter((p) => p.date === newDate);
  const pending = todayPlans.filter((p) => p.status === "approved" || p.status === "pending");

  const columns: Column<DailyPlan>[] = [
    { key: "rep", header: "المندوب", priority: "primary", render: (p) => {
      const rep = reps.find((r) => r.id === p.repId);
      return <b>{rep?.name ?? p.repId}</b>;
    } },
    { key: "date", header: "التاريخ", priority: "primary", render: (p) => <span className="num">{formatDateShort(p.date)}</span> },
    { key: "route", header: "الخطة", priority: "secondary", render: (p) => <span>{p.routeId ?? "—"}</span> },
    { key: "visits", header: "الزيارات", numeric: true, sortable: true, sortValue: (p) => p.entries.length, priority: "primary", render: (p) => <span className="num">{formatNumber(p.entries.length)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (p) => (
      <Badge tone={p.status === "approved" ? "success" : p.status === "pending" ? "warning" : "info"} dot>{p.status === "approved" ? "معتمدة" : p.status === "pending" ? "بانتظار" : p.status}</Badge>
    ) },
    { key: "target", header: "هدف المبيعات", numeric: true, sortable: true, sortValue: (p) => p.salesTarget, priority: "secondary", render: (p) => <span className="num">{formatNumber(p.salesTarget)}</span> },
    { key: "actions", header: "", priority: "primary", render: (p) => p.status === "pending" ? (
      <Button variant="ghost" size="sm" icon={<CheckCircle2 size={14} />} onClick={async () => { try { await mockApi.team.approvePlan(p.id); toast.success(`تم اعتماد الخطة: ${p.routeId ?? p.id}`); } catch { toast.error(`فشل اعتماد الخطة: ${p.routeId ?? p.id}`); } }}>اعتماد</Button>
    ) : (<Link to={`/supervisor/team/${p.repId}`}><Button variant="ghost" size="sm">عرض</Button></Link>) },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "التخطيط" }, { label: "خطط السير" }]}
        title="خطط سير المناديب"
        description={`إنشعار وتخطيط زيارات الفريق — فترة معتمدة: ${supervisorPolicies.activePeriod.currentMonth}`}
        actions={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setCreating(true)}>خطة جديدة</Button>}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="خطط اليوم" subtitle={`تاريخ: ${newDate}`}>
          <DataTable
            columns={columns}
            rows={todayPlans}
            rowKey={(p) => p.id}
            searchPlaceholder="بحث باسم المندوب..."
            searchKeys={(p) => reps.find((r) => r.id === p.repId)?.name ?? p.repId}
            emptyTitle="لا توجد خطط لهذا اليوم"
            pageSize={8}
          />
        </Card>
        <Card title="نشاطات هدف المؤسسات" subtitle={`طلبات تم مراجعتها: ${targetOrganizations.filter((t) => t.status === "approved").length}`}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>المؤسسة</th><th>الحالة</th><th>الموظف</th></tr></thead>
              <tbody>
                {targetOrganizations.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.name}</td>
                    <td><Badge tone={t.status === "approved" ? "success" : t.status === "under_review" ? "warning" : "danger"}>{t.status === "approved" ? "معتمد" : t.status === "under_review" ? "قيد المراجعة" : "مرفوض"}</Badge></td>
                    <td>{t.requestedById}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={creating} title="إنشاء خطة جديدة" size="md" onClose={() => setCreating(false)}>
        <NewPlanForm
          reps={reps}
          customers={customers}
          onSubmit={async (repId, date) => { try { await mockApi.team.createPlan({ repId, date }); toast.success(`تم إنشاء خطة للمندوب ${repId} بتاريخ ${date}`); setCreating(false); } catch { toast.error("فشل إنشاء الخطة"); } }}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </div>
  );
}

function NewPlanForm({ reps, customers, onSubmit, onCancel }: {
  reps: User[];
  customers: Customer[];
  onSubmit: (repId: string, date: string) => void;
  onCancel: () => void;
}) {
  const [repId, setRepId] = useState(reps[0]?.id ?? "");
  const [date, setDate] = useState("2026-08-15");

  return (
    <div className="stack" style={{ gap: 12 }}>
      <Select
        label="المندوب"
        value={repId}
        onChange={(e) => setRepId(e.target.value)}
        options={reps.map((r) => ({ value: r.id, label: r.name }))}
      />
      <div className="muted" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>{reps.find((r) => r.id === repId)?.territoryId ?? ""} · {reps.length} مناديب في الفريق</div>
      <Input label="التاريخ" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>سيتم تعبئة العملاء من خطة المنطقة. حسب سياسة الوقت: {customers.filter((c) => c.repId === repId).length} عميل متاح.</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>إلغاء</Button>
        <Button variant="primary" size="sm" onClick={() => onSubmit(repId, date)}>إنشاء المسودة</Button>
      </div>
    </div>
  );
}
