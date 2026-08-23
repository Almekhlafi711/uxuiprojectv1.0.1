import { Link } from "react-router-dom";
import { PackageCheck, UserCheck, CalendarDays, ShieldAlert, Archive } from "lucide-react";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { formatDateShort } from "@/utils/format";
import type { CustodyRecord } from "@/types";

export function AssetsPage() {
  const { custody, assetRequests, reps } = useTeamData();
  const repCustody = custody.filter((c) => c.assignedToRole === "REPRESENTATIVE");

  const columns: Column<CustodyRecord>[] = [
    { key: "asset", header: "الأصل", priority: "primary", render: (c) => (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <b>{c.assetName}</b>
        <span className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{c.assetType} — {c.serialNumber}</span>
      </div>
    ) },
    { key: "rep", header: "المندوب", priority: "primary", render: (c) => {
      const rep = reps.find((r) => r.id === c.assignedToId);
      return rep ? <b>{rep.name}</b> : <span className="muted">{c.assignedToId}</span>;
    } },
    { key: "issuedAt", header: "تاريخ التسليم", priority: "secondary", render: (c) => <span className="num">{formatDateShort(c.issuedAt)}</span> },
    { key: "condition", header: "الحالة", priority: "secondary", render: (c) => (
      <Badge tone={c.condition === "good" ? "success" : c.condition === "damaged" ? "danger" : c.condition === "lost" ? "danger" : "warning"} dot>{c.condition === "good" ? "ممتاز" : c.condition === "damaged" ? "تالف" : c.condition === "lost" ? "ضائع" : "يحتاج صيانة"}</Badge>
    ) },
    { key: "status", header: "الحالة العامة", priority: "primary", render: (c) => (
      <Badge tone={c.status === "issued" ? "success" : c.status === "transferred" ? "info" : "neutral"}>{c.status === "issued" ? "صادر" : c.status === "transferred" ? "محوّل" : "مرتجع"}</Badge>
    ) },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "الأصول والعهد" }]}
        title="العهد والأصول"
        description="مراجعة العهد الموزعة وطلبات الأصول — المشرف يراجع الطلبات، ولا يعتمدها (Sales Manager يعتمد)"
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="العهد الموزعة" subtitle={`${repCustody.length} أصلًا`}>
          <DataTable columns={columns} rows={repCustody} rowKey={(c) => c.id} searchPlaceholder="بحث بالمندوب أو الأصل..." searchKeys={(c) => `${c.assetName} ${c.assignedToId}`} emptyTitle="لا توجد عهد" pageSize={10} />
        </Card>
        <Card title="طلبات العهد" subtitle={`معلقة على المدير المبيعات: ${assetRequests.filter((a) => a.status === "pending_approval").length}`}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>الرقم</th><th>الأصل</th><th>المستفيد</th><th>الحالة</th><th>مدعوم من قبل</th></tr></thead>
              <tbody>
                {assetRequests.map((a) => (
                  <tr key={a.id}>
                    <td>{a.number}</td>
                    <td>{a.assetName}</td>
                    <td>{a.beneficiaryName}</td>
                    <td><Badge tone={a.status === "pending_approval" ? "warning" : a.status === "approved" ? "success" : a.status === "rejected" ? "danger" : a.status === "handed_over" ? "info" : "neutral"} dot>{a.status === "pending_approval" ? "بانتظار مدير" : a.status === "approved" ? "معتمد" : a.status === "handed_over" ? "منحوت" : a.status}</Badge></td>
                    <td>{a.approvedBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8 }}>
            <Link to="/supervisor/assets/requests"><Button variant="ghost" size="sm">إدارة الطلبات</Button></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
