import { useMemo, useState } from "react";
import { Search, Filter, Package, Tag, TrendingUp, AlertTriangle } from "lucide-react";
import { products } from "@/mock/products";
import { stockByRep } from "@/mock/inventory";
import { useAuthStore } from "@/store/auth";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input, Select } from "@/components/ui/FormControls";
import { formatMoney, formatNumber } from "@/utils/format";

const categoryLabels: Record<string, string> = {
  beverages: "مشروبات",
  water: "مياه",
  food: "مواد غذائية",
  dairy: "ألبان",
  snacks: "وجبات خفيفة",
  household: "منظفات",
  personal: "عناية شخصية",
};

export function ProductsPage() {
  const { user } = useAuthStore();
  const me = user!;
  const myVan = stockByRep(me.id);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "available" | "low" | "out">("all");

  const enrichedProducts = useMemo(() => {
    return products.map((p) => {
      const vanItem = myVan.find((v) => v.productId === p.id);
      const qty = vanItem?.qty ?? 0;
      const damaged = vanItem?.damagedQty ?? 0;
      const available = qty - damaged;
      const reorderLevel = p.reorderLevel ?? 5;
      let stockStatus: "available" | "low" | "out" = "available";
      if (available <= 0) stockStatus = "out";
      else if (available <= reorderLevel) stockStatus = "low";
      return { ...p, vanQty: qty, vanDamaged: damaged, vanAvailable: available, stockStatus };
    });
  }, [myVan]);

  const filtered = useMemo(() => {
    let rows = enrichedProducts;
    if (search) rows = rows.filter((p) => p.name.includes(search) || p.code.includes(search) || p.brand.includes(search));
    if (categoryFilter) rows = rows.filter((p) => p.categoryId === categoryFilter);
    if (stockFilter !== "all") rows = rows.filter((p) => p.stockStatus === stockFilter);
    return rows;
  }, [enrichedProducts, search, categoryFilter, stockFilter]);

  const categories = useMemo(() => {
    const cats = new Set(enrichedProducts.map((p) => p.categoryId));
    return Array.from(cats).map((id) => ({ value: id, label: categoryLabels[id] || id }));
  }, [enrichedProducts]);

  const columns: Column<typeof enrichedProducts[0]>[] = [
    { key: "code", header: "الرمز", sortable: true, sortValue: (r) => r.code, priority: "primary", render: (r) => <b className="num">{r.code}</b> },
    { key: "name", header: "المنتج", sortable: true, sortValue: (r) => r.name, priority: "primary", render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Package size={16} />
        <div>
          <b style={{ fontSize: "var(--font-size-sm)" }}>{r.name}</b>
          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.brand} · {categoryLabels[r.categoryId] || r.categoryId}</div>
        </div>
      </div>
    ) },
    { key: "unit", header: "الوحدة", priority: "secondary", render: (r) => <Badge tone="neutral">{r.unit} / {r.packSize}</Badge> },
    { key: "sellPrice", header: "سعر البيع", numeric: true, sortable: true, sortValue: (r) => r.sellPrice, priority: "primary", render: (r) => <span className="num" style={{ fontWeight: 600 }}>{formatMoney(r.sellPrice)}</span> },
    { key: "discountRate", header: "الخصم %", numeric: true, sortable: true, sortValue: (r) => r.discountRate, priority: "secondary", render: (r) => <span className="num">{r.discountRate}%</span> },
    { key: "vanAvailable", header: "متاح في السيارة", numeric: true, sortable: true, sortValue: (r) => r.vanAvailable, priority: "primary", render: (r) => (
      <span className="num" style={{ fontWeight: 600, color: r.stockStatus === "out" ? "var(--color-danger)" : r.stockStatus === "low" ? "var(--color-warning)" : "var(--color-success)" }}>{formatNumber(r.vanAvailable)}</span>
    ) },
    { key: "vanDamaged", header: "تالف", numeric: true, priority: "optional", render: (r) => r.vanDamaged > 0 ? <span className="num" style={{ color: "var(--color-danger)" }}>{formatNumber(r.vanDamaged)}</span> : <span className="faint">—</span> },
    { key: "stockStatus", header: "الحالة", priority: "primary", render: (r) => (
      <Badge tone={r.stockStatus === "out" ? "danger" : r.stockStatus === "low" ? "warning" : "success"} dot>
        {r.stockStatus === "out" ? "ناقص" : r.stockStatus === "low" ? "منخفض" : "متاح"}
      </Badge>
    ) },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المنتجات والأسعار" }]}
        title="المنتجات والأسعار"
        description="مرجع للبيع — يعرض المنتجات المسموحة، الأسعار، والمخزون المتاح في سيارتك"
      >
        <FilterBar>
          <Input label="البحث" placeholder="اسم، رمز، علامة..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
          <Select label="التصنيف" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} placeholder="الكل" options={categories} />
          <Select label="المخزون" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)} placeholder="الكل" options={[
            { value: "all", label: "الكل" },
            { value: "available", label: "متاح" },
            { value: "low", label: "منخفض" },
            { value: "out", label: "ناقص" },
          ]} />
        </FilterBar>

        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي المنتجات</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{enrichedProducts.length}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>متاح في السيارة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{enrichedProducts.filter((p) => p.stockStatus === "available").length}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>منخفض (عند حد إعادة الطلب)</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{enrichedProducts.filter((p) => p.stockStatus === "low").length}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>ناقص (صفر)</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-danger)" }}>{enrichedProducts.filter((p) => p.stockStatus === "out").length}</b></div></Card>
        </div>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        searchPlaceholder="بحث سريع..."
        searchKeys={(r) => `${r.name} ${r.code} ${r.brand}`}
        exportFilename="my-products"
        pageSize={15}
        emptyTitle="لا توجد منتجات مطابقة"
      />
    </div>
  );
}