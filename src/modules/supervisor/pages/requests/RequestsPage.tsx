import { useState } from "react";
import { Link } from "react-router-dom";
import { FileCheck2 } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { formatMoney, formatDateShort } from "@/utils/format";
import type { ApprovalRequest } from "@/types";

const typeLabels: Record<string, string> = {
  discount: "خصم استثنائي",
  credit_override: "تجاوز حد ائتماني",
  stock_transfer: "تحويل مخزون",
  route_plan: "خطة سير",
  target: "الأهداف",
  leave: "إجازة",
  custody: "عهدة",
  archive_change: "تعديل أرشيف",
  price_change: "تعديل سعر",
  customer_transfer: "تحويل عميل",
  target_org: "مؤسسة مستهدفة",
  deposit: "توريد",
  closing: "إقفال يوم",
};

const statusMeta: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  pending: { label: "بانتظار الاعتماد", tone: "warning" },
  submitted: { label: "مرسل", tone: "warning" },
  under_review: { label: "قيد المراجعة", tone: "warning" },
  approved: { label: "معتمد", tone: "success" },
  rejected: { label: "مرفوض", tone: "danger" },
};

export function RequestsPage() {
  const { approvals } = useTeamData();
  const [statusFilter, setStatusFilter] = useState("");

  const pending = approvals.filter((a) => ["pending", "submitted", "under_review"].includes(a.status)).length;
  const approved = approvals.filter((a) => a.status === "approved").length;
  const rejected = approvals.filter((a) => a.status === "rejected").length;

  const filtered = statusFilter ? approvals.filter((a) => a.status === statusFilter) : approvals;

  const columns: Column<ApprovalRequest>[] = [
    { key: "number", header: "الطلب", sortable: true, sortValue: (a) => a.number, priority: "primary", render: (a) => <b className="num">{a.number}</b> },
    { key: "type", header: "النوع", sortable: true, sortValue: (a) => typeLabels[a.type] ?? a.type, priority: "primary", render: (a) => typeLabels[a.type] ?? a.type },
    { key: "title", header: "الموضوع", sortable: true, sortValue: (a) => a.title, priority: "primary", render: (a) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{a.title}</div>
        <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>من {a.requestedBy}</div>
      </div>
    ) },
    { key: "amount", header: "المبلغ", numeric: true, sortable: true, sortValue: (a) => a.amount ?? 0, priority: "secondary", render: (a) => <span className="num">{a.amount ? formatMoney(a.amount) : "—"}</span> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (a) => a.date, priority: "secondary", render: (a) => <span className="num">{formatDateShort(a.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (a) => {
      const m = statusMeta[a.status] ?? { label: a.status, tone: "neutral" as const };
      return <Badge tone={m.tone} dot>{m.label}</Badge>;
    } },
    { key: "actions", header: "", priority: "primary", render: (a) => (
      <Link to={`/approvals/${a.id}`}><Button variant="ghost" size="sm">مراجعة</Button></Link>
    ) },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "طلبات الاعتماد" }]}
        title="طلبات الاعتماد"
        description="طلبات مندوبي فريقك وطلبات المشرف — تُعتمد وفق مراحل الموافقة المعتمدة"
      />

      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="بانتظار الاعتماد" value={String(pending)} hint="طلب" icon={<FileCheck2 size={14} />} />
          <StatCard label="معتمدة" value={String(approved)} hint="طلب" icon={<FileCheck2 size={14} />} />
          <StatCard label="مرفوضة" value={String(rejected)} hint="طلب" icon={<FileCheck2 size={14} />} />
        </div>

        <Card title="جميع الطلبات">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(a) => a.id}
            searchPlaceholder="بحث برقم الطلب أو الموضوع..."
            searchKeys={(a) => `${a.number} ${a.title} ${a.requestedBy}`}
            emptyTitle="لا توجد طلبات"
            pageSize={10}
            toolbarActions={
              <div className="btn-group">
                {["", "pending", "approved", "rejected"].map((s) => (
                  <Button
                    key={s || "all"}
                    variant={statusFilter === s ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "" ? "الكل" : s === "pending" ? "معلقة" : s === "approved" ? "معتمدة" : "مرفوضة"}
                  </Button>
                ))}
              </div>
            }
          />
        </Card>
      </div>
    </div>
  );
}
