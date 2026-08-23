import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, HandCoins, Navigation, Package, AlertTriangle,
  TrendingUp, DollarSign, Users, MapPin, CheckCircle2, XCircle,
  Clock, Target, Wallet, Box, Bell,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { customers } from "@/mock/customers";
import { invoices } from "@/mock/sales";
import { todayCollections } from "@/mock/collections";
import { visits } from "@/mock/visits";
import { returnsByRep } from "@/mock/returns";
import { dailyPlanByRepDate, activeTripByRep } from "@/mock/repField";
import { stockByRep } from "@/mock/inventory";
import { cashBoxes } from "@/mock/cash";
import { getCashBoxBalance } from "@/services/ledger";
import { repPolicies } from "@/config/repPolicies";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { unifiedQuickActions } from "@/config/dashboardActions";
import { toast } from "@/store/ui";
import { formatMoney, formatNumber, formatTime } from "@/utils/format";

const TODAY = "2026-08-14";

export function DashboardPage() {
  const { user } = useAuthStore();
  const me = user!;
  const navigate = useNavigate();

  const plan = dailyPlanByRepDate(me.id, TODAY);
  const trip = activeTripByRep(me.id);
  const myVan = stockByRep(me.id);
  const myBox = cashBoxes.find((b) => b.ownerId === me.id);
  const myCustomers = customers.filter((c) => c.repId === me.id);
  const myVisitsToday = visits.filter((v) => v.repId === me.id && v.date === TODAY);
  const myInvoicesToday = invoices.filter((i) => i.repId === me.id && i.date === TODAY && i.status === "completed");
  const myCollectionsToday = todayCollections().filter((c) => c.repId === me.id && c.status === "approved");
  const myReturnsToday = returnsByRep(me.id).filter((r) => r.date === TODAY);
  const myPendingRequests = myInvoicesToday.filter((i) => i.paymentStatus !== "paid").length;
  const myPendingReturns = myReturnsToday.filter((r) => r.status === "pending").length;

  const salesToday = myInvoicesToday.reduce((s, i) => s + i.net, 0);
  const collectionsToday = myCollectionsToday.reduce((s, c) => s + c.amount, 0);
  const visitsCompleted = myVisitsToday.filter((v) => v.result === "completed").length;
  const visitsPlanned = plan?.entries.length ?? 0;
  const visitPct = visitsPlanned > 0 ? Math.round((visitsCompleted / visitsPlanned) * 100) : 0;
  const salesTarget = plan?.salesTarget ?? 0;
  const collectionTarget = plan?.collectionTarget ?? 0;
  const salesTargetPct = salesTarget > 0 ? Math.min(100, Math.round((salesToday / salesTarget) * 100)) : 0;
  const collectionTargetPct = collectionTarget > 0 ? Math.min(100, Math.round((collectionsToday / collectionTarget) * 100)) : 0;

  const totalStockUnits = myVan.reduce((s, i) => s + i.qty, 0);
  const totalStockValue = myVan.reduce((s, i) => s + i.qty * (i as any).costPrice, 0);
  const lowStockItems = myVan.filter((i) => i.qty <= ((i as any).reorderLevel ?? 5)).length;

  const cashBalance = myBox ? getCashBoxBalance(myBox.id).balance : 0;
  const cashExpected = myCollectionsToday.filter((c) => c.method === "cash").reduce((s, c) => s + c.amount, 0);

  const alerts: { id: string; type: "warning" | "info" | "danger" | "success"; title: string; desc: string; action?: { label: string; href: string } }[] = [];

  if (myPendingReturns > 0) {
    alerts.push({ id: "pending-returns", type: "warning", title: "مرتجعات معلقة", desc: `${myPendingReturns} مرتجع بانتظار الاعتماد`, action: { label: "عرض", href: "/returns" } });
  }
  if (lowStockItems > 0) {
    alerts.push({ id: "low-stock", type: "warning", title: "منتجات عند حد إعادة الطلب", desc: `${lowStockItems} صنف بحاجة تموين`, action: { label: "طلب بضاعة", href: "/rep/loading" } });
  }
  if (!trip) {
    alerts.push({ id: "no-trip", type: "info", title: "الجولة لم تبدأ", desc: "ابدأ جولتك لتسجيل الزيارات والبيع", action: { label: "بدء الجولة", href: "/rep/plan" } });
  } else if (trip.status === "in_progress" && !trip.gpsEnabled) {
    alerts.push({ id: "gps-off", type: "danger", title: "GPS معطل", desc: "تفعيل التتبع مطلوب أثناء الجولة", action: { label: "تفعيل", href: "/rep/gps" } });
  }
  const overdueCustomers = myCustomers.filter((c) => c.status === "overdue").length;
  if (overdueCustomers > 0) {
    alerts.push({ id: "overdue", type: "danger", title: "عملاء متأخرون", desc: `${overdueCustomers} عميل يتجاوز الحد الائتماني أو متأخر سداد`, action: { label: "عرض", href: "/customers" } });
  }
  const unvisitedPlanned = plan?.entries.filter((e) => e.status === "pending").length ?? 0;
  if (unvisitedPlanned > 0 && trip?.status === "in_progress") {
    alerts.push({ id: "unvisited", type: "info", title: "زيارات متبقية", desc: `${unvisitedPlanned} زيارة مخططة لم تنفذ بعد`, action: { label: "الخطة", href: "/rep/plan" } });
  }

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الرئيسية" }]}
        title="لوحة تحكم المندوب"
        description={`مرحباً ${me.name} — ${TODAY} · المنطقة: ${me.territoryId === "t-01" ? "الرياض — شمال (أ)" : me.territoryId}`}
      />
      {/* العمليات السريعة الموحدة — مثبتة برأس الصفحة ومفلترة بالصلاحيات */}
      <DashboardQuickActions actions={unifiedQuickActions} sticky />

      {alerts.length > 0 && (
        <div className="stack" style={{ marginBottom: "var(--space-4)" }}>
          {alerts.map((al) => (
            <Card key={al.id} className={`alert alert-${al.type}`}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="alert-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {al.type === "warning" && <AlertTriangle size={18} />}
                    {al.type === "info" && <Bell size={18} />}
                    {al.type === "danger" && <XCircle size={18} />}
                    {al.type === "success" && <CheckCircle2 size={18} />}
                    <span>{al.title}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: "var(--font-size-sm)" }}>{al.desc}</div>
                </div>
                {al.action && (
                  <Button size="sm" variant="ghost" onClick={() => navigate(al.action!.href)}>{al.action.label}</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مبيعات اليوم</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-primary)" }}>{formatMoney(salesToday)}</b><Progress value={salesTargetPct} tone={salesTargetPct >= 100 ? "success" : salesTargetPct >= 70 ? "default" : "warning"} label={`هدف ${formatMoney(salesTarget)}`} /></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تحصيل اليوم</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{formatMoney(collectionsToday)}</b><Progress value={collectionTargetPct} tone={collectionTargetPct >= 100 ? "success" : collectionTargetPct >= 70 ? "default" : "warning"} label={`هدف ${formatMoney(collectionTarget)}`} /></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الزيارات</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{visitsCompleted} / {visitsPlanned}</b><Progress value={visitPct} tone={visitPct >= 100 ? "success" : visitPct >= 50 ? "default" : "warning"} label={`نسبة التنفيذ ${visitPct}%`} /></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>صندوق التحصيل</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{formatMoney(cashBalance)}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>نقدي متوقع اليوم: {formatMoney(cashExpected)}</div></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>العملاء</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{myCustomers.length}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>نشط: {myCustomers.filter((c) => c.status === "active").length} · متأخر: {overdueCustomers}</div></div></Card>
      </div>

      <div className="grid-2-1" style={{ marginBottom: "var(--space-4)" }}>
        <div className="stack">
          <Card title="آخر الفواتير" subtitle={`${myInvoicesToday.length} فاتورة اليوم`}>
            <div className="card-body">
              {myInvoicesToday.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد مبيعات اليوم</div>
              ) : (
                <div className="stack-sm">
                  {myInvoicesToday.slice(0, 5).map((inv) => {
                    const cust = customers.find((c) => c.id === inv.customerId);
                    return (
                      <div key={inv.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                        <div>
                          <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{inv.invoiceNumber}</b>
                          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{cust?.name}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatMoney(inv.net)}</b>
                          <StatusBadge status={inv.paymentStatus} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card title="آخر التحصيلات" subtitle={`${myCollectionsToday.length} سند اليوم`}>
            <div className="card-body">
              {myCollectionsToday.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد تحصيلات اليوم</div>
              ) : (
                <div className="stack-sm">
                  {myCollectionsToday.slice(0, 5).map((col) => {
                    const cust = customers.find((c) => c.id === col.customerId);
                    return (
                      <div key={col.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                        <div>
                          <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{col.number}</b>
                          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{cust?.name}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <b className="num" style={{ fontSize: "var(--font-size-sm)", color: "var(--color-success)" }}>{formatMoney(col.amount)}</b>
                          <Badge tone={col.method === "cash" ? "success" : col.method === "transfer" ? "info" : "warning"} dot>{col.method === "cash" ? "نقدي" : col.method === "transfer" ? "تحويل" : "POS"}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title="خطة اليوم" subtitle={plan ? `${plan.entries.length} زيارة · ${plan.source === "route" ? "مسار معتمد" : "يدوي"}` : "لا توجد خطة"}>
            <div className="card-body">
              {plan && plan.entries.length > 0 ? (
                <div className="stack-sm">
                  {plan.entries.slice(0, 6).map((e) => {
                    const cust = customers.find((c) => c.id === e.customerId);
                    const visit = myVisitsToday.find((v) => v.customerId === e.customerId);
                    return (
                      <div key={e.customerId} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="num" style={{ fontSize: "var(--font-size-sm)", minWidth: 24 }}>{e.order}</span>
                          <div>
                            <b style={{ fontSize: "var(--font-size-sm)" }}>{cust?.name}</b>
                            <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{formatTime(e.plannedTime)}</div>
                          </div>
                        </div>
                        <Badge tone={visit?.result === "completed" ? "success" : visit?.result === "not_found" ? "warning" : "neutral"} dot>{visit?.result === "completed" ? "منفذة" : visit?.result === "not_found" ? "مغلقة" : "مخططة"}</Badge>
                      </div>
                    );
                  })}
                  {plan.entries.length > 6 && <div className="faint" style={{ fontSize: "var(--font-size-xs)", textAlign: "center" }}>+ {plan.entries.length - 6} زيارة أخرى</div>}
                </div>
              ) : (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد زيارات مخططة اليوم</div>
              )}
            </div>
          </Card>

          <Card title="تنبيهات المخزون" subtitle={`${lowStockItems} صنف عند حد إعادة الطلب`}>
            <div className="card-body">
              {lowStockItems === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>جميع الأصناف فوق حد إعادة الطلب</div>
              ) : (
                <div className="stack-sm">
                  {myVan.filter((i) => i.qty <= ((i as any).reorderLevel ?? 5)).slice(0, 5).map((it) => (
                    <div key={it.productId} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 6 }}>
                      <div>
                        <b style={{ fontSize: "var(--font-size-sm)" }}>{it.productName}</b>
                        <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>رصيد: {formatNumber(it.qty)} · حد إعادة الطلب: {formatNumber((it as any).reorderLevel ?? 5)}</div>
                      </div>
                      <Badge tone="warning" dot>تموين</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مبيعات الشهر</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatMoney(invoices.filter((i) => i.repId === me.id && i.date.startsWith("2026-08") && i.status === "completed").reduce((s, i) => s + i.net, 0))}</b></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تحصيل الشهر</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{formatMoney(todayCollections().filter((c) => c.repId === me.id && c.date.startsWith("2026-08") && c.status === "approved").reduce((s, c) => s + c.amount, 0))}</b></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المرتجعات المعلقة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{myPendingReturns}</b></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>فواتير غير مسددة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-danger)" }}>{myPendingRequests}</b></div></Card>
      </div>
    </div>
  );
}