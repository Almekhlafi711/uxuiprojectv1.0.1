import type {
  CommissionPolicy,
  CommissionRun,
  CommissionLine,
  BonusPolicy,
  BonusRun,
} from "@/types";
import { repNames } from "./users";

export const commissionPolicies: CommissionPolicy[] = [
  {
    id: "cp-net-01",
    name: "عمولة المبيعات الصافية",
    basis: "net_sales",
    rate: 3,
    period: "monthly",
    targetThreshold: 0.8,
    effectiveFrom: "2026-01-01",
    version: 2,
    active: true,
  },
  {
    id: "cp-hybrid-01",
    name: "عمولة هجينة (مبيعات + تحصيل)",
    basis: "hybrid",
    rate: 2.5,
    period: "monthly",
    targetThreshold: 0.75,
    effectiveFrom: "2026-01-01",
    version: 1,
    active: false,
  },
  {
    id: "cp-coll-01",
    name: "عمولة التحصيل النقدي",
    basis: "collections",
    rate: 1.5,
    period: "monthly",
    targetThreshold: 0.7,
    effectiveFrom: "2026-01-01",
    version: 1,
    active: false,
  },
];

export const bonusPolicies: BonusPolicy[] = [
  {
    id: "bp-target-01",
    name: "مكافأة تحقيق الهدف الشهري",
    metric: "target_achievement",
    minThreshold: 1,
    amount: 500,
    period: "monthly",
    effectiveFrom: "2026-01-01",
    version: 1,
    active: true,
  },
  {
    id: "bp-new-01",
    name: "مكافأة العملاء الجدد",
    metric: "new_customers",
    minThreshold: 5,
    amount: 120,
    period: "monthly",
    effectiveFrom: "2026-01-01",
    version: 1,
    active: true,
  },
];

function buildLine(
  repId: string,
  repName: string,
  grossSales: number,
  returns: number,
  collections: number,
  grossProfit: number,
  targetAchievement: number,
  policy: CommissionPolicy
): CommissionLine {
  const netSales = grossSales - returns;
  let baseAmount = 0;
  switch (policy.basis) {
    case "net_sales":
      baseAmount = netSales;
      break;
    case "collections":
      baseAmount = collections;
      break;
    case "gross_profit":
      baseAmount = grossProfit;
      break;
    case "target":
      baseAmount = netSales;
      break;
    case "hybrid":
      baseAmount = netSales * 0.6 + collections * 0.4;
      break;
  }
  const eligible = targetAchievement >= policy.targetThreshold;
  const amount = eligible ? (baseAmount * policy.rate) / 100 : 0;
  return {
    repId,
    repName,
    grossSales,
    returns,
    netSales,
    collections,
    grossProfit,
    targetAchievement,
    baseAmount,
    rate: policy.rate,
    amount,
  };
}

function periodLines(
  policy: CommissionPolicy,
  raw: Array<[string, number, number, number, number, number]>
) {
  const lines = raw.map(([repId, grossSales, returns, collections, grossProfit, target]) =>
    buildLine(repId, repNames[repId] ?? repId, grossSales, returns, collections, grossProfit, target, policy)
  );
  const totalAmount = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, totalAmount };
}

const netPolicy = commissionPolicies[0];

export const commissionRuns: CommissionRun[] = [
  {
    id: "cr-2026-07",
    period: "2026-07",
    policyId: netPolicy.id,
    basis: netPolicy.basis,
    status: "exported",
    ...periodLines(netPolicy, [
      ["u-rp-01", 142000, 8000, 120000, 38000, 0.95],
      ["u-rp-02", 98000, 5000, 90000, 26000, 0.88],
      ["u-rp-03", 76000, 12000, 60000, 18000, 0.72],
      ["u-rp-04", 121000, 4000, 110000, 33000, 0.91],
    ]),
    createdAt: "2026-08-01T08:00:00Z",
    underReviewAt: "2026-08-01T12:00:00Z",
    finalizedAt: "2026-08-02T09:00:00Z",
    approvedAt: "2026-08-02T14:00:00Z",
    approvedBy: "u-sm-01",
    exportedAt: "2026-08-03T10:00:00Z",
  },
  {
    id: "cr-2026-08",
    period: "2026-08",
    policyId: netPolicy.id,
    basis: netPolicy.basis,
    status: "under_review",
    ...periodLines(netPolicy, [
      ["u-rp-01", 158000, 6000, 140000, 42000, 1.02],
      ["u-rp-02", 104000, 7000, 95000, 28000, 0.9],
      ["u-rp-03", 82000, 9000, 70000, 21000, 0.78],
      ["u-rp-04", 133000, 3000, 125000, 37000, 0.97],
      ["u-rp-05", 64000, 2000, 58000, 16000, 0.81],
      ["u-rp-07", 32000, 1000, 28000, 8000, 0.72],
    ]),
    createdAt: "2026-08-15T08:00:00Z",
    underReviewAt: "2026-08-15T13:00:00Z",
  },
];

export const bonusRuns: BonusRun[] = [
  {
    id: "br-2026-07",
    period: "2026-07",
    policyId: bonusPolicies[0].id,
    status: "draft",
    lines: [
      { repId: "u-rp-01", repName: repNames["u-rp-01"], metricValue: 0.95, qualifies: false, amount: 0 },
      { repId: "u-rp-02", repName: repNames["u-rp-02"], metricValue: 0.88, qualifies: false, amount: 0 },
      { repId: "u-rp-03", repName: repNames["u-rp-03"], metricValue: 0.72, qualifies: false, amount: 0 },
      { repId: "u-rp-04", repName: repNames["u-rp-04"], metricValue: 0.91, qualifies: false, amount: 0 },
    ],
    totalAmount: 0,
    createdAt: "2026-08-02T09:30:00Z",
  },
  {
    id: "br-2026-08",
    period: "2026-08",
    policyId: bonusPolicies[0].id,
    status: "draft",
    lines: [
      { repId: "u-rp-01", repName: repNames["u-rp-01"], metricValue: 1.02, qualifies: true, amount: 500 },
      { repId: "u-rp-02", repName: repNames["u-rp-02"], metricValue: 0.9, qualifies: false, amount: 0 },
      { repId: "u-rp-03", repName: repNames["u-rp-03"], metricValue: 0.78, qualifies: false, amount: 0 },
      { repId: "u-rp-04", repName: repNames["u-rp-04"], metricValue: 0.97, qualifies: false, amount: 0 },
      { repId: "u-rp-05", repName: repNames["u-rp-05"], metricValue: 0.81, qualifies: false, amount: 0 },
      { repId: "u-rp-07", repName: repNames["u-rp-07"], metricValue: 0.72, qualifies: false, amount: 0 },
    ],
    totalAmount: 500,
    createdAt: "2026-08-15T13:30:00Z",
  },
];
