import { useMemo, useState } from "react";
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
import { formatMoney, formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import type { Distributor, DistributorSellInOrder, DistributorSellOut } from "@/types";

const statusTone: Record<string, BadgeTone> = {
  active: "success",
  inactive: "neutral",
  suspended: "danger",
};

const orderStatusMeta: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "مسودة", tone: "neutral" },
  confirmed: { label: "مؤكد", tone: "info" },
  shipped: { label: "مرسل", tone: "warning" },
  received: { label: "مستلم", tone: "success" },
  cancelled: { label: "ملغى", tone: "danger" },
};

const typeLabel: Record<string, string> = {
  internal: "داخلي",
  external: "خارجي",
  managed: "مدار",
};

export function DistributionOfficerPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<"distributors" | "sellin" | "network">("distributors");
  const [activeDistributor, setActiveDistributor] = useState<Distributor | null>(null);
  const [activeOrder, setActiveOrder] = useState<DistributorSellInOrder | null>(null);

  const distributors = useData(() => mockApi.distributor.list());
  const sellIn = useData(() => mockApi.distributor.listSellIn());
  const sellOut = useData(() => mockApi.distributor.listSellOut());

  const branchId = user?.branchId;

  const visibleDistributors = useMemo(() => {
    const all = distributors.data ?? [];
    if (!user || !can("distributor.manage", user.role)) return all.filter((d) => d.branchId === branchId);
    return all;
  }, [distributors.data, user, can, branchId]);

  const visibleSellIn = useMemo(() => {
    const all = sellIn.data ?? [];
    if (user?.role === "DISTRIBUTION_OFFICER") {
      return all.filter((o) => {
        const d = distributors.data?.find((x) => x.id === o.distributorId);
        return d?.branchId === branchId;
      });
    }
    return all;
  }, [sellIn.data, distributors.data, user, branchId]);

  const visibleSellOut = useMemo(() => {
    const all = sellOut.data ?? [];
    if (user?.role === "DISTRIBUTION_OFFICER") {
      return all.filter((o) => {
        const d = distributors.data?.find((x) => x.id === o.distributorId);
        return d?.branchId === branchId;
      });
    }
    return all;
  }, [sellOut.data, distributors.data, user, branchId]);

  const canManage = user ? can("distributor.manage", user.role) : false;

  const distributorColumns: Column<Distributor>[] = [
    { key: "name", header: "اسم الموزع", sortable: true, render: (d) => <strong>{d.name}</strong> },
    { key: "type", header: "النوع", render: (d) => <Badge tone="neutral">{typeLabel[d.type ?? "managed"]}</Badge> },
    {
      key: "status",
      header: "الحالة",
      render: (d) => <Badge tone={statusTone[d.status ?? "active"]}>{d.status ?? "active"}</Badge>,
    },
    { key: "contactName", header: "جهة الاتصال", render: (d) => d.contactName ?? "—" },
    {
      key: "balance",
      header: "الرصيد / الحد الأقصى",
      render: (d) => <span className="num">{formatMoney(d.balance ?? 0)} / {formatMoney(d.creditLimit ?? 0)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <Button variant="ghost" size="sm" onClick={() => setActiveDistributor(d)}>
          إدارة
        </Button>
      ),
    },
  ];

  const sellInColumns: Column<DistributorSellInOrder>[] = [
    { key: "id", header: "الرقم", render: (o) => <span className="num">{o.id}</span> },
    { key: "distributorId", header: "الموزع", render: (o) => <span>{distributors.data?.find((d) => d.id === o.distributorId)?.name ?? o.distributorName}</span> },
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
      render: (o) => (
        <Button variant="ghost" size="sm" onClick={() => setActiveOrder(o)}>التفاصيل</Button>
      ),
    },
  ];

  async function setOrderStatus(id: string, status: DistributorSellInOrder["status"]) {
    try {
      await mockApi.distributor.updateSellInStatus(id, status);
      setActiveOrder(null);
      await sellIn.refetch();
      toast.success("تم تحديث حالة أمر التوزيع");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const networkColumns: Column<DistributorSellOut>[] = [
    { key: "date", header: "التاريخ", render: (o) => <span className="num">{formatDateShort(o.date)}</span> },
    { key: "distributorId", header: "الموزع", render: (o) => <span>{distributors.data?.find((d) => d.id === o.distributorId)?.name ?? "—"}</span> },
    { key: "customerName", header: "العميل", render: (o) => o.customerName },
    { key: "total", header: "المبلغ", numeric: true, render: (o) => <span className="num">{formatMoney(o.total)}</span> },
  ];

  const networkTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    (sellOut.data ?? []).forEach((o) => {
      totals[o.distributorId] = (totals[o.distributorId] ?? 0) + o.total;
    });
    return totals;
  }, [sellOut.data]);

  return (
    <div className="page">
<StickyPageHeader crumbs={[{ label: "الرئيسية", path: "/" }, { label: "إدارة التوزيع" }]} title="إدارة التوزيع" description="وحدة مسؤول التوزيع (DO) — الموزعون، أوامر Sell-In، وأداء Sell-Out" />

      <Tabs
        tabs={[
          { key: "distributors", label: "الموزعون", content: <DistributorsPanel /> },
          { key: "sellin", label: "أوامر التوزيع (Sell-In)", content: <SellInPanel /> },
          { key: "network", label: "أداء الشبكة (Sell-Out)", content: <NetworkPanel /> },
        ]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
      />

      <Modal
        open={!!activeOrder}
        onClose={() => setActiveOrder(null)}
        title={`أمر توزيع ${activeOrder?.id ?? ""}`}
        size="lg"
        footer={
          activeOrder && canManage ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {activeOrder.status === "confirmed" && <Button onClick={() => setOrderStatus(activeOrder!.id, "shipped")}>تحديد كمرسل</Button>}
              {activeOrder.status === "shipped" && <Button onClick={() => setOrderStatus(activeOrder!.id, "received")}>تأكيد الاستلام</Button>}
              <Button variant="ghost" onClick={() => setActiveOrder(null)}>إغلاق</Button>
            </div>
          ) : undefined
        }
      >
        {activeOrder && (
          <div>
            <p className="muted">
              {activeOrder.distributorName} — {formatDateShort(activeOrder.date)} — <Badge tone={orderStatusMeta[activeOrder.status].tone}>{orderStatusMeta[activeOrder.status].label}</Badge>
            </p>
            <DataTable
              columns={[
                { key: "productId", header: "المنتج", render: (i: any) => i.productName },
                { key: "qty", header: "الكمية", numeric: true, render: (i: any) => <span className="num">{i.qty}</span> },
                { key: "unitPrice", header: "السعر الواحد", numeric: true, render: (i: any) => <span className="num">{formatMoney(i.unitPrice)}</span> },
              ]}
              rows={activeOrder.items}
              rowKey={(i: any) => i.productId}
            />
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <strong>المجموع: {formatMoney(activeOrder.total)}</strong>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!activeDistributor}
        onClose={() => setActiveDistributor(null)}
        title={`إدارة ${activeDistributor?.name ?? ""}`}
        size="sm"
        footer={
          activeDistributor && canManage ? (
            <Button
              onClick={async () => {
                const next = activeDistributor!.status === "active" ? "suspended" : "active";
                try {
                  await mockApi.distributor.update({ id: activeDistributor!.id, status: next });
                  await distributors.refetch();
                  toast.success("تم تحديث حالة الموزع");
                  setActiveDistributor(null);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              {activeDistributor?.status === "active" ? "تعطيل" : "تفعيل"}
            </Button>
          ) : undefined
        }
      >
        {activeDistributor && (
          <div style={{ display: "grid", gap: 8 }}>
            <p><span className="muted">النوع:</span> {typeLabel[activeDistributor.type ?? "managed"]}</p>
            <p><span className="muted">الحالة:</span> <Badge tone={statusTone[activeDistributor.status ?? "active"]}>{activeDistributor.status ?? "active"}</Badge></p>
            <p><span className="muted">جهة الاتصال:</span> {activeDistributor.contactName ?? "—"} — {activeDistributor.phone ?? ""}</p>
            <p><span className="muted">البريد:</span> {activeDistributor.email ?? "—"}</p>
            <p><span className="muted">الرصيد / الحد:</span> {formatMoney(activeDistributor.balance ?? 0)} / {formatMoney(activeDistributor.creditLimit ?? 0)}</p>
          </div>
        )}
      </Modal>
    </div>
  );

  function DistributorsPanel() {
    return (
      <>
        <StatCard label="الموزعون النشطون" value={String((visibleDistributors ?? []).filter((d) => d.status === "active").length)} />
        <Card title="الموزعون">
          <DataTable
            columns={distributorColumns}
            rows={visibleDistributors}
            loading={distributors.loading}
            error={distributors.error}
            onRetry={distributors.refetch}
            rowKey={(d) => d.id}
          />
        </Card>
      </>
    );
  }

  function SellInPanel() {
    return (
      <>
        <StatCard label="إجمالي أوامر Sell-In" value={formatMoney((visibleSellIn ?? []).reduce((s, o) => s + o.total, 0))} />
        <Card title="أوامر التوزيع (Sell-In)">
          <DataTable
            columns={sellInColumns}
            rows={visibleSellIn}
            loading={sellIn.loading}
            error={sellIn.error}
            onRetry={sellIn.refetch}
            rowKey={(o) => o.id}
          />
        </Card>
      </>
    );
  }

  function NetworkPanel() {
    return (
      <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
          {(Object.keys(networkTotals) || []).map((id) => (
            <StatCard key={id} label={distributors.data?.find((d) => d.id === id)?.name ?? id} value={formatMoney(networkTotals[id])} />
          ))}
        </div>
        <Card title="مبيعات الخروج (Sell-Out)">
          <DataTable
            columns={networkColumns}
            rows={visibleSellOut}
            loading={sellOut.loading}
            error={sellOut.error}
            onRetry={sellOut.refetch}
            rowKey={(o) => o.id}
          />
        </Card>
      </>
    );
  }
}

