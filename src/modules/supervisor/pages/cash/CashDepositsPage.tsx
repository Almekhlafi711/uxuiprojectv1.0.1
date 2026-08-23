import { HandCoins, Banknote, CheckCircle, XCircle } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { toast } from "@/store/ui";
import { formatMoney, formatNumber, formatDateShort } from "@/utils/format";
import { approveDeposit, rejectDeposit } from "@/services/closing.service";
import { useAuthStore } from "@/store/auth";
import { dataScopeOf } from "@/config/authority";
import type { DepositRequest } from "@/types";

export function CashDepositsPage() {
  const { user } = useAuthStore();
  const { teamDeposits, reps } = useTeamData();
  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? id;
  const pending = teamDeposits.filter((d) => d.status === "pending");

  const columns: Column<DepositRequest>[] = [
    { key: "number", header: "رقم التوريد", priority: "primary", sortable: true, sortValue: (d) => d.number, render: (d) => <b className="num">{d.number}</b> },
    { key: "rep", header: "المندوب", priority: "primary", render: (d) => <span>{repName(d.repId)}</span> },
    { key: "amount", header: "المبلغ", numeric: true, priority: "primary", render: (d) => <span className="num">{formatMoney(d.amount)}</span> },
    { key: "method", header: "طريقة التحويل", priority: "secondary", render: (d) => (
      <Badge tone={d.method === "cash" ? "success" : "info"} dot>{d.method === "cash" ? "نقداً" : "تحويل بنكي"}</Badge>
    ) },
    { key: "reference", header: "المرجع", priority: "optional", render: (d) => <span className="muted">{d.reference ?? "—"}</span> },
    { key: "date", header: "التاريخ", priority: "secondary", sortable: true, sortValue: (d) => d.date, render: (d) => <span className="num">{formatDateShort(d.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (d) => (
      <Badge tone={d.status === "approved" ? "success" : d.status === "pending" ? "warning" : "danger"} dot>
        {d.status === "approved" ? "معتمد" : d.status === "pending" ? "معلّق" : "مرفوض"}
      </Badge>
    ) },
    { key: "actions", header: "", priority: "primary", render: (d) => d.status === "pending" ? (
      <div style={{ display: "flex", gap: 6 }}>
        <Button variant="ghost" size="sm" icon={<CheckCircle size={14} />} onClick={() => { approveDeposit(d.id, d.amount, "bx-main", d.repId, { id: user?.id ?? "", role: user?.role ?? "SUPERVISOR", scope: dataScopeOf[user?.role ?? "SUPERVISOR"], owns: false }); toast.success(`تم تأكيد توريد ${d.number}`); }}>تأكيد</Button>
        <Button variant="ghost" size="sm" icon={<XCircle size={14} />} onClick={() => { rejectDeposit(d.id, { id: user?.id ?? "", role: user?.role ?? "SUPERVISOR", scope: dataScopeOf[user?.role ?? "SUPERVISOR"], owns: false }); toast.warning(`تم رفض توريد ${d.number}`); }}>رفض</Button>
      </div>
    ) : <span className="muted">—</span> },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "الصندوق" }, { label: "توريدات المناديب" }]}
        title="توريدات المناديب"
        description={`المشرف يوافق/يرفض توريدات النقد/التحويلات — صندوق التسوية اليومية: ${supervisorPolicies.features.supervisorCashBox ? "مفعّل" : "غير مفعّل"}`}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="معلق" value={String(pending.length)} hint="توريد" icon={<HandCoins size={14} />} />
          <StatCard label="إجمالي التوريدات" value={formatMoney(teamDeposits.reduce((a, d) => a + d.amount, 0))} hint="ر.س" icon={<Banknote size={14} />} />
        </div>
        <Card title="طلبات التوريد" subtitle="موافقة المشرف على استلام التحصيل في صندوق التسوية">
          <DataTable columns={columns} rows={teamDeposits} rowKey={(d) => d.id} searchPlaceholder="بحث برقم التوريد أو المندوب..." searchKeys={(d) => `${d.number} ${repName(d.repId)}`} emptyTitle="لا توجد توريدات" pageSize={10} />
        </Card>
        <Card title="دورة التسوية">
          <ul style={{ display: "grid", gap: 6, fontSize: "var(--font-size-sm)", paddingLeft: 20 }}>
            <li>المرحلة 1: المندوب يرفع توريدًا → المشرف يوافق/يرفض.</li>
            <li>المرحلة 2: التسوية الشهرية تحتاج إغلاق التحركات والعهدة.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
