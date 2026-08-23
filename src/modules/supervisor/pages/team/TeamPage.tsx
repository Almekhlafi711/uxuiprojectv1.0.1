import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, MapPin, WifiOff, Wallet, ArrowLeft, UserX, UserCheck } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/FormControls";
import { LoadingState } from "@/components/ui/States";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { useTeamData, type RepStat } from "@/modules/supervisor/hooks/useTeamData";
import { mockApi } from "@/services/mockApi";
import { formatMoney, formatNumber, formatDateShort, initials } from "@/utils/format";
import { toast } from "@/store/ui";

export function TeamPage() {
  const { reps, repsLoading, statByRep, totals } = useTeamData();
  const [suspendModal, setSuspendModal] = useState<{ repId: string; repName: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const columns: Column<RepStat>[] = [
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => r.rep.name, priority: "primary", render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="avatar" style={{ background: "var(--color-brand)" }}>{initials(r.rep.name)}</span>
        <div>
          <Link to={`/supervisor/team/${r.rep.id}`} style={{ fontWeight: 600 }}>{r.rep.name}</Link>
          <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>انضم {formatDateShort(r.rep.joinedAt)}</div>
        </div>
      </div>
    ) },
    { key: "visits", header: "زيارات اليوم", numeric: true, sortable: true, sortValue: (r) => r.completedVisits, priority: "primary", render: (r) => (
      <span className="num">{formatNumber(r.completedVisits)} / {formatNumber(r.todayPlannedVisits)}</span>
    ) },
    { key: "sales", header: "مبيعات اليوم", numeric: true, sortable: true, sortValue: (r) => r.todaySales, priority: "primary", render: (r) => <span className="num">{formatMoney(r.todaySales)}</span> },
    { key: "collections", header: "تحصيل اليوم", numeric: true, sortable: true, sortValue: (r) => r.todayCollections, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.todayCollections)}</span> },
    { key: "targets", header: "مبيعات الشهر", numeric: true, sortable: true, sortValue: (r) => r.targetSales, priority: "secondary", render: (r) => (
      <span className="num">{formatMoney(r.targetSales)}</span>
    ) },
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
    { key: "actions", header: "", priority: "primary", render: (r) => (
      <div style={{ display: "flex", gap: 4 }}>
        <Link to={`/supervisor/team/${r.rep.id}`}><Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>الملف</Button></Link>
        {r.rep.status === "active" ? (
          <Button variant="ghost" size="sm" icon={<UserX size={14} />} onClick={() => setSuspendModal({ repId: r.rep.id, repName: r.rep.name })} className="text-danger">إيقاف</Button>
        ) : r.rep.status === "suspended" ? (
          <Button variant="ghost" size="sm" icon={<UserCheck size={14} />} onClick={async () => { try { await mockApi.team.activateRep(r.rep.id); toast.success(`تم تفعيل المندوب: ${r.rep.name}`); } catch { toast.error("فشل تفعيل المندوب"); } }}>تفعيل</Button>
        ) : null}
      </div>
    ) },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "فريقي" }]}
        title="فريق المندوبين"
        description="متابعة أداء مندوبي فريقك وملفاتهم الميدانية اليومية"
      />

      {repsLoading ? (
        <LoadingState label="جارٍ تحميل الفريق..." />
      ) : (
        <div className="stack" style={{ gap: "var(--space-4)" }}>
          <div className="stat-grid">
            <StatCard label="عدد المندوبين" value={String(totals.teamSize)} hint="مندوب" icon={<Users size={14} />} />
            <StatCard label="في الميدان" value={String(totals.inField)} hint="مندوب" icon={<MapPin size={14} />} />
            <StatCard label="خارج التغطية" value={String(totals.offline)} hint="مندوب" icon={<WifiOff size={14} />} />
            <StatCard label="لم يُرسلوا الإقفال" value={String(totals.teamSize - totals.doneClosings - totals.draftClosings)} hint="مندوب" icon={<Wallet size={14} />} />
          </div>

          <Card title="قائمة الفريق" subtitle="اضغط على اسم المندوب لعرض ملفه الكامل">
            <DataTable
              columns={columns}
              rows={reps.map((r) => statByRep.get(r.id)).filter((s): s is RepStat => !!s)}
              rowKey={(r) => r.rep.id}
              searchPlaceholder="بحث باسم المندوب..."
              searchKeys={(r) => r.rep.name}
              emptyTitle="لا يوجد مندوبون في فريقك"
              pageSize={10}
            />
          </Card>
        </div>
      )}

      <Modal open={suspendModal !== null} title="إيقاف المندوب" size="md" onClose={() => { setSuspendModal(null); setSuspendReason(""); }}>
        {suspendModal && (
          <div className="stack" style={{ gap: 12 }}>
            <div>هل تريد إيقاف المندوب <b>{suspendModal.repName}</b>؟</div>
            <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>سيتم تغيير حالة المندوب إلى "موقوف" ولن يستطيع تنفيذ أي عمليات حتى يتم تفعيله مرة أخرى.</div>
            <Textarea label="سبب الإيقاف" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} required placeholder="سبب الإيقاف..." />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => { setSuspendModal(null); setSuspendReason(""); }}>إلغاء</Button>
              <Button variant="danger-solid" size="sm" onClick={async () => {
                if (!suspendReason) { toast.warning("يرجى ذكر سبب الإيقاف"); return; }
                try {
                  await mockApi.team.suspendRep(suspendModal.repId, suspendReason);
                  toast.success(`تم إيقاف المندوب: ${suspendModal.repName}`);
                  setSuspendModal(null);
                  setSuspendReason("");
                } catch { toast.error("فشل إيقاف المندوب"); }
              }}>إيقاف المندوب</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
