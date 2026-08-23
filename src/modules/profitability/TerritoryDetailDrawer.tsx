import { useMemo } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { getTerritoryProfitabilityFull, getTerritoryWaterfall, getTeamProfitability } from "@/services/profitability.service";
import { BarChart } from "@/components/charts/Charts";
import { formatMoney, formatPercent } from "@/utils/format";
import type { TeamProfitability } from "@/types";

interface Props { territoryId: string; period: string; onClose: () => void; }

const CLS: Record<string, { l: string; t: "success" | "warning" | "danger" | "neutral" }> = {
  excellent: { l: "ممتاز", t: "success" }, profitable: { l: "مربح", t: "success" },
  low_margin: { l: "هامش منخفض", t: "warning" }, review: { l: "يحتاج مراجعة", t: "warning" },
  unprofitable: { l: "غير مربح", t: "danger" },
};
const SEV: Record<string, { bg: string; b: string; c: string }> = {
  success: { bg: "#e6f9e6", b: "#22c55e", c: "#22c55e" },
  warning: { bg: "#fff8e1", b: "#f59e0b", c: "#f59e0b" },
  danger: { bg: "#fee2e2", b: "#ef4444", c: "#ef4444" },
};

export function TerritoryDetailDrawer({ territoryId, period, onClose }: Props) {
  const all = useMemo(() => getTerritoryProfitabilityFull(period), [period]);
  const terr = all.find((t) => t.territoryId === territoryId);
  const wf = useMemo(() => getTerritoryWaterfall(territoryId, period), [territoryId, period]);
  const teamsData = useMemo(() => getTeamProfitability(period), [period]);
  const terrTeams = useMemo(() => {
    if (!terr) return [];
    return teamsData.filter((tm) => {
      const teamTerrIds = tm.costBreakdown.some((e) => e.source.scope.includes(`territory:${territoryId}`));
      return teamTerrIds;
    });
  }, [terr, teamsData, territoryId]);

  if (!terr) return null;
  const cls = CLS[terr.classification] ?? CLS.profitable;

  const teamCols: Column<TeamProfitability>[] = [
    { key: "t", header: "الفريق", render: (r) => <span style={{ fontWeight: 500 }}>{r.teamName}</span> },
    { key: "rep", header: "المناديب", numeric: true, render: (r) => <span className="num">{r.repCount}</span> },
    { key: "rev", header: "المبيعات", numeric: true, render: (r) => <span className="num">{formatMoney(r.revenue)}</span> },
    { key: "g", header: "Gross", numeric: true, render: (r) => <span className="num" style={{ color: "var(--color-success)" }}>{formatMoney(r.grossProfit)}</span> },
    { key: "n", header: "صافي الربح", numeric: true, render: (r) => <span className="num" style={{ color: r.netProfit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>{formatMoney(r.netProfit)}</span> },
  ];

  return (
    <Drawer open onClose={onClose} title={`تحليل ربحية — ${terr.territoryName}`} width="540px">
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            {terr.branchName} • {terr.teamCount} فرق • {terr.repCount} مناديب • {terr.period}
          </div>
          <Badge tone={cls.t}>{cls.l}</Badge>
        </div>

        <Sec title="P&L المنطقة">
          <Row l="إجمالي المبيعات" v={formatMoney(terr.revenue)} />
          <Row l="تكلفة البضاعة" v={formatMoney(terr.cogs)} c="var(--color-text-muted)" />
          <Row l="Gross Profit" v={formatMoney(terr.grossProfit)} b c="var(--color-success)" />
          <Row l="هامش الإجمالي" v={formatPercent(terr.grossMargin / 100)} />
          <div style={{ borderTop: "1px solid var(--color-border)", margin: "6px 0" }} />
          <Row l="تكاليف التشغيل المباشرة" v={formatMoney(terr.directCosts)} c="var(--color-danger)" />
          <Row l="Contribution Profit" v={formatMoney(terr.contributionProfit)} b c={terr.contributionProfit >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
          <Row l="مصاريف المنطقة (مخصمة)" v={formatMoney(terr.allocatedCosts)} c="var(--color-danger)" />
          <div style={{ borderTop: "1px solid var(--color-border)", margin: "6px 0" }} />
          <Row l="صافي الربحية" v={formatMoney(terr.netProfit)} b c={terr.netProfit >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
          <Row l="هامش صافي الربح" v={formatPercent(terr.netMargin / 100)} />
          <Row l="تحقيق الهدف" v={`${terr.targetAchievement.toFixed(0)}%`} />
        </Sec>

        <Sec title="مؤشرات التغطية">
          <Row l="عدد العملاء" v={`${terr.customerCount}`} />
          <Row l="تغطية العملاء" v={`${terr.customerCoverage.toFixed(0)}%`} />
          <Row l="تكلفة/زيارة" v={formatMoney(terr.costPerVisit)} />
          <Row l="تكلفة/عميل" v={formatMoney(terr.costPerCustomer)} />
          <Row l="إيراد/عميل" v={formatMoney(terr.revenuePerCustomer)} />
          <Row l="ربح/عميل" v={formatMoney(terr.profitPerCustomer)} />
        </Sec>

        <Sec title="تكاليف التشغيل — تفصيل">
          {terr.costBreakdown.slice(0, 8).map((e) => (
            <Row key={e.id} l={e.label} v={formatMoney(e.amount)} src={e.source.formula} />
          ))}
        </Sec>

        {terr.diagnosis.length > 0 && (
          <Sec title="التشخيص">
            {terr.diagnosis.map((d) => {
              const s = SEV[d.severity] ?? SEV.warning;
              return (
                <div key={d.id} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${s.b}`, backgroundColor: s.bg, marginBottom: 4 }}>
                  <div style={{ fontSize: "var(--font-size-xxs)", fontWeight: 500, color: s.c }}>{d.message}</div>
                  {d.recommendation && <div style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-muted)", marginTop: 2 }}>{d.recommendation}</div>}
                </div>
              );
            })}
          </Sec>
        )}

        <Sec title="فرق المنطقة">
          <DataTable columns={teamCols} rows={terrTeams.length > 0 ? terrTeams : teamsData.slice(0, 3)} rowKey={(r) => r.teamId} pageSize={5} emptyTitle="لا توجد فرق" />
        </Sec>

        {wf.length > 0 && (
          <Sec title="شريحة الربحية">
            <BarChart data={wf.map((w) => ({ label: w.label, value: w.value, secondary: 0 }))} valueLabel="المبلغ" valueFormatter={(v) => formatMoney(v)} height={160} />
          </Sec>
        )}
      </div>
    </Drawer>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div>
    <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid var(--color-border)" }}>{title}</div>
    {children}
  </div>;
}

function Row({ l, v, b, c, src }: { l: string; v: string; b?: boolean; c?: string; src?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{l}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {src && <span title={src} style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-primary)", cursor: "help", textDecoration: "underline dotted" }}>[المصدر]</span>}
        <span className="num" style={{ fontSize: "var(--font-size-xs)", fontWeight: b ? 600 : 400, color: c ?? "var(--color-text)" }}>{v}</span>
      </div>
    </div>
  );
}
