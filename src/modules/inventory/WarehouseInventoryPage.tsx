import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Download } from "lucide-react";
import { warehouseStock } from "@/mock/inventory";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatMoney, formatNumber } from "@/utils/format";
import type { StockItem } from "@/types";

export function WarehouseInventoryPage() {
  const { data, loading, error, refetch } = useData(() => mockApi.inventory.warehouseStock());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [receivingOpen, setReceivingOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((s) => {
      if (categoryFilter && !s.productName.includes(categoryFilter)) return false;
      if (lowOnly && s.available > s.reorderLevel) return false;
      return true;
    });
  }, [data, categoryFilter, lowOnly]);

  const totals = (data ?? []).reduce(
    (acc, s) => {
      acc.available += s.available;
      acc.value += s.available * s.costPrice;
      return acc;
    },
    { available: 0, value: 0 }
  );

  const columns: Column<StockItem>[] = [
    {
      key: "product",
      header: "المنتج",
      sortable: true,
      sortValue: (r) => r.productName,
      priority: "primary",
      render: (r) => <div style={{ fontWeight: 500 }}>{r.productName}</div>,
    },
    { key: "available", header: "المتوفر", numeric: true, sortable: true, sortValue: (r) => r.available, priority: "primary", render: (r) => <span className="num" style={{ fontWeight: 600 }}>{formatNumber(r.available)}</span> },
    { key: "reserved", header: "محجوز", numeric: true, sortable: true, sortValue: (r) => r.reserved, priority: "secondary", render: (r) => <span className="num">{formatNumber(r.reserved)}</span> },
    { key: "damaged", header: "تالف", numeric: true, sortable: true, sortValue: (r) => r.damaged, priority: "secondary", render: (r) => <span className="num" style={{ color: r.damaged > 0 ? "var(--color-danger)" : undefined }}>{formatNumber(r.damaged)}</span> },
    { key: "inTransit", header: "قيد النقل", numeric: true, sortable: true, sortValue: (r) => r.inTransit, priority: "optional", render: (r) => <span className="num" style={{ color: "var(--color-info)" }}>{formatNumber(r.inTransit)}</span> },
    { key: "cost", header: "قيمة المخزون", numeric: true, sortable: true, sortValue: (r) => r.available * r.costPrice, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.available * r.costPrice)}</span> },
    {
      key: "status",
      header: "الحالة",
      priority: "primary",
      render: (r) =>
        r.available <= r.reorderLevel ? (
          <Badge tone="danger" dot>أقل من مستوى الطلب</Badge>
        ) : r.available <= r.reorderLevel * 2 ? (
          <Badge tone="warning" dot>منخفض</Badge>
        ) : (
          <Badge tone="success" dot>جيد</Badge>
        ),
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المخزون", path: "/inventory" }, { label: "مخزون المستودع" }]}
        title="مخزون المستودع الرئيسي"
        description={`${formatNumber(totals.available)} وحدة · بقيمة ${formatMoney(totals.value)}`}
        actions={
          <>
            <Button variant="secondary" icon={<Download size={15} />}>تقرير الجرد</Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setReceivingOpen(true)}>استلام بضاعة</Button>
          </>
        }
      >
        <FilterBar>
          <Select
            label="التصنيف"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="كل التصنيفات"
            options={[
              { value: "مشروبات", label: "مشروبات" },
              { value: "مواد غذائية", label: "مواد غذائية" },
              { value: "ألبان", label: "ألبان" },
              { value: "استهلاكية", label: "مواد استهلاكية" },
              { value: "حلويات", label: "حلويات ووجبات خفيفة" },
            ]}
          />
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
            <label className="checkbox">
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
              المنتجات تحت مستوى إعادة الطلب فقط
            </label>
          </div>
        </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.productId}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث بالمنتج..."
        searchKeys={(r) => r.productName}
        exportFilename="warehouse-stock"
        pageSize={15}
        emptyTitle="لا توجد أصناف مطابقة"
      />

      <Modal
        open={receivingOpen}
        onClose={() => setReceivingOpen(false)}
        title="استلام بضاعة — GRN جديد"
        footer={<>
          <Button variant="secondary" onClick={() => setReceivingOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => { toast.success("تم تسجيل الاستلام وزيادة المخزون"); setReceivingOpen(false); }}>تسجيل الاستلام</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-6">
            <Input label="رقم مرجع المورد" placeholder="GRN-2026-..." />
          </div>
          <div className="field-span-6">
            <Input label="تاريخ الاستلام" type="date" defaultValue="2026-08-14" />
          </div>
          <div className="field-span-12">
            <SearchableProductInput label="منتج" />
          </div>
          <div className="field-span-6">
            <Input label="الكمية المستلمة" type="number" min={1} placeholder="0" />
          </div>
          <div className="field-span-6">
            <Input label="سعر التكلفة (ر.س)" type="number" placeholder="0.00" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SearchableProductInput({ label }: { label: string }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="searchable-select">
        <button type="button" className="ss-input">
          <span className="placeholder">ابحث عن منتج...</span>
        </button>
      </div>
    </div>
  );
}