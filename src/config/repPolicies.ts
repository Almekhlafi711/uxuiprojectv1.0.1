/**
 * Representative field module policies — DEPRECATED
 *
 * CONSOLIDATED INTO POLICY REGISTRY (Phase E).
 * All values now live in src/mock/policy.ts → policyConfig (lifecycle-managed).
 *
 * This module is kept for backward-compat; new code MUST read from the
 * policy registry via: import { policyConfig } from "@/mock/policy".
 */
import { policyConfig } from "@/mock/policy";

export const repPolicies = {
  vehicleAssignment: "optional" as "optional",
  gpsRequiredForTrip: policyConfig.gps.gpsRequiredForTrip,
  credit: policyConfig.credit,
  discount: policyConfig.discount,
  stockRequestIncreasesVanOnReceiptOnly: true,
  transferReceiptRequired: policyConfig.stock.transferReceiptRequired,
  countGeneratesAdjustment: policyConfig.stock.countGeneratesAdjustment,
  closingTabs: ["overview", "cash", "inventory", "expenses", "submit"] as const,
  closingRequiresTripCompleted: policyConfig.closing.closingRequiresTripCompleted,
  expenses: policyConfig.expenses,
  sync: policyConfig.sync,
  messagesAllowedRoles: ["SUPERVISOR", "SALES_MANAGER"] as const,
} as const;
