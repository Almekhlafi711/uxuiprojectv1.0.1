import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart, HandCoins, Banknote, Package, TrendingUp, TrendingDown,
  Users, ChevronLeft, RefreshCw, MapPin, CheckCircle, XCircle, AlertCircle,
  AlertTriangle, PackageX, FileCheck2, Clock, Target, BarChart3, Truck,
} from "lucide-react";
import { CURRENT_MONTH } from "@/config/date";
import { useAuthStore } from "@/store/auth";
import { users, supervisors, reps } from "@/mock/users";
import { territories } from "@/mock/organization";
import { customers } from "@/mock/customers";
import { invoices as allInvoices } from "@/mock/sales";
import { collections as allCollections } from "@/mock/collections";
import { formatMoney, formatPercent, formatNumber } from "@/utils/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/FormControls";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { unifiedQuickActions } from "@/config/dashboardActions";
import {
  type DashboardFilters,
  type RepProfitability,
  getSalesSummary,
  getCollectionsSummary,
  getCOGS,
  getGrossProfit,
  getRepProfitability,
  getTerritoryPerformance,
  getActionQueue,
} from "@/services/dashboard.service";
import {
  type RepProfitabilityDetail,
  type WaterfallPoint,
  getRepProfitabilityDetail,
  getProfitabilityWaterfall,
} from "@/services/profitability.service";

const PERIOD_OPTIONS = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
  { value: "quarter", label: "الربع الحالي" },
  { value: "year", label: "السنة" },
];

const CLASSIFICATION_LABELS: Record<string, string> = {
  excellent: "ممتاز", profitable: "مربح", low_margin: "هامش منخفض",
  review: "مراجعة", unprofitable: "غير مربح",
};
const CLASSIFICATION_COLORS: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  excellent: "success", profitable: "success", low_margin: "warning",
  review: "warning", unprofitable: "danger",
};

function CompactKPI({
  label, value, sub, trend, icon, onClick, danger,
}: {
  label: string; value: string; sub?: string;
  trend?: { direction: "up" | "down" | "flat"; text: string; positive?: boolean };
  icon?: React.ReactNode; onClick?: () => void; danger?: boolean;
}) {
  return (
    <div className="kpi-compact" onClick={onClick}>
      <div className="kpi-label">{icon}{label}</div>
      <div className="kpi-value num" style={{ color: danger ? "var(--color-danger)" : "inherit" }}>{value}</div>
      <div className="kpi-sub">
        {trend && (
          <span className={trend.direction === "up" ? "trend-up" : trend.direction === "down" ? "trend-down" : "trend-flat"}>
            {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "—"} {trend.text}
          </span>
        )}
        {sub && <span style={{ color: "var(--color-text-faint)" }}>· {sub}</span>}
      </div>
    </div>
  );
}

function ClassificationBadge({ classification }: { classification: string }) {
  return <Badge tone={CLASSIFICATION_COLORS[classification]} dot>{CLASSIFICATION_LABELS[classification]}</Badge>;
}

export function SalesManagerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DashboardFilters>({ period: "month" });
  const [drilldownModal, setDrilldownModal] = useState<{ open: boolean; type: "sales" | "collections" | "netsales" | "cogs" | "profit" }>({ open: false, type: "sales" });
  const [repDetailDrawer, setRepDetailDrawer] = useState<{ open: boolean; repId: string }>({ open: false, repId: "" });

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const lastUpdated = useMemo(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  }, []);

  const sales = useMemo(() => getSalesSummary(filters), [filters]);
  const collections = useMemo(() => getCollectionsSummary(filters), [filters]);
  const cogs = useMemo(() => getCOGS(filters), [filters]);
  const gp = useMemo(() => getGrossProfit(filters), [filters]);
  const repProfitData = useMemo(() => getRepProfitability(filters), [filters]);
  const territoryPerf = useMemo(() => getTerritoryPerformance(filters), [filters]);
  const actionQueue = useMemo(() => getActionQueue(), []);

  const repDetail = useMemo(() => {
    if (!repDetailDrawer.repId) return null;
    return getRepProfitabilityDetail(repDetailDrawer.repId, CURRENT_MONTH);
  }, [repDetailDrawer.repId]);

  const waterfall = useMemo(() => {
    if (!repDetailDrawer.repId) return [];
    return getProfitabilityWaterfall(repDetailDrawer.repId, CURRENT_MONTH);
  }, [repDetailDrawer.repId]);

  const territoryOptions = useMemo(() => [
    { value: "", label: "جميع المناطق" },
    ...territories.map((t) => ({ value: t.id, label: t.name })),
  ], []);
  const supervisorOptions = useMemo(() => [
    { value: "", label: "جميع المشرفين" },
    ...supervisors.map((s) => ({ value: s.id, label: s.name })),
  ], []);
  const repOptions = useMemo(() => [
    { value: "", label: "جميع المندوبين" },
    ...reps.map((r) => ({ value: r.id, label: r.name })),
  ], []);

  const worstRep = repProfitData.reduce((w, r) => !w || r.netContribution < w.netContribution ? r : w, null as RepProfitability | null);
  const bestRep = repProfitData.reduce((b, r) => !b || r.netContribution > b.netContribution ? r : b, null as RepProfitability | null);

  const salesTrend = { direction: sales.salesGrowth >= 0 ? "up" as const : "down" as const, text: formatPercent(Math.abs(sales.salesGrowth)), positive: sales.salesGrowth >= 0 };
  const collectionTrend = { direction: (collections.collectionRate >= 70 ? "up" as const : "down" as const), text: formatPercent(collections.collectionRate), positive: collections.collectionRate >= 70 };
  const profitTrend = { direction: gp.grossMargin >= 20 ? "up" as const : ("down" as const), text: formatPercent(gp.grossMargin), positive: gp.grossMargin >= 20 };

  return (
    <div>
      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3)" }}>
          <div>
            <h1 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, margin: 0 }}>إدارة المبيعات والتوزيع</h1>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", margin: "2px 0 0" }}>
              مركز التحكم التشغيلي للمبيعات والتحصيل والمخزون والربحية
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-faint)" }}>آخر تحديث: {lastUpdated}</span>
            <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={() => setFilters((f) => ({ ...f }))}>تحديث</Button>
          </div>
        </div>
        {/* Filter Bar */}
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          <Select label="الفترة" value={filters.period} options={PERIOD_OPTIONS} onChange={(e) => handleFilterChange("period", e.target.value)} style={{ minWidth: 130 }} />
          <Select label="المنطقة" value={filters.territoryId ?? ""} options={territoryOptions} onChange={(e) => handleFilterChange("territoryId", e.target.value)} style={{ minWidth: 150 }} />
          <Select label="المشرف" value={filters.supervisorId ?? ""} options={supervisorOptions} onChange={(e) => handleFilterChange("supervisorId", e.target.value)} style={{ minWidth: 150 }} />
          <Select label="المندوب" value={filters.repId ?? ""} options={repOptions} onChange={(e) => handleFilterChange("repId", e.target.value)} style={{ minWidth: 150 }} />
        </div>
      </div>

      {/* العمليات السريعة — مثبتة برأس الصفحة حسب الصلاحيات */}
      <DashboardQuickActions actions={unifiedQuickActions} sticky />

      {/* ── ROW 1: EXECUTIVE KPIs (6 compact) ── */}
      <div className="kpi-compact-grid" style={{ marginBottom: "var(--space-3)" }}>
        <CompactKPI label="إجمالي المبيعات" value={formatMoney(sales.grossSales)} sub={`${sales.totalInvoices} فاتورة`} icon={<ShoppingCart size={13} />} trend={salesTrend} onClick={() => setDrilldownModal({ open: true, type: "sales" })} />
        <CompactKPI label="صافي المبيعات" value={formatMoney(sales.netSales)} sub={`خصومات: ${formatMoney(sales.discountTotal)}`} icon={<Banknote size={13} />} trend={salesTrend} onClick={() => setDrilldownModal({ open: true, type: "netsales" })} />
        <CompactKPI label="إجمالي التحصيل" value={formatMoney(collections.totalCollected)} sub={`${collections.collectionCount} عملية`} icon={<HandCoins size={13} />} trend={collectionTrend} onClick={() => setDrilldownModal({ open: true, type: "collections" })} />
        <CompactKPI label="الربح الإجمالي" value={formatMoney(gp.grossProfit)} sub={`هامش: ${formatPercent(gp.grossMargin)}`} icon={<TrendingUp size={13} />} trend={profitTrend} onClick={() => setDrilldownModal({ open: true, type: "profit" })} />
        <CompactKPI label="هامش الربح" value={formatPercent(gp.grossMargin)} sub={`صافي: ${formatMoney(sales.netSales)}`} icon={<BarChart3 size={13} />} trend={profitTrend} />
        <CompactKPI label="الذمم المدينة" value={formatMoney(collections.pendingAmount)} sub={`متأخرة: ${formatMoney(collections.overdueAmount)}`} icon={<Banknote size={13} />} danger={collections.overdueAmount > 0} trend={{ direction: collections.overdueAmount > 0 ? "down" : "flat", text: collections.overdueAmount > 0 ? "متأخرة" : "مُسددة", positive: collections.overdueAmount === 0 }} onClick={() => navigate("/collections")} />
      </div>

      {/* ── ROW 2: OPERATIONAL ALERTS ── */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "var(--space-2)", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={13} /> يحتاج تدخلك الآن
        </div>
        <div className="alert-strip">
          {actionQueue.length === 0 ? (
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-faint)" }}>لا توجد إجراءات مطلوبة</span>
          ) : (
            actionQueue.slice(0, 6).map((item) => (
              <Link key={item.type} to={item.actionPath} className="alert-strip-item" style={{
                borderColor: item.severity === "danger" ? "var(--color-danger)" : item.severity === "warning" ? "var(--color-warning)" : "var(--color-info)",
                color: item.severity === "danger" ? "var(--color-danger)" : item.severity === "warning" ? "var(--color-warning)" : "var(--color-info)",
              }}>
                {item.severity === "danger" ? <AlertCircle size={12} /> : <AlertTriangle size={12} />}
                <span>{item.label}</span>
                <span className="asi-count">{item.count}</span>
                <ChevronLeft size={10} />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* ── ROW 3: TERRITORY + REP PERFORMANCE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
        {/* Region Table */}
        <Card title="المبيعات والتحصيل حسب المنطقة" subtitle="الأداء التفصيلي لكل منطقة">
          <div className="table-wrap" style={{ border: "none", boxShadow: "none", maxHeight: 360, overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المنطقة</th>
                  <th className="numeric">العملاء</th>
                  <th className="numeric">الزيارات</th>
                  <th className="numeric">المبيعات</th>
                  <th className="numeric">التحصيل</th>
                  <th className="numeric">التحصيل %</th>
                  <th className="numeric">الهدف</th>
                  <th className="numeric">الإنجاز %</th>
                </tr>
              </thead>
              <tbody>
                {territoryPerf.sort((a, b) => b.netContribution - a.netContribution).map((t) => (
                  <tr key={t.territoryId}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={12} style={{ color: "var(--color-text-faint)" }} />
                        <span style={{ fontWeight: 500 }}>{t.territoryName}</span>
                      </div>
                    </td>
                    <td className="numeric num">{t.customerCount}</td>
                    <td className="numeric num">{t.visitCount}</td>
                    <td className="numeric num">{formatMoney(t.salesTotal)}</td>
                    <td className="numeric num">{formatMoney(t.collectionTotal)}</td>
                    <td className="numeric num" style={{ color: t.collectionRate >= 70 ? "var(--color-success)" : "var(--color-warning)" }}>{formatPercent(t.collectionRate)}</td>
                    <td className="numeric num">{formatMoney(t.salesTarget)}</td>
                    <td className="numeric num" style={{ fontWeight: 600, color: t.targetAchievement >= 100 ? "var(--color-success)" : t.targetAchievement >= 80 ? "var(--color-warning)" : "var(--color-danger)" }}>
                      {formatPercent(t.targetAchievement)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Rep Performance Table */}
        <Card title="أداء المندوبين" subtitle="اضغط على أي صف لعرض التفاصيل">
          <div className="table-wrap" style={{ border: "none", boxShadow: "none", maxHeight: 360, overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المندوب</th>
                  <th className="numeric">المبيعات</th>
                  <th className="numeric">التحصيل</th>
                  <th className="numeric">المرتجعات</th>
                  <th className="numeric">الهامش</th>
                  <th className="numeric">التشغيل</th>
                  <th className="numeric">صافي المساهمة</th>
                  <th className="numeric">الإنجاز</th>
                  <th>التصنيف</th>
                </tr>
              </thead>
              <tbody>
                {repProfitData.sort((a, b) => b.netContribution - a.netContribution).map((rep) => {
                  const detail = getRepProfitabilityDetail(rep.repId, CURRENT_MONTH);
                  return (
                    <tr key={rep.repId} className="row-clickable" onClick={() => setRepDetailDrawer({ open: true, repId: rep.repId })}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: `hsl(${(rep.repId.charCodeAt(2) * 30) % 360}, 45%, 45%)`, color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, flexShrink: 0 }}>{rep.repName.charAt(0)}</div>
                          <span style={{ fontWeight: 500, fontSize: "var(--font-size-xs)" }}>{rep.repName}</span>
                        </div>
                      </td>
                      <td className="numeric num">{formatMoney(rep.revenue)}</td>
                      <td className="numeric num">{formatPercent(detail.collectionRate)}</td>
                      <td className="numeric num" style={{ color: "var(--color-danger)" }}>-{formatMoney(detail.returns)}</td>
                      <td className="numeric num">{formatPercent((rep.grossProfit / Math.max(detail.netSales, 1)) * 100)}</td>
                      <td className="numeric num">{formatMoney(detail.operatingCosts.total)}</td>
                      <td className="numeric num" style={{ fontWeight: 600, color: rep.netContribution >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>{formatMoney(rep.netContribution)}</td>
                      <td className="numeric num">{formatPercent(detail.targetAchievement)}</td>
                      <td><ClassificationBadge classification={rep.classification} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── ROW 4: PROFITABILITY ── */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <Card title="ربحية المندوبين" subtitle="تحليل الربحية الكامل — اضغط على المندوب للتفصيل">
          <div className="table-wrap" style={{ border: "none", boxShadow: "none", maxHeight: 400, overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المندوب</th>
                  <th className="numeric">المبيعات</th>
                  <th className="numeric">تكلفة البضاعة</th>
                  <th className="numeric">الخصومات</th>
                  <th className="numeric">المرتجعات</th>
                  <th className="numeric">العمولة</th>
                  <th className="numeric">التشغيل</th>
                  <th className="numeric">الربح الإجمالي</th>
                  <th className="numeric">صافي المساهمة</th>
                  <th className="numeric">هامش الربح</th>
                  <th>الحكم</th>
                </tr>
              </thead>
              <tbody>
                {repProfitData.sort((a, b) => b.netContribution - a.netContribution).map((rep) => {
                  const detail = getRepProfitabilityDetail(rep.repId, CURRENT_MONTH);
                  return (
                    <tr key={rep.repId} className="row-clickable" onClick={() => setRepDetailDrawer({ open: true, repId: rep.repId })}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: `hsl(${(rep.repId.charCodeAt(2) * 30) % 360}, 45%, 45%)`, color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, flexShrink: 0 }}>{rep.repName.charAt(0)}</div>
                          <span style={{ fontWeight: 500, fontSize: "var(--font-size-xs)" }}>{rep.repName}</span>
                        </div>
                      </td>
                      <td className="numeric num">{formatMoney(rep.revenue)}</td>
                      <td className="numeric num" style={{ color: "var(--color-danger)" }}>{formatMoney(detail.cogs)}</td>
                      <td className="numeric num" style={{ color: "var(--color-danger)" }}>-{formatMoney(detail.discounts)}</td>
                      <td className="numeric num" style={{ color: "var(--color-danger)" }}>-{formatMoney(detail.returns)}</td>
                      <td className="numeric num">{formatMoney(rep.commission)}</td>
                      <td className="numeric num">{formatMoney(detail.operatingCosts.total)}</td>
                      <td className="numeric num" style={{ color: "var(--color-success)" }}>{formatMoney(rep.grossProfit)}</td>
                      <td className="numeric num" style={{ fontWeight: 700, color: rep.netContribution >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>{formatMoney(rep.netContribution)}</td>
                      <td className="numeric num">{formatPercent(detail.netContributionMargin)}</td>
                      <td>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--font-size-xxs)",
                          padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                          background: rep.netContribution > 5000 ? "rgba(34,197,94,0.1)" : rep.netContribution > 0 ? "rgba(47,111,168,0.1)" : "rgba(239,68,68,0.1)",
                          color: rep.netContribution > 5000 ? "var(--color-success)" : rep.netContribution > 0 ? "var(--color-info)" : "var(--color-danger)",
                        }}>
                          {rep.netContribution > 0 ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          {rep.netContribution > 5000 ? "مربح ممتاز" : rep.netContribution > 0 ? "مربح" : "غير مربح"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── FOOTER SUMMARY ── */}
      <div style={{ display: "flex", gap: "var(--space-4)", padding: "var(--space-3) 0", borderTop: "1px solid var(--color-divider)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
        <span>إجمالي المبيعات: <b className="num">{formatMoney(sales.grossSales)}</b></span>
        <span>·</span>
        <span>التحصيل: <b className="num">{formatMoney(collections.totalCollected)}</b></span>
        <span>·</span>
        <span>الربح: <b className="num" style={{ color: "var(--color-success)" }}>{formatMoney(gp.grossProfit)}</b></span>
        <span>·</span>
        <span>عدد المندوبين: <b className="num">{repProfitData.length}</b></span>
      </div>

      {/* ── Drilldown Modal ── */}
      <DrilldownModal open={drilldownModal.open} onClose={() => setDrilldownModal({ open: false, type: "sales" })} type={drilldownModal.type} filters={filters} />

      {/* ── Rep Detail Drawer ── */}
      {repDetailDrawer.open && repDetail && (
        <RepDetailDrawer open={repDetailDrawer.open} onClose={() => setRepDetailDrawer({ open: false, repId: "" })} detail={repDetail} waterfall={waterfall} />
      )}
    </div>
  );
}

function DrilldownModal({ open, onClose, type, filters }: { open: boolean; onClose: () => void; type: "sales" | "collections" | "netsales" | "cogs" | "profit"; filters: DashboardFilters }) {
  const sales = useMemo(() => getSalesSummary(filters), [filters]);
  const collectionsData = useMemo(() => getCollectionsSummary(filters), [filters]);
  const cogs = useMemo(() => getCOGS(filters), [filters]);
  const gp = useMemo(() => getGrossProfit(filters), [filters]);

  const titles: Record<string, string> = { sales: "تفاصيل المبيعات", collections: "تفاصيل التحصيل", netsales: "تفاصيل صافي المبيعات", cogs: "تفاصيل تكلفة البضاعة", profit: "تفاصيل الربح" };

  return (
    <Modal open={open} onClose={onClose} title={titles[type]} size="fullscreen">
      <div style={{ maxHeight: 500, overflow: "auto" }}>
        {type === "sales" && (
          <table className="data-table">
            <thead><tr><th>الفاتورة</th><th>العميل</th><th>المندوب</th><th className="numeric">الإجمالي</th><th className="numeric">الخصم</th><th className="numeric">صافي البيع</th><th>الحالة</th><th>طريقة الدفع</th></tr></thead>
            <tbody>
              {allInvoices.filter((i) => i.status === "completed").sort((a, b) => b.date.localeCompare(a.date)).map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)" }}>{inv.invoiceNumber}</td>
                  <td>{customers.find((c) => c.id === inv.customerId)?.name ?? "—"}</td>
                  <td>{users.find((u) => u.id === inv.repId)?.name ?? "—"}</td>
                  <td className="numeric num">{formatMoney(inv.total)}</td>
                  <td className="numeric num">{formatMoney(inv.discount)}</td>
                  <td className="numeric num">{formatMoney(inv.net)}</td>
                  <td><Badge tone="success" dot>مكتملة</Badge></td>
                  <td>{inv.type === "cash" ? "نقداً" : "آجل"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {type === "collections" && (
          <table className="data-table">
            <thead><tr><th>الرقم</th><th>العميل</th><th>المندوب</th><th className="numeric">المبلغ</th><th>طريقة الدفع</th><th>التاريخ</th><th>الحالة</th></tr></thead>
            <tbody>
              {allCollections.filter((c) => c.status === "approved").sort((a, b) => b.date.localeCompare(a.date)).map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)" }}>{c.number}</td>
                  <td>{customers.find((cu) => cu.id === c.customerId)?.name ?? "—"}</td>
                  <td>{users.find((u) => u.id === c.repId)?.name ?? "—"}</td>
                  <td className="numeric num">{formatMoney(c.amount)}</td>
                  <td>{c.method === "cash" ? "نقداً" : c.method === "transfer" ? "تحويل" : c.method === "pos" ? "بطاقة" : "شيك"}</td>
                  <td>{c.date}</td>
                  <td><Badge tone={c.status === "approved" ? "success" : "warning"} dot>{c.status === "approved" ? "معتمد" : "معلق"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {type === "netsales" && (
          <div style={{ padding: "var(--space-3)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="flex-between"><span>إجمالي المبيعات:</span><span className="num">{formatMoney(sales.grossSales)}</span></div>
              <div className="flex-between"><span>الخصومات:</span><span className="num" style={{ color: "var(--color-danger)" }}>-{formatMoney(sales.discountTotal)}</span></div>
              <div className="flex-between"><span>المرتجعات (معتمدة):</span><span className="num" style={{ color: "var(--color-danger)" }}>-{formatMoney(sales.returnsTotal)}</span></div>
              <hr style={{ border: "none", borderTop: "1px solid var(--color-divider)" }} />
              <div className="flex-between"><span style={{ fontWeight: 600 }}>صافي المبيعات:</span><span className="num" style={{ fontWeight: 700, fontSize: "var(--font-size-lg)" }}>{formatMoney(sales.netSales)}</span></div>
            </div>
          </div>
        )}
        {type === "cogs" && (
          <div style={{ padding: "var(--space-3)" }}>
            <div className="grid-3">
              <div><div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>إجمالي التكلفة</div><div className="num" style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>{formatMoney(cogs.totalCOGS)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الوحدات المباعة</div><div className="num" style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>{formatNumber(cogs.totalUnitsSold)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>متوسط التكلفة</div><div className="num" style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>{formatMoney(cogs.averageUnitCost)}</div></div>
            </div>
          </div>
        )}
        {type === "profit" && (
          <div style={{ padding: "var(--space-3)" }}>
            <div className="grid-3" style={{ marginBottom: "var(--space-3)" }}>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الربح الإجمالي</div><div className="num" style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-success)" }}>{formatMoney(gp.grossProfit)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>هامش الربح</div><div className="num" style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>{formatPercent(gp.grossMargin)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>صافي المبيعات</div><div className="num" style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>{formatMoney(sales.netSales)}</div></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="flex-between"><span>صافي المبيعات:</span><span className="num">{formatMoney(sales.netSales)}</span></div>
              <div className="flex-between"><span>تكلفة البضاعة:</span><span className="num" style={{ color: "var(--color-danger)" }}>-{formatMoney(cogs.totalCOGS)}</span></div>
              <hr style={{ border: "none", borderTop: "1px solid var(--color-divider)" }} />
              <div className="flex-between"><span style={{ fontWeight: 600 }}>الربح الإجمالي:</span><span className="num" style={{ fontWeight: 700, fontSize: "var(--font-size-lg)", color: "var(--color-success)" }}>{formatMoney(gp.grossProfit)}</span></div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function RepDetailDrawer({ open, onClose, detail, waterfall }: { open: boolean; onClose: () => void; detail: RepProfitabilityDetail; waterfall: WaterfallPoint[] }) {
  if (!open) return null;
  const isProfitable = detail.netContribution > 0;
  const isHighProfit = detail.netContribution > 5000;
  const reasons: string[] = [];
  if (detail.returns > detail.revenue * 0.05) reasons.push("المرتجعات مرتفعة نسبياً");
  if (detail.grossMargin < 15) reasons.push("هامش الربح منخفض");
  if (detail.operatingCosts.total > detail.grossProfit * 0.5) reasons.push("التكاليف التشغيلية مرتفعة مقارنة بالربح");
  if (detail.collectionRate < 80) reasons.push("نسبة التحصيل منخفضة");
  if (reasons.length === 0 && !isProfitable) reasons.push("التكاليف والعمولة تتفوق على الربح الإجمالي");

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`تفاصيل ${detail.repName}`}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>تحليل ربحية {detail.repName}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="إغلاق"><ChevronLeft size={17} /></button>
        </div>
        <div className="modal-body" style={{ overflow: "auto", flex: 1 }}>
          {/* Rep Info */}
          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-3)", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-divider)" }}>
            <div><span className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>المنطقة</span><div style={{ fontWeight: 500, fontSize: "var(--font-size-sm)" }}>{detail.territoryName ?? "—"}</div></div>
            <div><span className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>المشرف</span><div style={{ fontWeight: 500, fontSize: "var(--font-size-sm)" }}>{detail.supervisorName ?? "—"}</div></div>
            <div><span className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>الفترة</span><div style={{ fontWeight: 500, fontSize: "var(--font-size-sm)" }}>{detail.period}</div></div>
          </div>

          {/* Revenue Section */}
          <Card title="الإيرادات">
            <div className="grid-4">
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>المبيعات</div><div className="num" style={{ fontWeight: 600 }}>{formatMoney(detail.revenue)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>التحصيل</div><div className="num" style={{ fontWeight: 600 }}>{formatPercent(detail.collectionRate)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>المرتجعات</div><div className="num" style={{ fontWeight: 600, color: "var(--color-danger)" }}>-{formatMoney(detail.returns)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>الخصومات</div><div className="num" style={{ fontWeight: 600, color: "var(--color-danger)" }}>-{formatMoney(detail.discounts)}</div></div>
            </div>
          </Card>

          {/* Cost Section */}
          <div style={{ marginTop: "var(--space-3)" }}>
          <Card title="التكاليف">
            <div className="grid-3">
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>تكلفة البضاعة</div><div className="num" style={{ fontWeight: 600 }}>{formatMoney(detail.cogs)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>العمولة</div><div className="num" style={{ fontWeight: 600 }}>{formatMoney(detail.commission)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>التشغيل (رواتب/مركبة/وقود/هاتف/أخرى)</div><div className="num" style={{ fontWeight: 600 }}>{formatMoney(detail.operatingCosts.total)}</div></div>
            </div>
          </Card>
          </div>

          {/* Financial Result */}
          <div style={{ marginTop: "var(--space-3)" }}>
          <Card title="النتيجة المالية">
            <div className="grid-4">
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>الربح الإجمالي</div><div className="num" style={{ fontWeight: 700, color: "var(--color-success)" }}>{formatMoney(detail.grossProfit)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>صافي الربح</div><div className="num" style={{ fontWeight: 700 }}>{formatMoney(detail.netContribution)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>صافي مساهمة المندوب</div><div className="num" style={{ fontWeight: 700, color: isProfitable ? "var(--color-success)" : "var(--color-danger)" }}>{formatMoney(detail.netContribution)}</div></div>
              <div><div className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>هامش الربح</div><div className="num" style={{ fontWeight: 700 }}>{formatPercent(detail.netContributionMargin)}</div></div>
            </div>
          </Card>
          </div>

          {/* Verdict */}
          <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", borderRadius: 8, background: isHighProfit ? "rgba(34,197,94,0.08)" : isProfitable ? "rgba(47,111,168,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${isHighProfit ? "var(--color-success)" : isProfitable ? "var(--color-info)" : "var(--color-danger)"}20` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              {isHighProfit ? <CheckCircle size={20} style={{ color: "var(--color-success)" }} /> : isProfitable ? <CheckCircle size={20} style={{ color: "var(--color-info)" }} /> : <XCircle size={20} style={{ color: "var(--color-danger)" }} />}
              <span style={{ fontWeight: 700, fontSize: "var(--font-size-sm)" }}>{isHighProfit ? "مربح للشركة بكفاءة عالية" : isProfitable ? "مربح للشركة" : "غير مربح — يحتاج تدخل"}</span>
            </div>
            {reasons.length > 0 && (
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>الأسباب: {reasons.join(" · ")}</div>
            )}
          </div>

          {/* Waterfall Chart */}
          {waterfall.length > 0 && (
            <div style={{ marginTop: "var(--space-3)" }}>
            <Card title="مصفوفة التدفق المالي">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 180, overflowX: "auto", paddingBottom: 12 }}>
                {waterfall.map((point, idx) => {
                  const maxCum = Math.max(...waterfall.map((w) => Math.abs(w.cumulative)));
                  const h = maxCum > 0 ? (Math.abs(point.cumulative) / maxCum) * 140 : 4;
                  return (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 90, flex: 1 }}>
                      <div style={{ width: "100%", height: Math.max(4, h), background: point.type === "positive" ? "var(--color-success)" : point.type === "negative" ? "var(--color-danger)" : "var(--color-primary)", borderRadius: "3px 3px 0 0", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                        {point.value !== 0 && <span style={{ fontSize: "var(--font-size-xxs)", color: "#fff", fontWeight: 600 }}>{formatMoney(Math.abs(point.value))}</span>}
                      </div>
                      <span style={{ fontSize: "var(--font-size-xxs)", marginTop: 6, textAlign: "center" }}>{point.label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            </div>
          )}

          {/* Quick Links */}
          <div style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-3)" }}>
            <Link to={`/sales?rep=${detail.repId}`} style={{ fontSize: "var(--font-size-xs)" }}>فواتير المندوب <ChevronLeft size={10} /></Link>
            <Link to={`/collections?rep=${detail.repId}`} style={{ fontSize: "var(--font-size-xs)" }}>تحصيلات المندوب <ChevronLeft size={10} /></Link>
            <Link to={`/returns?rep=${detail.repId}`} style={{ fontSize: "var(--font-size-xs)" }}>مرتجعات المندوب <ChevronLeft size={10} /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
