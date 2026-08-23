import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Tag } from "lucide-react";
import { products, productCategories, priceLists, categoryById } from "@/mock/products";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { createProduct, updateProduct } from "@/services/products.service";
import { formatMoney, formatNumber, formatDateShort } from "@/utils/format";
import { can } from "@/config/permissions";
import { useAuthStore } from "@/store/auth";
import type { Product } from "@/types";

export function ProductsPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.products.list());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [priceListsOpen, setPriceListsOpen] = useState(false);

  const canEdit = can("products.edit", user?.role ?? "REPRESENTATIVE");

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((p) => {
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [data, categoryFilter, statusFilter]);

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "المنتج",
      sortable: true,
      sortValue: (r) => r.name,
      priority: "primary",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.code} · {r.brand}</div>
        </div>
      ),
    },
    { key: "category", header: "التصنيف", sortable: true, sortValue: (r) => categoryById(r.categoryId)?.name ?? "", priority: "secondary", render: (r) => <Badge tone="neutral">{categoryById(r.categoryId)?.name ?? "—"}</Badge> },
    { key: "pack", header: "التعبئة", priority: "optional", render: (r) => <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>{r.packSize}</span> },
    { key: "cost", header: "التكلفة", numeric: true, sortable: true, sortValue: (r) => r.costPrice, priority: "secondary", render: (r) => <span className="num">{formatMoney(r.costPrice)}</span> },
    { key: "price", header: "سعر البيع", numeric: true, sortable: true, sortValue: (r) => r.sellPrice, priority: "primary", render: (r) => <span className="num" style={{ fontWeight: 600 }}>{formatMoney(r.sellPrice)}</span> },
    { key: "discount", header: "الخصم المسموح", numeric: true, priority: "optional", render: (r) => <span className="num">{r.discountRate}%</span> },
    { key: "margin", header: "الهامش", numeric: true, sortable: true, sortValue: (r) => ((r.sellPrice - r.costPrice) / r.sellPrice) * 100, priority: "secondary", render: (r) => <span className="num" style={{ color: "var(--color-success)" }}>{(((r.sellPrice - r.costPrice) / r.sellPrice) * 100).toFixed(1)}%</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      className: "actions-cell",
      hideable: false,
      priority: "primary",
      render: (r) =>
        canEdit ? (
          <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={(e) => { e.stopPropagation(); setEditProduct(r); }}>
            تعديل
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المنتجات والأسعار" }]}
        title="المنتجات والأسعار"
        description={`${formatNumber(data?.length ?? 0)} منتج نشط · ${formatNumber(priceLists.length)} قائمة أسعار`}
        actions={
          <>
            <Button variant="secondary" icon={<Tag size={15} />} onClick={() => setPriceListsOpen(true)}>قوائم الأسعار</Button>
            {canEdit && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>إضافة منتج</Button>
            )}
          </>
        }
      >
        <FilterBar>
          <Select
            label="التصنيف"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="كل التصنيفات"
            options={productCategories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="كل الحالات"
            options={[
              { value: "active", label: "نشط" },
              { value: "inactive", label: "غير نشط" },
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
        searchPlaceholder="بحث بالاسم أو الرمز أو العلامة..."
        searchKeys={(r) => `${r.name} ${r.code} ${r.brand}`}
        exportFilename="products"
        pageSize={12}
        emptyTitle="لا توجد منتجات مطابقة"
      />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة منتج جديد"
        footer={<>
          <Button variant="secondary" onClick={() => setAddOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => { const r = createProduct({ name: "", code: "", categoryId: "cat-01", brand: "", unit: "", packSize: "", costPrice: 0, sellPrice: 0, discountRate: 0 }, { id: user?.id ?? "" }); if (r.success) { toast.success("تمت إضافة المنتج"); setAddOpen(false); } else toast.error("فشل", r.reason); }}>حفظ المنتج</Button>
        </>}
      >
        <ProductForm />
      </Modal>

      <Modal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        title={`تعديل: ${editProduct?.name ?? ""}`}
        footer={<>
          <Button variant="secondary" onClick={() => setEditProduct(null)}>إلغاء</Button>
          <Button variant="primary" onClick={() => { if (editProduct) { const r = updateProduct(editProduct.id, {}, { id: user?.id ?? "" }); if (r.success) { toast.success("تم حفظ التعديلات"); setEditProduct(null); } else toast.error("فشل", r.reason); } }}>حفظ</Button>
        </>}
      >
        <ProductForm initial={editProduct ?? undefined} />
      </Modal>

      <Modal open={priceListsOpen} onClose={() => setPriceListsOpen(false)} title="قوائم الأسعار" size="lg">
        <div className="stack">
          {priceLists.map((pl) => (
            <div key={pl.id} className="section-block">
              <div className="section-block-title">
                <span>{pl.name}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>من {formatDateShort(pl.effectiveFrom)}</span>
                  <StatusBadge status={pl.status} />
                </span>
              </div>
              <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr><th>المنتج</th><th className="numeric">السعر</th></tr>
                  </thead>
                  <tbody>
                    {pl.items.slice(0, 6).map((it) => (
                      <tr key={it.productId}>
                        <td>{products.find((p) => p.id === it.productId)?.name ?? it.productId}</td>
                        <td className="numeric num">{formatMoney(it.price)}</td>
                      </tr>
                    ))}
                    {pl.items.length > 6 && <tr><td colSpan={2} className="faint" style={{ fontSize: "var(--font-size-xs)" }}>... و{pl.items.length - 6} منتجات أخرى</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="faint" style={{ fontSize: "var(--font-size-xs)" }}>
            ملاحظة: تعديل قوائم الأسعار يدخل سير اعتماد — يعتمده مدير المبيعات أو المدير العام.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function ProductForm({ initial }: { initial?: Product }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    code: initial?.code ?? "",
    categoryId: initial?.categoryId ?? "cat-01",
    brand: initial?.brand ?? "",
    packSize: initial?.packSize ?? "",
    costPrice: initial?.costPrice ?? 0,
    sellPrice: initial?.sellPrice ?? 0,
    discountRate: initial?.discountRate ?? 0,
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="form-grid">
      <div className="field-span-8">
        <Input label="اسم المنتج" required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="field-span-4">
        <Input label="الرمز" required value={form.code} onChange={(e) => set("code", e.target.value)} />
      </div>
      <div className="field-span-4">
        <Select
          label="التصنيف"
          value={form.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          options={productCategories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>
      <div className="field-span-4">
        <Input label="العلامة التجارية" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
      </div>
      <div className="field-span-4">
        <Input label="التعبئة" value={form.packSize} onChange={(e) => set("packSize", e.target.value)} placeholder="مثال: 24 علبة / كرتون" />
      </div>
      <div className="field-span-4">
        <Input label="سعر التكلفة (ر.س)" type="number" step="0.5" value={form.costPrice} onChange={(e) => set("costPrice", Number(e.target.value))} />
      </div>
      <div className="field-span-4">
        <Input label="سعر البيع (ر.س)" type="number" step="0.5" value={form.sellPrice} onChange={(e) => set("sellPrice", Number(e.target.value))} />
      </div>
      <div className="field-span-4">
        <Input label="نسبة الخصم المسموح (%)" type="number" step="0.5" value={form.discountRate} onChange={(e) => set("discountRate", Number(e.target.value))} />
      </div>
    </div>
  );
}