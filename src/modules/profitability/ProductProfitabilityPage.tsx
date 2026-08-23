import { useMemo, useState } from "react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { BarChart } from "@/components/charts/Charts";
import { products, productCategories } from "@/mock/products";
import { CURRENT_MONTH } from "@/config/date";
import { formatMoney, formatPercent } from "@/utils/format";

interface ProductRow {
  id: string;
  name: string;
  code: string;
  category: string;
  brand: string;
  sellPrice: number;
  costPrice: number;
  margin: number;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
}

function generateProductSalesData(): ProductRow[] {
  const quantities: Record<string, number> = {
    "p-001": 3200, "p-002": 2100, "p-003": 1800, "p-004": 1200,
    "p-005": 900, "p-006": 750, "p-007": 4500, "p-008": 3100,
    "p-009": 400, "p-010": 600, "p-011": 2800, "p-012": 500,
    "p-013": 950, "p-014": 1100, "p-015": 2500, "p-016": 350,
    "p-017": 1400, "p-018": 800, "p-019": 250, "p-020": 3200,
    "p-022": 1600,
  };

  return products
    .filter((p) => p.status === "active")
    .map((p) => {
      const unitsSold = quantities[p.id] ?? 500;
      const revenue = unitsSold * p.sellPrice;
      const cogs = unitsSold * p.costPrice;
      const grossProfit = revenue - cogs;
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const cat = productCategories.find((c) => c.id === p.categoryId);
      return {
        id: p.id,
        name: p.name,
        code: p.code,
        category: cat?.name ?? "—",
        brand: p.brand,
        sellPrice: p.sellPrice,
        costPrice: p.costPrice,
        margin,
        unitsSold,
        revenue,
        cogs,
        grossProfit,
      };
    });
}

export function ProductProfitabilityPage() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortKey, setSortKey] = useState<"revenue" | "grossProfit" | "margin" | "unitsSold">("revenue");

  const data = useMemo(() => generateProductSalesData(), []);

  const filtered = useMemo(() => {
    let rows = data;
    if (categoryFilter) rows = rows.filter((r) => {
      const cat = productCategories.find((c) => c.id === categoryFilter);
      return r.category === cat?.name;
    });
    return rows.sort((a, b) => b[sortKey] - a[sortKey]);
  }, [data, categoryFilter, sortKey]);

  const kpis = useMemo(() => {
    const rev = data.reduce((s, r) => s + r.revenue, 0);
    const cogs = data.reduce((s, r) => s + r.cogs, 0);
    const gross = data.reduce((s, r) => s + r.grossProfit, 0);
    const units = data.reduce((s, r) => s + r.unitsSold, 0);
    const margin = rev > 0 ? (gross / rev) * 100 : 0;
    return { rev, cogs, gross, units, margin };
  }, [data]);

  const topProducts = useMemo(() => [...data].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 8), [data]);

  const columns: Column<ProductRow>[] = [
    {
      key: "name", header: "المنتج", sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.name}</div>
          <div style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-muted)" }}>{r.code} • {r.brand}</div>
        </div>
      ),
    },
    {
      key: "cat", header: "الفئة",
      render: (r) => <span style={{ fontSize: "var(--font-size-xxs)" }}>{r.category}</span>,
    },
    {
      key: "units", header: "الكمية المباعة", numeric: true, sortable: true,
      sortValue: (r) => r.unitsSold,
      render: (r) => <span className="num">{r.unitsSold.toLocaleString("ar-SA")}</span>,
    },
    {
      key: "sellPrice", header: "سعر البيع", numeric: true,
      render: (r) => <span className="num">{formatMoney(r.sellPrice)}</span>,
    },
    {
      key: "costPrice", header: "سعر التكلفة", numeric: true,
      render: (r) => <span className="num" style={{ color: "var(--color-text-muted)" }}>{formatMoney(r.costPrice)}</span>,
    },
    {
      key: "rev", header: "الإيراد", numeric: true, sortable: true,
      sortValue: (r) => r.revenue,
      render: (r) => <span className="num">{formatMoney(r.revenue)}</span>,
    },
    {
      key: "cogs", header: "COGS", numeric: true, sortable: true,
      sortValue: (r) => r.cogs,
      render: (r) => <span className="num" style={{ color: "var(--color-text-muted)" }}>{formatMoney(r.cogs)}</span>,
    },
    {
      key: "profit", header: "Gross Profit", numeric: true, sortable: true,
      sortValue: (r) => r.grossProfit,
      render: (r) => <span className="num" style={{ fontWeight: 600, color: "var(--color-success)" }}>{formatMoney(r.grossProfit)}</span>,
    },
    {
      key: "margin", header: "الهامش", numeric: true, sortable: true,
      sortValue: (r) => r.margin,
      render: (r) => (
        <span className="num" style={{
          color: r.margin >= 25 ? "var(--color-success)" : r.margin >= 15 ? "var(--color-warning)" : "var(--color-danger)",
        }}>
          {formatPercent(r.margin / 100)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <StickyPageHeader crumbs={[{ label: "ربحية المنتجات" }]} title="ربحية المنتجات" description="تحليل ربحية كل منتج — إيراد وتكلفة وهامش">
        <FilterBar>
          <Select
            label="الفئة"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="كل الفئات"
            options={productCategories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="ترتيب حسب"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            options={[
              { value: "revenue", label: "الإيراد" },
              { value: "grossProfit", label: "الربح الإجمالي" },
              { value: "margin", label: "الهامش" },
              { value: "unitsSold", label: "الكمية" },
            ]}
          />
        </FilterBar>
      </StickyPageHeader>

      <div className="kpi-compact-grid" style={{ marginBottom: "var(--space-4)" }}>
        <div className="kpi-compact">
          <div className="kpi-compact-label">إجمالي المبيعات</div>
          <div className="kpi-compact-value">{formatMoney(kpis.rev)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">COGS</div>
          <div className="kpi-compact-value" style={{ color: "var(--color-text-muted)" }}>{formatMoney(kpis.cogs)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">Gross Profit</div>
          <div className="kpi-compact-value" style={{ color: "var(--color-success)" }}>{formatMoney(kpis.gross)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">الهامش</div>
          <div className="kpi-compact-value">{formatPercent(kpis.margin / 100)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">إجمالي الكمية</div>
          <div className="kpi-compact-value">{kpis.units.toLocaleString("ar-SA")}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">عدد المنتجات</div>
          <div className="kpi-compact-value">{data.length}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <Card title="أفضل 8 منتجات (Gross Profit)">
          <BarChart
            data={topProducts.map((p) => ({ label: p.name.split(" ").slice(0, 2).join(" "), value: p.grossProfit, secondary: 0 }))}
            valueLabel="الربح"
            valueFormatter={(v) => formatMoney(v)}
            height={160}
          />
        </Card>
        <Card title="مقارنة الهوامش">
          <BarChart
            data={topProducts.map((p) => ({ label: p.name.split(" ").slice(0, 2).join(" "), value: p.margin, secondary: 0 }))}
            valueLabel="الهامش %"
            valueFormatter={(v) => `${v.toFixed(1)}%`}
            height={160}
          />
        </Card>
      </div>

      <Card title="ربحية المنتجات — التفاصيل">
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          searchPlaceholder="بحث بالمنتج..."
          searchKeys={(r) => `${r.name} ${r.code} ${r.brand}`}
          pageSize={12}
          emptyTitle="لا توجد بيانات منتجات"
        />
      </Card>
    </div>
  );
}
