import { useMemo, useState } from "react";
import { Plus, Search, Filter, Package, RotateCcw, Clock, CheckCircle2, XCircle, AlertTriangle, Truck, ClipboardCheck } from "lucide-react";
import { stockRequests, stockTransfers, stockByRep } from "@/mock/inventory";
import { products } from "@/mock/products";
import { useAuthStore } from "@/store/auth";
import { repPolicies } from "@/config/repPolicies";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card, SectionBlock } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { formatNumber, formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import { mockApi } from "@/services/mockApi";
import type { StockRequest, StockTransfer } from "@/types";

const requestStatusLabels: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  in_transit: "قيد النقل",
};

const requestStatusTones: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  delivered: "info",
  cancelled: "neutral",
  in_transit: "info",
};

export function StockRequestsPage() {
  const { user } = useAuthStore();
  const me = user!;

  const myRequests = stockRequests.filter((r) => r.repId === me.id).sort((a, b) => b.date.localeCompare(a.date));
  const myVan = stockByRep(me.id);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<StockRequest | null>(null);

  const [form, setForm] = useState({
    warehouseId: "wh-01",
    items: [] as { productId: string; productName: string; qty: number }[],
    notes: "",
  });

  const pendingCount = myRequests.filter((r) => r.status === "pending").length;
  const approvedCount = myRequests.filter((r) => r.status === "approved").length;
  const deliveredCount = myRequests.filter((r) => r.status === "delivered").length;

  const columns: Column<StockRequest>[] = [
    { key: "number", header: "الطلب", sortable: true, sortValue: (r) => r.number, priority: "primary", render: (r) => <b className="num">{r.number}</b> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "warehouse", header: "المستودع", priority: "secondary", render: (r) => r.warehouseId === "wh-01" ? "المستودع الرئيسي — الرياض" : r.warehouseId },
    { key: "items", header: "البنود", priority: "primary", render: (r) => <span className="num">{r.items.length} منتج · {formatNumber(r.items.reduce((s, i) => s + i.qty, 0))} وحدة</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <Badge tone={requestStatusTones[r.status] || "neutral"} dot>{requestStatusLabels[r.status] || r.status}</Badge> },
    { key: "actions", header: "إجراء", priority: "primary", render: (r) => (
      <span style={{ display: "inline-flex", gap: 6 }}>
        {r.status === "pending" && <Button size="sm" variant="ghost" icon={<XCircle size={13} />} onClick={() => { toast.info("طلب إلغاء مرسل للمشرف"); }}>إلغاء</Button>}
        {r.status === "approved" && <Button size="sm" variant="primary" icon={<ClipboardCheck size={13} />} onClick={async () => { try { await mockApi.rep.receiveLoadingOrder(r.id); toast.success("تم تسجيل الاستلام"); } catch { toast.error("فشل الاستلام", "حدث خطأ أثناء الاستلام"); } }}>استلام</Button>}
        {r.status === "delivered" && <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>مستلم</span>}
      </span>
    ) },
  ];

  const openNew = () => {
    setForm({ warehouseId: "wh-01", items: [{ productId: "", productName: "", qty: 1 }], notes: "" });
    setEditRequest(null);
    setOpen(true);
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: "", productName: "", qty: 1 }] }));
  const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: any) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));

  const [submitting, setSubmitting] = useState(false);

  const submitRequest = async () => {
    if (!form.items.length || form.items.some((i) => !i.productId || i.qty <= 0)) {
      toast.warning("أضف منتجاً واحداً على الأقل بكمية صحيحة");
      return;
    }
    setSubmitting(true);
    try {
      const exists = myRequests.find((r) => r.id === editRequest?.id);
      await mockApi.rep.createStockRequest(form.items, form.warehouseId, form.notes || undefined);
      if (exists) {
        toast.success("تم تحديث طلب التموين", "سيُرسل للمراجعة مجدداً");
      } else {
        toast.success("أُرسل طلب التموين للمراجعة", "سيظهر في قائمة طلباتك بحالة 'قيد المراجعة'");
      }
      setOpen(false);
    } catch {
      toast.error("فشل إرسال الطلب", "حدث خطأ أثناء إرسال طلب التموين");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "طلبات التموين" }]}
        title="طلبات التموين (Stock Requests)"
        description="طلب بضاعة من المستودع — لا يزيد المخزون إلا عند الاستلام الفعلي"
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={openNew}>طلب تموين جديد</Button>}
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>قيد المراجعة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{pendingCount}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>معتمدة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{approvedCount}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مستلمة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-info)" }}>{deliveredCount}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي الطلبات</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{myRequests.length}</b></div></Card>
        </div>

        <FilterBar>
          <Input label="البحث" placeholder="رقم الطلب، منتج..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
          <Select label="الحالة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="الكل" options={[
            { value: "pending", label: "قيد المراجعة" },
            { value: "approved", label: "معتمد" },
            { value: "rejected", label: "مرفوض" },
            { value: "delivered", label: "مستلمة" },
          ]} />
        </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={myRequests.filter((r) => {
          if (search && !r.number.includes(search) && !r.items.some((i) => i.productName.includes(search))) return false;
          if (statusFilter && r.status !== statusFilter) return false;
          return true;
        })}
        rowKey={(r) => r.id}
        searchPlaceholder="بحث سريع..."
        searchKeys={(r) => `${r.number} ${r.items.map((i) => i.productName).join(" ")}`}
        exportFilename="stock-requests"
        pageSize={12}
        emptyTitle="لا توجد طلبات تموين"
        emptyDescription="ابدأ بإضافة طلب تموين جديد من المستودع."
      />

      <div className="alert alert-info" style={{ marginBottom: 0, marginTop: "var(--space-4)" }}>
        <AlertTriangle size={16} />
        <div>
          <div className="alert-title">سياسة طلب التموين</div>
          <div>{repPolicies.stockRequestIncreasesVanOnReceiptOnly ? "طلب التموين لا يزيد مخزون السيارة — الزيادة تحدث فقط عند استلام أمر التحميل الفعلي (Loading Order)." : "طلب التموين يزيد المخزون مباشرة عند الاعتماد."}</div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editRequest ? "تعديل طلب التموين" : "طلب تموين جديد"} size="xl" footer={<>
        <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
        <Button variant="primary" icon={<Plus size={15} />} onClick={submitRequest} loading={submitting} disabled={submitting}>{editRequest ? "حفظ التعديلات" : "إرسال الطلب"}</Button>
      </>}>
        <div className="stack-sm">
          <div className="form-grid">
            <div className="field-span-4">
              <Select label="المستودع" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} options={[
                { value: "wh-01", label: "المستودع الرئيسي — الرياض" },
                { value: "wh-02", label: "مستودع جدة" },
                { value: "wh-03", label: "مستودع الدمام" },
              ]} />
            </div>
            <div className="field-span-12">
              <Textarea label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="سبب الطلب، أولوية..." rows={2} />
            </div>
          </div>

          <SectionBlock title="بنود الطلب" actions={<Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addItem}>إضافة صنف</Button>}>
            <div className="card-body">
              {form.items.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد بنود — أضف منتجاً</div>
              ) : (
                <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>المنتج</th>
                        <th className="numeric">الكمية</th>
                        <th className="numeric">المتاح في السيارة</th>
                        <th className="numeric">الرصيد في المستودع</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="num">{idx + 1}</td>
                          <td style={{ width: 280 }}>
                            <Select
                              value={item.productId}
                              onChange={(e) => {
                                const p = products.find((pr) => pr.id === e.target.value);
                                updateItem(idx, "productId", e.target.value);
                                updateItem(idx, "productName", p?.name ?? "");
                              }}
                              options={products.filter((p) => p.status === "active").map((p) => ({ value: p.id, label: p.name, sublabel: `${p.code} · ${p.unit}` }))}
                              placeholder="اختر منتج..."
                            />
                          </td>
                          <td className="numeric">
                            <Input type="number" min={1} value={item.qty} onChange={(e) => updateItem(idx, "qty", Number(e.target.value) || 1)} style={{ width: 80 }} className="num" />
                          </td>
                          <td className="numeric">
                            <span className="num">{formatNumber(myVan.find((v) => v.productId === item.productId)?.qty ?? 0)}</span>
                          </td>
                          <td className="numeric">
                            <span className="num">{formatNumber(products.find((p) => p.id === item.productId)?.reorderLevel ?? 0)}</span>
                          </td>
                          <td><Button size="sm" variant="ghost" icon={<XCircle size={13} />} onClick={() => removeItem(idx)} style={{ color: "var(--color-danger)" }} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SectionBlock>
        </div>
      </Modal>
    </div>
  );
}
