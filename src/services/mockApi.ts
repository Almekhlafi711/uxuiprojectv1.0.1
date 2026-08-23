import type {
  ApprovalRequest, ArchiveRecord, AssetRequest, CashBox, CashMovement, Collection, Conversation, Customer,
  CustomerSuspension, CustomerTransferRecord, CustodyObjection, CustodyRecord, GpsLocation, Invoice, LeaveRequest, Message, Notification, Product, ProductCategory,
  ProfitabilityRecord, ReturnRecord, RoutePlan, StockItem, StockMovement, StockRequest,
  StockTransfer, SupervisorNote, Target, User, VanStock, Visit,
  CommissionRun, CommissionPolicy, BonusRun, BonusPolicy, CommissionLine,
  Distributor, DistributorSellInOrder, DistributorSellOut,
  DailyPlan, DailyClosing, LoadingOrder, InventoryCount, DepositRequest, Trip, TripExpense,
  StockBalance, CashSettlement, ResponsibleAssignment, DiscountRequest, OrganizationConfig, RepCostConfig,
  TargetOrganization,
  RepresentativeAssignment, CustomerAssignment, OrganizationAuditLog, PreTransferValidation, OrganizationTreeNode, CustomerTransferRequest,
  Territory, Team,
} from "@/types";
import { useAuthStore } from "@/store/auth";
import {
  canAccessApproval,
  canAccessArchive,
  canAccessCashBox,
  canAccessCashMovement,
  canAccessCollection,
  canAccessConversation,
  canAccessCustomer,
  canAccessCustody,
  canAccessDistributor,
  canAccessGps,
  canAccessInvoice,
  canAccessLeave,
  canAccessNotification,
  canAccessProfitability,
  canAccessReturn,
  canAccessRoute,
  canAccessStockMovement,
  canAccessStockRequest,
  canAccessStockTransfer,
  canAccessTarget,
  canAccessTerritory,
  canAccessVanStock,
  canAccessVisit,
  getDataScope,
  visibleCashBoxIds,
  visibleDistributorIds,
  visibleRepIds,
  visibleUsers,
  type DataScope,
} from "@/services/scope";
import { hasPermission } from "@/config/authority";
import type { Role } from "@/types";
import { customers } from "@/mock/customers";
import { products, productCategories, priceLists } from "@/mock/products";
import { invoices } from "@/mock/sales";
import { collections } from "@/mock/collections";
import { returns } from "@/mock/returns";
import { warehouses, warehouseStock, vanStock, stockMovements, stockTransfers, stockRequests } from "@/mock/inventory";
import { cashBoxes, cashMovements } from "@/mock/cash";
import { routePlans } from "@/mock/routes";
import { visits } from "@/mock/visits";
import { gpsLocations } from "@/mock/gps";
import { targets } from "@/mock/targets";
import { approvals } from "@/mock/approvals";
import { profitabilityRecords } from "@/mock/profitability";
import { custodyRecords, custodyObjections } from "@/mock/custody";
import { archiveRecords, conversations, leaveRequests, notifications, auditLogs } from "@/mock/admin";
import { messagingConversations, broadcasts, allConversations } from "@/mock/messaging";
import { users, roles } from "@/mock/users";
import {
  commissionRuns,
  commissionPolicies,
  bonusRuns,
  bonusPolicies,
} from "@/mock/commission";
import { policyConfig, policyConfigVersion, type PolicyConfig, type PolicySection, policyRegistry, canEditPolicy, createPolicyVersion, submitPolicy, approvePolicy, publishPolicy, getPolicy, getPolicyHistory } from "@/mock/policy";
import { distributors as distributorList, distributorSellInOrders, distributorSellOut } from "@/mock/distributors";
import { branches, territories, costCenters, teams, distributors, distributorOfficers } from "@/mock/organization";
import {
  dailyPlans,
  trips,
  tripExpenses,
  dailyClosings,
  targetOrganizations,
  syncQueue,
  loadingOrders,
  inventoryCounts,
  deposits,
} from "@/mock/repField";
import { supervisorNotes, assetRequests, customerTransfers, customerSuspensions } from "@/mock/supervisor";
import { cashSettlements } from "@/mock/settlements";
import { responsibleAssignments, discountRequests, organizationConfig, repCostConfigs } from "@/mock/assignments";
import { organizationService } from "@/services/organization.service";

const delay = (ms = 350) => new Promise((res) => setTimeout(res, ms));
const clone = <T>(data: T[]): T[] => structuredClone(data);

const currentScope = (): DataScope | null => getDataScope(useAuthStore.getState().user);

const ownBoxIds = (scope: DataScope): string[] =>
  cashBoxes.filter((b) => b.ownerId === scope.userId).map((b) => b.id);

const archiveOwnIds = (scope: DataScope): Set<string> => {
  const ids = new Set<string>();
  invoices.filter((i) => i.repId === scope.userId).forEach((i) => ids.add(i.id));
  collections.filter((c) => c.repId === scope.userId).forEach((c) => ids.add(c.id));
  returns.filter((r) => r.repId === scope.userId).forEach((r) => ids.add(r.id));
  visits.filter((v) => v.repId === scope.userId).forEach((v) => ids.add(v.id));
  custodyRecords.filter((c) => c.assignedToId === scope.userId).forEach((c) => ids.add(c.id));
  stockRequests.filter((r) => r.repId === scope.userId).forEach((r) => ids.add(r.id));
  routePlans.filter((r) => r.repId === scope.userId).forEach((r) => ids.add(r.id));
  targetOrganizations.filter((t) => t.requestedById === scope.userId).forEach((t) => ids.add(t.id));
  return ids;
};

/** Entity ids belonging to the supervisor's team, used to gate archive documents. */
const archiveTeamOwnIds = (scope: DataScope): Set<string> => {
  const ids = new Set<string>();
  const repIds = visibleRepIds(scope);
  invoices.filter((i) => repIds.includes(i.repId)).forEach((i) => ids.add(i.id));
  collections.filter((c) => repIds.includes(c.repId)).forEach((c) => ids.add(c.id));
  returns.filter((r) => repIds.includes(r.repId)).forEach((r) => ids.add(r.id));
  visits.filter((v) => repIds.includes(v.repId)).forEach((v) => ids.add(v.id));
  custodyRecords.filter((c) => visibleUsers(scope).some((u) => u.id === c.assignedToId)).forEach((c) => ids.add(c.id));
  stockRequests.filter((r) => repIds.includes(r.repId)).forEach((r) => ids.add(r.id));
  routePlans.filter((r) => repIds.includes(r.repId)).forEach((r) => ids.add(r.id));
  targetOrganizations.filter((t) => repIds.includes(t.requestedById)).forEach((t) => ids.add(t.id));
  return ids;
};

const syncOwnIds = (scope: DataScope): Set<string> => {
  const ids = new Set<string>();
  invoices.filter((i) => i.repId === scope.userId).forEach((i) => ids.add(i.id));
  collections.filter((c) => c.repId === scope.userId).forEach((c) => ids.add(c.id));
  returns.filter((r) => r.repId === scope.userId).forEach((r) => ids.add(r.id));
  visits.filter((v) => v.repId === scope.userId).forEach((v) => ids.add(v.id));
  tripExpenses.filter((e) => e.repId === scope.userId).forEach((e) => ids.add(e.id));
  dailyClosings.filter((c) => c.repId === scope.userId).forEach((c) => ids.add(c.id));
  targetOrganizations.filter((t) => t.requestedById === scope.userId).forEach((t) => ids.add(t.id));
  inventoryCounts.filter((c) => c.repId === scope.userId).forEach((c) => ids.add(c.id));
  deposits.filter((d) => d.repId === scope.userId).forEach((d) => ids.add(d.id));
  trips.filter((t) => t.repId === scope.userId).forEach((t) => ids.add(t.id));
  return ids;
};

export const mockApi = {
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      await delay(600);
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user || password.length === 0) {
        throw new Error("بيانات الدخول غير صحيحة");
      }
      return clone([user])[0];
    },
  },
  products: {
    list: async (): Promise<Product[]> => {
      await delay();
      return clone(products);
    },
    categories: async (): Promise<ProductCategory[]> => {
      await delay(120);
      return clone(productCategories);
    },
    priceLists: async () => {
      await delay(120);
      return clone(priceLists);
    },
  },
  sales: {
    list: async (): Promise<Invoice[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(invoices.filter((i) => canAccessInvoice(scope, i)));
    },
    getById: async (id: string): Promise<Invoice | undefined> => {
      await delay(200);
      const scope = currentScope();
      if (!scope) return undefined;
      const i = invoices.find((x) => x.id === id);
      if (!i || !canAccessInvoice(scope, i)) return undefined;
      return structuredClone(i);
    },
  },
  collections: {
    list: async (): Promise<Collection[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(collections.filter((c) => canAccessCollection(scope, c)));
    },
  },
  returns: {
    list: async (): Promise<ReturnRecord[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(returns.filter((r) => canAccessReturn(scope, r)));
    },
  },
  inventory: {
    warehouses: async () => {
      await delay(120);
      return clone(warehouses);
    },
    warehouseStock: async (): Promise<StockItem[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      if (scope.scopeType === "self") return [];
      return clone(warehouseStock);
    },
    vanStock: async (): Promise<VanStock[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(vanStock.filter((v) => canAccessVanStock(scope, v)));
    },
    movements: async (): Promise<StockMovement[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(stockMovements.filter((m) => canAccessStockMovement(scope, m)));
    },
    transfers: async (): Promise<StockTransfer[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(stockTransfers.filter((t) => canAccessStockTransfer(scope, t)));
    },
    requests: async (): Promise<StockRequest[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(stockRequests.filter((r) => canAccessStockRequest(scope, r)));
    },
    calculateStockBalance: async (warehouseId: string, productId: string): Promise<StockBalance> => {
      await delay(100);
      const movements = stockMovements.filter((m) => m.productId === productId && (m.fromWarehouseId === warehouseId || m.toWarehouseId === warehouseId));
      const inbound = movements.filter((m) => m.toWarehouseId === warehouseId && (m.type === "receiving" || m.type === "transfer_in" || m.type === "return_in")).reduce((s, m) => s + m.qty, 0);
      const outbound = movements.filter((m) => m.fromWarehouseId === warehouseId && (m.type === "issue" || m.type === "transfer_out" || m.type === "damage")).reduce((s, m) => s + m.qty, 0);
      const adjustments = movements.filter((m) => m.type === "count_adjust").reduce((s, m) => s + m.qty, 0);
      const ws = warehouseStock.find((w) => w.warehouseId === warehouseId && w.productId === productId);
      return {
        productId,
        productName: ws?.productName ?? "",
        warehouseId,
        previousBalance: 0,
        inbound,
        outbound,
        adjustments,
        currentBalance: inbound - outbound,
        lastUpdated: new Date().toISOString(),
      };
    },
    stockBalances: async (warehouseId?: string): Promise<StockBalance[]> => {
      await delay(100);
      const warehouseIds = warehouseId ? [warehouseId] : [...new Set(warehouseStock.map((w) => w.warehouseId))];
      const productIds = [...new Set(warehouseStock.map((w) => w.productId))];
      const results: StockBalance[] = [];
      for (const wid of warehouseIds) {
        for (const pid of productIds) {
          const ws = warehouseStock.find((w) => w.warehouseId === wid && w.productId === pid);
          if (ws) results.push({ productId: pid, productName: ws.productName, warehouseId: wid, previousBalance: ws.available, inbound: 0, outbound: 0, adjustments: 0, currentBalance: ws.available, lastUpdated: new Date().toISOString() });
        }
      }
      return results;
    },
  },
  cash: {
    boxes: async (): Promise<CashBox[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(cashBoxes.filter((b) => canAccessCashBox(scope, b)));
    },
    movements: async (): Promise<CashMovement[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      const boxIds = scope.scopeType === "team" ? visibleCashBoxIds(scope) : ownBoxIds(scope);
      return clone(cashMovements.filter((m) => canAccessCashMovement(scope, m, boxIds)));
    },
  },
  routes: {
    list: async (): Promise<RoutePlan[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(routePlans.filter((r) => canAccessRoute(scope, r)));
    },
  },
  visits: {
    list: async (): Promise<Visit[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(visits.filter((v) => canAccessVisit(scope, v)));
    },
    create: async (data: { customerId: string; repId: string; checkInAt?: string; checkOutAt?: string; result: Visit["result"]; outcome?: string; notes?: string }): Promise<Visit> => {
      await delay(200);
      const v: Visit = {
        id: `v-${Date.now()}`,
        ...data,
        date: new Date().toISOString().slice(0, 10),
        planned: false,
        lat: 24.7, lng: 46.6,
      };
      visits.push(v);
      return clone([v])[0];
    },
  },
  gps: {
    locations: async (): Promise<GpsLocation[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(gpsLocations.filter((g) => canAccessGps(scope, g)));
    },
  },
  targets: {
    list: async (): Promise<Target[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(targets.filter((t) => canAccessTarget(scope, t)));
    },
    approve: async (id: string): Promise<Target> => {
      await delay(200);
      const t = targets.find((x) => x.id === id);
      if (!t) throw new Error("الهدف غير موجود");
      t.status = "approved";
      t.approvedBy = useAuthStore.getState().user?.name;
      return clone([t])[0];
    },
    reject: async (id: string): Promise<Target> => {
      await delay(200);
      const t = targets.find((x) => x.id === id);
      if (!t) throw new Error("الهدف غير موجود");
      t.status = "draft";
      return clone([t])[0];
    },
  },
  approvals: {
    list: async (): Promise<ApprovalRequest[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(approvals.filter((a) => canAccessApproval(scope, a)));
    },
    getById: async (id: string): Promise<ApprovalRequest | undefined> => {
      await delay(200);
      const scope = currentScope();
      if (!scope) return undefined;
      const a = approvals.find((x) => x.id === id);
      if (!a || !canAccessApproval(scope, a)) return undefined;
      return structuredClone(a);
    },
  },
  profitability: {
    list: async (): Promise<ProfitabilityRecord[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(profitabilityRecords.filter((p) => canAccessProfitability(scope, p)));
    },
  },
  commission: {
    listRuns: async (): Promise<CommissionRun[]> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType === "none") return [];
      return clone(commissionRuns.filter((r) => {
        if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "read" || scope.scopeType === "network") return true;
        return r.lines.some((l) => visibleRepIds(scope).includes(l.repId));
      }));
    },
    getRun: async (id: string): Promise<CommissionRun | undefined> => {
      await delay(200);
      const scope = currentScope();
      if (!scope || scope.scopeType === "none") return undefined;
      const run = commissionRuns.find((r) => r.id === id);
      if (!run) return undefined;
      const allowed = scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "read" || scope.scopeType === "network" || run.lines.some((l) => visibleRepIds(scope).includes(l.repId));
      return allowed ? clone([run])[0] : undefined;
    },
    listPolicies: async (): Promise<CommissionPolicy[]> => {
      await delay();
      return clone(commissionPolicies);
    },
    transition: async (id: string, status: CommissionRun["status"]): Promise<CommissionRun> => {
      await delay(300);
      const scope = currentScope();
      if (!scope || !hasPermission(scope.role, "commission.approve")) throw new Error("غير مصرح باعتماد العمولة");
      if (scope.scopeType === "none") throw new Error("نطاق البيانات فارغ");
      const run = commissionRuns.find((r) => r.id === id);
      if (!run) throw new Error("التشغيلة غير موجودة");
      run.status = status;
      if (status === "under_review") run.underReviewAt = new Date().toISOString();
      if (status === "final") run.finalizedAt = new Date().toISOString();
      if (status === "approved") {
        run.approvedAt = new Date().toISOString();
        run.approvedBy = useAuthStore.getState().user?.id;
      }
      if (status === "exported") run.exportedAt = new Date().toISOString();
      return clone([run])[0];
    },
    recalc: async (id: string): Promise<CommissionRun> => {
      await delay(400);
      const scope = currentScope();
      if (!scope || !hasPermission(scope.role, "commission.view")) throw new Error("غير مصرح");
      const run = commissionRuns.find((r) => r.id === id);
      if (!run) throw new Error("التشغيلة غير موجودة");
      run.totalAmount = run.lines.reduce((s, l) => s + l.amount, 0);
      return clone([run])[0];
    },
  },
  bonus: {
    listRuns: async (): Promise<BonusRun[]> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType === "none") return [];
      return clone(bonusRuns.filter((r) => {
        if (scope.scopeType === "admin" || scope.scopeType === "system" || scope.scopeType === "read" || scope.scopeType === "network") return true;
        return r.lines.some((l) => visibleRepIds(scope).includes(l.repId));
      }));
    },
    listPolicies: async (): Promise<BonusPolicy[]> => {
      await delay();
      return clone(bonusPolicies);
    },
    transition: async (id: string, status: BonusRun["status"]): Promise<BonusRun> => {
      await delay(300);
      const scope = currentScope();
      if (!scope || !hasPermission(scope.role, "bonus.approve")) throw new Error("غير مصرح باعتماد المكافأة");
      const run = bonusRuns.find((r) => r.id === id);
      if (!run) throw new Error("تشغيلية المكافأة غير موجودة");
      run.status = status;
      if (status === "approved") run.approvedAt = new Date().toISOString();
      if (status === "paid") run.paidAt = new Date().toISOString();
      return clone([run])[0];
    },
  },
  policy: {
    get: async (): Promise<PolicyConfig> => {
      await delay();
      const scope = currentScope();
      if (!scope) return { ...policyConfig };
      try {
        return getPolicy(scope.role).content;
      } catch {
        return { ...policyConfig };
      }
    },
    getDocument: async () => {
      await delay();
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      return getPolicy(scope.role);
    },
    getHistory: async (category: string) => {
      await delay();
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      return getPolicyHistory(category, scope.role);
    },
    canEdit: async () => {
      await delay(100);
      const scope = currentScope();
      if (!scope) return false;
      try {
        const doc = getPolicy(scope.role);
        return canEditPolicy(doc, scope.role);
      } catch {
        return false;
      }
    },
    createVersion: async (patch: Partial<PolicyConfig>) => {
      await delay(300);
      const scope = currentScope();
      if (!scope || !hasPermission(scope.role, "policy.manage")) throw new Error("غير مصرح بإنشاء نسخة سياسة");
      const by = useAuthStore.getState().user?.name ?? "system";
      return createPolicyVersion("erp_operational", patch, by, scope.role);
    },
    submit: async (id: string) => {
      await delay(300);
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      const by = useAuthStore.getState().user?.name ?? "system";
      return submitPolicy(id, by, scope.role);
    },
    approve: async (id: string) => {
      await delay(300);
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      const by = useAuthStore.getState().user?.name ?? "system";
      return approvePolicy(id, by, scope.role);
    },
    publish: async (id: string) => {
      await delay(300);
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      const by = useAuthStore.getState().user?.name ?? "system";
      return publishPolicy(id, by, scope.role);
    },
  },
   distributor: {
    list: async (): Promise<Distributor[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      if (scope.scopeType === "none") return [];
      return clone(distributorList.filter((d) => canAccessDistributor(scope, d)));
    },
    listSellIn: async (): Promise<DistributorSellInOrder[]> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType === "none") return [];
      const allowedIds = visibleDistributorIds(scope);
      return clone(distributorSellInOrders.filter((o) => allowedIds.includes(o.distributorId)));
    },
    listSellOut: async (): Promise<DistributorSellOut[]> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType === "none") return [];
      const allowedIds = visibleDistributorIds(scope);
      return clone(distributorSellOut.filter((o) => allowedIds.includes(o.distributorId)));
    },
    update: async (patch: Partial<Distributor>): Promise<Distributor> => {
      await delay(300);
      const scope = currentScope();
      if (!scope || scope.scopeType === "none") throw new Error("غير مصرح");
      const d = distributors.find((x) => x.id === patch.id);
      if (!d || !canAccessDistributor(scope, d)) throw new Error("الموزع غير موجود أو خارج النطاق");
      Object.assign(d, patch);
      return clone([d])[0];
    },
    updateSellInStatus: async (id: string, status: DistributorSellInOrder["status"]): Promise<DistributorSellInOrder> => {
      await delay(300);
      const scope = currentScope();
      if (!scope || scope.scopeType === "none") throw new Error("غير مصرح");
      const order = distributorSellInOrders.find((o) => o.id === id);
      if (!order || !visibleDistributorIds(scope).includes(order.distributorId)) throw new Error("أمر التوزيع غير موجود أو خارج النطاق");
      order.status = status;
      return clone([order])[0];
    },
    addSellOut: async (entry: Omit<DistributorSellOut, "id">): Promise<DistributorSellOut> => {
      await delay(300);
      const scope = currentScope();
      if (!scope || scope.scopeType === "none") throw new Error("غير مصرح");
      if (!visibleDistributorIds(scope).includes(entry.distributorId)) throw new Error("الموزع خارج النطاق");
      const id = `sout-${Date.now()}`;
      const rec: DistributorSellOut = { id, ...entry };
      distributorSellOut.push(rec);
      return clone([rec])[0];
    },
  },
  custody: {
    list: async (): Promise<CustodyRecord[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(custodyRecords.filter((c) => canAccessCustody(scope, c)));
    },
    objections: async (): Promise<CustodyObjection[]> => {
      await delay(100);
      return clone(custodyObjections);
    },
    submitObjection: async (data: { custodyId: string; repId: string; reason: string }): Promise<CustodyObjection> => {
      await delay(200);
      const objection: CustodyObjection = {
        id: `co-${Date.now()}`,
        ...data,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      custodyObjections.push(objection);
      return clone([objection])[0];
    },
    returnRecord: async (id: string, condition: CustodyRecord["condition"], notes?: string): Promise<CustodyRecord> => {
      await delay(200);
      const cr = custodyRecords.find((c) => c.id === id);
      if (!cr) throw new Error("العهدة غير موجودة");
      cr.status = "returned";
      cr.condition = condition;
      cr.returnedAt = new Date().toISOString();
      if (notes) cr.notes = notes;
      return clone([cr])[0];
    },
  },
  credit: {
    approveRequest: async (id: string, approved: boolean, reason?: string): Promise<{ id: string; status: string }> => {
      await delay(200);
      return { id, status: approved ? "approved" : "rejected" };
    },
  },
  archive: {
    list: async (): Promise<ArchiveRecord[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      const own = scope.scopeType === "team" ? archiveTeamOwnIds(scope) : archiveOwnIds(scope);
      return clone(archiveRecords.filter((a) => canAccessArchive(scope, a, own)));
    },
    create: async (data: { title: string; type: string; entityType: string; entityId: string; version?: number }): Promise<ArchiveRecord> => {
      await delay(200);
      const scope = currentScope();
      const ar: ArchiveRecord = {
        id: `ar-${Date.now()}`,
        ...data,
        version: data.version ?? 1,
        status: "draft",
        locked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: scope ? visibleUsers(scope).find((u) => u.id === scope.userId)?.name ?? "system" : "system",
      };
      archiveRecords.push(ar);
      return clone([ar])[0];
    },
  },
  messages: {
    list: async (): Promise<Conversation[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(conversations.filter((c) => canAccessConversation(scope, c)));
    },
    listAll: async (): Promise<Conversation[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(allConversations.filter((c) => c.participants.includes(scope.userId)));
    },
    send: async (conversationId: string, body: string, attachments?: string[], priority?: Message["priority"]): Promise<Message> => {
      await delay(150);
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      const conv = allConversations.find((c) => c.id === conversationId);
      if (!conv || !conv.participants.includes(scope.userId)) throw new Error("المحادثة غير موجودة أو غير مصرح بها");
      const msg: Message = {
        id: `mm-${Date.now()}`,
        conversationId,
        senderId: scope.userId,
        body: body.trim(),
        sentAt: new Date().toISOString(),
        attachments: attachments ?? [],
        read: false,
        priority: priority ?? "normal",
        msgType: conv.type === "broadcast" ? "broadcast" : "direct",
      };
      conv.messages.push(msg);
      conv.lastMessageAt = msg.sentAt;
      if (!conv.readBy) conv.readBy = [];
      if (!conv.readBy.includes(scope.userId)) conv.readBy.push(scope.userId);
      return clone([msg])[0];
    },
    markRead: async (conversationId: string): Promise<void> => {
      await delay(50);
      const scope = currentScope();
      if (!scope) return;
      const conv = allConversations.find((c) => c.id === conversationId);
      if (!conv) return;
      if (!conv.readBy) conv.readBy = [];
      if (!conv.readBy.includes(scope.userId)) conv.readBy.push(scope.userId);
      const now = new Date().toISOString();
      conv.messages.forEach((m) => {
        if (m.senderId !== scope.userId && !m.read) {
          m.read = true;
          m.readAt = now;
        }
      });
    },
    create: async (data: { subject: string; body: string; recipientIds: string[]; attachments?: string[]; priority?: Message["priority"] }): Promise<Conversation> => {
      await delay(200);
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      const allParticipants = Array.from(new Set([scope.userId, ...data.recipientIds]));
      const conv: Conversation = {
        id: `mc-${Date.now()}`,
        subject: data.subject.trim(),
        participants: allParticipants,
        lastMessageAt: new Date().toISOString(),
        type: data.recipientIds.length > 1 ? "group" : "direct",
        createdBy: scope.userId,
        readBy: [scope.userId],
        messages: [{
          id: `mm-${Date.now()}`,
          conversationId: `mc-${Date.now()}`,
          senderId: scope.userId,
          body: data.body.trim(),
          sentAt: new Date().toISOString(),
          attachments: data.attachments ?? [],
          read: false,
          priority: data.priority ?? "normal",
          msgType: "direct",
        }],
      };
      messagingConversations.push(conv);
      return clone([conv])[0];
    },
    createBroadcast: async (data: { subject: string; body: string; audienceLabel: string; audienceType: Conversation["audienceType"]; recipientIds: string[]; attachments?: string[] }): Promise<Conversation> => {
      await delay(200);
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      const allParticipants = Array.from(new Set([scope.userId, ...data.recipientIds]));
      const conv: Conversation = {
        id: `bc-${Date.now()}`,
        subject: data.subject.trim(),
        participants: allParticipants,
        lastMessageAt: new Date().toISOString(),
        type: "broadcast",
        createdBy: scope.userId,
        readBy: [scope.userId],
        audienceLabel: data.audienceLabel,
        audienceType: data.audienceType,
        messages: [{
          id: `bm-${Date.now()}`,
          conversationId: `bc-${Date.now()}`,
          senderId: scope.userId,
          body: data.body.trim(),
          sentAt: new Date().toISOString(),
          attachments: data.attachments ?? [],
          read: false,
          priority: "high",
          msgType: "broadcast",
        }],
      };
      broadcasts.push(conv);
      return clone([conv])[0];
    },
  },
  leaves: {
    list: async (): Promise<LeaveRequest[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(leaveRequests.filter((l) => canAccessLeave(scope, l)));
    },
  },
  notifications: {
    list: async (): Promise<Notification[]> => {
      await delay(200);
      const scope = currentScope();
      if (!scope) return [];
      return clone(notifications.filter((n) => canAccessNotification(scope, n)));
    },
  },
  organization: {
    branches: async () => {
      await delay(150);
      return clone(branches);
    },
    territories: async () => {
      await delay(150);
      const scope = currentScope();
      if (!scope) return [];
      return clone(territories.filter((t) => canAccessTerritory(scope, t)));
    },
    costCenters: async () => {
      await delay(150);
      return clone(costCenters);
    },
    teams: async () => {
      await delay(150);
      return clone(teams);
    },
    distributors: async () => {
      await delay(150);
      return clone(distributors);
    },
    officers: async () => {
      await delay(150);
      return clone(distributorOfficers);
    },
    create: async (type: string, data: { name: string; [key: string]: any }): Promise<any> => {
      await delay(200);
      const id = `${type.slice(0, 2)}-${Date.now()}`;
      const item = { id, ...data } as any;
      if (type === "branch") branches.push(item);
      else if (type === "territory") territories.push(item);
      else if (type === "team") teams.push(item);
      else if (type === "costCenter") costCenters.push(item);
      return clone([item])[0];
    },
    updateTerritory: async (id: string, data: Partial<Territory>): Promise<Territory> => {
      await delay(200);
      const idx = territories.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("المنطقة غير موجودة");
      territories[idx] = { ...territories[idx], ...data };
      return territories[idx];
    },
    deleteTerritory: async (id: string): Promise<void> => {
      await delay(200);
      const idx = territories.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("المنطقة غير موجودة");
      territories.splice(idx, 1);
    },
    createTeam: async (data: { name: string; supervisorId: string; territoryIds: string[] }): Promise<Team> => {
      await delay(200);
      const newTeam: Team = { id: `team-${Date.now()}`, name: data.name, supervisorId: data.supervisorId, territoryIds: data.territoryIds, repIds: [] };
      teams.push(newTeam);
      return newTeam;
    },
    updateTeam: async (id: string, data: Partial<Team>): Promise<Team> => {
      await delay(200);
      const idx = teams.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("الفريق غير موجود");
      teams[idx] = { ...teams[idx], ...data };
      return teams[idx];
    },
    deleteTeam: async (id: string): Promise<void> => {
      await delay(200);
      const idx = teams.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("الفريق غير موجود");
      teams.splice(idx, 1);
    },
    assignRepToTerritory: async (repId: string, territoryId: string, supervisorId: string, reason: string): Promise<RepresentativeAssignment> => {
      await delay(200);
      return organizationService.assignRepToTerritory(repId, territoryId, supervisorId, reason, currentScope()?.userId ?? "u-sm-01");
    },
    releaseRepFromTerritory: async (repId: string, reason: string): Promise<void> => {
      await delay(200);
      organizationService.releaseRepFromTerritory(repId, reason, currentScope()?.userId ?? "u-sm-01");
    },
    transferRepToTerritory: async (repId: string, newTerritoryId: string, newSupervisorId: string, reason: string): Promise<RepresentativeAssignment> => {
      await delay(200);
      return organizationService.transferRepToTerritory(repId, newTerritoryId, newSupervisorId, reason, currentScope()?.userId ?? "u-sm-01");
    },
    assignCustomerToRep: async (customerId: string, repId: string, territoryId: string, supervisorId: string, reason: string): Promise<CustomerAssignment> => {
      await delay(200);
      return organizationService.assignCustomerToRep(customerId, repId, territoryId, supervisorId, reason, currentScope()?.userId ?? "u-sm-01");
    },
    bulkAssignCustomers: async (customerIds: string[], repId: string, territoryId: string, supervisorId: string, reason: string): Promise<CustomerAssignment[]> => {
      await delay(300);
      return organizationService.bulkAssignCustomers(customerIds, repId, territoryId, supervisorId, reason, currentScope()?.userId ?? "u-sm-01");
    },
    createCustomerTransfer: async (customerId: string, newRepId: string, reason: string, debtResponsibility: "previous_rep" | "new_rep" | "policy", validation: PreTransferValidation): Promise<CustomerTransferRequest> => {
      await delay(200);
      return organizationService.createCustomerTransfer(customerId, newRepId, reason, debtResponsibility, currentScope()?.userId ?? "u-sm-01", validation);
    },
    approveCustomerTransfer: async (transferId: string): Promise<void> => {
      await delay(200);
      organizationService.approveCustomerTransfer(transferId, currentScope()?.userId ?? "u-sm-01");
    },
    rejectCustomerTransfer: async (transferId: string, reason: string): Promise<void> => {
      await delay(200);
      organizationService.rejectCustomerTransfer(transferId, currentScope()?.userId ?? "u-sm-01", reason);
    },
    executeCustomerTransfer: async (transferId: string): Promise<void> => {
      await delay(200);
      organizationService.executeCustomerTransfer(transferId, currentScope()?.userId ?? "u-sm-01");
    },
    getRepAssignments: async (repId?: string): Promise<RepresentativeAssignment[]> => {
      await delay(150);
      return clone(organizationService.getRepAssignments(repId));
    },
    getCustomerAssignments: async (customerId?: string, repId?: string): Promise<CustomerAssignment[]> => {
      await delay(150);
      return clone(organizationService.getCustomerAssignments(customerId, repId));
    },
    getRecentAssignments: async (limit?: number): Promise<(RepresentativeAssignment | CustomerAssignment)[]> => {
      await delay(150);
      return clone(organizationService.getRecentAssignments(limit));
    },
    getOrganizationAuditLog: async (filters: { entityType?: string; entityId?: string; action?: string; dateFrom?: string; dateTo?: string }): Promise<OrganizationAuditLog[]> => {
      await delay(150);
      return clone(organizationService.getOrganizationAuditLog(filters));
    },
    getTransferRequests: async (status?: CustomerTransferRequest["status"]): Promise<CustomerTransferRequest[]> => {
      await delay(150);
      return clone(organizationService.getTransferRequests(status));
    },
    getOrganizationTree: async (): Promise<OrganizationTreeNode> => {
      await delay(200);
      return organizationService.getOrganizationTree();
    },
    getOrganizationKPIs: async (): Promise<any> => {
      await delay(200);
      return organizationService.getKPIs();
    },
  },
  users: {
    list: async (): Promise<User[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(visibleUsers(scope));
    },
    updateRolePermissions: async (roleId: string, permCodes: string[]): Promise<{ id: string; permissions: string[] }> => {
      await delay(200);
      const role = roles.find((r) => r.id === roleId);
      if (!role) throw new Error("الدور غير موجود");
      (role as any).permissions = permCodes;
      return { id: roleId, permissions: permCodes };
    },
  },
  audit: {
    list: async () => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType === "self") return [];
      if (scope.scopeType === "team") {
        const teamNames = new Set(visibleUsers(scope).map((u) => u.name));
        const teamIds = new Set<string>([
          ...visibleRepIds(scope),
          ...visibleUsers(scope).map((u) => u.id),
        ]);
        return clone(auditLogs.filter((l) => teamNames.has(l.actor) || teamIds.has(l.entityId)));
      }
      return clone(auditLogs);
    },
  },
  rep: {
    dailyPlans: async () => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(dailyPlans.filter((p) => p.repId === scope.userId));
    },
    approvePlan: async (id: string): Promise<DailyPlan> => {
      await delay(200);
      const plan = dailyPlans.find((p) => p.id === id);
      if (!plan) throw new Error("الخطة غير موجودة");
      plan.status = "approved";
      plan.approvedBy = useAuthStore.getState().user?.name;
      return clone([plan])[0];
    },
    trips: async () => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(trips.filter((t) => t.repId === scope.userId));
    },
    startTrip: async (planId: string): Promise<Trip> => {
      await delay(300);
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      const plan = dailyPlans.find((p) => p.id === planId);
      if (!plan) throw new Error("الخطة غير موجودة");
      const trip: Trip = {
        id: `trp-${Date.now()}`,
        number: `TRP-2026-${String(trips.length + 1).padStart(4, "0")}`,
        repId: scope.userId,
        date: plan.date,
        planId: plan.id,
        routeId: plan.routeId,
        territoryId: plan.territoryId,
        gpsEnabled: true,
        startTime: new Date().toTimeString().slice(0, 5),
        startLat: 24.7,
        startLng: 46.6,
        status: "in_progress",
        syncState: "pending",
      };
      trips.push(trip);
      return clone([trip])[0];
    },
    endTrip: async (tripId: string): Promise<Trip> => {
      await delay(200);
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) throw new Error("الجولة غير موجودة");
      trip.status = "completed";
      trip.endTime = new Date().toTimeString().slice(0, 5);
      return clone([trip])[0];
    },
    tripExpenses: async () => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(tripExpenses.filter((e) => e.repId === scope.userId));
    },
    createExpense: async (data: Omit<TripExpense, "id" | "number">): Promise<TripExpense> => {
      await delay(200);
      const exp: TripExpense = {
        id: `ex-${Date.now()}`,
        number: `EXP-2026-${String(tripExpenses.length + 1).padStart(4, "0")}`,
        ...data,
      };
      tripExpenses.push(exp);
      return clone([exp])[0];
    },
    dailyClosings: async () => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(dailyClosings.filter((c) => c.repId === scope.userId));
    },
    submitClosing: async (id: string): Promise<DailyClosing> => {
      await delay(200);
      const closing = dailyClosings.find((c) => c.id === id);
      if (!closing) throw new Error("إغلاق اليوم غير موجود");
      closing.status = "submitted";
      closing.submittedAt = new Date().toISOString();
      return clone([closing])[0];
    },
    targetOrganizations: async () => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(targetOrganizations.filter((t) => t.requestedById === scope.userId));
    },
    createTargetOrg: async (data: Partial<TargetOrganization>): Promise<TargetOrganization> => {
      await delay(300);
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      const to: TargetOrganization = {
        id: `to-${Date.now()}`,
        code: `TGT-ORG-${String(targetOrganizations.length + 1).padStart(4, "0")}`,
        orgType: data.orgType || "مؤسسة",
        name: data.name || "",
        city: data.city || "الرياض",
        phones: data.phones || [],
        territoryId: data.territoryId || "t-01",
        requestedById: scope.userId,
        supervisorId: data.supervisorId || "u-sp-01",
        date: new Date().toISOString().slice(0, 10),
        status: "under_review",
        ...data,
      };
      targetOrganizations.push(to);
      return clone([to])[0];
    },
    convertTargetOrg: async (id: string): Promise<TargetOrganization> => {
      await delay(300);
      const to = targetOrganizations.find((t) => t.id === id);
      if (!to) throw new Error("المنشأة المستهدفة غير موجودة");
      const custId = `c-${String(customers.length + 1).padStart(3, "0")}`;
      const newC: Customer = {
        id: custId,
        code: `CUS-${String(customers.length + 1).padStart(4, "0")}`,
        name: to.name,
        type: "wholesaler",
        territoryId: to.territoryId,
        repId: to.requestedById,
        supervisorId: to.supervisorId,
        phone: to.phones[0] || "",
        address: `${to.district || ""}، ${to.city}`,
        balance: 0,
        creditLimit: 50000,
        paymentTerms: to.paymentTerms || "credit_30",
        status: "active",
        visitedCount: 0,
        lat: 24.7,
        lng: 46.6,
        createdAt: new Date().toISOString().slice(0, 10),
        legalName: to.legalName,
        commercialReg: to.commercialReg,
        taxNumber: to.taxNumber,
      };
      customers.push(newC);
      to.status = "converted";
      to.convertedToCustomerId = custId;
      return clone([to])[0];
    },
    syncQueue: async () => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      if (scope.scopeType === "self") {
        const own = syncOwnIds(scope);
        return clone(syncQueue.filter((s) => own.has(s.entityId)));
      }
      return clone(syncQueue);
    },
    loadingOrders: async () => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(loadingOrders.filter((l) => l.repId === scope.userId));
    },
    receiveLoadingOrder: async (id: string): Promise<LoadingOrder> => {
      await delay(200);
      const lo = loadingOrders.find((l) => l.id === id);
      if (!lo) throw new Error("أمر التحميل غير موجود");
      lo.status = "completed";
      lo.completedAt = new Date().toISOString();
      lo.items.forEach((item) => { item.receivedQty = item.expectedQty; });
      return clone([lo])[0];
    },
    inventoryCounts: async () => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(inventoryCounts.filter((c) => c.repId === scope.userId));
    },
    submitInventoryCount: async (id: string): Promise<InventoryCount> => {
      await delay(200);
      const ic = inventoryCounts.find((c) => c.id === id);
      if (!ic) throw new Error("الجرد غير موجود");
      ic.status = "submitted";
      ic.submittedAt = new Date().toISOString();
      return clone([ic])[0];
    },
    createInventoryCount: async (items: { productId: string; productName: string; systemQty: number; physicalQty: number; variance: number; reason?: string }[]): Promise<InventoryCount> => {
      await delay(300);
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      const ic: InventoryCount = {
        id: `ic-${Date.now()}`,
        number: `IC-2026-${String(inventoryCounts.length + 1).padStart(4, "0")}`,
        repId: scope.userId,
        date: new Date().toISOString().slice(0, 10),
        status: "draft",
        items,
      };
      inventoryCounts.push(ic);
      return clone([ic])[0];
    },
    deposits: async () => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(deposits.filter((d) => d.repId === scope.userId));
    },
    createDeposit: async (data: Omit<DepositRequest, "id" | "number" | "status">): Promise<DepositRequest> => {
      await delay(200);
      const dep: DepositRequest = {
        id: `dp-${Date.now()}`,
        number: `DEP-2026-${String(deposits.length + 1).padStart(4, "0")}`,
        ...data,
        status: "pending",
      };
      deposits.push(dep);
      return clone([dep])[0];
    },
    createStockRequest: async (items: { productId: string; productName: string; qty: number }[], warehouseId: string, notes?: string): Promise<StockRequest> => {
      await delay(300);
      const scope = currentScope();
      if (!scope) throw new Error("غير مصرح");
      const sr: StockRequest = {
        id: `sr-${Date.now()}`,
        number: `SRQ-2026-${String(stockRequests.length + 1).padStart(4, "0")}`,
        repId: scope.userId,
        status: "pending",
        warehouseId,
        date: new Date().toISOString().slice(0, 10),
        items,
        notes,
      };
      stockRequests.push(sr);
      return clone([sr])[0];
    },
    createTransfer: async (items: { productId: string; productName: string; qty: number }[], toRepId: string, notes?: string): Promise<StockTransfer> => {
      await delay(300);
      const st: StockTransfer = {
        id: `st-${Date.now()}`,
        number: `ST-2026-${String(stockTransfers.length + 1).padStart(4, "0")}`,
        status: "draft",
        fromWarehouseId: "wh-01",
        toRepId,
        items,
        createdBy: useAuthStore.getState().user?.name || "system",
        date: new Date().toISOString().slice(0, 10),
        notes,
      };
      stockTransfers.push(st);
      return clone([st])[0];
    },
    receiveTransfer: async (id: string): Promise<StockTransfer> => {
      await delay(200);
      const st = stockTransfers.find((t) => t.id === id);
      if (!st) throw new Error("التحويل غير موجود");
      st.status = "completed";
      return clone([st])[0];
    },
    checkIn: async (visitId: string): Promise<Visit> => {
      await delay(100);
      const v = visits.find((x) => x.id === visitId);
      if (!v) throw new Error("الزيارة غير موجودة");
      v.checkInAt = new Date().toISOString();
      return clone([v])[0];
    },
    checkOut: async (visitId: string, result: Visit["result"], notes?: string): Promise<Visit> => {
      await delay(100);
      const v = visits.find((x) => x.id === visitId);
      if (!v) throw new Error("الزيارة غير موجودة");
      v.checkOutAt = new Date().toISOString();
      v.result = result;
      if (notes) v.notes = notes;
      return clone([v])[0];
    },
  },
  /** Supervisor-scoped operations over his team (team data scope only). */
  team: {
    representatives: async (): Promise<User[]> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      return clone(visibleUsers(scope).filter((u) => u.role === "REPRESENTATIVE"));
    },
    dailyPlans: async (): Promise<typeof dailyPlans> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      const repIds = visibleRepIds(scope);
      return clone(dailyPlans.filter((p) => repIds.includes(p.repId)));
    },
    trips: async (): Promise<typeof trips> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      const repIds = visibleRepIds(scope);
      return clone(trips.filter((t) => repIds.includes(t.repId)));
    },
    tripExpenses: async (): Promise<typeof tripExpenses> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      const repIds = visibleRepIds(scope);
      return clone(tripExpenses.filter((e) => repIds.includes(e.repId)));
    },
    dailyClosings: async (): Promise<typeof dailyClosings> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      const repIds = visibleRepIds(scope);
      return clone(dailyClosings.filter((c) => repIds.includes(c.repId)));
    },
    targetOrganizations: async (): Promise<typeof targetOrganizations> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      const repIds = visibleRepIds(scope);
      return clone(targetOrganizations.filter((t) => repIds.includes(t.requestedById)));
    },
    loadingOrders: async (): Promise<typeof loadingOrders> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      const repIds = visibleRepIds(scope);
      return clone(loadingOrders.filter((l) => repIds.includes(l.repId)));
    },
    inventoryCounts: async (): Promise<typeof inventoryCounts> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      const repIds = visibleRepIds(scope);
      return clone(inventoryCounts.filter((c) => repIds.includes(c.repId)));
    },
    deposits: async (): Promise<typeof deposits> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      const repIds = visibleRepIds(scope);
      return clone(deposits.filter((d) => repIds.includes(d.repId)));
    },
    notes: async (): Promise<SupervisorNote[]> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      return clone(supervisorNotes.filter((n) => n.authorId === scope.userId));
    },
    createNote: async (data: Omit<SupervisorNote, "id">): Promise<SupervisorNote> => {
      await delay(200);
      const note: SupervisorNote = {
        id: `sn-${Date.now()}`,
        ...data,
      };
      supervisorNotes.push(note);
      return clone([note])[0];
    },
    approveClosing: async (id: string): Promise<DailyClosing> => {
      await delay(200);
      const closing = dailyClosings.find((c) => c.id === id);
      if (!closing) throw new Error("إغلاق اليوم غير موجود");
      closing.status = "approved";
      closing.approvedBy = useAuthStore.getState().user?.name;
      if (closing.cashVariance !== 0) {
        cashMovements.push({
          id: `cm-${Date.now()}`,
          number: `ADJ-${Date.now()}`,
          type: "adjustment",
          amount: closing.cashVariance,
          cashBoxId: `cb-supervisor`,
          relatedRepId: closing.repId,
          date: new Date().toISOString().slice(0, 10),
          notes: `تسوية فروق إغلاق ${closing.number}: الفرق ${closing.cashVariance}`,
          createdBy: useAuthStore.getState().user?.name || "system",
        });
      }
      return clone([closing])[0];
    },
    approveDeposit: async (id: string): Promise<DepositRequest> => {
      await delay(200);
      const dep = deposits.find((d) => d.id === id);
      if (!dep) throw new Error("التوريد غير موجود");
      dep.status = "approved";
      dep.approvedBy = useAuthStore.getState().user?.name;
      return clone([dep])[0];
    },
    approveTargetOrg: async (id: string, approve: boolean, reason?: string): Promise<TargetOrganization> => {
      await delay(300);
      const to = targetOrganizations.find((t) => t.id === id);
      if (!to) throw new Error("المنشأة المستهدفة غير موجودة");
      if (approve) {
        to.status = "approved";
      } else {
        to.status = "rejected";
        to.rejectionReason = reason || "غير مبرر";
      }
      return clone([to])[0];
    },
    forwardTargetOrg: async (id: string): Promise<TargetOrganization> => {
      await delay(300);
      const to = targetOrganizations.find((t) => t.id === id);
      if (!to) throw new Error("المنشأة المستهدفة غير موجودة");
      to.status = "under_review";
      return clone([to])[0];
    },
    approveLoadingOrder: async (id: string): Promise<LoadingOrder> => {
      await delay(200);
      const lo = loadingOrders.find((l) => l.id === id);
      if (!lo) throw new Error("أمر التحميل غير موجود");
      lo.status = "completed";
      lo.completedAt = new Date().toISOString();
      return clone([lo])[0];
    },
    approveInventoryCount: async (id: string): Promise<InventoryCount> => {
      await delay(200);
      const ic = inventoryCounts.find((c) => c.id === id);
      if (!ic) throw new Error("الجرد غير موجود");
      ic.status = "approved";
      ic.approvedBy = useAuthStore.getState().user?.name;
      return clone([ic])[0];
    },
    approveStockRequest: async (id: string): Promise<StockRequest> => {
      await delay(200);
      const sr = stockRequests.find((r) => r.id === id);
      if (!sr) throw new Error("طلب المخزون غير موجود");
      sr.status = "approved";
      return clone([sr])[0];
    },
    confirmTransfer: async (id: string): Promise<StockTransfer> => {
      await delay(200);
      const st = stockTransfers.find((t) => t.id === id);
      if (!st) throw new Error("التحويل غير موجود");
      st.status = "received";
      st.items.forEach((item) => {
        stockMovements.push({
          id: `sm-${Date.now()}-${item.productId}`,
          type: "transfer_in",
          productId: item.productId,
          productName: item.productName,
          qty: item.qty,
          fromWarehouseId: st.fromWarehouseId,
          toWarehouseId: st.toRepId,
          repId: st.toRepId,
          date: new Date().toISOString().slice(0, 10),
          refNumber: st.number,
          createdBy: useAuthStore.getState().user?.name || "system",
          notes: `تحويل من المستودع للمندوب`,
        });
      });
      return clone([st])[0];
    },
    createPlan: async (data: { repId: string; date: string; territoryId?: string; salesTarget?: number; collectionTarget?: number; visitsTarget?: number }): Promise<DailyPlan> => {
      await delay(300);
      const plan: DailyPlan = {
        id: `dp-${Date.now()}`,
        date: data.date,
        repId: data.repId,
        territoryId: data.territoryId || "t-01",
        supervisorId: useAuthStore.getState().user?.id || "",
        entries: [],
        salesTarget: data.salesTarget ?? 5000,
        collectionTarget: data.collectionTarget ?? 3000,
        visitsTarget: data.visitsTarget ?? 8,
        source: "manual",
        status: "pending",
      };
      dailyPlans.push(plan);
      return clone([plan])[0];
    },
    approvePlan: async (id: string): Promise<DailyPlan> => {
      await delay(200);
      const plan = dailyPlans.find((p) => p.id === id);
      if (!plan) throw new Error("الخطة غير موجودة");
      plan.status = "approved";
      plan.approvedBy = useAuthStore.getState().user?.name;
      return clone([plan])[0];
    },
    rescheduleVisit: async (visitId: string, newDate: string, newTime?: string, reason?: string): Promise<Visit> => {
      await delay(200);
      const v = visits.find((x) => x.id === visitId);
      if (!v) throw new Error("الزيارة غير موجودة");
      const newVisit: Visit = {
        id: `v-${Date.now()}`,
        customerId: v.customerId,
        repId: v.repId,
        date: newDate,
        planned: true,
        result: "not_found",
        notes: reason || `إعادة جدولة من ${v.date}`,
        lat: v.lat,
        lng: v.lng,
      };
      visits.push(newVisit);
      v.result = "closed";
      v.notes = `تمت إعادة الجدولة إلى ${newDate}`;
      return clone([newVisit])[0];
    },
    sendDeviationAlert: async (userId: string, note: string): Promise<void> => {
      await delay(200);
      auditLogs.push({
        id: `al-${Date.now()}`,
        actor: useAuthStore.getState().user?.name || "supervisor",
        action: "deviation_alert",
        entity: "visit",
        entityId: userId,
        at: new Date().toISOString(),
        reason: note,
      });
    },
    suspendRep: async (repId: string, reason: string): Promise<User> => {
      await delay(300);
      const rep = users.find((u) => u.id === repId);
      if (!rep) throw new Error("المندوب غير موجود");
      rep.status = "suspended";
      auditLogs.push({
        id: `al-${Date.now()}`,
        actor: useAuthStore.getState().user?.name || "supervisor",
        action: "suspend_rep",
        entity: "user",
        entityId: repId,
        at: new Date().toISOString(),
        reason,
      });
      return clone([rep])[0];
    },
    activateRep: async (repId: string): Promise<User> => {
      await delay(200);
      const rep = users.find((u) => u.id === repId);
      if (!rep) throw new Error("المندوب غير موجود");
      rep.status = "active";
      auditLogs.push({
        id: `al-${Date.now()}`,
        actor: useAuthStore.getState().user?.name || "supervisor",
        action: "activate_rep",
        entity: "user",
        entityId: repId,
        at: new Date().toISOString(),
      });
      return clone([rep])[0];
    },
    issueStock: async (data: { repId: string; items: { productId: string; productName: string; qty: number }[]; notes?: string }): Promise<StockMovement[]> => {
      await delay(300);
      const movements: StockMovement[] = [];
      const date = new Date().toISOString().slice(0, 10);
      const user = useAuthStore.getState().user;
      data.items.forEach((item) => {
        const m: StockMovement = {
          id: `sm-${Date.now()}-${item.productId}`,
          type: "issue",
          productId: item.productId,
          productName: item.productName,
          qty: item.qty,
          fromWarehouseId: "wh-supervisor",
          repId: data.repId,
          date,
          refNumber: `ISS-${Date.now()}`,
          createdBy: user?.name || "system",
          notes: data.notes || "إصدار من مخزون المشرف",
        };
        stockMovements.push(m);
        movements.push(m);
      });
      return movements;
    },
  },
  assets: {
    requests: async (): Promise<AssetRequest[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      if (scope.scopeType === "self") return [];
      if (scope.scopeType === "team") return clone(assetRequests.filter((r) => r.requestedById === scope.userId));
      return clone(assetRequests);
    },
    approve: async (id: string, approve: boolean, note?: string): Promise<AssetRequest> => {
      await delay(300);
      const scope = currentScope();
      if (!scope || scope.scopeType === "self") throw new Error("غير مصرح");
      const req = assetRequests.find((r) => r.id === id);
      if (!req) throw new Error("طلب الأصل غير موجود");
      if (approve) {
        req.status = "approved";
        req.approvedBy = useAuthStore.getState().user?.name;
        req.approvalDate = new Date().toISOString().slice(0, 10);
      } else {
        req.status = "rejected";
        req.rejectionReason = note || "تم الرفض";
      }
      return clone([req])[0];
    },
    create: async (data: { assetType: string; beneficiaryId: string; beneficiaryName: string; reason: string; expectedDate?: string; notes?: string }): Promise<AssetRequest> => {
      await delay(300);
      const user = useAuthStore.getState().user;
      const ar: AssetRequest = {
        id: `ar-${Date.now()}`,
        number: `AR-2026-${String(assetRequests.length + 1).padStart(4, "0")}`,
        assetType: data.assetType as AssetRequest["assetType"],
        beneficiaryId: data.beneficiaryId,
        beneficiaryName: data.beneficiaryName,
        requestedById: user?.id || "",
        requestedBy: user?.name || "",
        reason: data.reason,
        expectedDate: data.expectedDate,
        notes: data.notes,
        status: "pending_approval",
        date: new Date().toISOString().slice(0, 10),
      };
      assetRequests.push(ar);
      return clone([ar])[0];
    },
  },
  customers: {
    list: async (): Promise<Customer[]> => {
      await delay();
      const scope = currentScope();
      if (!scope) return [];
      return clone(customers.filter((c) => canAccessCustomer(scope, c)));
    },
    getById: async (id: string): Promise<Customer | undefined> => {
      await delay(200);
      const scope = currentScope();
      if (!scope) return undefined;
      const c = customers.find((x) => x.id === id);
      if (!c || !canAccessCustomer(scope, c)) return undefined;
      return { ...c };
    },
    create: async (data: Partial<Customer>): Promise<Customer> => {
      await delay(300);
      const id = `c-${String(customers.length + 1).padStart(3, "0")}`;
      const code = `CUS-${String(customers.length + 1).padStart(4, "0")}`;
      const newC: Customer = {
        id,
        code,
        name: data.name || "",
        type: data.type || "retailer",
        territoryId: data.territoryId || "t-01",
        repId: data.repId || "u-rp-01",
        supervisorId: data.supervisorId || "u-sp-01",
        phone: data.phone || "",
        address: data.address || "",
        balance: 0,
        creditLimit: data.creditLimit || 10000,
        paymentTerms: data.paymentTerms || "cash",
        status: "active",
        visitedCount: 0,
        lat: data.lat || 24.7,
        lng: data.lng || 46.6,
        createdAt: new Date().toISOString().slice(0, 10),
        notes: data.notes,
      };
      customers.push(newC);
      return clone([newC])[0];
    },
    update: async (id: string, patch: Partial<Customer>): Promise<Customer> => {
      await delay(300);
      const c = customers.find((x) => x.id === id);
      if (!c) throw new Error("العميل غير موجود");
      Object.assign(c, patch);
      return clone([c])[0];
    },
    transfers: async (): Promise<typeof customerTransfers> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      const repIds = visibleRepIds(scope);
      return clone(customerTransfers.filter((t) => repIds.includes(t.previousRepId) || repIds.includes(t.newRepId)));
    },
    createTransfer: async (data: Omit<CustomerTransferRecord, "id" | "number" | "transferredAt" | "status" | "auditTrail">): Promise<CustomerTransferRecord> => {
      await delay(300);
      const ct: CustomerTransferRecord = {
        id: `ct-${Date.now()}`,
        number: `CT-2026-${String(customerTransfers.length + 15).padStart(4, "0")}`,
        ...data,
        transferredAt: new Date().toISOString(),
        status: "pending",
        auditTrail: [{ at: new Date().toISOString(), by: data.transferredById, action: "submit" }],
      };
      customerTransfers.push(ct);
      return clone([ct])[0];
    },
    suspensions: async (): Promise<CustomerSuspension[]> => {
      await delay();
      const scope = currentScope();
      if (!scope || scope.scopeType !== "team") return [];
      return clone(customerSuspensions);
    },
    suspend: async (customerId: string, reason: string): Promise<Customer> => {
      await delay(300);
      const c = customers.find((x) => x.id === customerId);
      if (!c) throw new Error("العميل غير موجود");
      const prev = c.status;
      c.status = "suspended";
      customerSuspensions.push({
        id: `cs-${Date.now()}`,
        customerId: c.id,
        customerName: c.name,
        reason,
        status: "suspended",
        suspendedBy: useAuthStore.getState().user?.name || "supervisor",
        suspendedAt: new Date().toISOString(),
        effectiveDate: new Date().toISOString().slice(0, 10),
        previousStatus: prev as "active" | "inactive",
        debtAtSuspension: c.balance,
        history: [{ at: new Date().toISOString(), by: useAuthStore.getState().user?.name || "supervisor", from: prev, to: "suspended", reason }],
      });
      auditLogs.push({
        id: `al-${Date.now()}`,
        actor: useAuthStore.getState().user?.name || "supervisor",
        action: "suspend_customer",
        entity: "customer",
        entityId: customerId,
        at: new Date().toISOString(),
        oldValue: prev,
        newValue: "suspended",
        reason,
      });
      return clone([c])[0];
    },
    reactivate: async (customerId: string): Promise<Customer> => {
      await delay(200);
      const c = customers.find((x) => x.id === customerId);
      if (!c) throw new Error("العميل غير موجود");
      c.status = "active";
      const suspension = customerSuspensions.find((s) => s.customerId === customerId && s.status === "suspended");
      if (suspension) suspension.status = "active";
      auditLogs.push({
        id: `al-${Date.now()}`,
        actor: useAuthStore.getState().user?.name || "supervisor",
        action: "reactivate_customer",
        entity: "customer",
        entityId: customerId,
        at: new Date().toISOString(),
        oldValue: "suspended",
        newValue: "active",
      });
      return clone([c])[0];
    },
  },
  settlements: {
    list: async (): Promise<CashSettlement[]> => {
      await delay();
      return clone(cashSettlements);
    },
    submit: async (id: string): Promise<CashSettlement> => {
      await delay(200);
      const cs = cashSettlements.find((s) => s.id === id);
      if (!cs) throw new Error("التسوية غير موجودة");
      cs.status = "submitted";
      cs.submittedAt = new Date().toISOString();
      return clone([cs])[0];
    },
    approve: async (id: string): Promise<CashSettlement> => {
      await delay(200);
      const cs = cashSettlements.find((s) => s.id === id);
      if (!cs) throw new Error("التسوية غير موجودة");
      cs.status = "approved";
      cs.approvedBy = useAuthStore.getState().user?.name;
      cs.approvedAt = new Date().toISOString();
      return clone([cs])[0];
    },
  },
  assignments: {
    list: async (): Promise<ResponsibleAssignment[]> => {
      await delay();
      return clone(responsibleAssignments);
    },
    release: async (id: string): Promise<ResponsibleAssignment> => {
      await delay(200);
      const ra = responsibleAssignments.find((a) => a.id === id);
      if (!ra) throw new Error("الإسناد غير موجود");
      ra.status = "released";
      ra.releasedAt = new Date().toISOString().slice(0, 10);
      return clone([ra])[0];
    },
  },
  discounts: {
    list: async (): Promise<DiscountRequest[]> => {
      await delay();
      return clone(discountRequests);
    },
    submit: async (data: Omit<DiscountRequest, "id" | "status" | "createdAt">): Promise<DiscountRequest> => {
      await delay(200);
      const dr: DiscountRequest = {
        id: `dr-${Date.now()}`,
        ...data,
        status: "pending",
      };
      discountRequests.push(dr);
      return clone([dr])[0];
    },
    approve: async (id: string, approve: boolean, reason?: string): Promise<DiscountRequest> => {
      await delay(200);
      const dr = discountRequests.find((d) => d.id === id);
      if (!dr) throw new Error("طلب الخصم غير موجود");
      if (approve) {
        dr.status = "approved";
        dr.approvedById = useAuthStore.getState().user?.id;
        dr.approvedByName = useAuthStore.getState().user?.name;
        dr.approvedAt = new Date().toISOString();
      } else {
        dr.status = "rejected";
        dr.rejectionReason = reason || "تم الرفض";
      }
      return clone([dr])[0];
    },
  },
  config: {
    getOrganization: async (): Promise<OrganizationConfig> => {
      await delay(100);
      return clone([organizationConfig])[0];
    },
    getRepCosts: async (): Promise<RepCostConfig[]> => {
      await delay(100);
      return clone(repCostConfigs);
    },
  },
};

export type MockApi = typeof mockApi;
