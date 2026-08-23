import { useMemo, useState } from "react";
import { TrendingDown, UserCheck } from "lucide-react";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { formatMoney, formatNumber, formatDateShort } from "@/utils/format";
import type { Invoice, Customer, User } from "@/types";

type Bucket = "not_due" | "1_30" | "31_60" | "61_90" | "over_90";

interface AgedInvoice {
  invoice: Invoice;
  customer: Customer;
  rep: User | undefined;
  outstanding: number;
  dueDate: string | undefined;
  bucket: Bucket;
  daysOverdue: number;
}

export function DebtsAgingPage() {
  const { sales: invoices, customers, reps, statByRep } = useTeamData();
  const today = supervisorPolicies.activePeriod.currentMonth;
  const [filterBucket, setFilterBucket] = useState<Bucket | "all">("all");

  const aged: AgedInvoice[] = useMemo(() => {
    return (invoices ?? [])
      .filter((inv) => inv.type === "credit" || inv.paid < inv.net)
      .map((inv) => {
        const outstanding = Math.max(0, inv.net - (inv.paid ?? 0));
        const customer = customers.find((c) => c.id === inv.customerId);
        const rep = reps.find((r) => r.id === (customer?.repId ?? inv.repId));
        const dueDate = inv.dueDate;
        let bucket: Bucket = "not_due";
        let daysOverdue = 0;
        if (dueDate) {
          daysOverdue = Math.floor((new Date(today).getTime() - new Date(dueDate).getTime()) / 86400000);
          if (daysOverdue <= 0) bucket = "not_due";
          else if (daysOverdue <= 30) bucket = "1_30";
          else if (daysOverdue <= 60) bucket = "31_60";
          else if (daysOverdue <= 90) bucket = "61_90";
          else bucket = "over_90";
        }
        return { invoice: inv, customer: customer!, rep, outstanding, dueDate, bucket, daysOverdue };
      })
      .filter((a) => a.customer);
  }, [invoices, customers, reps, today]);

  const filtered = filterBucket === "all" ? aged : aged.filter((a) => a.bucket === filterBucket);

  const bucketInfo: Record<Bucket, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
    not_due: { label: "غير متأخرة", tone: "success" },
    "1_30": { label: "1–30 يوم", tone: "info" },
    "31_60": { label: "31–60 يوم", tone: "warning" },
    "61_90": { label: "61–90 يوم", tone: "danger" },
    over_90: { label: "> 90 يوم", tone: "danger" },
  };

  const totalsByBucket = (bucket: Bucket) => aged.filter((a) => a.bucket === bucket).reduce((s, a) => s + a.outstanding, 0);

  const columns: Column<AgedInvoice>[] = [
    { key: "customer", header: "العميل", priority: "primary", render: (a) => <b>{a.customer.name}</b> },
    { key: "rep", header: "المندوب", priority: "primary", render: (a) => a.rep ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><UserCheck size={13} />{a.rep.name}</span> : <span className="muted">—</span> },
    { key: "invoice", header: "الفاتورة", priority: "secondary", render: (a) => <span className="muted">{a.invoice.invoiceNumber}</span> },
    { key: "dueDate", header: "تاريخ الاستحقاق", priority: "secondary", render: (a) => <span className="num">{a.dueDate ?? "—"}</span> },
    { key: "outstanding", header: "المستحق", numeric: true, priority: "primary", render: (a) => <span className="num" style={{ color: "var(--color-danger)" }}>{formatMoney(a.outstanding)}</span> },
    { key: "daysOverdue", header: "متأخر منذ", numeric: true, sortable: true, sortValue: (a) => a.daysOverdue, priority: "primary", render: (a) => (
      <Badge tone={a.bucket === "not_due" ? "success" : a.daysOverdue > 90 ? "danger" : a.daysOverdue > 60 ? "warning" : "info"} dot>
        {a.daysOverdue > 0 ? `${a.daysOverdue} يوم` : "موقع"}
      </Badge>
    ) },
    { key: "bucket", header: "الفئة", priority: "secondary", render: (a) => <Badge tone={bucketInfo[a.bucket].tone} dot>{bucketInfo[a.bucket].label}</Badge> },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "العملاء والديون" }, { label: "أعمار الديون" }]}
        title="تحليل الديون"
        description="Aging Buckets: Not Due / 1-30 / 31-60 / 61-90 / >90 — نطاق الفريق"
        quickActions={
          <div className="quick-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["all", ...Object.keys(bucketInfo)] as const).map((b) => (
              <Button key={b} variant={filterBucket === b ? "primary" : "ghost"} size="sm" onClick={() => setFilterBucket(b === "all" ? "all" : (b as Bucket))} style={{ fontSize: "var(--font-size-xs)" }}>
                {b === "all" ? "الكل" : bucketInfo[b as Bucket].label}
              </Button>
            ))}
          </div>
        }
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          {(["not_due", "1_30", "31_60", "61_90", "over_90"] as Bucket[]).map((b) => (
            <StatCard key={b} label={bucketInfo[b].label} value={formatMoney(totalsByBucket(b))} hint={`${aged.filter((a) => a.bucket === b).length} فاتورة`} icon={<TrendingDown size={14} />} />
          ))}
        </div>
        <Card title={`الديون (${filterBucket === "all" ? "الكل" : bucketInfo[filterBucket as Bucket]?.label})`} subtitle={`مجموع المستحقات: ${formatMoney(filtered.reduce((s, a) => s + a.outstanding, 0))}`}>
          <DataTable columns={columns} rows={filtered} rowKey={(a) => a.invoice.id} searchPlaceholder="بحث بالعميل أو الفاتورة..." searchKeys={(a) => `${a.customer.name} ${a.invoice.invoiceNumber}`} initialSort={{ key: "daysOverdue", dir: "desc" }} emptyTitle="لا توجد ديون في هذه الفئة" pageSize={10} />
        </Card>
      </div>
    </div>
  );
}
