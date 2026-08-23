import { Link } from "react-router-dom";
import { Warehouse, Truck, ArrowLeftRight, ClipboardList, History } from "lucide-react";
import { warehouseStock, stockMovements, vanStock } from "@/mock/inventory";
import { products } from "@/mock/products";
import { useAuthStore } from "@/store/auth";
import { getDataScope } from "@/services/scope";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { inventoryActions } from "@/config/dashboardActions";
import { formatMoney, formatNumber } from "@/utils/format";

const sections = [
  {
    path: "/inventory/warehouse",
    title: "مخزون المستودع",
    desc: "المخزون المركزي، مستويات إعادة الطلب، والقيمة الإجمالية",
    icon: Warehouse,
    tone: "info" as const,
  },
  {
    path: "/inventory/van",
    title: "مخزون المندوب / السيارة",
    desc: "المخزون المتحرك لدى المناديب والتلفيات",
    icon: Truck,
    tone: "warning" as const,
  },
  {
    path: "/inventory/transfers",
    title: "التحويلات",
    desc: "تحويلات بين المستودعات وسيارات المناديب",
    icon: ArrowLeftRight,
    tone: "success" as const,
  },
  {
    path: "/inventory/requests",
    title: "طلبات البضاعة",
    desc: "طلبات المناديب لإعادة التموين",
    icon: ClipboardList,
    tone: "primary" as const,
  },
  {
    path: "/inventory/movements",
    title: "سجل الحركات",
    desc: "كل حركات الدخول والخروج والتسويات",
    icon: History,
    tone: "danger" as const,
  },
];

export function InventoryIndexPage() {
  const { user } = useAuthStore();
  const scope = getDataScope(user);
  const isRep = user?.role === "REPRESENTATIVE";

  const myVanItems = (scope ? (vanStock.find((v) => v.repId === scope.userId)?.items ?? []) : []).map((i) => {
    const p = products.find((x) => x.id === i.productId);
    return { ...i, costPrice: p?.costPrice ?? 0, reorderLevel: p?.reorderLevel ?? 0 };
  });
  const totalUnits = isRep ? myVanItems.reduce((s, i) => s + i.qty, 0) : warehouseStock.reduce((s, i) => s + i.available, 0);
  const totalValue = isRep
    ? myVanItems.reduce((s, i) => s + i.qty * i.costPrice, 0)
    : warehouseStock.reduce((s, i) => s + i.available * i.costPrice, 0);
  const lowItems = isRep
    ? myVanItems.filter((i) => i.qty <= i.reorderLevel).length
    : warehouseStock.filter((i) => i.available <= i.reorderLevel).length;
  const lowRows = isRep
    ? myVanItems.filter((i) => i.qty <= i.reorderLevel).map((i) => ({ productId: i.productId, productName: i.productName, qty: i.qty, reorderLevel: i.reorderLevel }))
    : warehouseStock.filter((i) => i.available <= i.reorderLevel).map((i) => ({ productId: i.productId, productName: i.productName, qty: i.available, reorderLevel: i.reorderLevel }));
  const todayMovements = stockMovements.filter((m) => (isRep ? m.repId === user?.id : true) && m.date.startsWith("2026-08-14")).length;

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: isRep ? "مخزوني" : "المخزون" }]}
        title={isRep ? "مخزوني" : "المخزون"}
        description={isRep ? "مخزون سيارتك وطلباتك وحركاتك" : "إدارة المخزون المركزي والمتحرك عبر الفروع والمناديب"}
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <StatCard label="إجمالي الوحدات المتوفرة" value={formatNumber(totalUnits)} hint={isRep ? "بسيارتك" : "بالمستودعات"} icon={<Warehouse size={14} />} />
          <StatCard label="قيمة المخزون" value={formatMoney(totalValue)} hint="بتكلفة الشراء" icon={<ClipboardList size={14} />} />
          <StatCard label="أصناف تحت مستوى الطلب" value={formatNumber(lowItems)} hint="تحتاج إعادة تموين" icon={<History size={14} />} />
          <StatCard label="حركات اليوم" value={formatNumber(todayMovements)} hint="دخول وخروج وتسويات" icon={<ArrowLeftRight size={14} />} />
        </div>
      </StickyPageHeader>

      <DashboardQuickActions actions={inventoryActions} sticky />

      <div className="grid-2">
        {sections.filter((s) => !(isRep && s.path === "/inventory/warehouse")).map((s) => (
          <Link key={s.path} to={s.path} style={{ textDecoration: "none" }}>
            <Card className="hover-card">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span className={`badge badge-${s.tone}`} style={{ display: "inline-flex", padding: 8 }}>
                  <s.icon size={16} />
                </span>
                <div>
                  <h3 style={{ margin: 0 }}>{s.title}</h3>
                  <p className="muted" style={{ fontSize: "var(--font-size-sm)", margin: "4px 0 0" }}>{s.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {lowRows.length > 0 && (
        <Card title="تنبيه إعادة التموين" className="mt-4">
          <div className="stack-sm">
            {lowRows.map((i) => (
              <div key={i.productId} className="flex-between">
                <span>{i.productName}</span>
                <Badge tone="danger">متبقي {formatNumber(i.qty)} — الحد الأدنى {formatNumber(i.reorderLevel)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}