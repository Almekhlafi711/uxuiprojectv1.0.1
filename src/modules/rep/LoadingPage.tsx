import { useState } from "react";
import { PackageCheck, Truck, ClipboardCheck, PackageOpen } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { loadingOrdersByRep } from "@/mock/repField";
import { stockRequests } from "@/mock/inventory";
import { repPolicies } from "@/config/repPolicies";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/FormControls";
import { toast } from "@/store/ui";
import { formatQty, formatDateShort } from "@/utils/format";
import { receiveStock } from "@/services/loading.service";
import { dataScopeOf } from "@/config/authority";
import type { LoadingOrder } from "@/types";

export function LoadingPage() {
  const { user } = useAuthStore();
  const me = user!;

  const [orders, setOrders] = useState<LoadingOrder[]>(loadingOrdersByRep(me.id));
  const [receive, setReceive] = useState<LoadingOrder | null>(null);
  const [form, setForm] = useState<Record<string, { receivedQty: string; condition: "good" | "damaged" }>>({});

  const pendingRequest = stockRequests.find((r) => r.repId === me.id && r.status === "pending");
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  const openReceive = (o: LoadingOrder) => {
    setReceive(o);
    const init: Record<string, { receivedQty: string; condition: "good" | "damaged" }> = {};
    o.items.forEach((it) => { init[it.productId] = { receivedQty: String(it.expectedQty), condition: "good" }; });
    setForm(init);
  };

  const confirmReceive = () => {
    if (!receive || !user) return;
    const ok = receive.items.every((it) => {
      const v = Number(form[it.productId]?.receivedQty);
      return v > 0 && v <= it.expectedQty;
    });
    if (!ok) {
      toast.warning("تحقق من الكميات المستلمة", "الكمية يجب أن تكون أكبر من صفر ولا تتجاوز المتوقعة");
      return;
    }

    const result = receiveStock(
      {
        repId: user.id,
        items: receive.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          qty: Number(form[it.productId]?.receivedQty ?? it.expectedQty),
          condition: form[it.productId]?.condition ?? "good",
        })),
        source: "warehouse",
        refNumber: receive.number,
      },
      { id: user.id, role: user.role, scope: dataScopeOf[user.role], owns: true }
    );

    if (!result.success) {
      toast.error("فشل استلام البضاعة", result.reason ?? "خطأ غير معروف");
      return;
    }

    const now = "2026-08-14T" + new Date().toTimeString().slice(0, 8);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === receive.id
          ? {
              ...o,
              status: "completed" as const,
              completedAt: now,
              items: o.items.map((it) => ({
                ...it,
                receivedQty: Number(form[it.productId]?.receivedQty ?? it.expectedQty),
                condition: form[it.productId]?.condition ?? "good",
              })),
            }
          : o
      )
    );
    toast.success("تم استلام البضاعة", "زادت الكميات على مخزون سيارتك وسُجّلت الحركة في الأستاذ");
    setReceive(null);
  };

  const columns: Column<LoadingOrder>[] = [
    { key: "number", header: "أمر الاستلام", sortable: true, sortValue: (r) => r.number, priority: "primary", render: (r) => (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PackageOpen size={15} />
        <span>
          <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{r.number}</b>
          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>تحويل {r.transferId}</div>
        </span>
      </span>
    ) },
    { key: "warehouse", header: "المستودع", priority: "optional", render: () => "مستودع الرياض الرئيسي" },
    { key: "items", header: "البنود", priority: "primary", render: (r) => <span className="num">{r.items.length} منتج · {formatQty(r.items.reduce((s, i) => s + i.expectedQty, 0))} وحدة</span> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "secondary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "إجراء", priority: "primary", render: (r) => (
      r.status === "pending"
        ? <Button size="sm" variant="primary" icon={<ClipboardCheck size={13} />} onClick={() => openReceive(r)}>استلام</Button>
        : <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.completedAt?.slice(11, 16)}</span>
    ) },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "استلام البضاعة" }]}
        title="استلام البضاعة من المستودع"
        description="تأكيد استلام أوامر التحميل وزيادة مخزون السيارة عند الاستلام فقط"
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>بانتظار الاستلام</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{pendingOrders}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تم الاستلام</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{orders.filter((o) => o.status === "completed").length}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>طلبات تموين معلقة</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{pendingRequest ? 1 : 0}</b></div></Card>
        </div>
      </StickyPageHeader>

      <Card title="أوامر الاستلام">
        <div className="card-body">
          <DataTable
            columns={columns}
            rows={orders}
            rowKey={(r) => r.id}
            pageSize={10}
            emptyTitle="لا توجد أوامر استلام"
            emptyDescription="عند تجهيز طلب التموين من المستودع يظهر الأمر هنا."
          />
        </div>
      </Card>

      <div className="alert alert-info" style={{ marginBottom: 0 }}>
        <Truck size={17} />
        <div>
          <div className="alert-title">سياسة الاستلام</div>
          <div>
            {repPolicies.transferReceiptRequired ? "استلام البضاعة إلزامي لتأكيد التحويل — لا تزيد الكميات على مخزون السيارة إلا بعد الاستلام." : "الاستلام اختياري — تزيد الكميات عند الاستلام."}
            {repPolicies.stockRequestIncreasesVanOnReceiptOnly && " يُنشأ طلب التموين دون تغيير في المخزون حتى يصل أمر الاستلام الفعلي."}
          </div>
        </div>
      </div>

      {receive && (
        <Modal open onClose={() => setReceive(null)} title={`استلام ${receive.number}`} size="lg" footer={<>
          <Button variant="secondary" onClick={() => setReceive(null)}>إلغاء</Button>
          <Button variant="primary" icon={<ClipboardCheck size={15} />} onClick={confirmReceive}>تأكيد الاستلام</Button>
        </>}>
          <div className="stack-sm">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              أدخل الكميات الفعلية المستلمة وحالة كل منتج. لا يجوز تجاوز الكمية المتوقعة.
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
                  {receive.items.map((it) => (
                    <tr key={it.productId}>
                      <td>{it.productName}</td>
                      <td className="numeric num">{formatQty(it.expectedQty)}</td>
                      <td style={{ width: 110 }}>
                        <Input
                          type="number"
                          min={1}
                          max={it.expectedQty}
                          value={form[it.productId]?.receivedQty ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, [it.productId]: { ...f[it.productId], receivedQty: e.target.value } }))}
                        />
                      </td>
                      <td style={{ width: 130 }}>
                        <Select
                          value={form[it.productId]?.condition ?? "good"}
                          onChange={(e) => setForm((f) => ({ ...f, [it.productId]: { ...f[it.productId], condition: e.target.value as "good" | "damaged" } }))}
                          options={[
                            { value: "good", label: "سليم" },
                            { value: "damaged", label: "تالف" },
                          ]}
                        />
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
