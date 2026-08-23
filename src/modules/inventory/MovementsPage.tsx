import { useMemo, useState } from "react";
import { stockMovements, warehouses, movementsByProduct } from "@/mock/inventory";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Timeline } from "@/components/ui/Progress";
import { formatDateTime, formatNumber } from "@/utils/format";
import type { StockMovement } from "@/types";

const typeMeta: Record<string, { label: string; tone: "success" | "danger" | "info" | "warning" | "neutral"; sign: number }> = {
  receiving: { label: "استلام بضاعة", tone: "success", sign: 1 },
  transfer_in: { label: "تحويل وارد", tone: "success", sign: 1 },
  return_in: { label: "مرتجع وارد", tone: "success", sign: 1 },
  transfer_out: { label: "تحويل صادر", tone: "info", sign: -1 },
  issue: { label: "صرف (بيع)", tone: "danger", sign: -1 },
  damage: { label: "تلف", tone: "danger", sign: -1 },
  count_adjust: { label: "تسوية جرد", tone: "warning", sign: 0 },
};

export function MovementsPage() {
  const { data, loading, error, refetch } = useData(() => mockApi.inventory.movements());
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  const productOptions = useMemo(() => {
    const seen = new Set<string>();
    return (data ?? []).filter((m) => !seen.has(m.productId) && seen.add(m.productId)).map((m) => ({ value: m.productId, label: m.productName }));
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (typeFilter) rows = rows.filter((m) => m.type === typeFilter);
    if (dateFrom) rows = rows.filter((m) => m.date.slice(0, 10) >= dateFrom);
    if (dateTo) rows = rows.filter((m) => m.date.slice(0, 10) <= dateTo);
    return rows;
  }, [data, typeFilter, dateFrom, dateTo]);

  const inQty = filtered.filter((m) => typeMeta[m.type]?.sign === 1).reduce((s, m) => s + m.qty, 0);
  const outQty = filtered.filter((m) => typeMeta[m.type]?.sign === -1).reduce((s, m) => s + m.qty, 0);

  const columns: Column<StockMovement>[] = [
    {
      key: "type",
      header: "النوع",
      sortable: true,
      sortValue: (r) => typeMeta[r.type]?.label ?? r.type,
      render: (r) => <Badge tone={typeMeta[r.type]?.tone ?? "neutral"} dot>{typeMeta[r.type]?.label ?? r.type}</Badge>,
    },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, render: (r) => <span className="num" style={{ whiteSpace: "nowrap" }}>{formatDateTime(r.date)}</span> },
    { key: "product", header: "المنتج", sortable: true, sortValue: (r) => r.productName, render: (r) => <div style={{ fontWeight: 500 }}>{r.productName}</div> },
    { key: "ref", header: "المرجع", sortable: true, sortValue: (r) => r.refNumber, render: (r) => <span className="num" style={{ direction: "ltr", display: "inline-block" }}>{r.refNumber}</span> },
    { key: "location", header: "الموقع", render: (r) => {
      const locs: string[] = [];
      if (r.fromWarehouseId) locs.push(`من: ${warehouses.find((w) => w.id === r.fromWarehouseId)?.name ?? r.fromWarehouseId}`);
      if (r.toWarehouseId) locs.push(`إلى: ${warehouses.find((w) => w.id === r.toWarehouseId)?.name ?? r.toWarehouseId}`);
      if (r.repId) locs.push("سيارة مندوب");
      return <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>{locs.join(" · ")}</span>;
    } },
    {
      key: "qty",
      header: "الكمية",
      numeric: true,
      sortable: true,
      sortValue: (r) => r.qty * (typeMeta[r.type]?.sign ?? 1),
      render: (r) => {
        const sign = typeMeta[r.type]?.sign ?? 1;
        return (
          <span className="num" style={{ fontWeight: 600, color: sign > 0 ? "var(--color-success)" : sign < 0 ? "var(--color-danger)" : "var(--color-warning)" }}>
            {sign > 0 ? "+" : sign < 0 ? "−" : "±"}{formatNumber(r.qty)}
          </span>
        );
      },
    },
    { key: "by", header: "بواسطة", render: (r) => <span style={{ fontSize: "var(--font-size-sm)" }}>{r.createdBy}</span> },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المخزون", path: "/inventory" }, { label: "سجل الحركات" }]}
        title="سجل حركات المخزون"
        description={`وارد ${formatNumber(inQty)} · صادر ${formatNumber(outQty)} · ${filtered.length} حركة`}
      >
        <FilterBar>
          <Select
            label="النوع"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="كل الحركات"
            options={Object.entries(typeMeta).map(([v, m]) => ({ value: v, label: m.label }))}
          />
          <Select
            label="المنتج"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            placeholder="كل المنتجات"
            options={productOptions}
          />
          <Input label="من تاريخ" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="إلى تاريخ" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث بالمرجع أو المنتج..."
        searchKeys={(r) => `${r.refNumber} ${r.productName} ${r.createdBy}`}
        exportFilename="stock-movements"
        pageSize={12}
        emptyTitle="لا توجد حركات مطابقة"
        initialSort={{ key: "date", dir: "desc" }}
      />

      {selectedProduct && (
        <Card title={`مخطط حركة ${productOptions.find((p) => p.value === selectedProduct)?.label ?? ""}`} className="mt-4">
          <Timeline
            steps={movementsByProduct(selectedProduct).map((m) => ({
              label: `${typeMeta[m.type]?.label ?? m.type} — ${m.qty} وحدة`,
              status: (typeMeta[m.type]?.sign === 1 ? "done" : typeMeta[m.type]?.sign === -1 ? "failed" : "current") as "done" | "failed" | "current",
              meta: `${m.refNumber} · ${formatDateTime(m.date)} · ${m.createdBy}`,
            }))}
          />
        </Card>
      )}
    </div>
  );
}