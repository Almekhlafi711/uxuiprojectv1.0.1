import { TODAY, CURRENT_MONTH } from "@/config/date";
import { invoices } from "@/mock/sales";
import { collections } from "@/mock/collections";
import { returns } from "@/mock/returns";
import { visits } from "@/mock/visits";
import { targets as allTargets, targetByRepMonth } from "@/mock/targets";
import { users } from "@/mock/users";
import { customers as allCustomers } from "@/mock/customers";
import { territories } from "@/mock/organization";
import { profitabilityRecords, monthlySeries } from "@/mock/profitability";
import { commissionRuns, commissionPolicies } from "@/mock/commission";
import { repCostConfigs } from "@/mock/assignments";
import { productById } from "@/mock/products";
import { warehouseStock, stockTransfers, stockMovements } from "@/mock/inventory";
import { approvals } from "@/mock/approvals";
import { discountRequests } from "@/mock/assignments";
import type { Invoice, ReturnRecord, Collection, Visit, Target, User, ProfitabilityRecord } from "@/types";

// ── Filters ──────────────────────────────────────────────────────────────────

export interface DashboardFilters {
  period: "today" | "week" | "month" | "quarter" | "year" | "custom";
  startDate?: string;
  endDate?: string;
  territoryId?: string;
  supervisorId?: string;
  repId?: string;
  warehouseId?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function dateInPeriod(dateStr: string, filters: DashboardFilters): boolean {
  const d = new Date(dateStr);
  const now = new Date(TODAY);
  const start = new Date(filters.startDate ?? "2000-01-01");
  const end = new Date(filters.endDate ?? "2099-12-31");

  let periodStart: Date;
  switch (filters.period) {
    case "today":
      periodStart = new Date(TODAY);
      break;
    case "week": {
      const day = now.getDay();
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - day);
      break;
    }
    case "month":
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case "year":
      periodStart = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      periodStart = start;
  }
  return d >= periodStart && d <= end;
}

function getPreviousPeriodRange(filters: DashboardFilters): { start: string; end: string } {
  const now = new Date(TODAY);
  let prevStart: Date, prevEnd: Date;
  switch (filters.period) {
    case "today":
      prevStart = new Date(now);
      prevStart.setDate(now.getDate() - 1);
      prevEnd = new Date(prevStart);
      break;
    case "week": {
      const day = now.getDay();
      const ws = new Date(now);
      ws.setDate(now.getDate() - day);
      prevStart = new Date(ws);
      prevStart.setDate(ws.getDate() - 7);
      prevEnd = new Date(ws);
      prevEnd.setDate(ws.getDate() - 1);
      break;
    }
    case "month":
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case "quarter":
      prevStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
      prevEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
      break;
    case "year":
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31);
      break;
    default:
      prevStart = new Date("2000-01-01");
      prevEnd = new Date("2000-01-01");
  }
  return {
    start: prevStart.toISOString().slice(0, 10),
    end: prevEnd.toISOString().slice(0, 10),
  };
}

function repMatchesFilter(inv: { repId: string }, filters: DashboardFilters): boolean {
  if (filters.repId && inv.repId !== filters.repId) return false;
  if (filters.supervisorId) {
    const rep = users.find((u) => u.id === inv.repId);
    if (rep?.supervisorId !== filters.supervisorId) return false;
  }
  if (filters.territoryId) {
    const rep = users.find((u) => u.id === inv.repId);
    if (rep?.territoryId !== filters.territoryId) return false;
  }
  return true;
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

function periodRangeString(filters: DashboardFilters): string {
  if (filters.startDate && filters.endDate) return `${filters.startDate} ~ ${filters.endDate}`;
  const now = new Date(TODAY);
  switch (filters.period) {
    case "today": return TODAY;
    case "week": {
      const day = now.getDay();
      const ws = new Date(now);
      ws.setDate(now.getDate() - day);
      return ws.toISOString().slice(0, 10);
    }
    case "month": return CURRENT_MONTH;
    case "quarter": return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
    case "year": return `${now.getFullYear()}`;
    default: return CURRENT_MONTH;
  }
}

function repNameById(id: string): string {
  return users.find((u) => u.id === id)?.name ?? id;
}

function customerNameById(id: string): string {
  return allCustomers.find((c) => c.id === id)?.name ?? id;
}

// ── Sales Summary ────────────────────────────────────────────────────────────

export interface SalesSummary {
  grossSales: number;
  totalInvoices: number;
  averageInvoice: number;
  discountTotal: number;
  returnsTotal: number;
  netSales: number;
  previousNetSales: number;
  salesGrowth: number;
}

export function getSalesSummary(filters: DashboardFilters): SalesSummary {
  const completed = invoices.filter(
    (i) => i.status === "completed" && dateInPeriod(i.date, filters) && repMatchesFilter(i, filters)
  );

  const grossSales = completed.reduce((s, i) => s + i.total, 0);
  const totalInvoices = completed.length;
  const averageInvoice = totalInvoices > 0 ? grossSales / totalInvoices : 0;
  const discountTotal = completed.reduce((s, i) => s + i.discount, 0);

  const returnsFiltered = returns.filter(
    (r) => dateInPeriod(r.date, filters) && repMatchesFilter(r, filters) && r.status === "approved"
  );
  const returnsTotal = returnsFiltered.reduce((s, r) => s + r.totalAmount, 0);

  const netSales = grossSales - discountTotal - returnsTotal;

  const prev = getPreviousPeriodRange(filters);
  const prevCompleted = invoices.filter(
    (i) => i.status === "completed" && i.date >= prev.start && i.date <= prev.end && repMatchesFilter(i, filters)
  );
  const prevGross = prevCompleted.reduce((s, i) => s + i.total, 0);
  const prevDiscount = prevCompleted.reduce((s, i) => s + i.discount, 0);
  const prevReturns = returns
    .filter((r) => r.date >= prev.start && r.date <= prev.end && r.status === "approved" && repMatchesFilter(r, filters))
    .reduce((s, r) => s + r.totalAmount, 0);
  const previousNetSales = prevGross - prevDiscount - prevReturns;

  const salesGrowth = previousNetSales !== 0 ? ((netSales - previousNetSales) / Math.abs(previousNetSales)) * 100 : 0;

  return {
    grossSales,
    totalInvoices,
    averageInvoice: +averageInvoice.toFixed(2),
    discountTotal,
    returnsTotal,
    netSales: +netSales.toFixed(2),
    previousNetSales: +previousNetSales.toFixed(2),
    salesGrowth: +salesGrowth.toFixed(1),
  };
}

// ── Collections Summary ──────────────────────────────────────────────────────

export interface CollectionsSummary {
  totalCollected: number;
  collectionCount: number;
  collectionRate: number;
  pendingAmount: number;
  overdueAmount: number;
}

export function getCollectionsSummary(filters: DashboardFilters): CollectionsSummary {
  const filtered = collections.filter(
    (c) => dateInPeriod(c.date, filters) && repMatchesFilter(c, filters) && c.status === "approved"
  );

  const totalCollected = filtered.reduce((s, c) => s + c.amount, 0);
  const collectionCount = filtered.length;

  const creditInvoices = invoices.filter(
    (i) => i.type === "credit" && i.status === "completed" && dateInPeriod(i.date, filters) && repMatchesFilter(i, filters)
  );
  const creditSales = creditInvoices.reduce((s, i) => s + i.total, 0);
  const collectionRate = creditSales > 0 ? (totalCollected / creditSales) * 100 : 0;

  const pendingAmount = invoices
    .filter((i) => i.type === "credit" && i.status === "completed" && i.paymentStatus !== "paid" && dateInPeriod(i.date, filters) && repMatchesFilter(i, filters))
    .reduce((s, i) => s + (i.total - i.paid), 0);

  const overdueAmount = invoices
    .filter(
      (i) =>
        i.type === "credit" &&
        i.status === "completed" &&
        i.paymentStatus !== "paid" &&
        i.dueDate &&
        i.dueDate < TODAY &&
        repMatchesFilter(i, filters)
    )
    .reduce((s, i) => s + (i.total - i.paid), 0);

  return {
    totalCollected,
    collectionCount,
    collectionRate: +collectionRate.toFixed(1),
    pendingAmount,
    overdueAmount,
  };
}

// ── COGS ─────────────────────────────────────────────────────────────────────

export interface COGSResult {
  totalCOGS: number;
  totalUnitsSold: number;
  totalItems: number;
  averageUnitCost: number;
}

export function getCOGS(filters: DashboardFilters): COGSResult {
  const completed = invoices.filter(
    (i) => i.status === "completed" && dateInPeriod(i.date, filters) && repMatchesFilter(i, filters)
  );

  let totalCOGS = 0;
  let totalUnitsSold = 0;
  const productIds = new Set<string>();

  for (const inv of completed) {
    for (const item of inv.items) {
      totalCOGS += item.cost * item.qty;
      totalUnitsSold += item.qty;
      productIds.add(item.productId);
    }
  }

  const averageUnitCost = totalUnitsSold > 0 ? totalCOGS / totalUnitsSold : 0;

  return {
    totalCOGS: +totalCOGS.toFixed(2),
    totalUnitsSold,
    totalItems: productIds.size,
    averageUnitCost: +averageUnitCost.toFixed(2),
  };
}

// ── Gross Profit ─────────────────────────────────────────────────────────────

export interface GrossProfitResult {
  grossProfit: number;
  grossMargin: number;
}

export function getGrossProfit(filters: DashboardFilters): GrossProfitResult {
  const sales = getSalesSummary(filters);
  const cogs = getCOGS(filters);
  const grossProfit = sales.netSales - cogs.totalCOGS;
  const grossMargin = sales.netSales > 0 ? (grossProfit / sales.netSales) * 100 : 0;

  return {
    grossProfit: +grossProfit.toFixed(2),
    grossMargin: +grossMargin.toFixed(1),
  };
}

// ── Rep Profitability ────────────────────────────────────────────────────────

export interface RepProfitability {
  repId: string;
  repName: string;
  territoryId?: string;
  territoryName?: string;
  supervisorId?: string;
  supervisorName?: string;
  revenue: number;
  grossProfit: number;
  commission: number;
  operatingCosts: number;
  netContribution: number;
  classification: "excellent" | "profitable" | "low_margin" | "review" | "unprofitable";
}

function classifyRep(netContribution: number): RepProfitability["classification"] {
  if (netContribution > 5000) return "excellent";
  if (netContribution > 0) return "profitable";
  if (netContribution > -1000) return "low_margin";
  if (netContribution > -3000) return "review";
  return "unprofitable";
}

function getPeriodKey(filters: DashboardFilters): string {
  const now = new Date(TODAY);
  switch (filters.period) {
    case "month":
    case "today":
    case "week":
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    case "quarter":
      return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
    case "year":
      return `${now.getFullYear()}`;
    default:
      return CURRENT_MONTH;
  }
}

function daysInPeriod(filters: DashboardFilters): number {
  const now = new Date(TODAY);
  switch (filters.period) {
    case "today": return 1;
    case "week": return now.getDay() + 1;
    case "month": return now.getDate();
    case "quarter": {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return Math.round((now.getTime() - qStart.getTime()) / 86400000) + 1;
    }
    case "year": {
      const yStart = new Date(now.getFullYear(), 0, 1);
      return Math.round((now.getTime() - yStart.getTime()) / 86400000) + 1;
    }
    default: return 30;
  }
}

export function getRepProfitability(filters: DashboardFilters): RepProfitability[] {
  const period = getPeriodKey(filters);
  const activeReps = users.filter((u) => u.role === "REPRESENTATIVE" && u.status === "active");

  return activeReps.map((rep) => {
    const record = profitabilityRecords.find((r) => r.repId === rep.id && r.period === period);
    const revenue = record?.revenue ?? 0;
    const grossProfit = record?.grossProfit ?? 0;

    const commissionRun = commissionRuns.find((cr) => cr.period === period);
    const commissionLine = commissionRun?.lines.find((l) => l.repId === rep.id);
    const commission = commissionLine?.amount ?? 0;

    const costConfig = repCostConfigs.find((c) => c.repId === rep.id && (!c.effectiveTo || c.effectiveTo >= TODAY));
    const monthlyOpCost = costConfig
      ? costConfig.salary + costConfig.vehicleCost + costConfig.fuelAllowance + costConfig.phoneAllowance + costConfig.otherAllowance
      : 0;
    const days = daysInPeriod(filters);
    const operatingCosts = (monthlyOpCost / 30) * days;

    const netContribution = grossProfit - commission - operatingCosts;

    const territory = territories.find((t) => t.repIds.includes(rep.id));
    const supervisor = users.find((u) => u.id === rep.supervisorId);

    return {
      repId: rep.id,
      repName: rep.name,
      territoryId: rep.territoryId,
      territoryName: territory?.name,
      supervisorId: rep.supervisorId,
      supervisorName: supervisor?.name,
      revenue,
      grossProfit,
      commission,
      operatingCosts: +operatingCosts.toFixed(2),
      netContribution: +netContribution.toFixed(2),
      classification: classifyRep(netContribution),
    };
  });
}

// ── Rep Detail ───────────────────────────────────────────────────────────────

export interface RepDetail {
  repId: string;
  repName: string;
  revenue: number;
  discounts: number;
  returns: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  commission: number;
  operatingCosts: {
    salary: number;
    vehicle: number;
    fuel: number;
    phone: number;
    other: number;
    total: number;
  };
  netContribution: number;
  netContributionMargin: number;
  costToServe: number;
  revenuePerVisit: number;
  revenuePerCustomer: number;
  averageInvoice: number;
  collectionRate: number;
  targetAchievement: number;
}

export function getRepDetail(repId: string, filters?: DashboardFilters): RepDetail {
  const f: DashboardFilters = filters ?? { period: "month" };
  const period = getPeriodKey(f);
  const rep = users.find((u) => u.id === repId);
  const record = profitabilityRecords.find((r) => r.repId === repId && r.period === period);

  const repInvoices = invoices.filter(
    (i) => i.repId === repId && i.status === "completed" && dateInPeriod(i.date, f)
  );
  const revenue = record?.revenue ?? repInvoices.reduce((s, i) => s + i.total, 0);
  const discounts = record?.discountsAmount ?? repInvoices.reduce((s, i) => s + i.discount, 0);
  const repReturns = returns.filter((r) => r.repId === repId && dateInPeriod(r.date, f) && r.status === "approved");
  const returnsAmount = record?.returnsAmount ?? repReturns.reduce((s, r) => s + r.totalAmount, 0);
  const netSales = revenue - discounts - returnsAmount;

  let cogs = 0;
  for (const inv of repInvoices) {
    for (const item of inv.items) {
      cogs += item.cost * item.qty;
    }
  }
  const grossProfit = record?.grossProfit ?? netSales - cogs;
  const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  const commissionRun = commissionRuns.find((cr) => cr.period === period);
  const commissionLine = commissionRun?.lines.find((l) => l.repId === repId);
  const commission = commissionLine?.amount ?? 0;

  const costConfig = repCostConfigs.find((c) => c.repId === repId && (!c.effectiveTo || c.effectiveTo >= TODAY));
  const salary = costConfig?.salary ?? 0;
  const vehicle = costConfig?.vehicleCost ?? 0;
  const fuel = costConfig?.fuelAllowance ?? 0;
  const phone = costConfig?.phoneAllowance ?? 0;
  const other = costConfig?.otherAllowance ?? 0;
  const totalOpCost = salary + vehicle + fuel + phone + other;
  const days = daysInPeriod(f);
  const proratedOpCost = (totalOpCost / 30) * days;

  const netContribution = grossProfit - commission - proratedOpCost;
  const netContributionMargin = netSales > 0 ? (netContribution / netSales) * 100 : 0;

  const costToServe = proratedOpCost;
  const repVisits = visits.filter((v) => v.repId === repId && dateInPeriod(v.date, f));
  const revenuePerVisit = repVisits.length > 0 ? revenue / repVisits.length : 0;

  const repCustomers = allCustomers.filter((c) => c.repId === repId && c.status === "active");
  const revenuePerCustomer = repCustomers.length > 0 ? revenue / repCustomers.length : 0;

  const averageInvoice = repInvoices.length > 0 ? revenue / repInvoices.length : 0;

  const creditInvoices = repInvoices.filter((i) => i.type === "credit");
  const creditTotal = creditInvoices.reduce((s, i) => s + i.total, 0);
  const collectedAmount = collections
    .filter((c) => c.repId === repId && c.status === "approved" && dateInPeriod(c.date, f))
    .reduce((s, c) => s + c.amount, 0);
  const collectionRate = creditTotal > 0 ? (collectedAmount / creditTotal) * 100 : 100;

  const target = targetByRepMonth(repId);
  const targetAchievement = target && target.salesAmount > 0 ? (netSales / target.salesAmount) * 100 : 0;

  return {
    repId,
    repName: rep?.name ?? repId,
    revenue,
    discounts,
    returns: returnsAmount,
    netSales: +netSales.toFixed(2),
    cogs: +cogs.toFixed(2),
    grossProfit: +grossProfit.toFixed(2),
    grossMargin: +grossMargin.toFixed(1),
    commission,
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
    targetAchievement: +targetAchievement.toFixed(1),
  };
}

// ── Territory Performance ────────────────────────────────────────────────────

export interface TerritoryPerformance {
  territoryId: string;
  territoryName: string;
  customerCount: number;
  visitCount: number;
  salesTotal: number;
  collectionTotal: number;
  returnsTotal: number;
  netSales: number;
  cogs: number;
  grossProfit: number;
  margin: number;
  operatingCost: number;
  netContribution: number;
  salesTarget: number;
  collectionTarget: number;
  targetAchievement: number;
  collectionRate: number;
}

export function getTerritoryPerformance(filters: DashboardFilters): TerritoryPerformance[] {
  return territories.map((t) => {
    const repIds = t.repIds;

    const tInvoices = invoices.filter(
      (i) => i.status === "completed" && repIds.includes(i.repId) && dateInPeriod(i.date, filters)
    );
    const salesTotal = tInvoices.reduce((s, i) => s + i.total, 0);
    const discountSum = tInvoices.reduce((s, i) => s + i.discount, 0);

    const tReturns = returns.filter(
      (r) => repIds.includes(r.repId) && dateInPeriod(r.date, filters) && r.status === "approved"
    );
    const returnsTotal = tReturns.reduce((s, r) => s + r.totalAmount, 0);

    const netSales = salesTotal - discountSum - returnsTotal;

    let cogs = 0;
    for (const inv of tInvoices) {
      for (const item of inv.items) {
        cogs += item.cost * item.qty;
      }
    }
    const grossProfit = netSales - cogs;
    const margin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    const tCollections = collections.filter(
      (c) => repIds.includes(c.repId) && c.status === "approved" && dateInPeriod(c.date, filters)
    );
    const collectionTotal = tCollections.reduce((s, c) => s + c.amount, 0);

    const tVisits = visits.filter((v) => repIds.includes(v.repId) && dateInPeriod(v.date, filters));

    const tCustomers = allCustomers.filter((c) => repIds.includes(c.repId) && c.status === "active");

    const days = daysInPeriod(filters);
    let operatingCost = 0;
    for (const repId of repIds) {
      const costConfig = repCostConfigs.find((c) => c.repId === repId && (!c.effectiveTo || c.effectiveTo >= TODAY));
      if (costConfig) {
        const monthly = costConfig.salary + costConfig.vehicleCost + costConfig.fuelAllowance + costConfig.phoneAllowance + costConfig.otherAllowance;
        operatingCost += (monthly / 30) * days;
      }
    }

    const netContribution = grossProfit - operatingCost;

    const collectionRate = salesTotal > 0 ? (collectionTotal / salesTotal) * 100 : 0;

    const territoryTarget = allTargets.find((tgt) => tgt.ownerId === t.id && tgt.ownerType === "territory" && tgt.period === "monthly");
    let salesTarget: number;
    let collectionTarget: number;
    if (territoryTarget) {
      salesTarget = territoryTarget.salesAmount;
      collectionTarget = territoryTarget.collectionAmount;
    } else {
      const repTargets = t.repIds.map((rid) => targetByRepMonth(rid)).filter(Boolean);
      salesTarget = repTargets.reduce((s, tgt) => s + (tgt?.salesAmount ?? 0), 0);
      collectionTarget = repTargets.reduce((s, tgt) => s + (tgt?.collectionAmount ?? 0), 0);
    }
    const targetAchievement = salesTarget > 0 ? (salesTotal / salesTarget) * 100 : 0;

    return {
      territoryId: t.id,
      territoryName: t.name,
      customerCount: tCustomers.length,
      visitCount: tVisits.length,
      salesTotal,
      collectionTotal,
      returnsTotal,
      netSales: +netSales.toFixed(2),
      cogs: +cogs.toFixed(2),
      grossProfit: +grossProfit.toFixed(2),
      margin: +margin.toFixed(1),
      operatingCost: +operatingCost.toFixed(2),
      netContribution: +netContribution.toFixed(2),
      salesTarget,
      collectionTarget,
      targetAchievement: +targetAchievement.toFixed(1),
      collectionRate: +collectionRate.toFixed(1),
    };
  });
}

// ── Territory Targets ────────────────────────────────────────────────────────

export interface TerritoryTarget {
  territoryId: string;
  territoryName: string;
  salesTarget: number;
  collectionTarget: number;
  visitsTarget: number;
}

export function getTerritoryTargets(filters: DashboardFilters): TerritoryTarget[] {
  return territories.map((t) => {
    const territoryTarget = allTargets.find((tgt) => tgt.ownerId === t.id && tgt.ownerType === "territory" && tgt.period === "monthly");
    if (territoryTarget) {
      return {
        territoryId: t.id,
        territoryName: t.name,
        salesTarget: territoryTarget.salesAmount,
        collectionTarget: territoryTarget.collectionAmount,
        visitsTarget: territoryTarget.visitsCount,
      };
    }
    const repTargets = t.repIds.map((rid) => targetByRepMonth(rid)).filter(Boolean);
    return {
      territoryId: t.id,
      territoryName: t.name,
      salesTarget: repTargets.reduce((s, t) => s + (t?.salesAmount ?? 0), 0),
      collectionTarget: repTargets.reduce((s, t) => s + (t?.collectionAmount ?? 0), 0),
      visitsTarget: repTargets.reduce((s, t) => s + (t?.visitsCount ?? 0), 0),
    };
  });
}

// ── Action Queue ─────────────────────────────────────────────────────────────

export interface ActionItem {
  type: string;
  label: string;
  count: number;
  severity: "danger" | "warning" | "info";
  actionPath: string;
  actionLabel: string;
}

export function getActionQueue(): ActionItem[] {
  const items: ActionItem[] = [];

  const pendingDiscounts = discountRequests.filter((d) => d.status === "pending");
  if (pendingDiscounts.length > 0) {
    items.push({
      type: "pending_discounts",
      label: "طلبات خصومات معلقة",
      count: pendingDiscounts.length,
      severity: "warning",
      actionPath: "/approvals",
      actionLabel: "مراجعة الاعتمادات",
    });
  }

  const pendingReturns = returns.filter((r) => r.status === "pending");
  if (pendingReturns.length > 0) {
    items.push({
      type: "pending_returns",
      label: "مرتجعات معلقة",
      count: pendingReturns.length,
      severity: "warning",
      actionPath: "/returns",
      actionLabel: "مراجعة المرتجعات",
    });
  }

  const pendingTransfers = stockTransfers.filter((t) => t.status !== "completed" && t.status !== "rejected");
  if (pendingTransfers.length > 0) {
    items.push({
      type: "pending_transfers",
      label: "تحويلات مخزون معلقة",
      count: pendingTransfers.length,
      severity: "info",
      actionPath: "/inventory/transfers",
      actionLabel: "متابعة التحويلات",
    });
  }

  const overdueInvoices = invoices.filter(
    (i) => i.type === "credit" && i.status === "completed" && i.paymentStatus !== "paid" && i.dueDate && i.dueDate < TODAY
  );
  if (overdueInvoices.length > 0) {
    items.push({
      type: "overdue_collections",
      label: "فواتير متأخرة السداد",
      count: overdueInvoices.length,
      severity: "danger",
      actionPath: "/collections",
      actionLabel: "متابعة التحصيل",
    });
  }

  const creditBreaches = allCustomers.filter((c) => c.balance > c.creditLimit && c.status === "active");
  if (creditBreaches.length > 0) {
    items.push({
      type: "credit_breaches",
      label: "تجاوز حد ائتماني",
      count: creditBreaches.length,
      severity: "danger",
      actionPath: "/customers",
      actionLabel: "مراجعة العملاء",
    });
  }

  const lowStock = warehouseStock.filter((s) => s.available < s.reorderLevel);
  if (lowStock.length > 0) {
    items.push({
      type: "low_stock",
      label: "مخزون أقل من مستوى إعادة الطلب",
      count: lowStock.length,
      severity: "warning",
      actionPath: "/inventory",
      actionLabel: "مراجعة المخزون",
    });
  }

  const lateVisits = visits.filter((v) => v.date === TODAY && v.result === "not_found");
  if (lateVisits.length > 0) {
    items.push({
      type: "late_visits",
      label: "زيارات لم تكتمل اليوم",
      count: lateVisits.length,
      severity: "info",
      actionPath: "/visits",
      actionLabel: "متابعة الزيارات",
    });
  }

  const underTargetReps = users
    .filter((u) => u.role === "REPRESENTATIVE" && u.status === "active")
    .filter((rep) => {
      const record = profitabilityRecords.find((r) => r.repId === rep.id && r.period === CURRENT_MONTH);
      const target = targetByRepMonth(rep.id);
      return target && record && record.revenue < target.salesAmount * 0.8;
    });
  if (underTargetReps.length > 0) {
    items.push({
      type: "under_target",
      label: "مناديب تحت 80% من الهدف",
      count: underTargetReps.length,
      severity: "warning",
      actionPath: "/profitability",
      actionLabel: "مراجعة الربحية",
    });
  }

  const profitData = getRepProfitability({ period: "month" });
  const unprofitable = profitData.filter((p) => p.netContribution < 0);
  if (unprofitable.length > 0) {
    items.push({
      type: "unprofitable_reps",
      label: "مناديب غير مربحين",
      count: unprofitable.length,
      severity: "danger",
      actionPath: "/profitability",
      actionLabel: "تحليل الربحية",
    });
  }

  const pendingCollections = collections.filter((c) => c.status === "pending");
  if (pendingCollections.length > 0) {
    items.push({
      type: "pending_collections",
      label: "سندات قبض معلقة",
      count: pendingCollections.length,
      severity: "info",
      actionPath: "/collections",
      actionLabel: "اعتماد التحصيل",
    });
  }

  return items;
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export interface TimelineEntry {
  time: string;
  type: string;
  typeLabel: string;
  repName: string;
  customerName: string;
  amount: number;
  description: string;
}

export function getTimeline(): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const inv of invoices) {
    entries.push({
      time: inv.date,
      type: "invoice",
      typeLabel: "فاتورة بيع",
      repName: repNameById(inv.repId),
      customerName: customerNameById(inv.customerId),
      amount: inv.total,
      description: `${inv.invoiceNumber} — ${inv.paymentStatus === "paid" ? "مدفوعة" : inv.paymentStatus === "partial" ? "مدفوعة جزئياً" : "آجلة"}`,
    });
  }

  for (const col of collections) {
    entries.push({
      time: col.date,
      type: "collection",
      typeLabel: "سند قبض",
      repName: repNameById(col.repId),
      customerName: customerNameById(col.customerId),
      amount: col.amount,
      description: `${col.number} — ${col.status === "approved" ? "معتمدة" : col.status === "pending" ? "معلقة" : "مرفوضة"}`,
    });
  }

  for (const ret of returns) {
    entries.push({
      time: ret.date,
      type: "return",
      typeLabel: "مرتجع",
      repName: repNameById(ret.repId),
      customerName: customerNameById(ret.customerId),
      amount: ret.totalAmount,
      description: `${ret.number} — ${ret.reason}`,
    });
  }

  for (const v of visits) {
    entries.push({
      time: v.date,
      type: "visit",
      typeLabel: "زيارة",
      repName: repNameById(v.repId),
      customerName: customerNameById(v.customerId),
      amount: 0,
      description: v.outcome ?? v.result,
    });
  }

  for (const mv of stockMovements) {
    entries.push({
      time: mv.date.split("T")[0],
      type: "stock",
      typeLabel: "حركة مخزون",
      repName: mv.repId ? repNameById(mv.repId) : "—",
      customerName: "—",
      amount: 0,
      description: `${mv.type} — ${mv.productName} × ${mv.qty} (${mv.refNumber})`,
    });
  }

  entries.sort((a, b) => b.time.localeCompare(a.time));
  return entries.slice(0, 10);
}

// ── Performance Comparison ───────────────────────────────────────────────────

export interface PerformanceComparison {
  metric: string;
  current: number;
  previous: number;
  change: number;
  direction: "up" | "down";
}

export function getPerformanceComparison(filters: DashboardFilters): PerformanceComparison[] {
  const now = new Date(TODAY);
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const curProfitRecs = profitabilityRecords.filter((r) => r.period === currentMonth);
  const prevProfitRecs = profitabilityRecords.filter((r) => r.period === prevMonth);

  const curSales = curProfitRecs.reduce((s, r) => s + r.revenue, 0);
  const prevSales = prevProfitRecs.reduce((s, r) => s + r.revenue, 0);

  const curProfit = curProfitRecs.reduce((s, r) => s + r.grossProfit, 0);
  const prevProfit = prevProfitRecs.reduce((s, r) => s + r.grossProfit, 0);

  const curReturns = curProfitRecs.reduce((s, r) => s + r.returnsAmount, 0);
  const prevReturns = prevProfitRecs.reduce((s, r) => s + r.returnsAmount, 0);

  const curCollections = collections
    .filter((c) => c.date.startsWith(currentMonth) && c.status === "approved")
    .reduce((s, c) => s + c.amount, 0);
  const prevCollections = collections
    .filter((c) => c.date.startsWith(prevMonth) && c.status === "approved")
    .reduce((s, c) => s + c.amount, 0);

  const profitData = getRepProfitability({ period: "month" });
  const curNetContrib = profitData.reduce((s, p) => s + p.netContribution, 0);

  const prevProfitData = profitabilityRecords.filter((r) => r.period === prevMonth);
  const prevCostConfigs = repCostConfigs;
  let prevNetContrib = 0;
  for (const r of prevProfitRecs) {
    const costConfig = prevCostConfigs.find((c) => c.repId === r.repId);
    const monthly = costConfig
      ? costConfig.salary + costConfig.vehicleCost + costConfig.fuelAllowance + costConfig.phoneAllowance + costConfig.otherAllowance
      : 0;
    const commRun = commissionRuns.find((cr) => cr.period === prevMonth);
    const commLine = commRun?.lines.find((l) => l.repId === r.repId);
    prevNetContrib += r.grossProfit - (commLine?.amount ?? 0) - monthly;
  }

  function comp(metric: string, current: number, previous: number): PerformanceComparison {
    const change = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;
    return {
      metric,
      current: +current.toFixed(2),
      previous: +previous.toFixed(2),
      change: +change.toFixed(1),
      direction: current >= previous ? "up" : "down",
    };
  }

  return [
    comp("المبيعات", curSales, prevSales),
    comp("التحصيل", curCollections, prevCollections),
    comp("المرتجعات", curReturns, prevReturns),
    comp("gross_profit", curProfit, prevProfit),
    comp("صافي المساهمة", curNetContrib, prevNetContrib),
  ];
}
