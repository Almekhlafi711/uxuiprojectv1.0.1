import { UserCheck, PauseCircle } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { formatMoney, formatDateShort } from "@/utils/format";
import type { CustomerSuspension } from "@/types";

export function SuspendedCustomersPage() {
  const { customerSuspensions, customers, reps } = useTeamData();

  const columns: Column<CustomerSuspension>[] = [
    { key: "customerName", header: "العميل", priority: "primary", render: (c) => <b>{c.customerName}</b> },
    { key: "rep", header: "المندوب", priority: "primary", render: (c) => {
      const cust = customers.find((x) => x.id === c.customerId);
      const rep = cust?.repId ? reps.find((r) => r.id === cust.repId) : undefined;
      return cust ? <span>{rep?.name ?? cust.repId}</span> : <span className="muted">—</span>;
    } },
    { key: "suspendedBy", header: "قرر من قبل", priority: "primary", render: (c) => <span>{c.suspendedBy}</span> },
    { key: "effectiveDate", header: "تاريخ الإيقاف", priority: "secondary", render: (c) => <span className="num">{formatDateShort(c.effectiveDate)}</span> },
    { key: "debtAtSuspension", header: "الديون عند الإيقاف", numeric: true, priority: "secondary", render: (c) => <span className="num" style={{ color: "var(--color-danger)" }}>{formatMoney(c.debtAtSuspension ?? 0)}</span> },
    { key: "reason", header: "السبب", priority: "primary", render: (c) => <span style={{ fontSize: "var(--font-size-xs)" }}>{c.reason}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (c) => (
      <Badge tone={c.status === "suspended" ? "danger" : "success"} dot>{c.status === "suspended" ? "موقوف" : "نشط"}</Badge>
    ) },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "العملاء" }, { label: "العملاء الموقوفون" }]}
        title="العملاء الموقوفون"
        description="العملاء تحت الإيقاف — يُحفظ التاريخ ولا يُحذف. السياسة: بدون حذف إلا بعد إخلاء الذمة (مخزون/صندوق/عهدة)"
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="قائمة الموقوفين" subtitle={`${customerSuspensions.length} طلب إيقاف`}>
          <DataTable columns={columns} rows={customerSuspensions} rowKey={(c) => c.id} searchPlaceholder="بحث بالعميل أو المندوب..." searchKeys={(c) => `${c.customerName} ${c.suspendedBy}`} initialSort={{ key: "effectiveDate", dir: "desc" }} emptyTitle="لا يوجد عملاء موقوفون" pageSize={10} />
        </Card>
        <Card title="سياسة الإيقاف" subtitle="قواعد">
          <ul style={{ display: "grid", gap: 6, fontSize: "var(--font-size-sm)", paddingLeft: 20 }}>
            <li>الإيقاف = Active → Suspended (لا Delete)</li>
            <li>المراجعة: المخزون — الصندوق — العهدة قبل الإيقاف النهائي</li>
            <li>بنود الديون/المبيعات/التحصيل تبقى مرتبطة به</li>
            <li>الإعادة: يتطلب اعتماد المنظم أو المدير حسب السياسة</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
