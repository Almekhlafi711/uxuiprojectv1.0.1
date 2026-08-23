/**
 * Enterprise Sales & Distribution ERP — Central Authority
 *
 * Single source of truth for:
 *  - RoleCatalog (roles + authority class + scope classification)
 *  - PermissionMatrix (entity.action permissions — fine-grained, lifecycle-aware)
 *  - DataScopeMatrix (default data scope per role; fail-closed)
 *  - SoDMatrix (conflicting permission pairs)
 *
 * Replaces the old scattered `rolePermissions`, `roleLevel`, `roleLabel`,
 * and `supervisorPolicies.features` defaults.
 *
 * Permission keys use the canonical vocabulary from `permissionCatalog`
 * (src/mock/users.ts) so all existing `can(...)` call sites remain valid.
 *
 * Business Decisions encoded:
 *  - SYS is technical authority only (Ch 3 §3.7.6).
 *  - GM is administrative/business, NOT technical. No role inherits another.
 *  - DataScope fails closed: unknown role -> "none" (no data).
 *  - SM has NO `sales.cancel` on Posted invoices (cancellation = workflow).
 *  - SYS has NO business permissions (credit.approve / sales.cancel / commission.approve).
 */
import type { Role, AuthorityClass } from "@/types";

export type ScopeType =
  | "none"
  | "self"
  | "team"
  | "branch"
  | "entity"
  | "network"
  | "people"
  | "read"
  | "system"
  | "admin";

/** Permission key — uses canonical catalog strings (e.g. "customers.view", "sales.cancel"). */
export type PermissionKey = string;

export interface RoleSpec {
  id: Role;
  nameAr: string;
  description: string;
  level: number;
  authority: AuthorityClass;
  scope: ScopeType;
  permissions: PermissionKey[];
}

/** Representative: field operations, own data only. */
const repPerms: PermissionKey[] = [
  "dashboard.view",
  "customers.view",
  "products.view", "pricing.view",
  "sales.view", "sales.create",
  "collections.view", "collections.create", "collections.submit",
  "returns.view", "returns.create", "returns.submit",
  "inventory.view", "inventory.request", "inventory.transfer.submit",
  "custody.view",
  "cash.view",
  "routes.view",
  "visits.view", "visits.create",
  "gps.view",
  "targets.view",
  "messages.view",
  "reports.view",
  "leaves.view", "leaves.create",
  "archive.view",
  "commission.view", "bonus.view",
  "loading.view", "loading.receive",
  "count.view", "count.create",
  "deposit.view", "deposit.create",
  "stock_request.view", "stock_request.create",
  "closing.view", "closing.create",
  "trips.view", "trips.start",
  "sync.view",
  "targets.org.view", "targets.org.create",
  "expenses.view", "expenses.create",
];

/** Supervisor: team monitoring, operational authority over own reps. */
const supPerms: PermissionKey[] = [
  "dashboard.view",
  "customers.view", "customers.transfer", "customers.deactivate",
  "products.view", "pricing.view",
  "sales.view", "sales.cancel",
  "collections.view", "collections.approve", "collections.reject",
  "returns.view", "returns.approve", "returns.inspect",
  "inventory.view", "inventory.transfer",
  "custody.view",
  "cash.view", "cash.settle",
  "routes.view", "routes.create", "routes.approve",
  "visits.view",
  "gps.view",
  "targets.view", "targets.create",
  "approvals.view", "approvals.review",
  "customer_ledger.view",
  "reports.view",
  "messages.view",
  "leaves.view", "leaves.approve",
  "archive.view", "archive.edit",
  "commission.view", "bonus.view",
  "supervisor.team", "supervisor.planning", "supervisor.field",
  "supervisor.customers", "supervisor.inventory", "supervisor.cash",
  "supervisor.assets", "supervisor.comms", "supervisor.requests", "supervisor.activity",
];

/** Sales Manager: branch operations, planning, approvals — NOT technical. */
const smPerms: PermissionKey[] = [
  "dashboard.view",
  "customers.view", "customers.create", "customers.edit", "customers.transfer", "customers.deactivate", "customers.assign",
  "products.view", "products.edit", "pricing.view", "pricing.approve",
  "sales.view", "sales.cancel",
  "collections.view", "collections.create", "collections.approve", "collections.reject",
  "returns.view", "returns.approve",
  "inventory.view", "inventory.transfer", "inventory.count",
  "custody.view", "custody.manage",
  "cash.view", "cash.settle",
  "routes.view", "routes.create", "routes.approve",
  "visits.view",
  "gps.view",
  "targets.view", "targets.create", "targets.approve",
  "credit.view", "credit.approve",
  "discount.approve",
  "approvals.view", "approvals.review",
  "customer_ledger.view",
  "profitability.view",
  "reports.view", "reports.export",
  "messages.view",
  "leaves.view", "leaves.approve",
  "archive.view", "archive.edit",
  "commission.view", "commission.export",
  "bonus.view",
  "audit.view",
  "distributor.view", "distributor.manage",
  "trips.view", "closing.view", "sync.view", "expenses.view", "loading.view",
  "count.view", "deposit.view",
  "targets.org.view",
];

/** Distribution Officer: manages distributor network (own branch chain). */
const doPerms: PermissionKey[] = [
  "dashboard.view",
  "distributor.view", "distributor.manage",
  "inventory.view", "inventory.transfer",
  "routes.view", "routes.create", "routes.approve",
  "visits.view",
  "gps.view",
  "targets.view",
  "reports.view",
  "messages.view",
  "approvals.view",
  "profitability.view",
  "customers.view",
];

/** Distributor: own entity only. */
const distPerms: PermissionKey[] = [
  "dashboard.view",
  "distributor.view",
  "sales.view",
  "inventory.view",
  "customers.view",
  "reports.view",
  "messages.view",
  "profitability.view",
  "collections.view",
];

/** Finance: financial scope across entities — NO technical/admin perms. */
const finPerms: PermissionKey[] = [
  "dashboard.view",
  "customers.view",
  "sales.view",
  "collections.view",
  "returns.view",
  "inventory.view",
  "cash.view", "cash.settle",
  "credit.view",
  "approvals.view",
  "profitability.view",
  "reports.view", "reports.export",
  "commission.view", "commission.approve", "commission.export",
  "bonus.view", "bonus.approve",
  "archive.view",
  "messages.view",
  "customer_ledger.view",
  "expenses.view", "closing.view",
  "audit.view",
];

/** General Manager: enterprise admin + business — NOT technical (no users.manage, no sync). */
const gmPerms: PermissionKey[] = [
  "dashboard.view",
  "customers.view", "customers.create", "customers.edit", "customers.transfer", "customers.deactivate", "customers.assign",
  "products.view", "products.edit", "pricing.view", "pricing.approve",
  "sales.view", "sales.cancel",
  "collections.view", "collections.create", "collections.approve", "collections.reject",
  "returns.view", "returns.approve",
  "inventory.view", "inventory.transfer", "inventory.count",
  "custody.view", "custody.manage",
  "cash.view", "cash.settle",
  "routes.view", "routes.approve",
  "visits.view",
  "gps.view",
  "targets.view", "targets.approve",
  "credit.view", "credit.approve",
  "discount.approve",
  "approvals.view", "approvals.review",
  "customer_ledger.view",
  "profitability.view",
  "reports.view", "reports.export",
  "messages.view",
  "leaves.view", "leaves.approve",
  "archive.view", "archive.edit", "archive.override",
  "commission.view", "commission.approve", "commission.export",
  "bonus.view", "bonus.approve",
  "audit.view",
  "distributor.view", "distributor.manage",
  "trips.view", "closing.view", "sync.view", "expenses.view", "loading.view",
  "count.view", "deposit.view",
  "targets.org.view",
  "users.view",
  "settings.view", "settings.manage",
  "organization.manage",
];

/** System Administrator: technical authority ONLY — no business approvals. */
const sysPerms: PermissionKey[] = [
  "dashboard.view",
  "users.view", "users.manage",
  "roles.manage",
  "organization.manage",
  "settings.view", "settings.manage",
  "sync.view",
  "audit.view",
  "integration.view", "integration.manage",
  "policy.manage",
];

/** Auditor: read-only across operational data — NO writes. */
const audPerms: PermissionKey[] = [
  "dashboard.view",
  "audit.view",
  "customers.view",
  "sales.view",
  "collections.view",
  "returns.view",
  "inventory.view",
  "cash.view",
  "approvals.view",
  "profitability.view",
  "reports.view",
  "archive.view",
  "custody.view",
  "routes.view", "visits.view", "gps.view", "targets.view",
  "credit.view",
  "messages.view",
  "users.view",
  "distributor.view",
  "commission.view", "bonus.view",
  "customer_ledger.view",
  "integration.view",
];

/** HR: people + administrative — NO commercial/operational data. */
const hrPerms: PermissionKey[] = [
  "dashboard.view",
  "customers.view",
  "leaves.view", "leaves.create", "leaves.approve",
  "users.view", "users.manage",
  "roles.manage",
  "organization.manage",
  "messages.view",
  "archive.view",
  "reports.view",
  "audit.view",
  "settings.view",
  "routes.view",
  "expenses.view",
];

/** Warehouse Keeper: inventory operations for a branch. */
const whPerms: PermissionKey[] = [
  "dashboard.view",
  "inventory.view", "inventory.transfer", "inventory.count",
  "cash.view",
  "custody.view",
  "routes.view",
  "reports.view",
  "messages.view",
  "audit.view",
];

const roleCatalog: Record<Role, RoleSpec> = {
  REPRESENTATIVE: {
    id: "REPRESENTATIVE",
    nameAr: "المندوب",
    description: "العمل الميداني: الزيارات، المبيعات، التحصيل، المخزون المتحرك، الصندوق",
    level: 4,
    authority: "operational",
    scope: "self",
    permissions: repPerms,
  },
  SUPERVISOR: {
    id: "SUPERVISOR",
    nameAr: "المشرف",
    description: "إدارة فريق المناديب ضمن نطاقه: خطط السير، GPS، الموافقات، التحصيل",
    level: 3,
    authority: "operational",
    scope: "team",
    permissions: supPerms,
  },
  SALES_MANAGER: {
    id: "SALES_MANAGER",
    nameAr: "مدير المبيعات",
    description: "إدارة المبيعات والربحية والمناطق واعتماد الخطط والأهداف والحدود الائتمانية",
    level: 2,
    authority: "operational-administrative",
    scope: "branch",
    permissions: smPerms,
  },
  DISTRIBUTION_OFFICER: {
    id: "DISTRIBUTION_OFFICER",
    nameAr: "مسؤول التوزيع",
    description: "إدارة شبكة الموزعين والمبيعات عبر قناة التوزيع",
    level: 2,
    authority: "operational",
    scope: "network",
    permissions: doPerms,
  },
  DISTRIBUTOR: {
    id: "DISTRIBUTOR",
    nameAr: "موزع",
    description: "نقطة بيع/مخزن موزع يدير مخزونه ومبيعاته الخاصة",
    level: 4,
    authority: "operational",
    scope: "entity",
    permissions: distPerms,
  },
  WAREHOUSE: {
    id: "WAREHOUSE",
    nameAr: "أمين المستودع",
    description: "إدارة مخزون المستودع والاستلام والتحويلات",
    level: 3,
    authority: "operational",
    scope: "branch",
    permissions: whPerms,
  },
  FINANCE: {
    id: "FINANCE",
    nameAr: "الشؤون المالية",
    description: "الحسابات، التحصيل، التسوية، التقارير المالية، الموازنة",
    level: 2,
    authority: "business",
    scope: "network",
    permissions: finPerms,
  },
  GENERAL_MANAGER: {
    id: "GENERAL_MANAGER",
    nameAr: "المدير العام",
    description: "الإدارة العليا للنظام: الحوكمة، الاعتمادات العليه، إدارة المناطق والموظفين",
    level: 1,
    authority: "administrative",
    scope: "admin",
    permissions: gmPerms,
  },
  SYSTEM_ADMIN: {
    id: "SYSTEM_ADMIN",
    nameAr: "مسؤول النظام",
    description: "السلطة التقنية: الإعدادات، المستخدمون/أدوار (تقني)، التكامل، الصحة العامة",
    level: 0,
    authority: "technical",
    scope: "system",
    permissions: sysPerms,
  },
  AUDITOR: {
    id: "AUDITOR",
    nameAr: "محاسب تديقي",
    description: "مراجعة وتدقيق العمليات والسجلات بصلاحية قراءة فقط",
    level: 2,
    authority: "compliance",
    scope: "read",
    permissions: audPerms,
  },
  HR: {
    id: "HR",
    nameAr: "الموارد البشرية",
    description: "الموظفون، العقود، الإجازات، بيانات الأجور",
    level: 2,
    authority: "administrative",
    scope: "people",
    permissions: hrPerms,
  },
};

export { roleCatalog };

/** Permission lookup: true if role has permission. */
export const hasPermission = (role: Role, permission: PermissionKey): boolean => {
  const perms = roleCatalog[role]?.permissions;
  if (!perms) return false;
  return perms.includes(permission);
};

/** Backward-compat can() — accepts any permission string. */
export const can = (permission: string, role: Role): boolean => {
  const catalog = roleCatalog[role];
  if (!catalog) return false;
  return catalog.permissions.includes(permission);
};

export const roleLabel: Record<Role, string> = {
  REPRESENTATIVE: "المندوب",
  SUPERVISOR: "المشرف",
  SALES_MANAGER: "مدير المبيعات",
  DISTRIBUTION_OFFICER: "مسؤول التوزيع",
  DISTRIBUTOR: "موزع",
  WAREHOUSE: "أمين المستودع",
  FINANCE: "الشؤون المالية",
  GENERAL_MANAGER: "المدير العام",
  SYSTEM_ADMIN: "مسؤول النظام",
  AUDITOR: "محاسب تديقي",
  HR: "الموارد البشرية",
};

export const roleLevel: Record<Role, number> = {
  SYSTEM_ADMIN: 0,
  GENERAL_MANAGER: 1,
  SALES_MANAGER: 2,
  DISTRIBUTION_OFFICER: 2,
  FINANCE: 2,
  AUDITOR: 2,
  HR: 2,
  WAREHOUSE: 3,
  SUPERVISOR: 3,
  DISTRIBUTOR: 4,
  REPRESENTATIVE: 4,
};

/**
 * DataScopeMatrix — default data scope per role.
 * FAIL-CLOSED: any role not listed here gets "none" (no data).
 */
export const dataScopeOf: Record<Role, ScopeType> = {
  REPRESENTATIVE: "self",
  SUPERVISOR: "team",
  SALES_MANAGER: "branch",
  DISTRIBUTION_OFFICER: "network",
  DISTRIBUTOR: "entity",
  WAREHOUSE: "branch",
  FINANCE: "network",
  GENERAL_MANAGER: "admin",
  SYSTEM_ADMIN: "system",
  AUDITOR: "read",
  HR: "people",
};

/** Separation of Duties: pairs of permissions that must not coexist on the same role for the same document lifecycle. */
export const sodMatrix: ReadonlyArray<{ a: PermissionKey; b: PermissionKey; reason: string }> = [
  { a: "sales.create", b: "approvals.review", reason: "Sales creator must not self-approve" },
  { a: "sales.cancel", b: "cash.settle", reason: "Cancellation must not settle the same cash" },
  { a: "discount.approve", b: "sales.create", reason: "Discount approver must not originate the sale" },
  { a: "credit.approve", b: "sales.create", reason: "Credit override must not originate the sale" },
  { a: "archive.edit", b: "archive.override", reason: "Editor must not override own archive change" },
  { a: "commission.approve", b: "commission.export", reason: "Commission approver must not export own run" },
];

/**
 * Workflow state matrix — defines allowed transitions per entity lifecycle.
 * Prevents invalid state changes (e.g. Posted → Draft, Cancelled → Approved).
 */
export interface WorkflowTransition {
  from: string;
  to: string;
  roles: string[];
  action: string;
  scope: string;
}

export const workflowMatrix: Readonly<Record<string, ReadonlyArray<WorkflowTransition>>> = {
  sales_order: [
    { from: "draft", to: "submitted", roles: ["REPRESENTATIVE"], action: "submit", scope: "self" },
    { from: "submitted", to: "approved", roles: ["SUPERVISOR"], action: "approve", scope: "team" },
    { from: "submitted", to: "returned", roles: ["SUPERVISOR"], action: "return", scope: "team" },
    { from: "approved", to: "posted", roles: ["WAREHOUSE"], action: "post", scope: "branch" },
    { from: "posted", to: "cancelled", roles: ["SALES_MANAGER"], action: "cancel", scope: "branch" },
  ],
  invoice: [
    { from: "draft", to: "submitted", roles: ["REPRESENTATIVE"], action: "submit", scope: "self" },
    { from: "submitted", to: "completed", roles: ["WAREHOUSE"], action: "complete", scope: "branch" },
    { from: "completed", to: "cancelled", roles: ["SALES_MANAGER"], action: "cancel", scope: "branch" },
    { from: "submitted", to: "cancelled", roles: ["SALES_MANAGER"], action: "cancel", scope: "branch" },
  ],
  collection: [
    { from: "draft", to: "submitted", roles: ["REPRESENTATIVE"], action: "submit", scope: "self" },
    { from: "submitted", to: "approved", roles: ["SUPERVISOR"], action: "approve", scope: "team" },
    { from: "submitted", to: "rejected", roles: ["SUPERVISOR"], action: "reject", scope: "team" },
  ],
  archive: [
    { from: "draft", to: "submitted", roles: ["REPRESENTATIVE"], action: "submit", scope: "self" },
    { from: "submitted", to: "under_review", roles: ["SUPERVISOR"], action: "review", scope: "team" },
    { from: "under_review", to: "approved", roles: ["SALES_MANAGER"], action: "approve", scope: "branch" },
    { from: "approved", to: "locked", roles: ["GENERAL_MANAGER"], action: "lock", scope: "all" },
    { from: "draft", to: "rejected", roles: ["SUPERVISOR"], action: "reject", scope: "team" },
  ],
  commission_run: [
    { from: "provisional", to: "under_review", roles: ["FINANCE"], action: "submit", scope: "network" },
    { from: "under_review", to: "final", roles: ["SALES_MANAGER"], action: "finalize", scope: "branch" },
    { from: "final", to: "approved", roles: ["GENERAL_MANAGER"], action: "approve", scope: "all" },
    { from: "approved", to: "exported", roles: ["FINANCE"], action: "export", scope: "network" },
  ],
  return: [
    { from: "draft", to: "submitted", roles: ["REPRESENTATIVE"], action: "submit", scope: "self" },
    { from: "submitted", to: "inspection", roles: ["WAREHOUSE"], action: "inspect", scope: "branch" },
    { from: "inspection", to: "approved", roles: ["WAREHOUSE"], action: "approve", scope: "branch" },
    { from: "inspection", to: "rejected", roles: ["WAREHOUSE"], action: "reject", scope: "branch" },
    { from: "inspection", to: "returned_for_correction", roles: ["WAREHOUSE"], action: "return_for_correction", scope: "branch" },
    { from: "returned_for_correction", to: "submitted", roles: ["REPRESENTATIVE"], action: "resubmit", scope: "self" },
    { from: "approved", to: "posted", roles: ["WAREHOUSE"], action: "post", scope: "branch" },
  ],
  stock_transfer: [
    { from: "draft", to: "submitted", roles: ["WAREHOUSE"], action: "submit", scope: "branch" },
    { from: "submitted", to: "approved", roles: ["WAREHOUSE", "SALES_MANAGER"], action: "approve", scope: "branch" },
    { from: "approved", to: "sent", roles: ["WAREHOUSE"], action: "send", scope: "branch" },
    { from: "sent", to: "in_transit", roles: ["WAREHOUSE"], action: "transit", scope: "branch" },
    { from: "in_transit", to: "received", roles: ["WAREHOUSE", "REPRESENTATIVE"], action: "receive", scope: "branch" },
    { from: "received", to: "accepted", roles: ["WAREHOUSE", "SALES_MANAGER"], action: "accept", scope: "branch" },
    { from: "in_transit", to: "rejected", roles: ["WAREHOUSE"], action: "reject", scope: "branch" },
    { from: "approved", to: "returned_for_correction", roles: ["WAREHOUSE"], action: "return_for_correction", scope: "warehouse" },
    { from: "returned_for_correction", to: "submitted", roles: ["REPRESENTATIVE"], action: "resubmit", scope: "territory" },
  ],
  stock_request: [
    { from: "draft", to: "submitted", roles: ["WAREHOUSE", "REPRESENTATIVE"], action: "submit", scope: "warehouse" },
    { from: "submitted", to: "approved", roles: ["WAREHOUSE", "SALES_MANAGER"], action: "approve", scope: "warehouse" },
    { from: "submitted", to: "rejected", roles: ["WAREHOUSE", "SALES_MANAGER"], action: "reject", scope: "warehouse" },
  ],
  daily_closing: [
    { from: "draft", to: "submitted", roles: ["REPRESENTATIVE"], action: "submit", scope: "territory" },
    { from: "submitted", to: "approved", roles: ["SUPERVISOR", "SALES_MANAGER"], action: "approve", scope: "territory" },
    { from: "submitted", to: "returned", roles: ["SUPERVISOR"], action: "return", scope: "territory" },
    { from: "returned", to: "submitted", roles: ["REPRESENTATIVE"], action: "resubmit", scope: "territory" },
  ],
  route_plan: [
    { from: "draft", to: "submitted", roles: ["REPRESENTATIVE"], action: "submit", scope: "territory" },
    { from: "submitted", to: "approved", roles: ["SUPERVISOR"], action: "approve", scope: "territory" },
    { from: "submitted", to: "rejected", roles: ["SUPERVISOR"], action: "reject", scope: "territory" },
  ],
  target: [
    { from: "draft", to: "submitted", roles: ["SALES_MANAGER", "SUPERVISOR"], action: "submit", scope: "all" },
    { from: "submitted", to: "approved", roles: ["GENERAL_MANAGER"], action: "approve", scope: "all" },
    { from: "submitted", to: "rejected", roles: ["GENERAL_MANAGER"], action: "reject", scope: "all" },
  ],
  custody: [
    { from: "draft", to: "issued", roles: ["GENERAL_MANAGER", "SYSTEM_ADMIN"], action: "issue", scope: "all" },
    { from: "issued", to: "returned", roles: ["REPRESENTATIVE", "SUPERVISOR"], action: "return", scope: "territory" },
    { from: "issued", to: "transferred", roles: ["SUPERVISOR"], action: "transfer", scope: "territory" },
  ],
  asset_request: [
    { from: "draft", to: "submitted", roles: ["REPRESENTATIVE", "SUPERVISOR"], action: "submit", scope: "territory" },
    { from: "submitted", to: "approved", roles: ["SALES_MANAGER", "GENERAL_MANAGER"], action: "approve", scope: "all" },
    { from: "submitted", to: "rejected", roles: ["SALES_MANAGER", "GENERAL_MANAGER"], action: "reject", scope: "all" },
  ],
  customer_transfer: [
    { from: "pending", to: "approved", roles: ["SUPERVISOR", "SALES_MANAGER"], action: "approve", scope: "territory" },
    { from: "pending", to: "rejected", roles: ["SUPERVISOR", "SALES_MANAGER"], action: "reject", scope: "territory" },
    { from: "approved", to: "executed", roles: ["SYSTEM_ADMIN"], action: "execute", scope: "all" },
  ],
  deposit: [
    { from: "pending", to: "approved", roles: ["SUPERVISOR"], action: "approve", scope: "territory" },
    { from: "pending", to: "rejected", roles: ["SUPERVISOR"], action: "reject", scope: "territory" },
  ],
  leave: [
    { from: "pending", to: "under_review", roles: ["SUPERVISOR"], action: "review", scope: "territory" },
    { from: "under_review", to: "approved", roles: ["SUPERVISOR", "SALES_MANAGER"], action: "approve", scope: "territory" },
    { from: "under_review", to: "rejected", roles: ["SUPERVISOR", "SALES_MANAGER"], action: "reject", scope: "territory" },
  ],
};

export default roleCatalog;
