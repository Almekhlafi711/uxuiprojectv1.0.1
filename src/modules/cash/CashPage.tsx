import { useMemo, useState } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { cashBoxes, cashMovements } from "@/mock/cash";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { cashActions } from "@/config/dashboardActions";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatMoney, formatDateShort } from "@/utils/format";
import { can } from "@/config/permissions";
import { dataScopeOf } from "@/config/authority";
import { getDataScope, canAccessCashBox } from "@/services/scope";
import { getCashBoxBalance } from "@/services/ledger";
import { submitClosing } from "@/services/closing.service";
import type { CashMovement } from "@/types";

const typeMeta: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info"; sign: 1 | -1 }> = {
  collection_in: { label: "تحصيل وارد", tone: "success", sign: 1 },
  rep_deposit: { label: "توريد مندوب", tone: "success", sign: 1 },
  supervisor_receipt: { label: "استلام مشرف", tone: "info", sign: 1 },
  expense: { label: "مصروف", tone: "danger", sign: -1 },
  adjustment: { label: "تسوية", tone: "warning", sign: 1 },
};

export function CashPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.cash.movements());
  const [typeFilter, setTypeFilter] = useState("");
  const [boxFilter, setBoxFilter] = useState("");
  const [open, setOpen] = useState(false);

  const userName = (id?: string) => users.find((u) => u.id === id)?.name ?? "—";
  const canSettle = can("cash.settle", user?.role ?? "REPRESENTATIVE");

  const scope = getDataScope(user);
  const isRep = user?.role === "REPRESENTATIVE";
  const visibleBoxes = scope ? cashBoxes.filter((b) => canAccessCashBox(scope, b)) : [];

  const myBox = cashBoxes.find((b) => b.ownerId === user?.id && b.type !== "main");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (typeFilter) rows = rows.filter((r) => r.type === typeFilter);
    if (boxFilter) rows = rows.filter((r) => r.cashBoxId === boxFilter);
    return rows;
  }, [data, typeFilter, boxFilter]);

  const inflows = filtered.filter((m) => typeMeta[m.type]?.sign === 1).reduce((s, m) => s + m.amount, 0);
  const outflows = filtered.filter((m) => typeMeta[m.type]?.sign === -1).reduce((s, m) => s + m.amount, 0);

  const columns: Column<CashMovement>[] = [
    { key: "number", header: "الحركة", sortable: true, sortValue: (r) => r.number, priority: "primary", render: (r) => <b className="num">{r.number}</b> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "type", header: "النوع", priority: "primary", render: (r) => <Badge tone={typeMeta[r.type]?.tone ?? "neutral"} dot>{typeMeta[r.type]?.label ?? r.type}</Badge> },
    {
      key: "amount",
      header: "المبلغ",
      numeric: true,
      sortable: true,
      sortValue: (r) => r.amount * (typeMeta[r.type]?.sign ?? 1),
      priority: "primary",
      render: (r) => (
        <span className="num" style={{ fontWeight: 600, color: (typeMeta[r.type]?.sign ?? 1) > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
          {(typeMeta[r.type]?.sign ?? 1) > 0 ? "+" : "−"}{formatMoney(r.amount)}
        </span>
      ),
    },
    { key: "box", header: "الصندوق", priority: "secondary", render: (r) => cashBoxes.find((b) => b.id === r.cashBoxId)?.name ?? "—" },
    { key: "by", header: "بواسطة", sortable: true, sortValue: (r) => r.createdBy, priority: "optional", render: (r) => r.createdBy },
    { key: "notes", header: "ملاحظات", priority: "optional", render: (r) => <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>{r.notes ?? "—"}</span> },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الصناديق والتسويات" }]}
        title="الصناديق والتسويات"
        description="أرصدة الصناديق وحركات الدخول والخروج عبر المستويات"
        actions={
          canSettle ? (
            <Button variant="primary" icon={<Wallet size={15} />} onClick={() => setOpen(true)}>تسوية صندوق</Button>
          ) : null
        }
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          {!isRep && <StatCard label="رصيد الصندوق الرئيسي" value={formatMoney(getCashBoxBalance("bx-main").balance)} hint="المركزي" icon={<Wallet size={14} />} />}
          <StatCard label="إجمالي الصناديق" value={formatMoney(visibleBoxes.reduce((s, b) => s + getCashBoxBalance(b.id).balance, 0))} hint={`${visibleBoxes.length} صندوق`} icon={<Wallet size={14} />} />
          {myBox ? (
            <StatCard label="صندوقي" value={formatMoney(getCashBoxBalance(myBox.id).balance)} hint={myBox.name} icon={<Wallet size={14} />} />
          ) : (
            <StatCard label="وارد الحركات" value={formatMoney(inflows)} hint="للفترة المحددة" icon={<ArrowDownCircle size={14} />} />
          )}
          <StatCard label="صادر الحركات" value={formatMoney(outflows)} hint="مصروفات وتسويات" icon={<ArrowUpCircle size={14} />} />
        </div>

        <FilterBar>
          <Select
            label="النوع"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="الكل"
            options={Object.entries(typeMeta).map(([v, m]) => ({ value: v, label: m.label }))}
          />
          <Select
            label="الصندوق"
            value={boxFilter}
            onChange={(e) => setBoxFilter(e.target.value)}
            placeholder="كل الصناديق"
            options={visibleBoxes.map((b) => ({ value: b.id, label: b.name }))}
          />
          <Input label="بحث" type="text" placeholder="رقم الحركة..." />
        </FilterBar>
      </StickyPageHeader>

      <DashboardQuickActions actions={cashActions} sticky />

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث برقم الحركة أو المنفذ..."
        searchKeys={(r) => `${r.number} ${r.createdBy} ${r.notes ?? ""}`}
        exportFilename="cash-movements"
        pageSize={12}
        emptyTitle="لا توجد حركات صندوق مطابقة"
        initialSort={{ key: "date", dir: "desc" }}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="تسوية صندوق"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => { submitClosing({ repId: user?.id ?? "", date: new Date().toISOString().slice(0, 10), actualCash: 0, expectedCash: 0, salesCount: 0, collectionCount: 0, returnCount: 0, expenseTotal: 0, depositAmount: 0, inventoryVarianceItems: [] }, { id: user?.id ?? "", role: user?.role ?? "REPRESENTATIVE", scope: dataScopeOf[user?.role ?? "REPRESENTATIVE"], owns: false }); toast.success("أُرسلت التسوية — تُعتمد من المستوى الأعلى"); setOpen(false); }}>إرسال التسوية</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-12">
            <Select label="الصندوق" placeholder="اختر صندوقاً" options={visibleBoxes.map((b) => ({ value: b.id, label: `${b.name} — رصيد ${formatMoney(getCashBoxBalance(b.id).balance)}` }))} />
          </div>
          <div className="field-span-6"><Input label="الرصيد الفعلي المقبوض (ر.س)" type="number" min={0} placeholder="0.00" /></div>
          <div className="field-span-6"><Input label="الفروقات (ر.س)" type="number" placeholder="0.00" /></div>
          <div className="field-span-12">
            <div className="alert alert-warning" style={{ marginBottom: 0 }}>
              أي فرق بين الرصيد الفعلي والمسجل يُسجل كتسوية ويحتاج اعتماداً مع تبرير.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}