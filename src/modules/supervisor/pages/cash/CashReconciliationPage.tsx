import { Wallet, ClipboardCheck, CheckCircle, AlertTriangle, TrendingDown } from "lucide-react";
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
import { reviewClosing } from "@/services/closing.service";
import { useAuthStore } from "@/store/auth";
import { dataScopeOf } from "@/config/authority";
import type { DailyClosing, CashBox } from "@/types";

export function CashReconciliationPage() {
  const { user } = useAuthStore();
  const { closings, cashBoxes, reps, statByRep } = useTeamData();
  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? id;
  const threshold = supervisorPolicies.closing.varianceThresholdAmount;

  const columns: Column<DailyClosing>[] = [
    { key: "rep", header: "المندوب", priority: "primary", render: (c) => <b>{repName(c.repId)}</b> },
    { key: "date", header: "التاريخ", priority: "secondary", render: (c) => <span className="num">{formatDateShort(c.date)}</span> },
    { key: "expected", header: "المتوقع", numeric: true, priority: "secondary", render: (c) => <span className="num">{formatMoney(c.expectedCash)}</span> },
    { key: "actual", header: "الفعلي", numeric: true, priority: "secondary", render: (c) => <span className="num">{formatMoney(c.actualCash)}</span> },
    { key: "variance", header: "الفروق", numeric: true, priority: "primary", render: (c) => (
      <span className="num" style={{ color: c.cashVariance > 0 ? "var(--color-danger)" : "inherit" }}>{formatMoney(c.cashVariance)}</span>
    ) },
    { key: "status", header: "الحالة", priority: "primary", render: (c) => (
      <Badge tone={c.status === "approved" ? "success" : c.status === "submitted" ? "info" : c.status === "returned" ? "danger" : "warning"} dot>
        {c.status === "approved" ? "معتمد" : c.status === "submitted" ? "مرسل" : c.status === "returned" ? "مرتجع" : "مسودة"}
      </Badge>
    ) },
    { key: "actions", header: "", priority: "primary", render: (c) => Math.abs(c.cashVariance) > threshold && c.status === "submitted" ? (
      <Button variant="ghost" size="sm" icon={<CheckCircle size={14} />} onClick={async () => { try { await reviewClosing(c.id, "approved", { id: user?.id ?? "", role: user?.role ?? "SUPERVISOR", scope: dataScopeOf[user?.role ?? "SUPERVISOR"], owns: false }); toast.success(`تمت مراجعة إغلاق ${c.number}`); } catch { toast.error(`فشل مراجعة إغلاق ${c.number}`); } }}>مراجعة</Button>
    ) : <span className="muted">—</span> },
  ];

  const totalVariance = closings.reduce((a, c) => a + c.cashVariance, 0);
  const flagged = closings.filter((c) => Math.abs(c.cashVariance) > threshold);

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "الصندوق" }, { label: "التسوية اليومية" }]}
        title="التسوية اليومية"
        description={`حد الفرق المسموح: ${formatMoney(threshold)} — تكرار: ${supervisorPolicies.closing.frequency === "daily" ? "يومي" : supervisorPolicies.closing.frequency}`}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="فروقات مرة واحد" value={formatMoney(totalVariance)} hint="ر.ص" icon={<Wallet size={14} />} />
          <StatCard label="مُعلّق/مرة" value={String(flagged.length)} hint="يوم" icon={<AlertTriangle size={14} />} />
          <StatCard label="الصناديق" value={String(cashBoxes.length)} hint="صندوق" icon={<Wallet size={14} />} />
        </div>
        <Card title="إغلاقات اليوم" subtitle={`معايير التسوية — حجم الفروق: ${formatMoney(threshold)}`}>
          <DataTable columns={columns} rows={closings} rowKey={(c) => c.id} searchPlaceholder="بحث بالمندوب أو التاريخ..." searchKeys={(c) => `${repName(c.repId)} ${c.date}`} emptyTitle="لا توجد إغلاقات" pageSize={10} />
        </Card>
        <Card title="مراجعة العهدة والمخزون">
          <ul style={{ display: "grid", gap: 6, fontSize: "var(--font-size-sm)", paddingLeft: 20 }}>
            <li>التفريغ = إغلاق اليوم (Cash + Inventory + Custody) قبل التسوية النهائية.</li>
            <li>فروقات تتجاوز {formatMoney(threshold)} تحتاج موافقة: ${supervisorPolicies.closing.varianceApprovalRequired ? "مطلوبة" : "غير مطلوبة"}.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
