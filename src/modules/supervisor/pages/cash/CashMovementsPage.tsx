import { Wallet, ArrowUpRight, ArrowDownToLine, Receipt, Banknote } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { formatMoney, formatDateShort, formatNumber } from "@/utils/format";
import type { CashMovement, CashBox } from "@/types";

export function CashMovementsPage() {
  const { cashMovements, cashBoxes, reps } = useTeamData();
  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? id;

  const netIn = cashMovements.filter((m) => m.type === "collection_in" || m.type === "rep_deposit" || m.type === "supervisor_receipt").reduce((a, m) => a + m.amount, 0);
  const netOut = cashMovements.filter((m) => m.type === "expense" || m.type === "adjustment").reduce((a, m) => a + m.amount, 0);

  const columns: Column<CashMovement>[] = [
    { key: "number", header: "الحركة", priority: "primary", sortable: true, sortValue: (m) => m.number, render: (m) => <b className="num">{m.number}</b> },
    { key: "type", header: "النوع", priority: "primary", render: (m) => (
      <Badge tone={m.type === "collection_in" || m.type === "rep_deposit" || m.type === "supervisor_receipt" ? "success" : m.type === "expense" ? "warning" : "info"} dot>
        {m.type === "collection_in" ? "تحصيل وارد" : m.type === "rep_deposit" ? "توريد مندوب" : m.type === "supervisor_receipt" ? "استلام مشرف" : m.type === "expense" ? "مصروف" : "تسوية"}
      </Badge>
    ) },
    { key: "amount", header: "المبلغ", numeric: true, priority: "primary", render: (m) => <span className="num">{formatMoney(m.amount)}</span> },
    { key: "box", header: "الصندوق", priority: "secondary", render: (m) => <span>{cashBoxes.find((b) => b.id === m.cashBoxId)?.name ?? m.cashBoxId}</span> },
    { key: "related", header: "المندوب", priority: "optional", render: (m) => (m.relatedRepId ? repName(m.relatedRepId) : "—") },
    { key: "createdBy", header: "المدخل", priority: "optional", render: (m) => <span className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{m.createdBy}</span> },
    { key: "date", header: "التاريخ", priority: "secondary", sortable: true, sortValue: (m) => m.date, render: (m) => <span className="num">{formatDateShort(m.date)}</span> },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "الصندوق" }, { label: "حركات الصندوق" }]}
        title="حركات الصندوق"
        description={`نطاق الفريق — حركات الصناديق المرئية للمشرف: ${supervisorPolicies.features.supervisorCashBox ? "مفعّل" : "غير مفعّل"}`}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="المورد" value={formatMoney(netIn)} hint="ر.س" icon={<ArrowDownToLine size={14} />} />
          <StatCard label="المنفق" value={formatMoney(netOut)} hint="ر.س" icon={<ArrowUpRight size={14} />} />
          <StatCard label="الرصيد الصافي" value={formatMoney(netIn - netOut)} hint="ر.س" icon={<Wallet size={14} />} />
        </div>
        <Card title="دفتر حركات الصندوق" subtitle={`مجموع الحركات: ${formatNumber(cashMovements.length)}`}>
          <DataTable columns={columns} rows={cashMovements} rowKey={(m) => m.id} searchPlaceholder="بحث برقم الحركة..." searchKeys={(m) => `${m.number} ${m.createdBy}`} emptyTitle="لا توجد حركات صندوق" pageSize={10} />
        </Card>
      </div>
    </div>
  );
}
