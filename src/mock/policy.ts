/**
 * Enterprise Sales & Distribution ERP — Policy Registry
 *
 * Policies are versioned, lifecycle-managed, auditable.
 * Lifecycle: draft -> submitted -> under_review -> approved -> published
 *            -> effective -> superseded -> archived
 *
 * Only one policy per category may be `effective` at a time.
 * Published/effective policies are IMMUTABLE — changes create a new version.
 *
 * Central configuration authority (replaces scattered `supervisorPolicies`
 * feature flags → consolidated into policy features).
 */
import type { Role } from "@/types";

export type PolicyStatus =
  | "draft"
  | "returned"
  | "submitted"
  | "under_review"
  | "approved"
  | "published"
  | "effective"
  | "superseded"
  | "archived";

export interface PolicyAuditEntry {
  at: string;
  by: string;
  role: Role;
  action: "create" | "submit" | "review" | "approve" | "publish" | "effect" | "supersede" | "archive" | "change_reason";
  note?: string;
  oldValue?: string;
  newValue?: string;
}

export interface PolicyDocument<T = any> {
  id: string;
  number: string;
  name: string;
  category: string;
  owner: Role;
  version: number;
  status: PolicyStatus;
  content: T;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedBy?: string;
  publishedAt?: string;
  supersededById?: string;
  changeReason?: string;
  auditTrail: PolicyAuditEntry[];
}

export interface PolicyConfig {
  credit: { warnAtPercent: number; blockWhenExceeded: boolean };
  discount: { maxRateWithoutApproval: number; approvalThresholdAmount: number };
  stock: { transferReceiptRequired: boolean; countGeneratesAdjustment: boolean };
  gps: { gpsRequiredForTrip: boolean };
  closing: { closingRequiresTripCompleted: boolean };
  expenses: { maxWithoutApproval: number };
  distributor: { type: "internal" | "external" | "managed"; allowSellOut: boolean };
  costMethod: "moving_average" | "standard" | "fifo";
  debtResponsibility: "previous_rep" | "new_rep" | "policy";
  sync: { autoSync: boolean; offlineQueue: boolean; retryMax: number };
  /** Feature toggles — consolidated from supervisorPolicies.features. */
  features: {
    supervisorWarehouse: boolean;
    supervisorCashBox: boolean;
    planningTargets: boolean;
    customerTransfers: boolean;
    communications: boolean;
    quantitativeTargets: boolean;
  };
}

const defaultConfig: PolicyConfig = {
  credit: { warnAtPercent: 90, blockWhenExceeded: true },
  discount: { maxRateWithoutApproval: 5, approvalThresholdAmount: 500 },
  stock: { transferReceiptRequired: true, countGeneratesAdjustment: true },
  gps: { gpsRequiredForTrip: true },
  closing: { closingRequiresTripCompleted: false },
  expenses: { maxWithoutApproval: 200 },
  distributor: { type: "managed", allowSellOut: true },
  costMethod: "moving_average",
  debtResponsibility: "policy",
  sync: { autoSync: true, offlineQueue: true, retryMax: 3 },
  features: {
    supervisorWarehouse: true,
    supervisorCashBox: true,
    planningTargets: true,
    customerTransfers: true,
    communications: true,
    quantitativeTargets: true,
  },
};

const now = () => new Date().toISOString();

/** Seed — version 1, created by initial admin. */
const seedPolicy: PolicyDocument<PolicyConfig> = {
  id: "pol-erp-main",
  number: "POL-0001",
  name: "Enterprise Sales & Distribution ERP — Operational Policy",
  category: "erp_operational",
  owner: "GENERAL_MANAGER",
  version: 1,
  status: "effective",
  content: defaultConfig,
  effectiveFrom: "2026-01-01",
  createdBy: "خالد بن عبدالله العتيبي",
  createdAt: "2026-01-01T00:00:00Z",
  approvedBy: "خالد بن عبدالله العتيبي",
  approvedAt: "2026-01-01T00:00:00Z",
  publishedBy: "خالد بن عبدالله العتيبي",
  publishedAt: "2026-01-01T00:00:00Z",
  auditTrail: [
    { at: "2026-01-01T00:00:00Z", by: "خالد بن عبدالله العتيبي", role: "GENERAL_MANAGER", action: "create" },
    { at: "2026-01-01T00:00:00Z", by: "خالد بن عبدالله العتيبي", role: "GENERAL_MANAGER", action: "approve" },
    { at: "2026-01-01T00:00:00Z", by: "خالد بن عبدالله العتيبي", role: "GENERAL_MANAGER", action: "publish" },
    { at: "2026-01-01T00:00:00Z", by: "خالد بن عبدالله العتيبي", role: "GENERAL_MANAGER", action: "effect" },
  ],
};

export const policyRegistry: PolicyDocument<PolicyConfig>[] = [seedPolicy];

/** The currently effective policy (read-only for non-SYS). */
export const policyConfig: PolicyConfig = defaultConfig;

/** Backward-compat: active version number. */
export const policyConfigVersion = seedPolicy.version;

export type PolicySection = keyof PolicyConfig;

/**
 * Lifecycle actions — only Draft policies are mutable.
 * Published/effective policies cannot be directly mutated.
 */
const immutable: PolicyStatus[] = ["published", "effective", "superseded", "archived"];

export const canEditPolicy = (policy: PolicyDocument, role: Role): boolean => {
  if (immutable.includes(policy.status)) return false;
  if (role === "SYSTEM_ADMIN") return true;
  if (role === policy.owner && (policy.status === "draft" || policy.status === "returned")) return true;
  return false;
};

/** Create a new draft version from the current effective policy. */
export const createPolicyVersion = (category: string, patch: Partial<PolicyConfig>, by: string, role: Role): PolicyDocument<PolicyConfig> => {
  if (role !== "SYSTEM_ADMIN" && role !== seedPolicy.owner) {
    throw new Error("غير مصرح بإنشاء نسخة جديدة من السياسة");
  }
  const nextVersion = policyRegistry.filter((p) => p.category === category).length + 1;
  const newPolicy: PolicyDocument<PolicyConfig> = {
    id: `pol-${category}-${nextVersion}`,
    number: `POL-${String(nextVersion).padStart(4, "0")}`,
    name: `Operational Policy v${nextVersion}`,
    category,
    owner: "GENERAL_MANAGER",
    version: nextVersion,
    status: "draft",
    content: { ...defaultConfig, ...patch },
    createdBy: by,
    createdAt: now(),
    auditTrail: [
      { at: now(), by, role, action: "create", note: "New version branched from effective policy" },
    ],
  };
  policyRegistry.push(newPolicy);
  return { ...newPolicy };
};

export const submitPolicy = (id: string, by: string, role: Role): PolicyDocument<PolicyConfig> => {
  const policy = policyRegistry.find((p) => p.id === id);
  if (!policy) throw new Error("السياسة غير موجودة");
  if (policy.status !== "draft" && policy.status !== "returned") throw new Error("لا يمكن إرسال السياسة في حالة " + policy.status);
  if (role !== "SYSTEM_ADMIN" && role !== policy.owner) throw new Error("غير مصرح بإرسال هذه السياسة");
  policy.status = "submitted";
  policy.auditTrail.push({ at: now(), by, role, action: "submit" });
  return { ...policy };
};

export const approvePolicy = (id: string, by: string, role: Role): PolicyDocument<PolicyConfig> => {
  const policy = policyRegistry.find((p) => p.id === id);
  if (!policy) throw new Error("السياسة غير موجودة");
  if (policy.status !== "submitted" && policy.status !== "under_review") throw new Error("لا يمكن اعتماد السياسة في حالة " + policy.status);
  if (role !== "GENERAL_MANAGER") throw new Error("يجب اعتماد السياسة من قبل المدير العام");
  policy.status = "approved";
  policy.approvedBy = by;
  policy.approvedAt = now();
  policy.auditTrail.push({ at: now(), by, role, action: "approve" });
  return { ...policy };
};

export const publishPolicy = (id: string, by: string, role: Role): PolicyDocument<PolicyConfig> => {
  const policy = policyRegistry.find((p) => p.id === id);
  if (!policy) throw new Error("السياسة غير موجودة");
  if (policy.status !== "approved") throw new Error("يجب اعتماد السياسة قبل النشر");
  if (role !== "GENERAL_MANAGER") throw new Error("يجب نشر السياسة من قبل المدير العام");
  const prevEffective = policyRegistry.find((p) => p.category === policy.category && p.status === "effective");
  if (prevEffective) {
    prevEffective.status = "superseded";
    prevEffective.supersededById = policy.id;
    prevEffective.auditTrail.push({ at: now(), by, role, action: "supersede", note: `Superseded by ${policy.id}` });
  }
  policy.status = "effective";
  policy.effectiveFrom = now();
  policy.publishedBy = by;
  policy.publishedAt = now();
  policy.auditTrail.push({ at: now(), by, role, action: "publish" }, { at: now(), by, role, action: "effect" });
  return { ...policy };
};

export const getPolicy = (role: Role): PolicyDocument<PolicyConfig> => {
  if (role !== "SYSTEM_ADMIN" && role !== "GENERAL_MANAGER" && role !== "AUDITOR") {
    throw new Error("غير مصرح بعرض السياسات");
  }
  return { ...seedPolicy };
};

export const getPolicyHistory = (category: string, role: Role): PolicyDocument<PolicyConfig>[] => {
  if (role !== "SYSTEM_ADMIN" && role !== "GENERAL_MANAGER" && role !== "AUDITOR") {
    throw new Error("غير مصرح بعرض تاريخ السياسات");
  }
  return policyRegistry.filter((p) => p.category === category).map((p) => ({ ...p }));
};
