import { useMemo, useState } from "react";
import { HandCoins, AlertTriangle } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/FormControls";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { formatMoney, formatNumber, formatDateShort } from "@/utils/format";
import type { Invoice } from "@/types";
import { getAllCustomerBalances } from "@/services/ledger";

export function DebtsPage() {
  const { reps, customers, sales, collections, statByRep, today } = useTeamData();
  const [repFilter, setRepFilter] = useState("");

  const balanceMap = new Map(getAllCustomerBalances().map((b) => [b.customerId, b.balance]));

  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? "—";
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  const unpaidInvoices = useMemo(() => {
    let rows = (sales ?? []).filter((s) => s.paymentStatus !== "paid");
    if (repFilter) rows = rows.filter((s) => s.repId === repFilter);
    return rows;
  }, [sales, repFilter]);

  const totalOutstanding = unpaidInvoices.reduce((a, s) => a + s.net, 0);

  const aging = useMemo(() => {
    const buckets = { current: 0, late: 0, "31_60": 0, "61_90": 0, over90: 0 };
    unpaidInvoices.forEach((s) => {
      if (!s.dueDate) return;
      const days = Math.floor((Date.parse(today) - Date.parse(s.dueDate)) / 86400000);
      if (days <= 0) buckets.current += s.net;
      else if (days <= 30) buckets.late += s.net;
      else if (days <= 60) buckets["31_60"] += s.net;
      else if (days <= 90) buckets["61_90"] += s.net;
      else buckets.over90 += s.net;
    });
    return buckets;
  }, [unpaidInvoices, today]);

  const teamOutstanding = customers.reduce((a, c) => a + (balanceMap.get(c.id) ?? 0), 0);

  const columns: Column<Invoice>[] = [
    { key: "number", header: "الفاتورة", sortable: true, sortValue: (s) => s.number, priority: "primary", render: (s) => <b className="num">{s.number}</b> },
    { key: "customer", header: "العميل", sortable: true, sortValue: (s) => customerName(s.customerId), priority: "primary", render: (s) => <span>{customerName(s.customerId)}</span> },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (s) => repName(s.repId), priority: "primary", render: (s) => repName(s.repId) },
    { key: "date", header: "تاريخ الفاتورة", sortable: true, sortValue: (s) => s.date, priority: "secondary", render: (s) => <span className="num">{formatDateShort(s.date)}</span> },
    { key: "due", header: "الاستحقاق", sortable: true, sortValue: (s) => s.dueDate ?? "", priority: "secondary", render: (s) => <span className="num">{s.dueDate ? formatDateShort(s.dueDate) : "—"}</span> },
    { key: "amount", header: "المبلغ", numeric: true, sortable: true, sortValue: (s) => s.net, priority: "primary", render: (s) => <span className="num" style={{ fontWeight: 600 }}>{formatMoney(s.net)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (s) => {
      const overdue = s.dueDate && s.dueDate < today;
      return <Badge tone={s.paymentStatus === "unpaid" && overdue ? "danger" : s.paymentStatus === "partial" ? "warning" : "neutral"} dot>
        {s.paymentStatus === "paid" ? "مسددة" : s.paymentStatus === "partial" ? "مدفوعة جزئياً" : overdue ? "متأخرة" : "غير مسددة"}
      </Badge>;
    } },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "الديون والذمم" }]}
        title="الديون والذمم"
        description="متطلبات التحصيل لأرصدة عملاء فريقك والفواتير المتأخرة"
      />

      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="إجمالي أرصدة العملاء" value={formatMoney(teamOutstanding)} hint="ر.س" icon={<HandCoins size={14} />} />
          <StatCard label="فواتير غير مسددة" value={formatMoney(totalOutstanding)} hint="ر.س" icon={<HandCoins size={14} />} />
          <StatCard label="متأخر أكثر من 90 يوم" value={formatMoney(aging.over90)} hint="ر.س — يحتاج إجراء" icon={<AlertTriangle size={14} />} />
        </div>

        <Card title="توزيع الأعمار" subtitle="تحليل أعمار الديون غير المسددة">
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {[
              { label: "حالية (≤0 يوم)", value: aging.current, tone: "success" as const },
              { label: "متأخرة 1–30 يوم", value: aging.late, tone: "warning" as const },
              { label: "31–60 يوم", value: aging["31_60"], tone: "warning" as const },
              { label: "61–90 يوم", value: aging["61_90"], tone: "danger" as const },
              { label: "أكثر من 90 يوم", value: aging.over90, tone: "danger" as const },
            ].map((b) => (
              <div key={b.label} className="card" style={{ padding: 0 }}>
                <div className="card-body">
                  <div className="muted" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>{b.label}</div>
                  <div className="num" style={{ fontWeight: 700 }}>{formatMoney(b.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="أداء التحصيل اليومي للمندوبين">
          <DataTable
            columns={[
              { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => r.name, priority: "primary", render: (r) => <b>{r.name}</b> },
              { key: "collections", header: "تحصيل اليوم", numeric: true, sortable: true, sortValue: (r) => statByRep.get(r.id)?.todayCollections ?? 0, priority: "primary", render: (r) => <span className="num">{formatMoney(statByRep.get(r.id)?.todayCollections ?? 0)}</span> },
              { key: "target", header: "هدف الشهر", numeric: true, sortable: true, sortValue: (r) => statByRep.get(r.id)?.targetCollections ?? 0, priority: "secondary", render: (r) => <span className="num">{formatMoney(statByRep.get(r.id)?.targetCollections ?? 0)}</span> },
            ]}
            rows={reps}
            rowKey={(r) => r.id}
            emptyTitle="لا يوجد مندوبون"
            pageSize={10}
          />
        </Card>

        <Card title="الفواتير غير المسددة" subtitle={`إجمالي ${formatNumber(unpaidInvoices.length)} فاتورة`}>
          <FilterBar>
            <Select
              label="المندوب"
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              placeholder="الكل"
              options={reps.map((r) => ({ value: r.id, label: r.name }))}
            />
          </FilterBar>
          <DataTable
            columns={columns}
            rows={unpaidInvoices}
            rowKey={(s) => s.id}
            searchPlaceholder="بحث برقم الفاتورة أو العميل..."
            searchKeys={(s) => `${s.number} ${customerName(s.customerId)}`}
            emptyTitle="لا توجد فواتير غير مسددة"
            pageSize={10}
          />
        </Card>
      </div>
    </div>
  );
}
