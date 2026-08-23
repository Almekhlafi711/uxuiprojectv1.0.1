import { profitabilityRecords } from "@/mock/profitability";
import { commissionRuns, commissionPolicies } from "@/mock/commission";
import { repCostConfigs } from "@/mock/assignments";
import { targets } from "@/mock/targets";
import { invoices } from "@/mock/sales";
import { collections } from "@/mock/collections";
import { returns } from "@/mock/returns";
import { visits } from "@/mock/visits";
import { users } from "@/mock/users";
import { territories, teams, branches } from "@/mock/organization";
import { customers as allCustomers } from "@/mock/customers";
import { TODAY, CURRENT_MONTH } from "@/config/date";
import {
  getRepOperatingCosts,
  getCommissionCost,
  getTeamSupervisionCost,
  getTerritoryOverhead,
  getTotalDirectCost,
  getTotalTeamDirectCost,
} from "./costAllocation.service";
import type {
  ProfitabilityRecord,
  RepCostConfig,
  Target,
  TeamProfitability,
  TerritoryProfitabilityFull,
  DiagnosisItem,
  CostAllocationEntry,
  SourceDetail,
} from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface RepProfitabilityDetail {
  repId: string;
  repName: string;
  territoryId?: string;
  territoryName?: string;
  supervisorId?: string;
  supervisorName?: string;
  period: string;
  // Revenue
  revenue: number;
  discounts: number;
  returns: number;
  netSales: number;
  // COGS
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  // Operating
  commission: number;
  bonus: number;
  operatingCosts: {
    salary: number;
    vehicle: number;
    fuel: number;
    phone: number;
    other: number;
    total: number;
  };
  // Net
  netContribution: number;
  netContributionMargin: number;
  // Efficiency
  costToServe: number;
  revenuePerVisit: number;
  revenuePerCustomer: number;
  averageInvoice: number;
  collectionRate: number;
  // Target
  targetSales: number;
  targetAchievement: number;
  // Classification
  classification: "excellent" | "profitable" | "low_margin" | "review" | "unprofitable";
}

export interface ClassificationThresholds {
  excellent: number;
  profitable: number;
  low_margin: number;
  review: number;
}

export interface WaterfallPoint {
  label: string;
  value: number;
  cumulative: number;
  type: "positive" | "negative" | "total";
}

// ── Classification ───────────────────────────────────────────────────────────

export function getClassificationThresholds(): ClassificationThresholds {
  return {
    excellent: 5000,
    profitable: 0,
    low_margin: -1000,
    review: -3000,
  };
}

export function classifyRep(
  netContribution: number,
  thresholds?: ClassificationThresholds
): RepProfitabilityDetail["classification"] {
  const t = thresholds ?? getClassificationThresholds();
  if (netContribution > t.excellent) return "excellent";
  if (netContribution > t.profitable) return "profitable";
  if (netContribution > t.low_margin) return "low_margin";
  if (netContribution > t.review) return "review";
  return "unprofitable";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodString(period?: string): string {
  if (period) return period;
  return CURRENT_MONTH;
}

function periodStartEnd(period: string): { start: string; end: string } {
  if (period.includes("-Q")) {
    const [year, q] = period.split("-Q");
    const qNum = parseInt(q, 10);
    const startMonth = (qNum - 1) * 3;
    const start = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
    const endMonth = startMonth + 3;
    const end = `${year}-${String(endMonth).padStart(2, "0")}-01`;
    const endDate = new Date(new Date(end).getTime() - 86400000);
    return { start, end: endDate.toISOString().slice(0, 10) };
  }
  if (period.length === 7) {
    const [year, month] = period.split("-");
    const start = `${period}-01`;
    const nextMonth = new Date(parseInt(year, 10), parseInt(month, 10), 1);
    const end = new Date(nextMonth.getTime() - 86400000);
    return { start, end: end.toISOString().slice(0, 10) };
  }
  return { start: `${period}-01-01`, end: `${period}-12-31` };
}

function dateInRange(dateStr: string, range: { start: string; end: string }): boolean {
  return dateStr >= range.start && dateStr <= range.end;
}

// ── Rep Profitability Detail ─────────────────────────────────────────────────

export function getRepProfitabilityDetail(repId: string, period?: string): RepProfitabilityDetail {
  const p = getPeriodString(period);
  const range = periodStartEnd(p);
  const rep = users.find((u) => u.id === repId);
  const territory = territories.find((t) => t.repIds.includes(repId));
  const supervisor = rep?.supervisorId ? users.find((u) => u.id === rep.supervisorId) : undefined;

  // Revenue from profitability records
  const record = profitabilityRecords.find((r) => r.repId === repId && r.period === p);
  const revenue = record?.revenue ?? 0;
  const discounts = record?.discountsAmount ?? 0;
  const returnsAmt = record?.returnsAmount ?? 0;
  const netSales = revenue - discounts - returnsAmt;

  // COGS
  const cogs = record?.cost ?? 0;
  const grossProfit = record?.grossProfit ?? netSales - cogs;
  const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  // Commission
  const commissionRun = commissionRuns.find((cr) => cr.period === p);
  const commissionLine = commissionRun?.lines.find((l) => l.repId === repId);
  const commission = commissionLine?.amount ?? 0;

  // Bonus
  const bonusRun = commissionRuns.find((cr) => cr.period === p && cr.status === "approved");
  const bonus = 0;

  // Operating Costs
  const costConfig = repCostConfigs.find((c) => c.repId === repId && (!c.effectiveTo || c.effectiveTo >= TODAY));
  const salary = costConfig?.salary ?? 0;
  const vehicle = costConfig?.vehicleCost ?? 0;
  const fuel = costConfig?.fuelAllowance ?? 0;
  const phone = costConfig?.phoneAllowance ?? 0;
  const other = costConfig?.otherAllowance ?? 0;
  const totalOpCost = salary + vehicle + fuel + phone + other;

  // Prorate for partial month
  const { start: rangeStart, end: rangeEnd } = range;
  const rangeStartD = new Date(rangeStart);
  const rangeEndD = new Date(rangeEnd);
  const todayD = new Date(TODAY);
  const effectiveEnd = todayD < rangeEndD ? todayD : rangeEndD;
  const daysInPeriod = Math.max(1, Math.round((effectiveEnd.getTime() - rangeStartD.getTime()) / 86400000) + 1);
  const totalDaysInMonth = Math.round((rangeEndD.getTime() - rangeStartD.getTime()) / 86400000) + 1;
  const prorate = daysInPeriod / totalDaysInMonth;
  const proratedOpCost = totalOpCost * prorate;

  const netContribution = grossProfit - commission - proratedOpCost;
  const netContributionMargin = netSales > 0 ? (netContribution / netSales) * 100 : 0;

  // Efficiency
  const costToServe = proratedOpCost;
  const repVisits = visits.filter((v) => v.repId === repId && dateInRange(v.date, range));
  const revenuePerVisit = repVisits.length > 0 ? revenue / repVisits.length : 0;
  const repCustomers = allCustomers.filter((c) => c.repId === repId && c.status === "active");
  const revenuePerCustomer = repCustomers.length > 0 ? revenue / repCustomers.length : 0;

  const repInvoices = invoices.filter(
    (i) => i.repId === repId && i.status === "completed" && dateInRange(i.date, range)
  );
  const averageInvoice = repInvoices.length > 0 ? revenue / repInvoices.length : 0;

  const creditInvoices = repInvoices.filter((i) => i.type === "credit");
  const creditTotal = creditInvoices.reduce((s, i) => s + i.total, 0);
  const collectedAmount = collections
    .filter((c) => c.repId === repId && c.status === "approved" && dateInRange(c.date, range))
    .reduce((s, c) => s + c.amount, 0);
  const collectionRate = creditTotal > 0 ? (collectedAmount / creditTotal) * 100 : 100;

  // Target
  const target = targets.find(
    (t) => t.ownerId === repId && t.ownerType === "rep" && t.period === "monthly" && t.startDate <= rangeEnd && t.endDate >= rangeStart
  );
  const targetSales = target?.salesAmount ?? 0;
  const targetAchievement = targetSales > 0 ? (netSales / targetSales) * 100 : 0;

  const classification = classifyRep(netContribution);

  return {
    repId,
    repName: rep?.name ?? repId,
    territoryId: rep?.territoryId,
    territoryName: territory?.name,
    supervisorId: rep?.supervisorId,
    supervisorName: supervisor?.name,
    period: p,
    revenue,
    discounts,
    returns: returnsAmt,
    netSales: +netSales.toFixed(2),
    cogs,
    grossProfit: +grossProfit.toFixed(2),
    grossMargin: +grossMargin.toFixed(1),
    commission,
    bonus,
    operatingCosts: {
      salary,
      vehicle,
      fuel,
      phone,
      other,
      total: +proratedOpCost.toFixed(2),
    },
    netContribution: +netContribution.toFixed(2),
    netContributionMargin: +netContributionMargin.toFixed(1),
    costToServe: +costToServe.toFixed(2),
    revenuePerVisit: +revenuePerVisit.toFixed(2),
    revenuePerCustomer: +revenuePerCustomer.toFixed(2),
    averageInvoice: +averageInvoice.toFixed(2),
    collectionRate: +collectionRate.toFixed(1),
    targetSales,
    targetAchievement: +targetAchievement.toFixed(1),
    classification,
  };
}

// ── All Reps Profitability ───────────────────────────────────────────────────

export function getAllRepsProfitability(period?: string): RepProfitabilityDetail[] {
  const activeReps = users.filter((u) => u.role === "REPRESENTATIVE");
  return activeReps.map((rep) => getRepProfitabilityDetail(rep.id, period));
}

// ── Waterfall ────────────────────────────────────────────────────────────────

export function getProfitabilityWaterfall(repId: string, period?: string): WaterfallPoint[] {
  const detail = getRepProfitabilityDetail(repId, period);
  const points: WaterfallPoint[] = [];
  let cumulative = 0;

  function addPoint(label: string, value: number, type: "positive" | "negative" | "total") {
    cumulative += value;
    points.push({
      label,
      value,
      cumulative: +cumulative.toFixed(2),
      type,
    });
  }

  addPoint("إجمالي المبيعات", detail.revenue, "total");
  addPoint("الخصومات", -detail.discounts, "negative");
  addPoint("المرتجعات", -detail.returns, "negative");
  addPoint("صافي المبيعات", detail.netSales, "total");
  addPoint("تكلفة البضاعة", -detail.cogs, "negative");
  addPoint("الربح الإجمالي", detail.grossProfit, "total");
  addPoint("العمولة", -detail.commission, "negative");
  addPoint("تكاليف التشغيل", -detail.operatingCosts.total, "negative");
  addPoint("صافي المساهمة", detail.netContribution, "total");

  return points;
}

// ── Profitability by Territory ───────────────────────────────────────────────

export interface TerritoryProfitability {
  territoryId: string;
  territoryName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  margin: number;
  operatingCost: number;
  netContribution: number;
  repCount: number;
}

export function getProfitabilityByTerritory(period?: string): TerritoryProfitability[] {
  const p = getPeriodString(period);

  return territories.map((t) => {
    const repRecords = profitabilityRecords.filter(
      (r) => r.territoryId === t.id && r.period === p
    );

    const revenue = repRecords.reduce((s, r) => s + r.revenue, 0);
    const cogs = repRecords.reduce((s, r) => s + r.cost, 0);
    const grossProfit = repRecords.reduce((s, r) => s + r.grossProfit, 0);
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const range = periodStartEnd(p);
    const daysInRange = Math.max(1, Math.round((new Date(range.end).getTime() - new Date(range.start).getTime()) / 86400000) + 1);
    const todayD = new Date(TODAY);
    const effectiveEnd = todayD < new Date(range.end) ? todayD : new Date(range.end);
    const days = Math.max(1, Math.round((effectiveEnd.getTime() - new Date(range.start).getTime()) / 86400000) + 1);

    let operatingCost = 0;
    for (const repId of t.repIds) {
      const costConfig = repCostConfigs.find((c) => c.repId === repId && (!c.effectiveTo || c.effectiveTo >= TODAY));
      if (costConfig) {
        const monthly = costConfig.salary + costConfig.vehicleCost + costConfig.fuelAllowance + costConfig.phoneAllowance + costConfig.otherAllowance;
        operatingCost += (monthly / 30) * days;
      }
    }

    const netContribution = grossProfit - operatingCost;

    return {
      territoryId: t.id,
      territoryName: t.name,
      revenue,
      cogs,
      grossProfit: +grossProfit.toFixed(2),
      margin: +margin.toFixed(1),
      operatingCost: +operatingCost.toFixed(2),
      netContribution: +netContribution.toFixed(2),
      repCount: t.repIds.length,
    };
  });
}

// ── Profitability by Supervisor ──────────────────────────────────────────────

export interface SupervisorProfitability {
  supervisorId: string;
  supervisorName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  margin: number;
  operatingCost: number;
  netContribution: number;
  repCount: number;
  territories: string[];
}

export function getProfitabilityBySupervisor(period?: string): SupervisorProfitability[] {
  const p = getPeriodString(period);
  const supervisorUsers = users.filter((u) => u.role === "SUPERVISOR" && u.status === "active");

  return supervisorUsers.map((sup) => {
    const supTerritories = territories.filter((t) => t.supervisorId === sup.id);
    const repIds = supTerritories.flatMap((t) => t.repIds);
    const uniqueRepIds = [...new Set(repIds)];

    const repRecords = profitabilityRecords.filter(
      (r) => r.supervisorId === sup.id && r.period === p
    );

    const revenue = repRecords.reduce((s, r) => s + r.revenue, 0);
    const cogs = repRecords.reduce((s, r) => s + r.cost, 0);
    const grossProfit = repRecords.reduce((s, r) => s + r.grossProfit, 0);
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const range = periodStartEnd(p);
    const todayD = new Date(TODAY);
    const effectiveEnd = todayD < new Date(range.end) ? todayD : new Date(range.end);
    const days = Math.max(1, Math.round((effectiveEnd.getTime() - new Date(range.start).getTime()) / 86400000) + 1);

    let operatingCost = 0;
    for (const repId of uniqueRepIds) {
      const costConfig = repCostConfigs.find((c) => c.repId === repId && (!c.effectiveTo || c.effectiveTo >= TODAY));
      if (costConfig) {
        const monthly = costConfig.salary + costConfig.vehicleCost + costConfig.fuelAllowance + costConfig.phoneAllowance + costConfig.otherAllowance;
        operatingCost += (monthly / 30) * days;
      }
    }

    const netContribution = grossProfit - operatingCost;

    return {
      supervisorId: sup.id,
      supervisorName: sup.name,
      revenue,
      cogs,
      grossProfit: +grossProfit.toFixed(2),
      margin: +margin.toFixed(1),
      operatingCost: +operatingCost.toFixed(2),
      netContribution: +netContribution.toFixed(2),
      repCount: uniqueRepIds.length,
      territories: supTerritories.map((t) => t.name),
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Enhanced Functions — Profitability Analysis Module ──────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── Diagnosis ───────────────────────────────────────────────────────────────

export function getProfitabilityDiagnosis(repId: string, period?: string): DiagnosisItem[] {
  const detail = getRepProfitabilityDetail(repId, period);
  const p = getPeriodString(period);
  const items: DiagnosisItem[] = [];

  function add(severity: DiagnosisItem["severity"], category: DiagnosisItem["category"], message: string, recommendation?: string) {
    items.push({
      id: `diag-${items.length + 1}`,
      severity,
      category,
      message,
      recommendation,
      source: {
        source: "diagnosis_engine",
        formula: `threshold check on ${category}`,
        period: p,
        scope: `rep:${repId}`,
        lastUpdated: TODAY,
      },
    });
  }

  if (detail.netContribution > 5000) {
    add("success", "cost", "المندوب مربح جداً — صافي المساهمة مرتفع");
  } else if (detail.netContribution > 0) {
    add("success", "cost", "المندوب مربح — صافي المساهمة إيجابي");
  } else if (detail.netContribution > -3000) {
    add("warning", "cost", "المندوب هامشيه منخفض", "راجع تكاليف التشغيل وزيادة المبيعات");
  } else {
    add("danger", "cost", "المندوب غير مربح — صافي سلبي", "يجب مراجعة الأداء أو تقليل التكاليف");
  }

  if (detail.targetAchievement >= 100) {
    add("success", "revenue", `تحقيق الهدف: ${detail.targetAchievement.toFixed(0)}%`);
  } else if (detail.targetAchievement >= 80) {
    add("warning", "revenue", `تحقيق الهدف: ${detail.targetAchievement.toFixed(0)}% — أقل من المتوقع`, "زيادة الزيارات أو تحسين أسعار البيع");
  } else {
    add("danger", "revenue", `تحقيق الهدف ضعيف: ${detail.targetAchievement.toFixed(0)}%`, "مراجعة خطة المبيعات");
  }

  if (detail.collectionRate < 80) {
    add("danger", "collection", `نسبة التحصيل منخفضة: ${detail.collectionRate.toFixed(0)}%`, "متابعة التحصيل بجدية");
  } else if (detail.collectionRate < 95) {
    add("warning", "collection", `نسبة التحصيل: ${detail.collectionRate.toFixed(0)}%`);
  } else {
    add("success", "collection", `نسبة التحصيل ممتازة: ${detail.collectionRate.toFixed(0)}%`);
  }

  const returnsRate = detail.revenue > 0 ? (detail.returns / detail.revenue) * 100 : 0;
  if (returnsRate > 5) {
    add("danger", "efficiency", `نسبة المرتجعات مرتفعة: ${returnsRate.toFixed(1)}%`, "مراجعة جودة التوصيل");
  } else if (returnsRate > 2) {
    add("warning", "efficiency", `نسبة المرتجعات: ${returnsRate.toFixed(1)}%`);
  }

  if (detail.averageInvoice < 3000) {
    add("warning", "revenue", `متوسط الفاتورة منخفض: ${detail.averageInvoice.toLocaleString("ar-SA")} ر.س`, "زيادة حجم الفواتير");
  }

  if (detail.costToServe > detail.grossProfit * 0.6) {
    add("danger", "cost", "تكلفة الخدمة تتجاوز 60% من الربح الإجمالي", "مراجعة هيكل التكاليف");
  }

  return items;
}

// ── Enhanced Rep Profitability (with cost breakdown + diagnosis) ────────────

export interface RepProfitabilityEnhanced extends RepProfitabilityDetail {
  costBreakdown: CostAllocationEntry[];
  diagnosis: DiagnosisItem[];
}

export function getRepProfitabilityEnhanced(repId: string, period?: string): RepProfitabilityEnhanced {
  const base = getRepProfitabilityDetail(repId, period);
  const costBreakdown = [
    ...getRepOperatingCosts(repId, period),
    ...(getCommissionCost(repId, period) ? [getCommissionCost(repId, period)!] : []),
  ];
  const diagnosis = getProfitabilityDiagnosis(repId, period);

  return {
    ...base,
    costBreakdown,
    diagnosis,
  };
}

export function getAllRepsProfitabilityEnhanced(period?: string): RepProfitabilityEnhanced[] {
  const activeReps = users.filter((u) => u.role === "REPRESENTATIVE" && u.status === "active");
  return activeReps.map((rep) => getRepProfitabilityEnhanced(rep.id, period));
}

// ── Team Profitability ──────────────────────────────────────────────────────

export function getTeamProfitability(period?: string): TeamProfitability[] {
  const p = getPeriodString(period);

  return teams.map((team) => {
    const repRecords = profitabilityRecords.filter(
      (r) => r.teamId === team.id && r.period === p
    );

    const revenue = repRecords.reduce((s, r) => s + r.revenue, 0);
    const cogs = repRecords.reduce((s, r) => s + r.cost, 0);
    const grossProfit = repRecords.reduce((s, r) => s + r.grossProfit, 0);
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const directCosts = getTotalTeamDirectCost(team.id, period);
    const contributionProfit = grossProfit - directCosts;

    const supCosts = getTeamSupervisionCost(team.id, period);
    const allocatedCosts = supCosts.reduce((s: number, e: CostAllocationEntry) => s + e.amount, 0);
    const allocatedProfit = contributionProfit - allocatedCosts;
    const netProfit = allocatedProfit;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    const target = targets.find(
      (t) => t.ownerId === team.supervisorId && t.ownerType === "supervisor" && t.period === "monthly"
    );
    const targetAchievement = target && target.salesAmount > 0
      ? (revenue / target.salesAmount) * 100
      : 0;

    const classification = classifyRep(netProfit);

    const costBreakdown: CostAllocationEntry[] = [
      ...team.repIds.flatMap((repId) => getRepOperatingCosts(repId, period)),
      ...team.repIds.map((repId) => getCommissionCost(repId, period)).filter(Boolean) as CostAllocationEntry[],
      ...supCosts,
    ];

    const diagnosis = getTeamDiagnosis(team.id, p, {
      revenue,
      grossProfit,
      directCosts,
      contributionProfit,
      netProfit,
      targetAchievement,
      repCount: team.repIds.length,
    });

    return {
      teamId: team.id,
      teamName: team.name,
      supervisorId: team.supervisorId,
      supervisorName: users.find((u) => u.id === team.supervisorId)?.name ?? team.supervisorId,
      period: p,
      repCount: team.repIds.length,
      revenue,
      cogs,
      grossProfit: +grossProfit.toFixed(2),
      grossMargin: +grossMargin.toFixed(1),
      directCosts: +directCosts.toFixed(2),
      allocatedCosts: +allocatedCosts.toFixed(2),
      contributionProfit: +contributionProfit.toFixed(2),
      allocatedProfit: +allocatedProfit.toFixed(2),
      netProfit: +netProfit.toFixed(2),
      netMargin: +netMargin.toFixed(1),
      targetAchievement: +targetAchievement.toFixed(1),
      classification,
      costBreakdown,
      diagnosis,
    };
  });
}

function getTeamDiagnosis(
  teamId: string,
  period: string,
  data: {
    revenue: number;
    grossProfit: number;
    directCosts: number;
    contributionProfit: number;
    netProfit: number;
    targetAchievement: number;
    repCount: number;
  }
): DiagnosisItem[] {
  const items: DiagnosisItem[] = [];
  const p = getPeriodString(period);

  function add(severity: DiagnosisItem["severity"], category: DiagnosisItem["category"], message: string, recommendation?: string) {
    items.push({
      id: `team-diag-${items.length + 1}`,
      severity,
      category,
      message,
      recommendation,
      source: {
        source: "team_diagnosis_engine",
        formula: `team aggregate check`,
        period: p,
        scope: `team:${teamId}`,
        lastUpdated: TODAY,
      },
    });
  }

  if (data.netProfit > 10000) {
    add("success", "cost", "الفريق مربح جداً");
  } else if (data.netProfit > 0) {
    add("success", "cost", "الفريق مربح");
  } else if (data.netProfit > -5000) {
    add("warning", "cost", "الفريق هامشيه منخفض", "مراجعة التكاليف");
  } else {
    add("danger", "cost", "الفريق غير مربح", "مراجعة الأداء الجماعي");
  }

  if (data.targetAchievement >= 100) {
    add("success", "revenue", `تحقيق الهدف الجماعي: ${data.targetAchievement.toFixed(0)}%`);
  } else if (data.targetAchievement >= 80) {
    add("warning", "revenue", `تحقيق الهدف: ${data.targetAchievement.toFixed(0)}%`);
  } else {
    add("danger", "revenue", `تحقيق الهدف ضعيف: ${data.targetAchievement.toFixed(0)}%`);
  }

  const avgProfitPerRep = data.repCount > 0 ? data.netProfit / data.repCount : 0;
  if (avgProfitPerRep < 0) {
    add("danger", "efficiency", `متوسط الربح لكل مندوب سلبي: ${avgProfitPerRep.toLocaleString("ar-SA")} ر.س`, "تحديد المناديب الأقل أداءً");
  }

  return items;
}

// ── Territory Profitability (Full) ──────────────────────────────────────────

export function getTerritoryProfitabilityFull(period?: string): TerritoryProfitabilityFull[] {
  const p = getPeriodString(period);

  return territories.map((t) => {
    const repRecords = profitabilityRecords.filter(
      (r) => r.territoryId === t.id && r.period === p
    );

    const revenue = repRecords.reduce((s, r) => s + r.revenue, 0);
    const cogs = repRecords.reduce((s, r) => s + r.cost, 0);
    const grossProfit = repRecords.reduce((s, r) => s + r.grossProfit, 0);
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    let directCosts = 0;
    for (const repId of t.repIds) {
      directCosts += getTotalDirectCost(repId, period);
    }
    const overheadEntry = getTerritoryOverhead(t.id, period);
    directCosts += overheadEntry.amount;

    const contributionProfit = grossProfit - directCosts;

    const allocatedCosts = overheadEntry.amount;
    const allocatedProfit = contributionProfit;
    const netProfit = allocatedProfit;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    const territoryTeams = teams.filter((tm) => tm.territoryIds.includes(t.id));

    const repVisits = visits.filter(
      (v) => t.repIds.includes(v.repId) && dateInRange(v.date, periodStartEnd(p))
    );
    const repCustomers = allCustomers.filter(
      (c) => t.repIds.includes(c.repId) && c.status === "active"
    );

    const costPerVisit = repVisits.length > 0 ? directCosts / repVisits.length : 0;
    const costPerCustomer = repCustomers.length > 0 ? directCosts / repCustomers.length : 0;
    const revenuePerCustomer = repCustomers.length > 0 ? revenue / repCustomers.length : 0;
    const profitPerCustomer = repCustomers.length > 0 ? netProfit / repCustomers.length : 0;
    const customerCoverage = t.customerCount > 0 ? (repCustomers.length / t.customerCount) * 100 : 0;

    const target = targets.find(
      (tgt) => tgt.ownerId === t.id && tgt.ownerType === "territory" && tgt.period === "monthly"
    );
    const targetAchievement = target && target.salesAmount > 0
      ? (revenue / target.salesAmount) * 100
      : 0;

    const classification = classifyRep(netProfit);

    const costBreakdown: CostAllocationEntry[] = [
      ...t.repIds.flatMap((repId) => getRepOperatingCosts(repId, period)),
      ...t.repIds.map((repId) => getCommissionCost(repId, period)).filter(Boolean) as CostAllocationEntry[],
      overheadEntry,
    ];

    const diagnosis = getTerritoryDiagnosis(t.id, p, {
      revenue,
      grossProfit,
      directCosts,
      netProfit,
      targetAchievement,
      costPerVisit,
      customerCoverage,
      repCount: t.repIds.length,
    });

    const branch = branches.find((b) => b.id === t.branchId);

    return {
      territoryId: t.id,
      territoryName: t.name,
      branchName: branch?.name ?? t.branchId,
      period: p,
      repCount: t.repIds.length,
      teamCount: territoryTeams.length,
      revenue,
      cogs,
      grossProfit: +grossProfit.toFixed(2),
      grossMargin: +grossMargin.toFixed(1),
      directCosts: +directCosts.toFixed(2),
      allocatedCosts: +allocatedCosts.toFixed(2),
      contributionProfit: +contributionProfit.toFixed(2),
      allocatedProfit: +allocatedProfit.toFixed(2),
      netProfit: +netProfit.toFixed(2),
      netMargin: +netMargin.toFixed(1),
      customerCount: t.customerCount,
      customerCoverage: +customerCoverage.toFixed(1),
      costPerVisit: +costPerVisit.toFixed(2),
      costPerCustomer: +costPerCustomer.toFixed(2),
      revenuePerCustomer: +revenuePerCustomer.toFixed(2),
      profitPerCustomer: +profitPerCustomer.toFixed(2),
      targetAchievement: +targetAchievement.toFixed(1),
      classification,
      costBreakdown,
      diagnosis,
    };
  });
}

function getTerritoryDiagnosis(
  territoryId: string,
  period: string,
  data: {
    revenue: number;
    grossProfit: number;
    directCosts: number;
    netProfit: number;
    targetAchievement: number;
    costPerVisit: number;
    customerCoverage: number;
    repCount: number;
  }
): DiagnosisItem[] {
  const items: DiagnosisItem[] = [];
  const p = getPeriodString(period);

  function add(severity: DiagnosisItem["severity"], category: DiagnosisItem["category"], message: string, recommendation?: string) {
    items.push({
      id: `terr-diag-${items.length + 1}`,
      severity,
      category,
      message,
      recommendation,
      source: {
        source: "territory_diagnosis_engine",
        formula: "territory aggregate check",
        period: p,
        scope: `territory:${territoryId}`,
        lastUpdated: TODAY,
      },
    });
  }

  if (data.netProfit > 20000) {
    add("success", "cost", "المنطقة مربحة جداً");
  } else if (data.netProfit > 0) {
    add("success", "cost", "المنطقة مربحة");
  } else if (data.netProfit > -10000) {
    add("warning", "cost", "المنطقة هامشها منخفض", "مراجعة التوزيع الجغرافي للمناديب");
  } else {
    add("danger", "cost", "المنطقة غير مربحة", "مراجعة استراتيجية التغطية");
  }

  if (data.costPerVisit > 500) {
    add("danger", "efficiency", `تكلفة الزيارة مرتفعة: ${data.costPerVisit.toLocaleString("ar-SA")} ر.س`, "تحسين مخططات الجولات");
  } else if (data.costPerVisit > 300) {
    add("warning", "efficiency", `تكلفة الزيارة: ${data.costPerVisit.toLocaleString("ar-SA")} ر.س`);
  }

  if (data.customerCoverage < 70) {
    add("danger", "efficiency", `تغطية العملاء منخفضة: ${data.customerCoverage.toFixed(0)}%`, "زيادة عدد العملاء الم-active");
  } else if (data.customerCoverage < 90) {
    add("warning", "efficiency", `تغطية العملاء: ${data.customerCoverage.toFixed(0)}%`);
  } else {
    add("success", "efficiency", `تغطية العملاء ممتازة: ${data.customerCoverage.toFixed(0)}%`);
  }

  if (data.targetAchievement >= 100) {
    add("success", "revenue", `تحقيق الهدف: ${data.targetAchievement.toFixed(0)}%`);
  } else if (data.targetAchievement >= 80) {
    add("warning", "revenue", `تحقيق الهدف: ${data.targetAchievement.toFixed(0)}%`);
  } else {
    add("danger", "revenue", `تحقيق الهدف ضعيف: ${data.targetAchievement.toFixed(0)}%`);
  }

  return items;
}

// ── Waterfall (Team) ────────────────────────────────────────────────────────

export function getTeamWaterfall(teamId: string, period?: string): WaterfallPoint[] {
  const teamData = getTeamProfitability(period).find((t) => t.teamId === teamId);
  if (!teamData) return [];

  const points: WaterfallPoint[] = [];
  let cumulative = 0;

  function addPoint(label: string, value: number, type: "positive" | "negative" | "total") {
    cumulative += value;
    points.push({ label, value, cumulative: +cumulative.toFixed(2), type });
  }

  addPoint("إجمالي المبيعات", teamData.revenue, "total");
  addPoint("تكلفة البضاعة", -teamData.cogs, "negative");
  addPoint("الربح الإجمالي", teamData.grossProfit, "total");
  addPoint("تكاليف التشغيل المباشرة", -teamData.directCosts, "negative");
  addPoint("الربح المساهمة", teamData.contributionProfit, "total");
  addPoint("تكاليف الإشراف", -teamData.allocatedCosts, "negative");
  addPoint("صافي الربحية", teamData.netProfit, "total");

  return points;
}

// ── Waterfall (Territory) ───────────────────────────────────────────────────

export function getTerritoryWaterfall(territoryId: string, period?: string): WaterfallPoint[] {
  const terrData = getTerritoryProfitabilityFull(period).find((t) => t.territoryId === territoryId);
  if (!terrData) return [];

  const points: WaterfallPoint[] = [];
  let cumulative = 0;

  function addPoint(label: string, value: number, type: "positive" | "negative" | "total") {
    cumulative += value;
    points.push({ label, value, cumulative: +cumulative.toFixed(2), type });
  }

  addPoint("إجمالي المبيعات", terrData.revenue, "total");
  addPoint("تكلفة البضاعة", -terrData.cogs, "negative");
  addPoint("الربح الإجمالي", terrData.grossProfit, "total");
  addPoint("تكاليف التشغيل المباشرة", -terrData.directCosts, "negative");
  addPoint("الربح المساهمة", terrData.contributionProfit, "total");
  addPoint("مصاريف المنطقة", -terrData.allocatedCosts, "negative");
  addPoint("صافي الربحية", terrData.netProfit, "total");

  return points;
}
