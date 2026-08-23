import { useMemo, useState } from "react";
import { Package, Plus, Landmark, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { can } from "@/config/permissions";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/utils/status";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/FormControls";
import { formatMoney, formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import type { Distributor, DistributorSellInOrder, DistributorSellOut } from "@/types";

const orderStatusMeta: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "مسودة", tone: "neutral" },
  confirmed: { label: "مؤكد", tone: "info" },
  shipped: { label: "مرسل", tone: "warning" },
  received: { label: "مستلم", tone: "success" },
  cancelled: { label: "ملغى", tone: "danger" },
};

export function DistributorPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<"orders" | "sellout" | "overview">("overview");
  const [newSellOutOpen, setNewSellOutOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [newLines, setNewLines] = useState<Array<{ productName: string; qty: number; amount: number }>>([]);

  const sellIn = useData(() => mockApi.distributor.listSellIn());
  const sellOut = useData(() => mockApi.distributor.listSellOut());
  const distributors = useData(() => mockApi.distributor.list());

  const distributorId = user?.distributorId;
  const me = distributors.data?.find((d) => d.id === distributorId);

  const myOrders = useMemo(() => (sellIn.data ?? []).filter((o) => o.distributorId === distributorId), [sellIn.data, distributorId]);
  const mySellOut = useMemo(() => (sellOut.data ?? []).filter((o) => o.distributorId === distributorId), [sellOut.data, distributorId]);

  const orderColumns: Column<DistributorSellInOrder>[] = [
    { key: "id", header: "الرقم", render: (o) => <span className="num">{o.id}</span> },
    { key: "date", header: "التاريخ", render: (o) => <span className="num">{formatDateShort(o.date)}</span> },
    {
      key: "status",
      header: "الحالة",
      render: (o) => {
        const m = orderStatusMeta[o.status];
        return <Badge tone={m.tone}>{m.label}</Badge>;
      },
    },
    { key: "total", header: "المجموع", numeric: true, render: (o) => <span className="num">{formatMoney(o.total)}</span> },
    {
      key: "actions",
      header: "",
      render: (o) =>
        o.status === "shipped" ? (
          <Button size="sm" onClick={() => confirmReceive(o.id)}>تأكيد الاستلام</Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => alert(JSON.stringify(o.items))}>التفاصيل</Button>
        ),
    },
  ];

  async function confirmReceive(id: string) {
    try {
      await mockApi.distributor.updateSellInStatus(id, "received");
      await sellIn.refetch();
      toast.success("تم تسجيل الاستلام");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function addLine() {
    setNewLines([...newLines, { productName: "", qty: 0, amount: 0 }]);
  }

  async function submitSellOut() {
    if (!newCustomer.trim() || newLines.length === 0 || !distributorId) {
      toast.error("أكمل بيانات المبيعات");
      return;
    }
    const items = newLines.filter((l) => l.qty > 0 && l.productName.trim());
    if (items.length === 0) {
      toast.error("أدخل أصنافاً");
      return;
    }
    const total = items.reduce((s, l) => s + l.amount, 0);
    try {
      await mockApi.distributor.addSellOut({
        distributorId,
        date: new Date().toISOString().slice(0, 10),
        customerName: newCustomer,
        items: items.map((i, idx) => ({ productId: String(idx), productName: i.productName, qty: i.qty, amount: i.amount })),
        total,
      });
      await sellOut.refetch();
      setNewSellOutOpen(false);
      setNewCustomer("");
      setNewLines([]);
      toast.success("تم تسجيل مبيعات الخروج (Sell-Out)");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const sellOutColumns: Column<DistributorSellOut>[] = [
    { key: "date", header: "التاريخ", render: (o) => <span className="num">{formatDateShort(o.date)}</span> },
    { key: "customerName", header: "العميل", render: (o) => o.customerName },
    { key: "total", header: "المبلغ", numeric: true, render: (o) => <span className="num">{formatMoney(o.total)}</span> },
  ];

  const soldTotal = useMemo(() => mySellOut.reduce((s, o) => s + o.total, 0), [mySellOut]);

  return (
    <div className="page">
      <StickyPageHeader crumbs={[{ label: "الرئيسية", path: "/" }, { label: "بوابة الموزع" }]} title="بوابة الموزع" description={`موزع: ${me?.name ?? "—"} (${distributorId ?? "—"})`} />

      <Tabs
        tabs={[
          { key: "overview", label: "نظرة عامة", content: <OverviewPanel /> },
          { key: "orders", label: "أوامر التسليم (Sell-In)", content: <OrdersPanel /> },
          { key: "sellout", label: "مبيعاتي (Sell-Out)", content: <SellOutPanel /> },
        ]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
      />

      <Modal
        open={newSellOutOpen}
        onClose={() => setNewSellOutOpen(false)}
        title="تسجيل مبيعات خروج (Sell-Out)"
        size="md"
        footer={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={() => setNewSellOutOpen(false)}>إلغاء</Button>
            <Button onClick={submitSellOut}>حفظ</Button>
          </div>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Input label="اسم العميل" value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="مثال: سوبر ماركت ..." />
          {newLines.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 3fr", gap: 8, alignItems: "end" }}>
              <Input
                label={`منتج ${i + 1}`}
                value={l.productName}
                onChange={(e) => {
                  const v = [...newLines];
                  v[i].productName = e.target.value;
                  setNewLines(v);
                }}
              />
              <Input
                label="الكمية"
                type="number"
                value={l.qty}
                onChange={(e) => {
                  const v = [...newLines];
                  v[i].qty = Number(e.target.value);
                  setNewLines(v);
                }}
              />
              <Input
                label="المبلغ"
                type="number"
                value={l.amount}
                onChange={(e) => {
                  const v = [...newLines];
                  v[i].amount = Number(e.target.value);
                  setNewLines(v);
                }}
              />
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={addLine}>
            <Plus size={14} /> إضافة صف
          </Button>
        </div>
      </Modal>
    </div>
  );

  function OverviewPanel() {
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          <StatCard label="الرصيد الحالي" value={formatMoney(me?.balance ?? 0)} icon={<Landmark size={18} />} />
          <StatCard label="الحد الائتماني" value={formatMoney(me?.creditLimit ?? 0)} icon={<Landmark size={18} />} />
          <StatCard label="إجمالي مبيعات الخروج" value={formatMoney(soldTotal)} icon={<TrendingUp size={18} />} />
          <StatCard label="أوامر قيد الاستلام" value={String(myOrders.filter((o) => o.status === "shipped").length)} icon={<Package size={18} />} />
        </div>
        <Card title="أحدث أوامر التوزيع">
          <DataTable columns={orderColumns} rows={myOrders.slice(0, 5)} rowKey={(o) => o.id} />
        </Card>
      </>
    );
  }

  function OrdersPanel() {
    return (
      <Card title="أوامر التسليم (Sell-In)">
        <DataTable columns={orderColumns} rows={myOrders} loading={sellIn.loading} error={sellIn.error} onRetry={sellIn.refetch} rowKey={(o) => o.id} />
      </Card>
    );
  }

  function SellOutPanel() {
    return (
      <>
        <Button style={{ marginBottom: 12 }} onClick={() => setNewSellOutOpen(true)}>
          <Plus size={16} /> تسجيل مبيعات خروج
        </Button>
        <Card title="مبيعات الخروج (Sell-Out)">
          <DataTable columns={sellOutColumns} rows={mySellOut} loading={sellOut.loading} error={sellOut.error} onRetry={sellOut.refetch} rowKey={(o) => o.id} />
        </Card>
      </>
    );
  }
}
