/**
 * Enterprise Sales & Distribution ERP — Field Operations Supervisor Policies & Configuration.
 * 
 * All supervisor business rules, thresholds, feature toggles and workflow policies
 * MUST be policy-driven through this configuration. Never hardcode numbers or roles.
 */
export const supervisorPolicies = {
  /** Maximum representatives allowed per team (Configurable; default 10). */
  teamSizeLimit: 10,

  /** Supported planning periods for routes and targets (SUP-02 / SUP-03). */
  planningPeriods: ["daily", "weekly", "monthly", "yearly"] as const,

  /** Stock transfer between representatives policy (SUP-13). */
  stockTransferPolicy: {
    scope: "team" as const,
    productScope: "all" as "all" | "allowed_categories" | "catalog_only",
    quantityLimitPerTransaction: 500,
    approvalRequired: false,
    receivingRequired: true,
    ownTransfersAllowed: false,
  },

  /** Stock movement and cross-territory permissions. */
  crossTerritoryAllowed: true,

  /** Customer transfer configuration & historical debt responsibility (SUP-17 / SUP-18). */
  customerTransfer: {
    allowed: true,
    requiresApproval: false,
    debtResponsibility: "new_rep" as "previous_rep" | "new_rep" | "policy",
    preserveHistory: true,
  },

  /** Asset Request & Custody Approval Workflow (SUP-11 / SUP-12).
   * Fixed project rule: Supervisor creates the request, Sales Manager approves it.
   * Supervisor NEVER approves his own asset request.
   */
  assetApprovalWorkflow: {
    role: "SALES_MANAGER" as const,
    supervisorCannotApproveOwn: true,
    requiresReason: true,
    requiresAttachments: true,
  },

  /** GPS & Field Tracking Configuration (SUP-05 / SUP-06). */
  gps: {
    intervalMinutes: 5,
    showLiveVsSynced: true,
    offlineAfterMinutes: 30,
    deviationThresholdMeters: 200,
  },

  /** Conditional Feature Toggles (SUP-14 / SUP-15).
   * When false, the corresponding UI navigation and routes are hidden/disabled.
   */
  features: {
    supervisorWarehouse: true,
    supervisorCashBox: true,
    planningTargets: true,
    customerTransfers: true,
    communications: true,
    quantitativeTargets: true,
  },

  /** Communication scope (SUP-24): supervisor communicates with own team and sales manager. */
  communicationScope: {
    allowedRoles: ["REPRESENTATIVE", "SALES_MANAGER", "GENERAL_MANAGER"] as const,
    ownTeamOnly: true,
  },

  /** Planning & Approval roles. */
  planning: {
    planApprovalRole: "SUPERVISOR" as const,
    targetsApprovalRole: "SALES_MANAGER" as const,
    targetPeriods: ["daily", "weekly", "monthly", "yearly"] as const,
  },

  /** Daily closing & Reconciliation policy (SUP-14). */
  closing: {
    frequency: "daily" as const,
    varianceThresholdAmount: 50,
    varianceApprovalRequired: true,
  },

  /** Exception monitoring thresholds (Alerts generation). */
  exceptionThresholds: {
    lateVisitMinutes: 30,
    routeDeviationThresholdMeters: 300,
    debtOverdueDays: 90,
    stockVarianceThresholdQty: 5,
  },

  /** Active mock periods for data simulation. */
  activePeriod: {
    currentMonth: "2026-08",
    previousMonth: "2026-07",
  },

  /** Activity log settings. */
  activity: {
    readOnly: true,
  },
} as const;

/** System reference date for mock calculations. */
export const SYSTEM_TODAY = "2026-08-14";
export const SYSTEM_TIME = "10:35:00";
