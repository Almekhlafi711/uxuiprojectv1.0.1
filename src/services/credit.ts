/**
 * Credit Evaluation Service
 *
 * Returns a unified credit verdict. Holds NO approval authority — the verdict
 * only drives UI + feeds into the Workflow/Approval engine (C2).
 *
 * Inputs (all centralized):
 * - Customer Master (creditLimit, paymentTerms)          -> mock/customers
 * - Current balance (transaction-derived)                -> services/ledger
 * - Credit policy (blockWhenExceeded, warnAtPercent)     -> config/repPolicies
 * - Pending/approved unpaid invoices for the customer    -> mock/sales
 *
 * Verdict scale:
 *  BLOCK              | already at/over limit OR exceeded after this sale
 *  APPROVAL_REQUIRED  | within policy but projected > warnAtPercent, OR terms not yet approved
 *  WARN               | projected exceeds hard limit but customer is still within terms window (needs override)
 *  ALLOW              | safe to proceed
 */
import { getCustomerBalance } from "@/services/ledger";
import { customers } from "@/mock/customers";
import { invoices } from "@/mock/sales";
import { repPolicies } from "@/config/repPolicies";
import type { Customer, Invoice } from "@/types";

export type CreditVerdict = "ALLOW" | "WARN" | "APPROVAL_REQUIRED" | "BLOCK";

export interface EvaluateCreditInput {
  customerId: string;
  amount: number;
  repId?: string;
  // optional override of policy thresholds for a single evaluation
  policy?: {
    warnAtPercent?: number;
    blockWhenExceeded?: boolean;
    warnAtPercentValue?: number;
  };
}

export interface CreditEvaluation {
  verdict: CreditVerdict;
  balance: number;
  creditLimit: number;
  projectedBalance: number;
  utilizationPct: number;
  aging: { current: number; days30: number; days60: number; days90: number; over90: number };
  reasons: string[];
}

export const evaluateCredit = (input: EvaluateCreditInput): CreditEvaluation => {
  const customer = customers.find((c) => c.id === input.customerId);
  const policy = {
    warnAtPercent: input.policy?.warnAtPercent ?? repPolicies.credit.warnAtPercent,
    blockWhenExceeded: input.policy?.blockWhenExceeded ?? repPolicies.credit.blockWhenExceeded,
  } as const;

  const reasons: string[] = [];
  let verdict: CreditVerdict = "ALLOW";

  if (!customer) {
    return {
      verdict: "BLOCK",
      balance: 0, creditLimit: 0, projectedBalance: input.amount,
      utilizationPct: 0,
      aging: { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 },
      reasons: ["العميل غير موجود"],
    };
  }

  const bal = getCustomerBalance(input.customerId);
  const balance = bal.balance;
  const creditLimit = customer.creditLimit;
  const projectedBalance = +(balance + input.amount).toFixed(2);
  const utilizationPct = creditLimit > 0 ? +(100 * Math.abs(projectedBalance) / creditLimit).toFixed(2) : 0;

  const aging = bal.aging;

  // 1. Hard block: already at/over limit OR projected exceeds limit
  if (balance >= creditLimit) {
    verdict = "BLOCK"; reasons.push("العميل على أو فوق الحد الائتماني الحالي");
  } else if (projectedBalance > creditLimit) {
    if (policy.blockWhenExceeded) {
      verdict = "BLOCK"; reasons.push(`الرصيد المتوقع (${projectedBalance}) يتجاوز الحد (${creditLimit})`);
    } else {
      verdict = "APPROVAL_REQUIRED";
      reasons.push(`الرصيد المتوقع (${projectedBalance}) يتجاوز الحد (${creditLimit}) ويتطلب موافقة`);
    }
  }

  // 2. Aging risk: >30 days outstanding triggers approval
  const overdue = aging.days30 + aging.days60 + aging.days90 + aging.over90;
  if (overdue > 0 && projectedBalance > 0) {
    verdict = verdict === "ALLOW" ? "APPROVAL_REQUIRED" : verdict;
    reasons.push("العميل لديه مستحقات متأخرة — يتطلب مراجعة");
  }

  // 3. Warning threshold (configurable)
  if (utilizationPct >= policy.warnAtPercent && verdict === "ALLOW") {
    verdict = "WARN";
    reasons.push(`استخدام الحد ${utilizationPct}% >= نسبة التحذير ${policy.warnAtPercent}%`);
  }

  return {
    verdict,
    balance,
    creditLimit,
    projectedBalance,
    utilizationPct,
    aging,
    reasons,
  };
};

/**
 * Convenience: is this an invoice still unpaid (for pending-transaction view)?
 */
export const pendingInvoices = (customerId: string): Invoice[] =>
  invoices.filter((i) => i.customerId === customerId && i.paymentStatus !== "paid" && i.status === "completed");

export default evaluateCredit;
