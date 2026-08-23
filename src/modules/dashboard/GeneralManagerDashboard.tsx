import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart, TrendingUp, Percent, HandCoins, AlertTriangle, Users,
  Package, FileCheck2, Palmtree, RefreshCw, Banknote, BarChart3, CheckCircle, XCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { customers } from "@/mock/customers";
import { pendingApprovals } from "@/mock/approvals";
import { users, supervisors, reps } from "@/mock/users";
import { branches } from "@/mock/organization";
import { leaveRequests, auditLogs } from "@/mock/admin";
import { warehouseStock } from "@/mock/inventory";
import { monthlySeries, salesVsCollectionSeries } from "@/mock/profitability";
import { formatMoney, formatPercent, formatNumber, formatDateTime } from "@/utils/format";
import { Card, SectionBlock } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BarChart, LineChart } from "@/components/charts/Charts";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { unifiedQuickActions } from "@/config/dashboardActions";
import { getAllCustomerBalances } from "@/services/ledger";
import {
  type DashboardFilters,
  getSalesSummary,
  getCollectionsSummary,
  getGrossProfit,
  getRepProfitability,
} from "@/services/dashboard.service";
import {
  getRepProfitabilityDetail,
  type RepProfitabilityDetail,
} from "@/services/profitability.service";
import { CURRENT_MONTH } from "@/config/date";

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

export function GeneralManagerDashboard() {
  const { user } = useAuthStore();
  const me = user!;

  const [filters] = useState<DashboardFilters>({ period: "month" });
  const [selectedRep, setSelectedRep] = useState<string | null>(null);

  const balanceMap = new Map(getAllCustomerBalances().map((b) => [b.customerId, b.balance]));

  const sales = useMemo(() => getSalesSummary(filters), [filters]);
  const collections = useMemo(() => getCollectionsSummary(filters), [filters]);
  const gp = useMemo(() => getGrossProfit(filters), [filters]);
  const repProfitData = useMemo(() => getRepProfitability(filters), [filters]);

  const repDetail = useMemo(() => {
    if (!selectedRep) return null;
    return getRepProfitabilityDetail(selectedRep, CURRENT_MONTH);
  }, [selectedRep]);

  const totalDebts = customers.reduce((s, c) => s + (balanceMap.get(c.id) ?? 0), 0);
  const overdueCount = customers.filter((c) => c.status === "overdue").length;
  const lowStock = warehouseStock.filter((s) => s.available <= s.reorderLevel);
  const pending = pendingApprovals();
  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending" || l.status === "under_review");
  const activeUsers = users.filter((u) => u.status === "active").length;

  const branchSales = branches.map((b) => {
    const branchReps = users.filter((u) => u.branchId === b.id && u.role === "REPRESENTATIVE").map((u) => u.id);
    return {
      label: b.city,
      value: sales.grossSales > 0 ? Math.round((branchReps.length / Math.max(reps.length, 1)) * sales.grossSales) : 0,
    };
  });

  const lastUpdated = useMemo(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  }, []);

  const salesTrend = { direction: sales.salesGrowth >= 0 ? "up" as const : "down" as const, text: formatPercent(Math.abs(sales.salesGrowth)), positive: sales.salesGrowth >= 0 };
  const collectionTrend = { direction: (collections.collectionRate >= 70 ? "up" as const : "down" as const), text: formatPercent(collections.collectionRate), positive: collections.collectionRate >= 70 };
  const profitTrend = { direction: gp.grossMargin >= 20 ? "up" as const : ("down" as const), text: formatPercent(gp.grossMargin), positive: gp.grossMargin >= 20 };

  const returnsRate = sales.grossSales > 0 ? (sales.returnsTotal / sales.grossSales) * 100 : 0;
  const collectionRate = sales.grossSales > 0 ? (collections.totalCollected / sales.grossSales) * 100 : 0;

  return (
    <div>
      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3)" }}>
          <div>
            <h1 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, margin: 0 }}>لوحة الإدارة العليا — {me.name.split(" ")[0]}</h1>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", margin: "2px 0 0" }}>
              مؤشرات الأداء التنفيذية للشركة: المبيعات، الربحية، الفروع، والإدارة العامة
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-faint)" }}>آخر تحديث: {lastUpdated}</span>
          </div>
        </div>
      </div>

      <DashboardQuickActions actions={unifiedQuickActions} sticky />

      {/* ── KPI ROW ── */}
      <div className="kpi-compact-grid" style={{ marginBottom: "var(--space-3)" }}>
        <CompactKPI label="إجمالي المبيعات" value={formatMoney(sales.grossSales)} sub={`${sales.totalInvoices} فاتورة`} icon={<ShoppingCart size={13} />} trend={salesTrend} />
        <CompactKPI label="الربح الإجمالي" value={formatMoney(gp.grossProfit)} sub={`هامش: ${formatPercent(gp.grossMargin)}`} icon={<TrendingUp size={13} />} trend={profitTrend} />
        <CompactKPI label="هامش الربح" value={formatPercent(gp.grossMargin)} sub={`صافي: ${formatMoney(sales.netSales)}`} icon={<BarChart3 size={13} />} trend={profitTrend} />
        <CompactKPI label="التحصيل الشهري" value={formatMoney(collections.totalCollected)} sub={`${collections.collectionCount} عملية`} icon={<HandCoins size={13} />} trend={collectionTrend} />
        <CompactKPI label="الذمم المدينة" value={formatMoney(collections.pendingAmount)} sub={`${overdueCount} عميل متأخر`} icon={<Banknote size={13} />} danger={collections.overdueAmount > 0} />
        <CompactKPI label="العملاء النشطون" value={formatNumber(customers.filter((c) => c.status === "active").length)} sub={`${customers.length} عميل مسجل`} icon={<Users size={13} />} />
        <CompactKPI label="طلبات الاعتماد" value={formatNumber(pending.length)} sub="معلقة حالياً" icon={<FileCheck2 size={13} />} onClick={() => window.location.href = "/approvals"} />
        <CompactKPI label="الموظفون النشطون" value={formatNumber(activeUsers)} sub={`${supervisors.length} مشرف · ${reps.length} مندوب`} icon={<Users size={13} />} />
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid-2" style={{ marginBottom: "var(--space-3)" }}>
        <Card title="اتجاه المبيعات والربح — آخر 6 أشهر" subtitle="آلاف الريالات">
          <BarChart
            data={monthlySeries.map((m) => ({ label: m.month, value: m.revenue, secondary: m.profit }))}
            valueFormatter={(v) => `${Math.round(v / 1000)}K`}
            secondaryLabel="الربح"
            secondaryColor="var(--color-success)"
          />
        </Card>
        <Card title="المبيعات مقابل التحصيل — آخر 6 أشهر">
          <LineChart
            data={salesVsCollectionSeries.map((m) => ({ label: m.month, value: m.sales, secondary: m.collection }))}
            series={["value", "secondary"]}
            valueFormatter={(v) => `${Math.round(v / 1000)}K`}
          />
        </Card>
      </div>

      {/* ── BOTTOM: Branches + Alerts ── */}
      <div className="grid-2-1" style={{ marginBottom: "var(--space-3)" }}>
        <div className="stack">
          <Card title="أداء الفروع — مبيعات الشهر">
            <BarChart data={branchSales} valueFormatter={(v) => formatMoney(v)} />
          </Card>

          <Card title="آخر النشاط الإداري — سجل التدقيق" actions={<Link to="/settings" style={{ fontSize: "var(--font-size-sm)" }}>الإعدادات ←</Link>}>
            <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
              <table className="data-table">
                <thead>
                  <tr><th>الفاعل</th><th>العملية</th><th>الكيان</th><th>التاريخ</th></tr>
                </thead>
                <tbody>
                  {auditLogs.slice(0, 5).map((log) => (
                    <tr key={log.id}>
                      <td>{log.actor}</td>
                      <td>{log.action}</td>
                      <td className="muted">{log.entity}</td>
                      <td className="num" style={{ fontSize: "var(--font-size-xs)" }}>{formatDateTime(log.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="stack">
          <SectionBlock title="تنبيهات تحتاج قرارك">
            <div className="card-body stack-sm">
              {pendingLeaves.length > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                  <Palmtree size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: "var(--font-size-sm)" }}>
                    <b>{pendingLeaves.length} طلب إجازة بانتظار الاعتماد</b>
                    <div className="muted">موظفون بانتظار الموافقة النهائية</div>
                  </div>
                </div>
              )}
              {lowStock.length > 0 && (
                <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                  <Package size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: "var(--font-size-sm)" }}>
                    <b>{lowStock.length} منتجات تحت مستوى إعادة الطلب</b>
                    <div className="muted">{lowStock.map((s) => s.productName).slice(0, 2).join("، ")}</div>
                  </div>
                </div>
              )}
              <Link to="/inventory/warehouse" style={{ fontSize: "var(--font-size-sm)" }}>مراجعة المخزون ←</Link>
            </div>
          </SectionBlock>

          <SectionBlock title="طلبات الاعتماد الأخيرة">
            <div className="card-body stack-sm">
              {pending.slice(0, 4).map((a) => (
                <div key={a.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>{a.title}</div>
                    <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{a.requestedBy}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
              <Link to="/approvals" style={{ fontSize: "var(--font-size-sm)" }}>الانتقال إلى مركز الاعتمادات ←</Link>
            </div>
          </SectionBlock>

          <SectionBlock title="مؤشرات الأداء التشغيلية">
            <div className="card-body stack-sm">
              {[
                { label: "نسبة تحصيل الشهر", value: `${formatPercent(collectionRate)}` },
                { label: "نسبة المرتجعات", value: `${formatPercent(returnsRate)}` },
                { label: "هامش الربح", value: `${formatPercent(gp.grossMargin)}` },
                { label: "فروع نشطة", value: formatNumber(branches.length) },
              ].map((k) => (
                <div key={k.label} className="flex-between">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>{k.label}</span>
                  <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{k.value}</b>
                </div>
              ))}
            </div>
          </SectionBlock>
        </div>
      </div>

      {/* ── REP PROFITABILITY ── */}
      <Card title="ربحية المندوبين" subtitle="اضغط على المندوب لعرض التفاصيل">
        <div className="table-wrap" style={{ border: "none", boxShadow: "none", maxHeight: 360, overflowY: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المندوب</th>
                <th className="numeric">المبيعات</th>
                <th className="numeric">التحصيل</th>
                <th className="numeric">المرتجعات</th>
                <th className="numeric">الهامش</th>
                <th className="numeric">صافي المساهمة</th>
                <th className="numeric">الإنجاز</th>
                <th>التصنيف</th>
              </tr>
            </thead>
            <tbody>
              {repProfitData.sort((a, b) => b.netContribution - a.netContribution).map((rep) => {
                const detail = getRepProfitabilityDetail(rep.repId, CURRENT_MONTH);
                return (
                  <tr key={rep.repId} className="row-clickable" onClick={() => setSelectedRep(rep.repId)}>
                    <td style={{ fontWeight: 500 }}>{rep.repName}</td>
                    <td className="numeric num">{formatMoney(rep.revenue)}</td>
                    <td className="numeric num">{formatPercent(detail.collectionRate)}</td>
                    <td className="numeric num" style={{ color: "var(--color-danger)" }}>-{formatMoney(detail.returns)}</td>
                    <td className="numeric num">{formatPercent(detail.netContributionMargin)}</td>
                    <td className="numeric num" style={{ fontWeight: 600, color: rep.netContribution >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>{formatMoney(rep.netContribution)}</td>
                    <td className="numeric num">{formatPercent(detail.targetAchievement)}</td>
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

      {/* ── REP DETAIL MODAL ── */}
      {selectedRep && repDetail && (
        <RepDetailModal detail={repDetail} onClose={() => setSelectedRep(null)} />
      )}
    </div>
  );
}

function RepDetailModal({ detail, onClose }: { detail: RepProfitabilityDetail; onClose: () => void }) {
  const isProfitable = detail.netContribution > 0;
  const reasons: string[] = [];
  if (detail.returns > detail.revenue * 0.05) reasons.push("المرتجعات مرتفعة نسبياً");
  if (detail.grossMargin < 15) reasons.push("هامش الربح منخفض");
  if (detail.operatingCosts.total > detail.grossProfit * 0.5) reasons.push("التكاليف التشغيلية مرتفعة مقارنة بالربح");
  if (detail.collectionRate < 80) reasons.push("نسبة التحصيل منخفضة");
  if (reasons.length === 0 && !isProfitable) reasons.push("التكاليف والعمولة تتفوق على الربح الإجمالي");

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>تحليل ربحية {detail.repName}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>
        <div className="modal-body" style={{ overflow: "auto", flex: 1 }}>
          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
            <div><span className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>المنطقة</span><div style={{ fontWeight: 500 }}>{detail.territoryName ?? "—"}</div></div>
            <div><span className="faint" style={{ fontSize: "var(--font-size-xxs)" }}>المشرف</span><div style={{ fontWeight: 500 }}>{detail.supervisorName ?? "—"}</div></div>
          </div>

          <div className="grid-2" style={{ gap: "var(--space-3)" }}>
            <Card title="الإيرادات">
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div className="flex-between"><span>المبيعات</span><span className="num">{formatMoney(detail.revenue)}</span></div>
                <div className="flex-between"><span>التحصيل</span><span className="num">{formatPercent(detail.collectionRate)}</span></div>
                <div className="flex-between"><span>المرتجعات</span><span className="num" style={{ color: "var(--color-danger)" }}>-{formatMoney(detail.returns)}</span></div>
                <div className="flex-between"><span>الخصومات</span><span className="num" style={{ color: "var(--color-danger)" }}>-{formatMoney(detail.discounts)}</span></div>
              </div>
            </Card>
            <Card title="التكاليف">
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <div className="flex-between"><span>تكلفة البضاعة</span><span className="num">{formatMoney(detail.cogs)}</span></div>
                <div className="flex-between"><span>العمولة</span><span className="num">{formatMoney(detail.commission)}</span></div>
                <div className="flex-between"><span>التشغيل</span><span className="num">{formatMoney(detail.operatingCosts.total)}</span></div>
              </div>
            </Card>
          </div>

          <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", borderRadius: 8, background: isProfitable ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${isProfitable ? "var(--color-success)" : "var(--color-danger)"}20` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              {isProfitable ? <CheckCircle size={20} style={{ color: "var(--color-success)" }} /> : <XCircle size={20} style={{ color: "var(--color-danger)" }} />}
              <span style={{ fontWeight: 700 }}>{isProfitable ? "مربح للشركة" : "غير مربح — يحتاج تدخل"}</span>
            </div>
            {reasons.length > 0 && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>الأسباب: {reasons.join(" · ")}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
