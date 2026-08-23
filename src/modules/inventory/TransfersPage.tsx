import { useMemo, useState } from "react";
import { Plus, Download } from "lucide-react";
import { stockTransfers, warehouses } from "@/mock/inventory";
import { users } from "@/mock/users";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { createAdminTransfer } from "@/services/stockRequests.service";
import { formatDateShort, formatNumber } from "@/utils/format";
import { can } from "@/config/permissions";
import { useAuthStore } from "@/store/auth";
import { getDataScope, visibleUsers } from "@/services/scope";
import type { StockTransfer } from "@/types";

export function TransfersPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.inventory.transfers());
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);

  const scope = getDataScope(user);
  const canCreate = can("inventory.transfer", user?.role ?? "REPRESENTATIVE");
  const visibleReps = scope ? visibleUsers(scope).filter((u) => u.role === "REPRESENTATIVE") : [];

  const whName = (id?: string) => warehouses.find((w) => w.id === id)?.name ?? "—";
  const repName = (id?: string) => users.find((u) => u.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!statusFilter) return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [data, statusFilter]);

  const columns: Column<StockTransfer>[] = [
    { key: "number", header: "رقم التحويل", sortable: true, sortValue: (r) => r.number, priority: "primary", render: (r) => <b className="num">{r.number}</b> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    {
      key: "from",
      header: "من",
      sortable: true,
      sortValue: (r) => (r.fromWarehouseId ? whName(r.fromWarehouseId) : ""),
      priority: "primary",
      render: (r) => (r.fromWarehouseId ? whName(r.fromWarehouseId) : "—"),
    },
    {
      key: "to",
      header: "إلى",
      sortable: true,
      sortValue: (r) => (r.toRepId ? repName(r.toRepId) : whName(r.toWarehouseId)),
      priority: "primary",
      render: (r) => (
        r.toRepId ? <div><b>{repName(r.toRepId)}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>مخزون مندوب</div></div>
          : whName(r.toWarehouseId)
      ),
    },
    {
      key: "items",
      header: "الأصناف",
      priority: "secondary",
      render: (r) => (
        <div className="stack-xs">
          {r.items.map((it) => (
            <div key={it.productId} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: "var(--font-size-sm)" }}>
              <span>{it.productName}</span>
              <b className="num" style={{ whiteSpace: "nowrap" }}>× {formatNumber(it.qty)}</b>
            </div>
          ))}
        </div>
      ),
    },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "approvedBy",
      header: "معتمد بواسطة",
      priority: "optional",
      render: (r) => (r.approvedBy ? r.approvedBy : <span className="faint">—</span>),
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المخزون", path: "/inventory" }, { label: "التحويلات بين المستودعات والمناديب" }]}
        title="التحويلات"
        description="تحويلات المخزون بين المستودعات وسيارات المناديب"
        actions={
          <>
            <Button variant="secondary" icon={<Download size={15} />}>تصدير</Button>
            {canCreate && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>تحويل جديد</Button>
            )}
          </>
        }
      >
        <FilterBar>
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="الكل"
            options={[
              { value: "pending", label: "قيد الانتظار" },
              { value: "approved", label: "معتمد" },
              { value: "completed", label: "منفذ" },
              { value: "rejected", label: "مرفوض" },
            ]}
          />
        </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث برقم التحويل..."
        searchKeys={(r) => r.number}
        exportFilename="stock-transfers"
        pageSize={10}
        emptyTitle="لا توجد تحويلات مطابقة"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="تحويل مخزون جديد"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => {
            const fromWh = "wh-01";
            const toRep = visibleReps[0]?.id ?? "";
            createAdminTransfer(
              { fromWarehouseId: fromWh, toWarehouseId: toRep, items: [] },
              { id: user?.id ?? "system" }
            );
            toast.success("تم إنشاء التحويل — سينفذه أمين المستودع");
            setOpen(false);
          }}>إنشاء التحويل</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-6">
            <Select label="المستودع المصدر" defaultValue="wh-01" options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
          </div>
          <div className="field-span-6">
            <Select label="الوجهة" defaultValue="" placeholder="اختر الوجهة" options={visibleReps.map((u) => ({ value: u.id, label: `سيارة: ${u.name}` }))} />
          </div>
          <div className="field-span-12">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              ستُضاف الأصناف والكميات في الخطوة التالية. يتحقق النظام من توفر الكميات بالمستودع قبل التنفيذ.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}