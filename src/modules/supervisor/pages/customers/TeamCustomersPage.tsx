import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Ban, PlayCircle } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { mockApi } from "@/services/mockApi";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea, Select } from "@/components/ui/FormControls";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { formatMoney, formatNumber, formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import type { Customer } from "@/types";
import { getAllCustomerBalances } from "@/services/ledger";

export function TeamCustomersPage() {
  const { reps, customers, today } = useTeamData();
  const [repFilter, setRepFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [suspendModal, setSuspendModal] = useState<{ customerId: string; customerName: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const balanceMap = new Map(getAllCustomerBalances().map((b) => [b.customerId, b.balance]));

  const repName = (id: string) => reps.find((r) => r.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    let rows = customers ?? [];
    if (repFilter) rows = rows.filter((c) => c.repId === repFilter);
    if (statusFilter) rows = rows.filter((c) => c.status === statusFilter);
    return rows;
  }, [customers, repFilter, statusFilter]);

  const totalBalance = filtered.reduce((a, c) => a + (balanceMap.get(c.id) ?? 0), 0);
  const creditRisk = filtered.filter((c) => c.creditLimit > 0 && (balanceMap.get(c.id) ?? 0) / c.creditLimit >= 0.9).length;

  const columns: Column<Customer>[] = [
    { key: "name", header: "العميل", sortable: true, sortValue: (c) => c.name, priority: "primary", render: (c) => (
      <Link to={`/supervisor/customers/${c.id}`} style={{ fontWeight: 600 }}>{c.name}</Link>
    ) },
    { key: "code", header: "الرمز", priority: "optional", render: (c) => <span className="num">{c.code}</span> },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (c) => repName(c.repId), priority: "primary", render: (c) => repName(c.repId) },
    { key: "type", header: "النوع", priority: "secondary", render: (c) => (
      <Badge tone="neutral">{c.type === "retailer" ? "مفرق" : c.type === "wholesaler" ? "جملة" : c.type === "supermarket" ? "سوبر ماركت" : c.type === "restaurant" ? "مطعم" : "كشك"}</Badge>
    ) },
    { key: "balance", header: "الرصيد", numeric: true, sortable: true, sortValue: (c) => (balanceMap.get(c.id) ?? 0), priority: "primary", render: (c) => <span className="num" style={{ fontWeight: 600 }}>{formatMoney(balanceMap.get(c.id) ?? 0)}</span> },
    { key: "credit", header: "الحد الائتماني", numeric: true, sortable: true, sortValue: (c) => c.creditLimit, priority: "secondary", render: (c) => <span className="num">{formatMoney(c.creditLimit)}</span> },
    { key: "lastVisit", header: "آخر زيارة", priority: "secondary", render: (c) => <span className="num">{c.lastVisitAt ? formatDateShort(c.lastVisitAt) : "—"}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (c) => (
      <Badge tone={c.status === "active" ? "success" : c.status === "overdue" ? "danger" : c.status === "suspended" ? "warning" : "neutral"} dot>
        {c.status === "active" ? "نشط" : c.status === "overdue" ? "متأخر" : c.status === "suspended" ? "موقوف" : "غير نشط"}
      </Badge>
    ) },
    { key: "actions", header: "", priority: "primary", render: (c) => c.status === "active" ? (
      <Button variant="ghost" size="sm" icon={<Ban size={14} />} onClick={() => setSuspendModal({ customerId: c.id, customerName: c.name })}>إيقاف</Button>
    ) : c.status === "suspended" ? (
      <Button variant="ghost" size="sm" icon={<PlayCircle size={14} />} onClick={async () => { try { await mockApi.customers.reactivate(c.id); toast.success(`تم تفعيل العميل: ${c.name}`); } catch { toast.error("فشل تفعيل العميل"); } }}>تفعيل</Button>
    ) : null },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "عملاء الفريق" }]}
        title="عملاء الفريق"
        description={`${formatNumber(customers.length)} عميل ضمن نطاق فريقك — اعتباراً من ${today}`}
      />

      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <div className="stat-grid">
          <StatCard label="عدد العملاء" value={formatNumber(customers.length)} hint="عميل" icon={<Users size={14} />} />
          <StatCard label="إجمالي الأرصدة" value={formatMoney(totalBalance)} hint="ر.س" icon={<Users size={14} />} />
          <StatCard label="مخاطر ائتمانية" value={String(creditRisk)} hint="عميل ≥ 90% من الحد" icon={<Users size={14} />} />
        </div>

        <Card title="عملاء فريقك" subtitle="اضغط على العميل لعرض ملفه الكامل">
          <FilterBar>
            <Select
              label="المندوب"
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              placeholder="الكل"
              options={reps.map((r) => ({ value: r.id, label: r.name }))}
            />
            <Select
              label="الحالة"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="الكل"
              options={[
                { value: "active", label: "نشط" },
                { value: "overdue", label: "متأخر" },
                { value: "suspended", label: "موقوف" },
                { value: "inactive", label: "غير نشط" },
              ]}
            />
          </FilterBar>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(c) => c.id}
            searchPlaceholder="بحث باسم العميل أو الرمز..."
            searchKeys={(c) => `${c.name} ${c.code}`}
            emptyTitle="لا يوجد عملاء"
            pageSize={10}
          />
        </Card>
      </div>

      <Modal open={suspendModal !== null} title="إيقاف العميل" size="md" onClose={() => { setSuspendModal(null); setSuspendReason(""); }}>
        {suspendModal && (
          <div className="stack" style={{ gap: 12 }}>
            <div>هل تريد إيقاف العميل <b>{suspendModal.customerName}</b>؟</div>
            <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>سيتم تغيير حالة العميل إلى "موقوف" مع حفظ كامل التاريخ والأرصدة. لن يستطيع المندوب تنفيذ مبيعات لهذا العميل حتى يتم تفعيله.</div>
            <Textarea label="سبب الإيقاف" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} required placeholder="سبب الإيقاف..." />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => { setSuspendModal(null); setSuspendReason(""); }}>إلغاء</Button>
              <Button variant="danger-solid" size="sm" onClick={async () => {
                if (!suspendReason) { toast.warning("يرجى ذكر سبب الإيقاف"); return; }
                try {
                  await mockApi.customers.suspend(suspendModal.customerId, suspendReason);
                  toast.success(`تم إيقاف العميل: ${suspendModal.customerName}`);
                  setSuspendModal(null);
                  setSuspendReason("");
                } catch { toast.error("فشل إيقاف العميل"); }
              }}>إيقاف العميل</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
