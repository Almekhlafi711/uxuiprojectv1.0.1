import { useMemo, useState } from "react";
import { Search, Filter, Package, ClipboardCheck, Truck, AlertTriangle, CheckCircle2, RotateCcw, XCircle, PackageOpen } from "lucide-react";
import { stockTransfers, stockByRep, warehouses } from "@/mock/inventory";
import { loadingOrdersByRep } from "@/mock/repField";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { repPolicies } from "@/config/repPolicies";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input, Select } from "@/components/ui/FormControls";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { formatNumber, formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import { receiveStock } from "@/services/loading.service";
import { dataScopeOf } from "@/config/authority";
import type { StockTransfer, LoadingOrder } from "@/types";

export function ReceivingPage() {
  const { user } = useAuthStore();
  const me = user!;

  const incomingTransfers = stockTransfers.filter((t) => t.toRepId === me.id && (t.status === "in_transit" || t.status === "approved")).sort((a, b) => b.date.localeCompare(a.date));
  const loadingOrders = loadingOrdersByRep(me.id).filter((o) => o.status === "pending").sort((a, b) => b.date.localeCompare(a.date));
  const myVan = stockByRep(me.id);

  const [activeTab, setActiveTab] = useState<"transfers" | "loading">("transfers");
  const [receiveTransfer, setReceiveTransfer] = useState<StockTransfer | null>(null);
  const [receiveLoading, setReceiveLoading] = useState<LoadingOrder | null>(null);
  const [transferForm, setTransferForm] = useState<Record<string, { receivedQty: number; condition: "good" | "damaged" }>>({});
  const [loadingForm, setLoadingForm] = useState<Record<string, { receivedQty: number; condition: "good" | "damaged" }>>({});

  const pendingTransfersCount = incomingTransfers.filter((t) => t.status === "in_transit").length;
  const pendingLoadingCount = loadingOrders.length;

  const tabs = [
    {
      key: "transfers",
      label: `تحويلات واردة (${pendingTransfersCount})`,
      content: renderTransfers(),
    },
    {
      key: "loading",
      label: `أوامر استلام (${pendingLoadingCount})`,
      content: renderLoading(),
    },
  ];

  function renderTransfers() {
    const columns: Column<StockTransfer>[] = [
      { key: "number", header: "رقم التحويل", priority: "primary", render: (r) => <b className="num">{r.number}</b> },
      { key: "date", header: "التاريخ", priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
      { key: "fromRep", header: "من المستودع", priority: "primary", render: (r) => warehouses.find((w) => w.id === r.fromWarehouseId)?.name ?? r.fromWarehouseId },
      { key: "items", header: "البنود", priority: "primary", render: (r) => <span className="num">{r.items.length} منتج · {formatNumber(r.items.reduce((s, i) => s + i.qty, 0))} وحدة</span> },
      { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
      { key: "actions", header: "إجراء", priority: "primary", render: (r) => r.status === "in_transit" ? (
        <Button size="sm" variant="primary" icon={<ClipboardCheck size={13} />} onClick={() => openReceiveTransfer(r)}>استلام</Button>
      ) : r.status === "approved" ? (
        <Button size="sm" variant="secondary" icon={<Truck size={13} />}>قيد التجهيز</Button>
      ) : <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>مكتمل</span> },
    ];

    return (
      <div>
        <FilterBar>
          <Input label="البحث" placeholder="رقم التحويل، منتج..." value="" onChange={() => {}} icon={<Search size={16} />} />
        </FilterBar>
        <DataTable
          columns={columns}
          rows={incomingTransfers}
          rowKey={(r) => r.id}
          pageSize={10}
          emptyTitle="لا توجد تحويلات واردة للاستلام"
          emptyDescription="عند إرسال تحويل لك من مندوب آخر، سيظهر هنا بعد اعتماده وتجهيزه."
        />
      </div>
    );
  }

  function renderLoading() {
    const columns: Column<LoadingOrder>[] = [
      { key: "number", header: "أمر الاستلام", priority: "primary", render: (r) => <b className="num">{r.number}</b> },
      { key: "date", header: "التاريخ", priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
      { key: "warehouse", header: "المستودع", priority: "secondary", render: () => "المستودع الرئيسي — الرياض" },
      { key: "items", header: "البنود", priority: "primary", render: (r) => <span className="num">{r.items.length} منتج · {formatNumber(r.items.reduce((s, i) => s + i.expectedQty, 0))} وحدة</span> },
      { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
      { key: "actions", header: "إجراء", priority: "primary", render: (r) => r.status === "pending" ? (
        <Button size="sm" variant="primary" icon={<ClipboardCheck size={13} />} onClick={() => openReceiveLoading(r)}>استلام</Button>
      ) : <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.completedAt?.slice(11, 16)}</span> },
    ];

    return (
      <div>
        <FilterBar>
          <Input label="البحث" placeholder="رقم الأمر، منتج..." value="" onChange={() => {}} icon={<Search size={16} />} />
        </FilterBar>
        <DataTable
          columns={columns}
          rows={loadingOrders}
          rowKey={(r) => r.id}
          pageSize={10}
          emptyTitle="لا توجد أوامر استلام"
          emptyDescription="عند تجهيز طلب التموين من المستودع، يظهر أمر الاستلام هنا."
        />
      </div>
    );
  }

  const openReceiveTransfer = (t: StockTransfer) => {
    setReceiveTransfer(t);
    const init: Record<string, { receivedQty: number; condition: "good" | "damaged" }> = {};
    t.items.forEach((it) => { init[it.productId] = { receivedQty: it.qty, condition: "good" }; });
    setTransferForm(init);
  };

  const openReceiveLoading = (o: LoadingOrder) => {
    setReceiveLoading(o);
    const init: Record<string, { receivedQty: number; condition: "good" | "damaged" }> = {};
    o.items.forEach((it) => { init[it.productId] = { receivedQty: it.expectedQty, condition: "good" }; });
    setLoadingForm(init);
  };

  const confirmReceiveTransfer = () => {
    if (!receiveTransfer || !user) return;
    const allValid = receiveTransfer.items.every((it) => {
      const v = transferForm[it.productId]?.receivedQty;
      return v !== undefined && v > 0 && v <= it.qty;
    });
    if (!allValid) {
      toast.warning("تحقق من الكميات", "يجب أن تكون الكمية أكبر من صفر ولا تتجاوز المرسلة");
      return;
    }

    const result = receiveStock(
      {
        repId: user.id,
        items: receiveTransfer.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          qty: transferForm[it.productId]?.receivedQty ?? it.qty,
          condition: "good" as const,
        })),
        source: "transfer",
        refNumber: receiveTransfer.number,
      },
      { id: user.id, role: user.role, scope: dataScopeOf[user.role], owns: true }
    );

    if (!result.success) {
      toast.error("فشل استلام التحويل", result.reason ?? "خطأ غير معروف");
      return;
    }

    toast.success("تم استلام التحويل", "زادت الكميات على مخزون سيارتك وسُجّلت الحركة في الأستاذ");
    setReceiveTransfer(null);
  };

  const confirmReceiveLoading = () => {
    if (!receiveLoading || !user) return;
    const allValid = receiveLoading.items.every((it) => {
      const v = loadingForm[it.productId]?.receivedQty;
      return v !== undefined && v > 0 && v <= it.expectedQty;
    });
    if (!allValid) {
      toast.warning("تحقق من الكميات", "يجب أن تكون الكمية أكبر من صفر ولا تتجاوز المتوقعة");
      return;
    }

    const result = receiveStock(
      {
        repId: user.id,
        items: receiveLoading.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          qty: loadingForm[it.productId]?.receivedQty ?? it.expectedQty,
          condition: "good" as const,
        })),
        source: "warehouse",
        refNumber: receiveLoading.number,
      },
      { id: user.id, role: user.role, scope: dataScopeOf[user.role], owns: true }
    );

    if (!result.success) {
      toast.error("فشل استلام البضاعة", result.reason ?? "خطأ غير معروف");
      return;
    }

    toast.success("تم استلام البضاعة من المستودع", "زادت الكميات على مخزون سيارتك وسُجّلت الحركة في الأستاذ");
    setReceiveLoading(null);
  };

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "استلام البضاعة" }]}
        title="استلام البضاعة"
        description="استلام تحويلات من مندوبين آخرين وأوامر استلام من المستودع — المخزون يزيد عند الاستلام الفعلي فقط"
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تحويلات قيد الاستلام</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{pendingTransfersCount}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>أوامر استلام معلقة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-info)" }}>{pendingLoadingCount}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مخزون السيارة الحالي</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatNumber(myVan.reduce((s, i) => s + i.qty, 0))} وحدة</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي التحويلات</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{incomingTransfers.length}</b></div></Card>
        </div>
      </StickyPageHeader>

      <div className="alert alert-info" style={{ marginBottom: "var(--space-4)" }}>
        <Truck size={16} />
        <div>
          <div className="alert-title">سياسة الاستلام</div>
          <div>{repPolicies.transferReceiptRequired ? "استلام التحويلات إلزامي لتأكيد النقل — لا تزيد الكميات على مخزون السيارة إلا بعد الاستلام." : "الاستلام اختياري."} {repPolicies.stockRequestIncreasesVanOnReceiptOnly && " أوامر الاستلام من المستودع: المخزون لا يتغير حتى يصل الأمر الفعلي ويستلم."}</div>
        </div>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={(k) => setActiveTab(k as typeof activeTab)} />

      {receiveTransfer && (
        <Modal open onClose={() => setReceiveTransfer(null)} title={`استلام التحويل: ${receiveTransfer.number} من ${warehouses.find((w) => w.id === receiveTransfer.fromWarehouseId)?.name ?? receiveTransfer.fromWarehouseId}`} size="lg" footer={<>
          <Button variant="secondary" onClick={() => setReceiveTransfer(null)}>إلغاء</Button>
          <Button variant="primary" icon={<ClipboardCheck size={15} />} onClick={confirmReceiveTransfer}>تأكيد الاستلام</Button>
        </>}>
          <div className="stack-sm">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              <Package size={16} />
              <div>أدخل الكميات المستلمة فعلياً وحالة كل منتج. لا يجوز تجاوز الكمية المرسلة.</div>
            </div>
            <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th className="numeric">المرسل</th>
                    <th className="numeric">المستلم</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {receiveTransfer.items.map((it) => (
                    <tr key={it.productId}>
                      <td>{it.productName}</td>
                      <td className="numeric num">{formatNumber(it.qty)}</td>
                      <td style={{ width: 110 }}>
                        <Input type="number" min={1} max={it.qty} value={transferForm[it.productId]?.receivedQty ?? it.qty} onChange={(e) => setTransferForm((f) => ({ ...f, [it.productId]: { ...f[it.productId], receivedQty: Number(e.target.value) || it.qty } }))} />
                      </td>
                      <td style={{ width: 130 }}>
                        <Select value={transferForm[it.productId]?.condition ?? "good"} onChange={(e) => setTransferForm((f) => ({ ...f, [it.productId]: { ...f[it.productId], condition: e.target.value as "good" | "damaged" } }))} options={[
                          { value: "good", label: "سليم" },
                          { value: "damaged", label: "تالف" },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Badge tone="neutral" dot>زيادة المخزون تتم على مخزون السيارة فقط (مخزون المندوب المتنقل)</Badge>
          </div>
        </Modal>
      )}

      {receiveLoading && (
        <Modal open onClose={() => setReceiveLoading(null)} title={`استلام أمر التحميل: ${receiveLoading.number} من المستودع`} size="lg" footer={<>
          <Button variant="secondary" onClick={() => setReceiveLoading(null)}>إلغاء</Button>
          <Button variant="primary" icon={<ClipboardCheck size={15} />} onClick={confirmReceiveLoading}>تأكيد الاستلام</Button>
        </>}>
          <div className="stack-sm">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              <Package size={16} />
              <div>أدخل الكميات الفعلية المستلمة وحالة كل منتج. لا يجوز تجاوز الكمية المتوقعة.</div>
            </div>
            <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th className="numeric">المتوقع</th>
                    <th className="numeric">المستلم</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {receiveLoading.items.map((it) => (
                    <tr key={it.productId}>
                      <td>{it.productName}</td>
                      <td className="numeric num">{formatNumber(it.expectedQty)}</td>
                      <td style={{ width: 110 }}>
                        <Input type="number" min={1} max={it.expectedQty} value={loadingForm[it.productId]?.receivedQty ?? it.expectedQty} onChange={(e) => setLoadingForm((f) => ({ ...f, [it.productId]: { ...f[it.productId], receivedQty: Number(e.target.value) || it.expectedQty } }))} />
                      </td>
                      <td style={{ width: 130 }}>
                        <Select value={loadingForm[it.productId]?.condition ?? "good"} onChange={(e) => setLoadingForm((f) => ({ ...f, [it.productId]: { ...f[it.productId], condition: e.target.value as "good" | "damaged" } }))} options={[
                          { value: "good", label: "سليم" },
                          { value: "damaged", label: "تالف" },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Badge tone="neutral" dot>زيادة المخزون تتم على مخزون السيارة فقط (مخزون المندوب المتنقل)</Badge>
          </div>
        </Modal>
      )}
    </div>
  );
}