import { repCostConfigs } from "@/mock/assignments";
import { commissionRuns } from "@/mock/commission";
import { territories, teams } from "@/mock/organization";
import { TODAY, CURRENT_MONTH } from "@/config/date";
import type { CostAllocationEntry, SourceDetail } from "@/types";

// ── Period Helpers ───────────────────────────────────────────────────────────

function getPeriodString(period?: string): string {
  return period ?? CURRENT_MONTH;
}

function periodStartEnd(period: string): { start: string; end: string } {
  if (period.length === 7) {
    const [year, month] = period.split("-");
    const start = `${period}-01`;
    const nextMonth = new Date(parseInt(year, 10), parseInt(month, 10), 1);
    const end = new Date(nextMonth.getTime() - 86400000);
    return { start, end: end.toISOString().slice(0, 10) };
  }
  return { start: `${period}-01-01`, end: `${period}-12-31` };
}

function getProrationFactor(period: string): number {
  const range = periodStartEnd(period);
  const rangeStartD = new Date(range.start);
  const rangeEndD = new Date(range.end);
  const todayD = new Date(TODAY);
  const effectiveEnd = todayD < rangeEndD ? todayD : rangeEndD;
  const daysInPeriod = Math.max(1, Math.round((effectiveEnd.getTime() - rangeStartD.getTime()) / 86400000) + 1);
  const totalDaysInMonth = Math.round((rangeEndD.getTime() - rangeStartD.getTime()) / 86400000) + 1;
  return daysInPeriod / totalDaysInMonth;
}

// ── Source Builders ──────────────────────────────────────────────────────────

function buildSource(opts: {
  source: string;
  formula: string;
  period: string;
  scope: string;
  calculationDetails?: string;
}): SourceDetail {
  return {
    source: opts.source,
    formula: opts.formula,
    period: opts.period,
    scope: opts.scope,
    lastUpdated: TODAY,
    calculationDetails: opts.calculationDetails,
  };
}

let entryCounter = 0;
function nextId(prefix: string): string {
  entryCounter += 1;
  return `${prefix}-${String(entryCounter).padStart(3, "0")}`;
}

// ── Rep Operating Costs ─────────────────────────────────────────────────────

const COST_LABELS: Record<string, string> = {
  salary: "الراتب الأساسي",
  vehicle: "تكلفة المركبة",
  fuel: "بدل الوقود",
  phone: "بدل الاتصالات",
  other: "مصاريف أخرى",
};

export function getRepOperatingCosts(repId: string, period?: string): CostAllocationEntry[] {
  const p = getPeriodString(period);
  const factor = getProrationFactor(p);
  const config = repCostConfigs.find(
    (c) => c.repId === repId && (!c.effectiveTo || c.effectiveTo >= TODAY)
  );
  if (!config) return [];

  const fields: Array<{ key: keyof typeof config; costType: CostAllocationEntry["costType"] }> = [
    { key: "salary", costType: "salary" },
    { key: "vehicleCost", costType: "vehicle" },
    { key: "fuelAllowance", costType: "fuel" },
    { key: "phoneAllowance", costType: "phone" },
    { key: "otherAllowance", costType: "other" },
  ];

  return fields
    .filter(({ key }) => {
      const val = config[key];
      return typeof val === "number" && val > 0;
    })
    .map(({ key, costType }) => {
      const monthly = config[key] as number;
      const prorated = monthly * factor;
      const label = COST_LABELS[costType] ?? costType;
      return {
        id: nextId("op"),
        costType,
        label,
        amount: +prorated.toFixed(2),
        source: buildSource({
          source: "repCostConfig",
          formula: `${label} (${monthly.toLocaleString("ar-SA")} ر.س/شهر × ${factor.toFixed(2)})`,
          period: p,
          scope: `rep:${repId}`,
          calculationDetails: `${monthly.toLocaleString("ar-SA")} × ${factor.toFixed(2)} = ${prorated.toFixed(2)}`,
        }),
      };
    });
}

// ── Commission Cost ─────────────────────────────────────────────────────────

export function getCommissionCost(repId: string, period?: string): CostAllocationEntry | null {
  const p = getPeriodString(period);
  const run = commissionRuns.find((cr) => cr.period === p);
  if (!run) return null;
  const line = run.lines.find((l) => l.repId === repId);
  if (!line || line.amount <= 0) return null;

  return {
    id: nextId("comm"),
    costType: "commission",
    label: "عمولة المبيعات",
    amount: +line.amount.toFixed(2),
    source: buildSource({
      source: "commissionRun",
      formula: `الأساس ${line.baseAmount.toLocaleString("ar-SA")} × ${line.rate}% = ${line.amount.toLocaleString("ar-SA")}`,
      period: p,
      scope: `rep:${repId}`,
      calculationDetails: `run:${run.id} | base:${line.baseAmount} | rate:${line.rate}% | eligible:${line.targetAchievement >= 0.8}`,
    }),
  };
}

// ── Team Supervision Cost ───────────────────────────────────────────────────

export function getTeamSupervisionCost(teamId: string, period?: string): CostAllocationEntry[] {
  const p = getPeriodString(period);
  const factor = getProrationFactor(p);
  const team = teams.find((t) => t.id === teamId);
  if (!team) return [];

  const supervisorConfig = repCostConfigs.find(
    (c) => c.repId === team.supervisorId && (!c.effectiveTo || c.effectiveTo >= TODAY)
  );
  if (!supervisorConfig) return [];

  const supervisorSalary = supervisorConfig.salary * factor;
  const overhead = 3000 * factor;

  return [
    {
      id: nextId("sup"),
      costType: "supervision",
      label: "راتب المشرف",
      amount: +supervisorSalary.toFixed(2),
      source: buildSource({
        source: "repCostConfig",
        formula: `راتب المشرف (${supervisorConfig.salary.toLocaleString("ar-SA")} ر.س/شهر × ${factor.toFixed(2)})`,
        period: p,
        scope: `team:${teamId}`,
        calculationDetails: `${supervisorConfig.salary.toLocaleString("ar-SA")} × ${factor.toFixed(2)} = ${supervisorSalary.toFixed(2)}`,
      }),
    },
    {
      id: nextId("over"),
      costType: "overhead",
      label: "مصاريف إدارية",
      amount: +overhead.toFixed(2),
      source: buildSource({
        source: "fixed_overhead",
        formula: `مصاريف إدارية ثابتة (3,000 ر.س/شهر × ${factor.toFixed(2)})`,
        period: p,
        scope: `team:${teamId}`,
        calculationDetails: `3000 × ${factor.toFixed(2)} = ${overhead.toFixed(2)}`,
      }),
    },
  ];
}

// ── Territory Overhead ──────────────────────────────────────────────────────

const TERRITORY_OVERHEAD_MONTHLY = 5000;

export function getTerritoryOverhead(territoryId: string, period?: string): CostAllocationEntry {
  const p = getPeriodString(period);
  const factor = getProrationFactor(p);
  const territory = territories.find((t) => t.id === territoryId);
  const amount = TERRITORY_OVERHEAD_MONTHLY * factor;

  return {
    id: nextId("terr"),
    costType: "overhead",
    label: "مصاريف المنطقة",
    amount: +amount.toFixed(2),
    source: buildSource({
      source: "territory_overhead",
      formula: `مصاريف منطقة ثابتة (${TERRITORY_OVERHEAD_MONTHLY.toLocaleString("ar-SA")} ر.س/شهر × ${factor.toFixed(2)})`,
      period: p,
      scope: `territory:${territoryId}`,
      calculationDetails: `${TERRITORY_OVERHEAD_MONTHLY} × ${factor.toFixed(2)} = ${amount.toFixed(2)}`,
    }),
  };
}

// ── Aggregate Helpers ───────────────────────────────────────────────────────

export function getTotalDirectCost(repId: string, period?: string): number {
  const opCosts = getRepOperatingCosts(repId, period);
  const commCost = getCommissionCost(repId, period);
  const total = opCosts.reduce((s, e) => s + e.amount, 0) + (commCost?.amount ?? 0);
  return +total.toFixed(2);
}

export function getTotalTeamDirectCost(teamId: string, period?: string): number {
  const team = teams.find((t) => t.id === teamId);
  if (!team) return 0;
  let total = 0;
  for (const repId of team.repIds) {
    total += getTotalDirectCost(repId, period);
  }
  const supCosts = getTeamSupervisionCost(teamId, period);
  total += supCosts.reduce((s, e) => s + e.amount, 0);
  return +total.toFixed(2);
}

export function getTotalTerritoryDirectCost(territoryId: string, period?: string): number {
  const territory = territories.find((t) => t.id === territoryId);
  if (!territory) return 0;
  let total = 0;
  for (const repId of territory.repIds) {
    total += getTotalDirectCost(repId, period);
  }
  total += getTerritoryOverhead(territoryId, period).amount;
  return +total.toFixed(2);
}
