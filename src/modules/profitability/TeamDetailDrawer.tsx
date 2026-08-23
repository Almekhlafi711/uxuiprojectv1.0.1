import { useMemo } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { getTeamProfitability, getTeamWaterfall } from "@/services/profitability.service";
import { BarChart } from "@/components/charts/Charts";
import { formatMoney, formatPercent } from "@/utils/format";
import { users } from "@/mock/users";
import { getRepProfitabilityEnhanced } from "@/services/profitability.service";
import type { RepProfitabilityEnhanced } from "@/services/profitability.service";

interface Props { teamId: string; period: string; onClose: () => void; }

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

export function TeamDetailDrawer({ teamId, period, onClose }: Props) {
  const all = useMemo(() => getTeamProfitability(period), [period]);
  const team = all.find((t) => t.teamId === teamId);
  const wf = useMemo(() => getTeamWaterfall(teamId, period), [teamId, period]);

  const repRows = useMemo(() => {
    if (!team) return [];
    const repIds = [...new Set(team.costBreakdown.map((e) => e.source.scope.split(":")[1]).filter(Boolean))];
    return repIds.map((id) => getRepProfitabilityEnhanced(id, period));
  }, [team, period]);

  if (!team) return null;
  const cls = CLS[team.classification] ?? CLS.profitable;

  const repCols: Column<RepProfitabilityEnhanced>[] = [
    { key: "r", header: "المندوب", render: (r) => <span style={{ fontWeight: 500 }}>{r.repName}</span> },
    { key: "rev", header: "المبيعات", numeric: true, render: (r) => <span className="num">{formatMoney(r.revenue)}</span> },
    { key: "g", header: "Gross", numeric: true, render: (r) => <span className="num" style={{ color: "var(--color-success)" }}>{formatMoney(r.grossProfit)}</span> },
    { key: "c", header: "Contribution", numeric: true, render: (r) => <span className="num" style={{ color: r.netContribution >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>{formatMoney(r.netContribution)}</span> },
  ];

  return (
    <Drawer open onClose={onClose} title={`تحليل ربحية — ${team.teamName}`} width="540px">
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            المشرف: {team.supervisorName} • {team.repCount} مناديب • {team.period}
          </div>
          <Badge tone={cls.t}>{cls.l}</Badge>
        </div>

        <Sec title="P&L الفريق">
          <Row l="إجمالي المبيعات" v={formatMoney(team.revenue)} />
          <Row l="تكلفة البضاعة" v={formatMoney(team.cogs)} c="var(--color-text-muted)" />
          <Row l="Gross Profit" v={formatMoney(team.grossProfit)} b c="var(--color-success)" />
          <Row l="هامش الإجمالي" v={formatPercent(team.grossMargin / 100)} />
          <div style={{ borderTop: "1px solid var(--color-border)", margin: "6px 0" }} />
          <Row l="تكاليف التشغيل المباشرة" v={formatMoney(team.directCosts)} c="var(--color-danger)" />
          <Row l="Contribution Profit" v={formatMoney(team.contributionProfit)} b c={team.contributionProfit >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
          <Row l="تكاليف الإشراف (مخصمة)" v={formatMoney(team.allocatedCosts)} c="var(--color-danger)" />
          <div style={{ borderTop: "1px solid var(--color-border)", margin: "6px 0" }} />
          <Row l="صافي الربحية" v={formatMoney(team.netProfit)} b c={team.netProfit >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
          <Row l="هامش صافي الربح" v={formatPercent(team.netMargin / 100)} />
          <Row l="تحقيق الهدف" v={`${team.targetAchievement.toFixed(0)}%`} />
        </Sec>

        <Sec title="تكاليف التشغيل — تفصيل">
          {team.costBreakdown.slice(0, 8).map((e) => (
            <Row key={e.id} l={e.label} v={formatMoney(e.amount)} src={e.source.formula} />
          ))}
        </Sec>

        {team.diagnosis.length > 0 && (
          <Sec title="التشخيص">
            {team.diagnosis.map((d) => {
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

        <Sec title="مناديب الفريق">
          <DataTable columns={repCols} rows={repRows} rowKey={(r) => r.repId} pageSize={5} emptyTitle="لا توجد بيانات" />
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
