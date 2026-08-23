import { useMemo } from "react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { BarChart, LineChart } from "@/components/charts/Charts";
import { CURRENT_MONTH } from "@/config/date";
import {
  getAllRepsProfitabilityEnhanced,
  getTeamProfitability,
  getTerritoryProfitabilityFull,
} from "@/services/profitability.service";
import { monthlySeries, salesVsCollectionSeries } from "@/mock/profitability";
import { formatMoney, formatPercent } from "@/utils/format";
import { useState } from "react";
import type { RepProfitabilityEnhanced } from "@/services/profitability.service";

export function ProfitabilityDashboard() {
  const [period, setPeriod] = useState(CURRENT_MONTH);

  const reps = useMemo(() => getAllRepsProfitabilityEnhanced(period), [period]);
  const teams = useMemo(() => getTeamProfitability(period), [period]);
  const territories = useMemo(() => getTerritoryProfitabilityFull(period), [period]);

  const kpis = useMemo(() => {
    const rev = reps.reduce((s, r) => s + r.revenue, 0);
    const cogs = reps.reduce((s, r) => s + r.cogs, 0);
    const gross = reps.reduce((s, r) => s + r.grossProfit, 0);
    const direct = reps.reduce((s, r) => s + r.operatingCosts.total + r.commission, 0);
    const contrib = reps.reduce((s, r) => s + r.netContribution, 0);
    const margin = rev > 0 ? (gross / rev) * 100 : 0;
    const avgTarget = reps.length > 0 ? reps.reduce((s, r) => s + r.targetAchievement, 0) / reps.length : 0;
    return { rev, cogs, gross, direct, contrib, margin, avgTarget };
  }, [reps]);

  const topReps = useMemo(() => [...reps].sort((a, b) => b.netContribution - a.netContribution).slice(0, 5), [reps]);
  const bottomReps = useMemo(() => [...reps].sort((a, b) => a.netContribution - b.netContribution).slice(0, 5), [reps]);

  const alerts = useMemo(() => {
    const items: Array<{ msg: string; severity: "success" | "warning" | "danger" }> = [];
    const unprofitable = reps.filter((r) => r.classification === "unprofitable" || r.classification === "review");
    if (unprofitable.length > 0) {
      items.push({ msg: `${unprofitable.length} مندوب تحت نقطة التعادل`, severity: "danger" });
    }
    const highCostTerr = territories.filter((t) => t.costPerVisit > 500);
    if (highCostTerr.length > 0) {
      items.push({ msg: `تكلفة الزيارة مرتفعة في ${highCostTerr.map((t) => t.territoryName).join("، ")}`, severity: "warning" });
    }
    const bestTeam = teams.reduce((best, t) => t.netProfit > (best?.netProfit ?? -Infinity) ? t : best, teams[0]);
    if (bestTeam && bestTeam.netProfit > 0) {
      items.push({ msg: `${bestTeam.teamName} — أفضل أداء (${formatMoney(bestTeam.netProfit)})`, severity: "success" });
    }
    return items;
  }, [reps, territories, teams]);

  const CLS: Record<string, { l: string; t: "success" | "warning" | "danger" | "neutral" }> = {
    excellent: { l: "ممتاز", t: "success" }, profitable: { l: "مربح", t: "success" },
    low_margin: { l: "هامش منخفض", t: "warning" }, review: { l: "يحتاج مراجعة", t: "warning" },
    unprofitable: { l: "غير مربح", t: "danger" },
  };

  const topCols: Column<RepProfitabilityEnhanced>[] = [
    { key: "r", header: "المندوب", render: (r) => <span style={{ fontWeight: 500 }}>{r.repName}</span> },
    { key: "rev", header: "المبيعات", numeric: true, render: (r) => <span className="num">{formatMoney(r.revenue)}</span> },
    { key: "g", header: "Gross", numeric: true, render: (r) => <span className="num" style={{ color: "var(--color-success)" }}>{formatMoney(r.grossProfit)}</span> },
    { key: "n", header: "Contribution", numeric: true, render: (r) => <span className="num" style={{ color: r.netContribution >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>{formatMoney(r.netContribution)}</span> },
    { key: "c", header: "الحالة", render: (r) => { const c = CLS[r.classification] ?? CLS.profitable; return <Badge tone={c.t}>{c.l}</Badge>; } },
  ];

  return (
    <div>
      <StickyPageHeader crumbs={[{ label: "لوحة تحكم الربحية" }]} title="لوحة تحكم الربحية" description="نظرة تحليلية شاملة على أداء الربحية">
        <FilterBar>
          <Select label="الفترة" value={period} onChange={(e) => setPeriod(e.target.value)} options={[
            { value: "2026-08", label: "أغسطس 2026" }, { value: "2026-07", label: "يوليو 2026" }, { value: "2026-06", label: "يونيو 2026" },
          ]} />
        </FilterBar>
      </StickyPageHeader>

      {/* KPIs */}
      <div className="kpi-compact-grid" style={{ marginBottom: "var(--space-4)" }}>
        <div className="kpi-compact">
          <div className="kpi-compact-label">إجمالي المبيعات</div>
          <div className="kpi-compact-value">{formatMoney(kpis.rev)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">Gross Profit</div>
          <div className="kpi-compact-value" style={{ color: "var(--color-success)" }}>{formatMoney(kpis.gross)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">Contribution</div>
          <div className="kpi-compact-value" style={{ color: kpis.contrib >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>{formatMoney(kpis.contrib)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">هامش الإجمالي</div>
          <div className="kpi-compact-value">{formatPercent(kpis.margin / 100)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">متوسط الإنجاز</div>
          <div className="kpi-compact-value">{kpis.avgTarget.toFixed(0)}%</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">عدد المناديب</div>
          <div className="kpi-compact-value">{reps.length}</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <Card title="تطور الأرباح الشهرية">
          <BarChart
            data={monthlySeries.map((m) => ({ label: m.month, value: m.revenue, secondary: m.profit }))}
            secondaryLabel="الربح" valueLabel="الإيراد"
            valueFormatter={(v) => formatMoney(v)} height={160}
          />
        </Card>
        <Card title="مبيعات vs تحصيل">
          <BarChart
            data={salesVsCollectionSeries.map((m) => ({ label: m.month, value: m.sales, secondary: m.collection }))}
            secondaryLabel="تحصيل" valueLabel="مبيعات"
            valueFormatter={(v) => formatMoney(v)} height={160}
          />
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="alert-strip" style={{ marginBottom: "var(--space-4)" }}>
          {alerts.map((a, i) => (
            <div key={i} className="alert-strip-item" style={{
              borderRight: `3px solid ${a.severity === "danger" ? "var(--color-danger)" : a.severity === "warning" ? "var(--color-warning)" : "var(--color-success)"}`,
            }}>
              <span style={{ fontSize: "var(--font-size-xxs)" }}>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top/Bottom Reps */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        <Card title="أفضل 5 مناديب (Contribution)">
          <DataTable columns={topCols} rows={topReps} rowKey={(r) => r.repId} pageSize={5} emptyTitle="لا توجد بيانات" />
        </Card>
        <Card title="أسوأ 5 مناديب (Contribution)">
          <DataTable columns={topCols} rows={bottomReps} rowKey={(r) => r.repId} pageSize={5} emptyTitle="لا توجد بيانات" />
        </Card>
      </div>

      {/* Teams Summary */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Card title="مقارنة الفرق">
          <div className="kpi-compact-grid">
          {teams.map((t) => (
            <div key={t.teamId} className="kpi-compact">
              <div className="kpi-compact-label">{t.teamName}</div>
              <div className="kpi-compact-value" style={{ fontSize: "var(--font-size-sm)", color: t.netProfit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                {formatMoney(t.netProfit)}
              </div>
              <div style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-muted)" }}>
                {t.repCount} مناديب • هامش {formatPercent(t.grossMargin / 100)}
              </div>
            </div>
          ))}
        </div>
        </Card>
      </div>
    </div>
  );
}
