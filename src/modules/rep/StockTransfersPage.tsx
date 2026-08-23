import { useMemo, useState } from "react";
import { Search, Filter, RotateCcw, ArrowLeftRight, Truck, Package, CheckCircle2, XCircle, AlertTriangle, Clock, Send, RotateCw, Plus } from "lucide-react";
import { stockTransfers, stockByRep, warehouses } from "@/mock/inventory";
import { users } from "@/mock/users";
import { products } from "@/mock/products";
import { useAuthStore } from "@/store/auth";
import { repPolicies } from "@/config/repPolicies";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
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
import { createTransfer } from "@/services/transfers.service";
import { dataScopeOf } from "@/config/authority";
import type { StockTransfer } from "@/types";

const transferStatusLabels: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  in_transit: "قيد النقل",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const transferStatusTones: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  in_transit: "info",
  completed: "success",
  cancelled: "neutral",
};

export function StockTransfersPage() {
  const { user } = useAuthStore();
  const me = user!;

  const myTransfersOut = stockTransfers.filter((t) => t.createdBy === me.id || t.toRepId === me.id).sort((a, b) => b.date.localeCompare(a.date));
  const myVan = stockByRep(me.id);
  const otherReps = users.filter((u) => u.role === "REPRESENTATIVE" && u.id !== me.id);

  const [tab, setTab] = useState<"outgoing" | "incoming" | "create">("outgoing");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState({
    type: "request" as "request" | "direct",
    toRepId: "",
    items: [] as { productId: string; productName: string; qty: number }[],
    notes: "",
  });

  const outgoing = myTransfersOut.filter((t) => t.createdBy === me.id);
  const incoming = myTransfersOut.filter((t) => t.toRepId === me.id);

  const pendingOut = outgoing.filter((t) => t.status === "pending" || t.status === "approved").length;
  const inTransitIn = incoming.filter((t) => t.status === "in_transit").length;
  const completedTotal = myTransfersOut.filter((t) => t.status === "completed").length;

  const tabs = [
    { key: "outgoing", label: "صادر مني", content: renderOutgoing() },
    { key: "incoming", label: "وارد لي", content: renderIncoming() },
    { key: "create", label: "تحويل جديد", content: renderCreate() },
  ];

  function renderOutgoing() {
    const columns: Column<StockTransfer>[] = [
      { key: "number", header: "التحويل", sortable: true, sortValue: (r) => r.number, priority: "primary", render: (r) => <b className="num">{r.number}</b> },
      { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
      { key: "toRep", header: "إلى", priority: "primary", render: (r) => users.find((u) => u.id === r.toRepId)?.name ?? r.toRepId },
      { key: "items", header: "البنود", priority: "primary", render: (r) => <span className="num">{r.items.length} منتج · {formatNumber(r.items.reduce((s, i) => s + i.qty, 0))} وحدة</span> },
      { key: "status", header: "الحالة", priority: "primary", render: (r) => <Badge tone={transferStatusTones[r.status] || "neutral"} dot>{transferStatusLabels[r.status] || r.status}</Badge> },
      { key: "actions", header: "إجراء", priority: "primary", render: (r) => (
        <span style={{ display: "inline-flex", gap: 6 }}>
          {r.status === "pending" && <Button size="sm" variant="ghost" icon={<XCircle size={13} />} onClick={() => toast.info("تم إرسال طلب الإلغاء للمشرف")}>إلغاء</Button>}
          {r.status === "approved" && <Button size="sm" variant="primary" icon={<Truck size={13} />} onClick={async () => { try { await mockApi.rep.receiveTransfer(r.id); toast.success("بدأ التحويل"); } catch { toast.error("فشل بدء التحويل", "حدث خطأ"); } }}>تجهيز</Button>}
          {r.status === "in_transit" && <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>قيد النقل</span>}
        </span>
      ) },
    ];

    return (
      <div>
        <FilterBar>
          <Input label="البحث" placeholder="رقم، منتج..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
          <Select label="الحالة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="الكل" options={[
            { value: "pending", label: "قيد المراجعة" },
            { value: "approved", label: "معتمد" },
            { value: "in_transit", label: "قيد النقل" },
            { value: "completed", label: "مكتمل" },
          ]} />
        </FilterBar>
        <DataTable
          columns={columns}
          rows={outgoing.filter((t) => {
            if (search && !t.number.includes(search)) return false;
            if (statusFilter && t.status !== statusFilter) return false;
            return true;
          })}
          rowKey={(r) => r.id}
          pageSize={12}
          emptyTitle="لا توجد تحويلات صادرة"
        />
      </div>
    );
  }

  function renderIncoming() {
    const columns: Column<StockTransfer>[] = [
      { key: "number", header: "التحويل", sortable: true, sortValue: (r) => r.number, priority: "primary", render: (r) => <b className="num">{r.number}</b> },
      { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
      { key: "fromRep", header: "من", priority: "primary", render: (r) => warehouses.find((w) => w.id === r.fromWarehouseId)?.name ?? r.fromWarehouseId },
      { key: "items", header: "البنود", priority: "primary", render: (r) => <span className="num">{r.items.length} منتج · {formatNumber(r.items.reduce((s, i) => s + i.qty, 0))} وحدة</span> },
      { key: "status", header: "الحالة", priority: "primary", render: (r) => <Badge tone={transferStatusTones[r.status] || "neutral"} dot>{transferStatusLabels[r.status] || r.status}</Badge> },
      { key: "actions", header: "إجراء", priority: "primary", render: (r) => (
        <span style={{ display: "inline-flex", gap: 6 }}>
          {r.status === "in_transit" && <Button size="sm" variant="primary" icon={<CheckCircle2 size={13} />} onClick={async () => { try { await mockApi.rep.receiveTransfer(r.id); toast.success("تم الاستلام بنجاح"); } catch { toast.error("فشل الاستلام", "حدث خطأ أثناء استلام التحويل"); } }}>استلام</Button>}
          {r.status === "completed" && <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>مستلم</span>}
        </span>
      ) },
    ];

    return (
      <div>
        <FilterBar>
          <Input label="البحث" placeholder="رقم، منتج..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
          <Select label="الحالة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="الكل" options={[
            { value: "in_transit", label: "قيد النقل" },
            { value: "completed", label: "مكتمل" },
            { value: "rejected", label: "مرفوض" },
          ]} />
        </FilterBar>
        <DataTable
          columns={columns}
          rows={incoming.filter((t) => {
            if (search && !t.number.includes(search)) return false;
            if (statusFilter && t.status !== statusFilter) return false;
            return true;
          })}
          rowKey={(r) => r.id}
          pageSize={12}
          emptyTitle="لا توجد تحويلات واردة"
        />
      </div>
    );
  }

  function renderCreate() {
    const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: "", productName: "", qty: 1 }] }));
    const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
    const updateItem = (idx: number, field: string, value: any) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));

    const submitTransfer = () => {
      if (!form.toRepId || !form.items.length || form.items.some((i) => !i.productId || i.qty <= 0) || !user) {
        toast.warning("أكمل البيانات: المندوب المستلم ومنتج واحد على الأقل");
        return;
      }
      const totalQty = form.items.reduce((s, i) => s + i.qty, 0);
      const myStock = myVan.find((v) => v.productId === form.items[0].productId)?.qty ?? 0;
      if (totalQty > myStock) {
        toast.warning("الكمية تتجاوز مخزونك الحالي", `متاح: ${myStock}، مطلوب: ${totalQty}`);
        return;
      }

      const result = createTransfer(
        {
          fromRepId: user.id,
          toRepId: form.toRepId,
          items: form.items,
          notes: form.notes,
        },
        {
          id: user.id,
          role: user.role,
          scope: dataScopeOf[user.role],
          owns: true,
        }
      );

      if (!result.success) {
        toast.error("لا يمكن إرسال التحويل", result.reason ?? "خطأ غير معروف");
        return;
      }

      toast.success(form.type === "request" ? "أُرسل طلب تحويل للمراجعة" : "أُرسل تحويل مباشر — بانتظار قبول المندوب المستلم");
      setForm({ type: "request", toRepId: "", items: [], notes: "" });
    };

    return (
      <div className="stack">
        <Card title="نوع التحويل" subtitle={repPolicies.transferReceiptRequired ? "استلام البضاعة إلزامي لتأكيد التحويل" : "التحويل المباشر متاح"}>
          <div className="card-body">
            <div className="form-grid">
              <div className="field-span-6">
                <Select label="نوع التحويل" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "request" | "direct" })} options={[
                  { value: "request", label: "طلب تحويل (يمر بمراجعة/اعتماد)" },
                  { value: "direct", label: "تحويل مباشر (قبول/رفض من المندوب المستلم)" },
                ]} />
              </div>
              <div className="field-span-6">
                <Select label="المندوب المستلم" value={form.toRepId} onChange={(e) => setForm({ ...form, toRepId: e.target.value })} placeholder="اختر مندوباً" options={otherReps.map((u) => ({ value: u.id, label: u.name, sublabel: u.territoryId }))} />
              </div>
            </div>
          </div>
        </Card>

        <Card title="بنود التحويل" actions={<Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addItem}>إضافة صنف</Button>}>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: "var(--space-3)" }}>
              <ArrowLeftRight size={16} />
              <div>
                <div className="alert-title">تنبيه المخزون</div>
                <div>الكمية ستُخصم من مخزون سيارتك فور اعتماد/تنفيذ التحويل. تأكد من توفر الرصيد.</div>
              </div>
            </div>

            <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>المنتج</th>
                    <th className="numeric">الكمية</th>
                    <th className="numeric">متاح في سيارتي</th>
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
                            options={products.filter((p) => p.status === "active" && (myVan.find((v) => v.productId === p.id)?.qty ?? 0) > 0).map((p) => ({ value: p.id, label: p.name, sublabel: `${p.code} · ${p.unit}` }))}
                          placeholder="اختر منتجاً متاحاً في سيارتك..."
                        />
                      </td>
                      <td className="numeric">
                        <Input type="number" min={1} value={item.qty} onChange={(e) => updateItem(idx, "qty", Number(e.target.value) || 1)} style={{ width: 80 }} className="num" />
                      </td>
                      <td className="numeric">
                        <span className="num">{formatNumber(myVan.find((v) => v.productId === item.productId)?.qty ?? 0)}</span>
                      </td>
                      <td><Button size="sm" variant="ghost" icon={<XCircle size={13} />} onClick={() => removeItem(idx)} style={{ color: "var(--color-danger)" }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {form.items.length === 0 && (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد بنود — أضف منتجاً من مخزون سيارتك</div>
              )}
            </div>
          </div>
        </Card>

        <Card title="ملاحظات">
          <div className="card-body">
            <Textarea label="ملاحظات التحويل" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="سبب التحويل، موعد التسليم المتوقع..." rows={2} />
          </div>
        </Card>

        <Button variant="primary" size="lg" icon={<Send size={17} />} onClick={submitTransfer} style={{ width: "100%" }}>
          {form.type === "request" ? "إرسال طلب تحويل للمراجعة" : "إرسال تحويل مباشر للمندوب"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "تحويلات المخزون" }]}
        title="تحويلات المخزون بين المندوبين"
        description="طلب تحويل (يمر باعتماد) أو تحويل مباشر (قبول/رفض) — المخزون يُخصم عند التنفيذ فقط"
        actions={<Button variant="secondary" icon={<RotateCw size={15} />} onClick={() => setTab("outgoing")}>تحديث</Button>}
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>صادر — قيد التنفيذ</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{pendingOut}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>وارد — قيد النقل</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-info)" }}>{inTransitIn}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مكتملة إجمالاً</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{completedTotal}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مخزون سيارتي</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatNumber(myVan.reduce((s, i) => s + i.qty, 0))} وحدة</b></div></Card>
        </div>
      </StickyPageHeader>

      <div className="alert alert-info" style={{ marginBottom: "var(--space-4)" }}>
        <ArrowLeftRight size={16} />
        <div>
          <div className="alert-title">قاعدة التحويل</div>
          <div>طلب ↔ اعتماد ↔ تنفيذ ↔ استلام. {repPolicies.transferReceiptRequired ? "التحويل لا يكتمل إلا بعد استلام المندوب المستلم." : "التحويل يكتمل عند التنفيذ."} المخزون لا يتغير في مرحلة الطلب.</div>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={(k) => setTab(k as typeof tab)} />
    </div>
  );
}