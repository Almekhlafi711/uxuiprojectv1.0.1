import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { stockRequests, warehouses } from "@/mock/inventory";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
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
import { createStockRequest } from "@/services/stockRequests.service";
import { formatDateShort, formatNumber } from "@/utils/format";
import type { StockRequest } from "@/types";

export function RequestsPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.inventory.requests());
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);

  const repName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? "—";
  const isRep = user?.role === "REPRESENTATIVE";

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (isRep) rows = rows.filter((r) => r.repId === user.id);
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [data, statusFilter, isRep, user?.id]);

  const pendingCount = filtered.filter((r) => r.status === "pending").length;

  const columns: Column<StockRequest>[] = [
    { key: "number", header: "رقم الطلب", sortable: true, sortValue: (r) => r.number, priority: "primary", render: (r) => <b className="num">{r.number}</b> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => repName(r.repId), priority: "primary", render: (r) => repName(r.repId) },
    { key: "warehouse", header: "المستودع", priority: "secondary", render: (r) => whName(r.warehouseId) },
    {
      key: "items",
      header: "الأصناف المطلوبة",
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
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المخزون", path: "/inventory" }, { label: "طلبات البضاعة" }]}
        title="طلبات البضاعة"
        description={isRep ? "طلباتك من المستودع — ستراجعها الإدارة قبل التنفيذ" : `${filtered.length} طلب · ${pendingCount} قيد الانتظار`}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>
            طلب جديد
          </Button>
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
              { value: "delivered", label: "تم التسليم" },
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
        searchPlaceholder="بحث برقم الطلب..."
        searchKeys={(r) => `${r.number} ${repName(r.repId)}`}
        exportFilename="stock-requests"
        pageSize={10}
        emptyTitle="لا توجد طلبات مطابقة"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="طلب بضاعة جديد"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => {
            createStockRequest(
              { warehouseId: "wh-01", items: [] },
              { id: user?.id ?? "system" }
            );
            toast.success("تم إرسال الطلب — بانتظار الاعتماد");
            setOpen(false);
          }}>إرسال الطلب</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-6">
            <Select label="المستودع" defaultValue="wh-01" options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
          </div>
          <div className="field-span-6">
            <Select label="أولوية الطلب" defaultValue="normal" options={[{ value: "urgent", label: "عاجل" }, { value: "normal", label: "عادي" }]} />
          </div>
          <div className="field-span-12">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              ستضاف الأصناف والكميات في الخطوة التالية مع مراجعة المستودع للتوفر.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}