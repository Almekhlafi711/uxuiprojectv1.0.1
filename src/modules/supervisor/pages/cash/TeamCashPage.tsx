import { useMemo } from "react";
import { Wallet, ArrowDownToLine } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { formatMoney, formatDateShort } from "@/utils/format";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { toast } from "@/store/ui";
import type { CashBox, CashMovement } from "@/types";
import { getCashBoxBalance } from "@/services/ledger";

export function TeamCashPage() {
  const { user } = useAuthStore();
  const { reps } = useTeamData();
  const { data: boxes, loading: boxesLoading } = useData(() => mockApi.cash.boxes());
  const { data: movements, loading: movementsLoading } = useData(() => mockApi.cash.movements());
  const { data: deposits } = useData(() => mockApi.team.deposits());

  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? "—";
  const ownerName = (b: CashBox) => (b.ownerId === user?.id ? "صندوقي" : b.ownerId ? repName(b.ownerId) : "رئيسي");

  const myBox = useMemo(() => (boxes ?? []).find((b) => b.ownerId === user?.id), [boxes, user?.id]);
  const repBoxes = useMemo(() => (boxes ?? []).filter((b) => b.ownerId !== user?.id), [boxes, user?.id]);
  const totalRepBalance = repBoxes.reduce((a, b) => a + getCashBoxBalance(b.id).balance, 0);
  const pendingDeposits = useMemo(() => (deposits ?? []).filter((d) => d.status === "pending"), [deposits]);

  const boxColumns: Column<CashBox>[] = [
    { key: "name", header: "الصندوق", sortable: true, sortValue: (b) => b.name, priority: "primary", render: (b) => <b>{b.name}</b> },
    { key: "owner", header: "المالك", sortable: true, sortValue: (b) => ownerName(b), priority: "primary", render: (b) => ownerName(b) },
    { key: "type", header: "النوع", priority: "secondary", render: (b) => (
      <Badge tone={b.type === "main" ? "neutral" : b.type === "supervisor" ? "warning" : "success"} dot>
        {b.type === "main" ? "رئيسي" : b.type === "supervisor" ? "صندوق مشرف" : "صندوق مندوب"}
      </Badge>
    ) },
    { key: "balance", header: "الرصيد", numeric: true, sortable: true, sortValue: (b) => getCashBoxBalance(b.id).balance, priority: "primary", render: (b) => <span className="num" style={{ fontWeight: 700 }}>{formatMoney(getCashBoxBalance(b.id).balance)}</span> },
  ];

  const movementColumns: Column<CashMovement>[] = [
    { key: "number", header: "الحركة", sortable: true, sortValue: (m) => m.number, priority: "primary", render: (m) => <b className="num">{m.number}</b> },
    { key: "type", header: "النوع", priority: "primary", render: (m) => (
      <Badge tone={m.type === "collection_in" || m.type === "rep_deposit" ? "success" : m.type === "expense" ? "warning" : "neutral"}>
        {m.type === "collection_in" ? "تحصيل وارد" : m.type === "rep_deposit" ? "توريد مندوب" : m.type === "supervisor_receipt" ? "استلام مشرف" : m.type === "expense" ? "مصروف" : "تسوية"}
      </Badge>
    ) },
    { key: "amount", header: "المبلغ", numeric: true, sortable: true, sortValue: (m) => m.amount, priority: "primary", render: (m) => <span className="num" style={{ fontWeight: 600 }}>{formatMoney(m.amount)}</span> },
    { key: "box", header: "الصندوق", priority: "secondary", render: (m) => <span>{boxes?.find((b) => b.id === m.cashBoxId)?.name ?? m.cashBoxId}</span> },
    { key: "related", header: "المندوب", priority: "optional", render: (m) => (m.relatedRepId ? repName(m.relatedRepId) : "—") },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (m) => m.date, priority: "secondary", render: (m) => <span className="num">{formatDateShort(m.date)}</span> },
    { key: "createdBy", header: "أنشأها", priority: "optional", render: (m) => <span style={{ fontSize: "var(--font-size-xs)" }}>{m.createdBy}</span> },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "صناديق الفريق" }]}
        title="صناديق الفريق"
        description={`صناديق المشرف والمناديب في نطاق فريقك — السياسة: ${supervisorPolicies.features.supervisorCashBox ? "المشرف يملك صندوق توريد" : "بدون صندوق مشرف"}`}
      />

      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="رصيد صندوقي" value={formatMoney(myBox ? getCashBoxBalance(myBox.id).balance : 0)} hint="ر.س" icon={<Wallet size={14} />} />
          <StatCard label="أرصدة صناديق المناديب" value={formatMoney(totalRepBalance)} hint="ر.س" icon={<Wallet size={14} />} />
          <StatCard label="توريدات بانتظار الاعتماد" value={String(pendingDeposits.length)} hint="توريد" icon={<ArrowDownToLine size={14} />} />
        </div>

        <Card title="الصناديق" subtitle="أرصدة صناديق الفريق">
          <DataTable
            columns={boxColumns}
            rows={boxes ?? []}
            rowKey={(b) => b.id}
            loading={boxesLoading}
            emptyTitle="لا توجد صناديق"
            pageSize={8}
          />
        </Card>

        <Card title="توريدات المناديب" subtitle="طلبات توريد الحصيلة إلى صندوق المشرف">
          {pendingDeposits.length === 0 ? (
            <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد توريدات معلقة.</div>
          ) : (
            <div className="list-group">
              {pendingDeposits.map((d) => (
                <div key={d.id} className="list-group-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{d.number} — {repName(d.repId)}</div>
                    <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{formatDateShort(d.date)} · {d.method === "cash" ? "نقداً" : d.method === "transfer" ? "تحويل بنكي" : d.method === "pos" ? "POS" : "شيك"}</div>
                  </div>
                  <span className="num" style={{ fontWeight: 700 }}>{formatMoney(d.amount)}</span>
                  <Button variant="secondary" size="sm" onClick={async () => { try { await mockApi.team.approveDeposit(d.id); toast.success("تم تأكيد استلام التوريد في صندوق المشرف"); } catch { toast.error("فشل تأكيد استلام التوريد"); } }}>تأكيد الاستلام</Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="حركات الصندوق">
          <DataTable
            columns={movementColumns}
            rows={movements ?? []}
            rowKey={(m) => m.id}
            loading={movementsLoading}
            searchPlaceholder="بحث برقم الحركة..."
            searchKeys={(m) => `${m.number} ${m.createdBy}`}
            emptyTitle="لا توجد حركات"
            pageSize={10}
          />
        </Card>
      </div>
    </div>
  );
}
