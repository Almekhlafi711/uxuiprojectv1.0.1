/**
 * Row-level data-scope enforcement.
 *
 * Authority model (see src/config/authority.ts):
 *  - REPRESENTATIVE -> self        (own data + assigned customers)
 *  - SUPERVISOR    -> team          (own reps + their customers)
 *  - SALES_MANAGER -> branch        (branch data; company-wide views only via explicit permission)
 *  - DISTRIBUTION_OFFICER -> network (own distributor chain only)
 *  - DISTRIBUTOR    -> entity       (own entity only)
 *  - WAREHOUSE      -> branch       (warehouse branch)
 *  - FINANCE        -> network      (financial scope across entities)
 *  - GENERAL_MANAGER -> admin       (enterprise management)
 *  - SYSTEM_ADMIN   -> system       (technical configuration)
 *  - AUDITOR        -> read         (read-only company-wide — no writes)
 *  - HR             -> people       (employees, leaves, payroll)
 *
 * FAIL-CLOSED: any role not in the matrix below resolves to scopeType "none"
 * → `visibleRepIds` / `visibleUserIds` / `canAccess*` return **empty** by default.
 * Never fall back to "company" silently.
 */
import { users } from "@/mock/users";
import { cashBoxes } from "@/mock/cash";
import { distributors } from "@/mock/organization";
import type {
  ApprovalRequest,
  ArchiveRecord,
  CashBox,
  CashMovement,
  Collection,
  Conversation,
  Customer,
  CustodyRecord,
  Distributor,
  GpsLocation,
  Invoice,
  LeaveRequest,
  Notification,
  ProfitabilityRecord,
  ReturnRecord,
  RoutePlan,
  StockMovement,
  StockRequest,
  StockTransfer,
  Target,
  Territory,
  User,
  VanStock,
  Visit,
} from "@/types";
import { dataScopeOf } from "@/config/authority";
import type { Role } from "@/types";
import type { ScopeType } from "@/config/authority";

export interface DataScope {
  role: Role;
  userId: string;
  scopeType: ScopeType;
  territoryId?: string;
  branchId?: string;
  supervisorId?: string;
  entityId?: string;
  networkId?: string;
}

export const getDataScope = (user: User | null | undefined): DataScope | null => {
  if (!user) return null;
  const scopeType = dataScopeOf[user.role];
  const base: DataScope = {
    role: user.role,
    userId: user.id,
    scopeType,
    territoryId: user.territoryId,
    branchId: user.branchId,
    supervisorId: user.supervisorId,
    entityId: user.distributorId,
    networkId: user.branchId,
  };
  if (scopeType === "none") {
    return { ...base, scopeType: "none" };
  }
  return base;
};

const inScope = (scope: DataScope, userId: string | undefined): boolean => {
  if (!userId) return false;
  const scopeType = scope.scopeType;
  if (scopeType === "none") return false;
  if (scopeType === "system" || scopeType === "admin") return true;
  if (scopeType === "read") return true;
  if (scopeType === "people") return true;
  return visibleUserIds(scope).includes(userId);
};

export const visibleRepIds = (scope: DataScope): string[] => {
  if (scope.scopeType === "none") return [];
  switch (scope.scopeType) {
    case "self":
      return [scope.userId];
    case "team":
      return users
        .filter((u) => u.role === "REPRESENTATIVE" && (u.supervisorId === scope.supervisorId || u.id === scope.userId))
        .map((u) => u.id);
    case "branch":
      return users.filter((u) => u.role === "REPRESENTATIVE" && u.branchId === scope.branchId).map((u) => u.id);
    case "network":
    case "admin":
    case "system":
    case "read":
    case "people":
      return users.filter((u) => u.role === "REPRESENTATIVE").map((u) => u.id);
    case "entity":
      return users
        .filter((u) => u.role === "REPRESENTATIVE" && u.distributorId === scope.entityId)
        .map((u) => u.id);
    default:
      return [];
  }
};

export const visibleUserIds = (scope: DataScope): string[] => {
  if (scope.scopeType === "none") return [];
  switch (scope.scopeType) {
    case "self":
      return scope.supervisorId ? [scope.userId, scope.supervisorId] : [scope.userId];
    case "team": {
      const ids = new Set<string>([scope.userId]);
      users.forEach((u) => {
        if (u.role === "REPRESENTATIVE" && (u.supervisorId === scope.supervisorId || u.id === scope.userId)) ids.add(u.id);
        if (u.id === scope.supervisorId) ids.add(u.id);
      });
      return [...ids];
    }
    case "branch":
      return users.filter((u) => u.branchId === scope.branchId).map((u) => u.id);
    case "network":
    case "admin":
    case "system":
    case "read":
    case "people":
      return users.map((u) => u.id);
    case "entity":
      return users.filter((u) => u.distributorId === scope.entityId || u.id === scope.userId).map((u) => u.id);
    default:
      return [];
  }
};

export const visibleUsers = (scope: DataScope): User[] => {
  if (scope.scopeType === "none") return [];
  return users.filter((u) => visibleUserIds(scope).includes(u.id));
};

const isRep = (scope: DataScope, repId?: string): boolean => !!repId && visibleRepIds(scope).includes(repId);
const isUser = (scope: DataScope, userId?: string): boolean => !!userId && visibleUserIds(scope).includes(userId);

export const visibleCashBoxIds = (scope: DataScope): string[] => {
  if (scope.scopeType === "none") return [];
  const ids = new Set<string>();
  cashBoxes.forEach((b) => {
    if (!b.ownerId) return;
    if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "read" || scope.scopeType === "people" || scope.scopeType === "network" || isUser(scope, b.ownerId)) ids.add(b.id);
  });
  return [...ids];
};

export const visibleDistributorIds = (scope: DataScope): string[] => {
  if (scope.scopeType === "none") return [];
  switch (scope.scopeType) {
    case "system":
    case "admin":
    case "read":
      return distributors.map((d) => d.id);
    case "network":
      return distributors.filter((d) => d.branchId === scope.branchId).map((d) => d.id);
    case "entity":
      return scope.entityId ? [scope.entityId] : [];
    default:
      return [];
  }
};

export const canAccessCustomer = (scope: DataScope, c: Pick<Customer, "repId" | "supervisorId" | "territoryId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "people") return true;
  if (scope.scopeType === "read") return true;
  if (scope.scopeType === "network") return true;
  if (scope.scopeType === "branch") return true;
  if (scope.scopeType === "entity") return c.territoryId ? distributors.some((d) => d.id === scope.entityId && d.territoryIds.includes(c.territoryId!)) : false;
  if (scope.scopeType === "team") {
    return c.repId === scope.userId || c.supervisorId === scope.supervisorId || (!!scope.territoryId && c.territoryId === scope.territoryId);
  }
  return c.repId === scope.userId;
};

export const canAccessInvoice = (scope: DataScope, i: Pick<Invoice, "repId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "people" || scope.scopeType === "read" || scope.scopeType === "network") return true;
  return isRep(scope, i.repId);
};

export const canAccessCollection = (scope: DataScope, c: Pick<Collection, "repId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "people" || scope.scopeType === "read" || scope.scopeType === "network") return true;
  return isRep(scope, c.repId);
};

export const canAccessReturn = (scope: DataScope, r: Pick<ReturnRecord, "repId">): boolean => canAccessInvoice(scope, { repId: r.repId });
export const canAccessVisit = (scope: DataScope, v: Pick<Visit, "repId">): boolean => canAccessInvoice(scope, { repId: v.repId });
export const canAccessRoute = (scope: DataScope, r: Pick<RoutePlan, "repId">): boolean => canAccessInvoice(scope, { repId: r.repId });
export const canAccessVanStock = (scope: DataScope, v: Pick<VanStock, "repId">): boolean => canAccessInvoice(scope, { repId: v.repId });
export const canAccessStockMovement = (scope: DataScope, m: Pick<StockMovement, "repId">): boolean => canAccessInvoice(scope, { repId: m.repId ?? "" });
export const canAccessStockRequest = (scope: DataScope, r: Pick<StockRequest, "repId">): boolean => canAccessInvoice(scope, { repId: r.repId });
export const canAccessStockTransfer = (scope: DataScope, t: Pick<StockTransfer, "toRepId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "people" || scope.scopeType === "read" || scope.scopeType === "network" || scope.scopeType === "branch") return true;
  return isRep(scope, t.toRepId);
};

export const canAccessCashBox = (scope: DataScope, b: Pick<CashBox, "ownerId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "people" || scope.scopeType === "read" || scope.scopeType === "network" || scope.scopeType === "branch") return true;
  return isUser(scope, b.ownerId);
};

export const canAccessCashMovement = (scope: DataScope, m: Pick<CashMovement, "cashBoxId" | "relatedRepId">, ownBoxIds: string[]): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "people" || scope.scopeType === "read" || scope.scopeType === "network" || scope.scopeType === "branch") return true;
  return ownBoxIds.includes(m.cashBoxId) || isRep(scope, m.relatedRepId);
};

export const canAccessGps = (scope: DataScope, g: Pick<GpsLocation, "userId">): boolean => isUser(scope, g.userId);

export const canAccessTarget = (scope: DataScope, t: Pick<Target, "ownerId" | "ownerType">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "people" || scope.scopeType === "read" || scope.scopeType === "network" || scope.scopeType === "branch") return true;
  if (isUser(scope, t.ownerId)) return true;
  if (scope.scopeType === "team" && t.ownerType === "territory" && t.ownerId === scope.territoryId) return true;
  return false;
};

export const canAccessApproval = (scope: DataScope, a: Pick<ApprovalRequest, "requestedById">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "self") return a.requestedById === scope.userId;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "people" || scope.scopeType === "read" || scope.scopeType === "network" || scope.scopeType === "branch") return true;
  return isUser(scope, a.requestedById);
};

export const canAccessDistributor = (scope: DataScope, d: Pick<Distributor, "id" | "branchId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "read") return true;
  if (scope.scopeType === "network") return d.branchId === scope.branchId;
  if (scope.scopeType === "entity") return d.id === scope.entityId;
  if (scope.scopeType === "people") return true;
  return false;
};

export const canAccessProfitability = (scope: DataScope, p: Pick<ProfitabilityRecord, "repId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "people" || scope.scopeType === "read" || scope.scopeType === "network" || scope.scopeType === "branch" || scope.scopeType === "entity") return true;
  return isRep(scope, p.repId);
};

export const canAccessCustody = (scope: DataScope, c: Pick<CustodyRecord, "assignedToId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "self") return c.assignedToId === scope.userId;
  return isUser(scope, c.assignedToId);
};

export const canAccessLeave = (scope: DataScope, l: Pick<LeaveRequest, "employeeId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "self") return l.employeeId === scope.userId;
  return isUser(scope, l.employeeId);
};

export const canAccessConversation = (scope: DataScope, c: Pick<Conversation, "participants">): boolean => {
  if (scope.scopeType === "none") return false;
  return c.participants.includes(scope.userId);
};

export const canAccessTerritory = (scope: DataScope, t: Pick<Territory, "id" | "supervisorId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "people" || scope.scopeType === "read" || scope.scopeType === "network" || scope.scopeType === "branch") return true;
  if (scope.scopeType === "team") return t.id === scope.territoryId || t.supervisorId === scope.supervisorId;
  return t.id === scope.territoryId;
};

export const canAccessNotification = (scope: DataScope, n: Pick<Notification, "recipientId">): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType === "self") return n.recipientId === scope.userId;
  return !n.recipientId || isUser(scope, n.recipientId);
};

export const canAccessArchive = (scope: DataScope, a: Pick<ArchiveRecord, "entityType" | "entityId" | "createdBy">, ownEntityIds: Set<string>): boolean => {
  if (scope.scopeType === "none") return false;
  if (scope.scopeType !== "self" && scope.scopeType !== "team") {
    if (scope.scopeType === "read") return true;
    return true;
  }
  const self = users.find((u) => u.id === scope.userId);
  if (self && a.createdBy === self.name) return true;
  if (scope.scopeType === "team") {
    const team = users.filter((u) => visibleUserIds(scope).includes(u.id));
    if (a.createdBy && team.some((u) => u.name === a.createdBy)) return true;
    if (a.entityType === "employee" && isUser(scope, a.entityId)) return true;
  } else if (a.entityType === "employee" && a.entityId === scope.userId) {
    return true;
  }
  return ownEntityIds.has(a.entityId);
};
