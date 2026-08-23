import type { RepresentativeAssignment, CustomerAssignment, OrganizationAuditLog, OrganizationTreeNode, Territory, Team, CustomerTransferRequest, PreTransferValidation } from "@/types";
import { repAssignments as _repAssignments, customerAssignments as _customerAssignments, organizationAuditLogs as _auditLogs, customerTransferRequests as _transferRequests } from "@/mock/organizationAssignments";
import { territories as _territories, teams as _teams, branches } from "@/mock/organization";
import { users, reps, supervisors } from "@/mock/users";
import { customers } from "@/mock/customers";

let repAssignments = [..._repAssignments];
let customerAssignmentsList = [..._customerAssignments];
let auditLogs = [..._auditLogs];
let transferRequests = [..._transferRequests];
let territoriesList = [..._territories];
let teamsList = [..._teams];

let nextRepAssignmentId = 100;
let nextCustomerAssignmentId = 100;
let nextAuditId = 200;
let nextTransferId = 100;

function now() { return new Date().toISOString(); }
function userName(id: string) { return users.find(u => u.id === id)?.name ?? "—"; }
function territoryName(id: string) { return territoriesList.find(t => t.id === id)?.name ?? "—"; }
function supervisorName(id: string) { return supervisors.find(s => s.id === id)?.name ?? "—"; }
function branchName(id: string) { return branches.find(b => b.id === id)?.name ?? "—"; }
function teamName(id: string) { return teamsList.find(t => t.id === id)?.name ?? "—"; }
function repName(id: string) { return reps.find(r => r.id === id)?.name ?? "—"; }
function customerName(id: string) { return customers.find(c => c.id === id)?.name ?? "—"; }
function customerCode(id: string) { return customers.find(c => c.id === id)?.code ?? "—"; }

function logAudit(
  entityType: OrganizationAuditLog["entityType"],
  entityId: string,
  entityName: string,
  action: OrganizationAuditLog["action"],
  performedBy: string,
  details: OrganizationAuditLog["details"],
  notes?: string,
) {
  auditLogs.push({
    id: `oal-${String(nextAuditId++).padStart(3, "0")}`,
    entityType, entityId, entityName, action,
    performedBy, performedByName: userName(performedBy),
    performedAt: now(), details, notes,
  });
}

export const organizationService = {
  // ─── شجرة التنظيم ───
  getOrganizationTree(): OrganizationTreeNode {
    return {
      id: "root", name: "المؤسسة", type: "branch",
      children: branches.map(branch => ({
        id: branch.id, name: branch.name, type: "branch" as const,
        repCount: repAssignments.filter(a => a.branchId === branch.id && a.status === "active").length,
        customerCount: customerAssignmentsList.filter(a => {
          const c = customers.find(cx => cx.id === a.customerId);
          return c && territoriesList.some(t => t.id === c.territoryId && t.branchId === branch.id);
        }).filter(a => a.status === "active").length,
        children: territoriesList
          .filter(t => t.branchId === branch.id)
          .map(territory => ({
            id: territory.id, name: territory.name, type: "territory" as const,
            supervisorName: territory.supervisorId ? supervisorName(territory.supervisorId) : "—",
            repCount: territory.repIds.length,
            customerCount: customerAssignmentsList.filter(a => a.territoryId === territory.id && a.status === "active").length,
            children: repAssignments
              .filter(a => a.territoryId === territory.id && a.status === "active")
              .map(a => ({
                id: a.repId, name: a.repName, type: "rep" as const,
                customerCount: customerAssignmentsList.filter(cx => cx.repId === a.repId && cx.status === "active").length,
              })),
          })),
      })),
    };
  },

  getTerritoryStats(territoryId: string) {
    const t = territoriesList.find(tx => tx.id === territoryId);
    const territoryReps = repAssignments.filter(a => a.territoryId === territoryId && a.status === "active");
    const territoryCustomers = customerAssignmentsList.filter(a => a.territoryId === territoryId && a.status === "active");
    return {
      territory: t,
      repCount: territoryReps.length,
      customerCount: territoryCustomers.length,
      supervisorName: t?.supervisorId ? supervisorName(t.supervisorId) : "—",
      teamName: teamsList.find(tx => tx.territoryIds.includes(territoryId))?.name ?? "—",
    };
  },

  // ─── KPIs ───
  getKPIs() {
    const activeReps = repAssignments.filter(a => a.status === "active");
    const activeCustomers = customerAssignmentsList.filter(a => a.status === "active");
    const unassignedCustomers = customers.filter(c => !customerAssignmentsList.some(a => a.customerId === c.id && a.status === "active"));
    const repsWithoutTerritory = reps.filter(r => !activeReps.some(a => a.repId === r.id));
    return {
      branchCount: branches.length,
      territoryCount: territoriesList.length,
      teamCount: teamsList.length,
      activeRepCount: activeReps.length,
      suspendedRepCount: repAssignments.filter(a => a.status === "released").length,
      activeCustomerCount: activeCustomers.length,
      unassignedCustomerCount: unassignedCustomers.length,
      repsWithoutTerritoryCount: repsWithoutTerritory.length,
      pendingTransfers: transferRequests.filter(t => t.status === "pending").length,
      recentAssignments: [...repAssignments, ...customerAssignmentsList]
        .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
        .slice(0, 5),
    };
  },

  // ─── CRUD المناطق ───
  createTerritory(data: { name: string; branchId: string; supervisorId: string }): Territory {
    const newTerritory: Territory = {
      id: `t-${String(territoriesList.length + 1).padStart(2, "0")}`,
      name: data.name,
      branchId: data.branchId,
      supervisorId: data.supervisorId,
      repIds: [],
      customerCount: 0,
    };
    territoriesList.push(newTerritory);
    logAudit("territory", newTerritory.id, newTerritory.name, "create", data.supervisorId,
      { "الاسم": { old: null, new: data.name }, "الفرع": { old: null, new: data.branchId } },
      "إنشاء منطقة جديدة");
    return newTerritory;
  },

  updateTerritory(id: string, data: Partial<Territory>): Territory {
    const idx = territoriesList.findIndex(t => t.id === id);
    if (idx === -1) throw new Error("المنطقة غير موجودة");
    const old = { ...territoriesList[idx] };
    territoriesList[idx] = { ...territoriesList[idx], ...data };
    logAudit("territory", id, old.name, "update", data.supervisorId ?? "u-sm-01",
      { "الاسم": { old: old.name, new: data.name ?? old.name } },
      "تعديل المنطقة");
    return territoriesList[idx];
  },

  deleteTerritory(id: string): void {
    const idx = territoriesList.findIndex(t => t.id === id);
    if (idx === -1) throw new Error("المنطقة غير موجودة");
    const t = territoriesList[idx];
    if (t.repIds.length > 0) throw new Error("لا يمكن حذف منطقة بها مندوبون نشطون");
    const assignedCustomers = customerAssignmentsList.filter(a => a.territoryId === id && a.status === "active");
    if (assignedCustomers.length > 0) throw new Error("لا يمكن حذف منطقة بها عملاء معيّنون");
    logAudit("territory", id, t.name, "delete" as any, "u-sm-01", {}, "حذف المنطقة");
    territoriesList.splice(idx, 1);
  },

  // ─── CRUD الفرق ───
  createTeam(data: { name: string; supervisorId: string; territoryIds: string[] }): Team {
    const newTeam: Team = {
      id: `team-${String(teamsList.length + 1).padStart(2, "0")}`,
      name: data.name,
      supervisorId: data.supervisorId,
      territoryIds: data.territoryIds,
      repIds: [],
    };
    teamsList.push(newTeam);
    logAudit("team", newTeam.id, newTeam.name, "create", data.supervisorId,
      { "الاسم": { old: null, new: data.name } }, "إنشاء فريق جديد");
    return newTeam;
  },

  updateTeam(id: string, data: Partial<Team>): Team {
    const idx = teamsList.findIndex(t => t.id === id);
    if (idx === -1) throw new Error("الفريق غير موجود");
    const old = { ...teamsList[idx] };
    teamsList[idx] = { ...teamsList[idx], ...data };
    logAudit("team", id, old.name, "update", data.supervisorId ?? "u-sm-01",
      { "الاسم": { old: old.name, new: data.name ?? old.name } }, "تعديل الفريق");
    return teamsList[idx];
  },

  deleteTeam(id: string): void {
    const idx = teamsList.findIndex(t => t.id === id);
    if (idx === -1) throw new Error("الفريق غير موجود");
    const t = teamsList[idx];
    if (t.repIds.length > 0) throw new Error("لا يمكن حذف فريق به مندوبون نشطون");
    logAudit("team", id, t.name, "delete" as any, "u-sm-01", {}, "حذف الفريق");
    teamsList.splice(idx, 1);
  },

  // ─── تعيين المندوبين ───
  assignRepToTerritory(repId: string, territoryId: string, supervisorId: string, reason: string, assignedBy: string): RepresentativeAssignment {
    const rName = repName(repId);
    const tName = territoryName(territoryId);
    const sName = supervisorName(supervisorId);
    const t = territoriesList.find(tx => tx.id === territoryId);
    const team = teamsList.find(tx => tx.territoryIds.includes(territoryId));

    // Release any existing active assignment for this rep
    const existing = repAssignments.find(a => a.repId === repId && a.status === "active");
    if (existing) {
      existing.status = "released";
      existing.releasedAt = now();
      existing.releasedBy = assignedBy;
      existing.releasedByName = userName(assignedBy);
    }

    const assignment: RepresentativeAssignment = {
      id: `ra-${String(nextRepAssignmentId++).padStart(3, "0")}`,
      repId, repName: rName,
      territoryId, territoryName: tName,
      supervisorId, supervisorName: sName,
      branchId: t?.branchId ?? "b-01", branchName: branchName(t?.branchId ?? "b-01"),
      teamId: team?.id, teamName: team?.name,
      assignedAt: now(), assignedBy, assignedByName: userName(assignedBy),
      status: "active", reason,
    };
    repAssignments.push(assignment);

    // Update territory repIds
    if (t && !t.repIds.includes(repId)) {
      t.repIds.push(repId);
    }

    // Update team repIds
    if (team && !team.repIds.includes(repId)) {
      team.repIds.push(repId);
    }

    logAudit("rep", repId, rName, "assign", assignedBy,
      { "المنطقة": { old: existing?.territoryId ?? null, new: territoryId }, "المشرف": { old: existing?.supervisorId ?? null, new: supervisorId } },
      reason);
    return assignment;
  },

  releaseRepFromTerritory(repId: string, reason: string, releasedBy: string): void {
    const active = repAssignments.find(a => a.repId === repId && a.status === "active");
    if (!active) throw new Error("المندوب ليس لديه تعيين نشط");
    active.status = "released";
    active.releasedAt = now();
    active.releasedBy = releasedBy;
    active.releasedByName = userName(releasedBy);

    // Remove from territory
    const t = territoriesList.find(tx => tx.id === active.territoryId);
    if (t) t.repIds = t.repIds.filter(id => id !== repId);

    // Remove from team
    const team = teamsList.find(tx => tx.repIds.includes(repId));
    if (team) team.repIds = team.repIds.filter(id => id !== repId);

    logAudit("rep", repId, active.repName, "suspend", releasedBy,
      { "المنطقة": { old: active.territoryId, new: null } }, reason);
  },

  transferRepToTerritory(repId: string, newTerritoryId: string, newSupervisorId: string, reason: string, transferredBy: string): RepresentativeAssignment {
    const old = repAssignments.find(a => a.repId === repId && a.status === "active");
    const rName = repName(repId);
    const tName = territoryName(newTerritoryId);
    const sName = supervisorName(newSupervisorId);

    // Release old assignment
    if (old) {
      old.status = "released";
      old.releasedAt = now();
      old.releasedBy = transferredBy;
      old.releasedByName = userName(transferredBy);
      // Remove from old territory
      const oldT = territoriesList.find(tx => tx.id === old.territoryId);
      if (oldT) oldT.repIds = oldT.repIds.filter(id => id !== repId);
      // Remove from old team
      const oldTeam = teamsList.find(tx => tx.repIds.includes(repId));
      if (oldTeam) oldTeam.repIds = oldTeam.repIds.filter(id => id !== repId);
    }

    // Create new assignment
    const newT = territoriesList.find(tx => tx.id === newTerritoryId);
    const newTeam = teamsList.find(tx => tx.territoryIds.includes(newTerritoryId));
    const assignment: RepresentativeAssignment = {
      id: `ra-${String(nextRepAssignmentId++).padStart(3, "0")}`,
      repId, repName: rName,
      territoryId: newTerritoryId, territoryName: tName,
      supervisorId: newSupervisorId, supervisorName: sName,
      branchId: newT?.branchId ?? "b-01", branchName: branchName(newT?.branchId ?? "b-01"),
      teamId: newTeam?.id, teamName: newTeam?.name,
      assignedAt: now(), assignedBy: transferredBy, assignedByName: userName(transferredBy),
      status: "active", reason,
    };
    repAssignments.push(assignment);

    // Add to new territory
    if (newT && !newT.repIds.includes(repId)) newT.repIds.push(repId);
    // Add to new team
    if (newTeam && !newTeam.repIds.includes(repId)) newTeam.repIds.push(repId);

    logAudit("rep", repId, rName, "reassign", transferredBy,
      { "المنطقة": { old: old?.territoryId ?? null, new: newTerritoryId }, "المشرف": { old: old?.supervisorId ?? null, new: newSupervisorId } },
      reason);
    return assignment;
  },

  // ─── تعيين العملاء ───
  assignCustomerToRep(customerId: string, repId: string, territoryId: string, supervisorId: string, reason: string, assignedBy: string): CustomerAssignment {
    const cName = customerName(customerId);
    const rName = repName(repId);

    // Release any existing active assignment
    const existing = customerAssignmentsList.find(a => a.customerId === customerId && a.status === "active");
    if (existing) {
      existing.status = "released";
      existing.releasedAt = now();
      existing.releasedBy = assignedBy;
      existing.releasedByName = userName(assignedBy);
    }

    const assignment: CustomerAssignment = {
      id: `ca-${String(nextCustomerAssignmentId++).padStart(3, "0")}`,
      customerId, customerName: cName, customerCode: customerCode(customerId),
      repId, repName: rName,
      territoryId, territoryName: territoryName(territoryId),
      supervisorId, supervisorName: supervisorName(supervisorId),
      assignedAt: now(), assignedBy, assignedByName: userName(assignedBy),
      status: "active", reason,
    };
    customerAssignmentsList.push(assignment);
    logAudit("customer", customerId, cName, "assign", assignedBy,
      { "المندوب": { old: existing?.repId ?? null, new: repId }, "المنطقة": { old: existing?.territoryId ?? null, new: territoryId } },
      reason);
    return assignment;
  },

  bulkAssignCustomers(customerIds: string[], repId: string, territoryId: string, supervisorId: string, reason: string, assignedBy: string): CustomerAssignment[] {
    return customerIds.map(cid => this.assignCustomerToRep(cid, repId, territoryId, supervisorId, reason, assignedBy));
  },

  // ─── نقل العملاء ───
  createCustomerTransfer(customerId: string, newRepId: string, reason: string, debtResponsibility: "previous_rep" | "new_rep" | "policy", requestedBy: string, validation: PreTransferValidation): CustomerTransferRequest {
    const c = customers.find(cx => cx.id === customerId);
    if (!c) throw new Error("العميل غير موجود");
    const oldAssignment = customerAssignmentsList.find(a => a.customerId === customerId && a.status === "active");
    const newRepTerritory = repAssignments.find(a => a.repId === newRepId && a.status === "active");

    const request: CustomerTransferRequest = {
      id: `ctr-${String(nextTransferId++).padStart(3, "0")}`,
      number: `CTR-2026-${String(nextTransferId).padStart(4, "0")}`,
      customerId, customerName: c.name, customerCode: c.code,
      previousRepId: oldAssignment?.repId ?? c.repId,
      previousRepName: oldAssignment?.repName ?? repName(c.repId),
      previousTerritoryId: oldAssignment?.territoryId ?? c.territoryId,
      previousTerritoryName: oldAssignment?.territoryName ?? territoryName(c.territoryId),
      newRepId, newRepName: repName(newRepId),
      newTerritoryId: newRepTerritory?.territoryId ?? "—",
      newTerritoryName: newRepTerritory?.territoryName ?? "—",
      effectiveDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
      reason, debtResponsibility,
      requestedBy, requestedByName: userName(requestedBy),
      requestedAt: now(),
      status: "pending",
      validation,
      auditTrail: [{ at: now(), by: requestedBy, byName: userName(requestedBy), action: "submit", note: reason }],
    };
    transferRequests.push(request);
    logAudit("customer", customerId, c.name, "transfer", requestedBy,
      { "المندوب الجديد": { old: null, new: newRepId } }, reason);
    return request;
  },

  approveCustomerTransfer(transferId: string, approvedBy: string): void {
    const req = transferRequests.find(t => t.id === transferId);
    if (!req) throw new Error("طلب النقل غير موجود");
    if (req.status !== "pending") throw new Error("لا يمكن اعتماد طلب بحالة مختلفة عن معلق");
    req.status = "approved";
    req.approvedBy = approvedBy;
    req.approvedByName = userName(approvedBy);
    req.approvedAt = now();
    req.auditTrail.push({ at: now(), by: approvedBy, byName: userName(approvedBy), action: "approve" });
    logAudit("customer", req.customerId, req.customerName, "transfer", approvedBy,
      { "الحالة": { old: "pending", new: "approved" } }, "اعتماد طلب النقل");
  },

  rejectCustomerTransfer(transferId: string, rejectedBy: string, reason: string): void {
    const req = transferRequests.find(t => t.id === transferId);
    if (!req) throw new Error("طلب النقل غير موجود");
    if (req.status !== "pending") throw new Error("لا يمكن رفض طلب بحالة مختلفة عن معلق");
    req.status = "rejected";
    req.rejectionReason = reason;
    req.auditTrail.push({ at: now(), by: rejectedBy, byName: userName(rejectedBy), action: "reject", note: reason });
    logAudit("customer", req.customerId, req.customerName, "transfer", rejectedBy,
      { "الحالة": { old: "pending", new: "rejected" } }, reason);
  },

  executeCustomerTransfer(transferId: string, executedBy: string): void {
    const req = transferRequests.find(t => t.id === transferId);
    if (!req) throw new Error("طلب النقل غير موجود");
    if (req.status !== "approved") throw new Error("لا يمكن تنفيذ طلب بحالة مختلفة عن معتمد");

    // Execute the actual transfer
    const oldAssignment = customerAssignmentsList.find(a => a.customerId === req.customerId && a.status === "active");
    if (oldAssignment) {
      oldAssignment.status = "released";
      oldAssignment.releasedAt = now();
      oldAssignment.releasedBy = executedBy;
      oldAssignment.releasedByName = userName(executedBy);
    }

    const newRep = repAssignments.find(a => a.repId === req.newRepId && a.status === "active");
    const newAssignment: CustomerAssignment = {
      id: `ca-${String(nextCustomerAssignmentId++).padStart(3, "0")}`,
      customerId: req.customerId, customerName: req.customerName, customerCode: req.customerCode,
      repId: req.newRepId, repName: req.newRepName,
      territoryId: newRep?.territoryId ?? "—", territoryName: newRep?.territoryName ?? "—",
      supervisorId: newRep?.supervisorId ?? "—", supervisorName: newRep?.supervisorName ?? "—",
      assignedAt: now(), assignedBy: executedBy, assignedByName: userName(executedBy),
      status: "active", reason: `تنفيذ نقل — ${req.reason}`,
    };
    customerAssignmentsList.push(newAssignment);

    // Update the customer record directly
    const c = customers.find(cx => cx.id === req.customerId);
    if (c) {
      c.repId = req.newRepId;
      c.territoryId = newRep?.territoryId ?? c.territoryId;
      c.supervisorId = newRep?.supervisorId ?? c.supervisorId;
    }

    req.status = "executed";
    req.executedAt = now();
    req.auditTrail.push({ at: now(), by: executedBy, byName: userName(executedBy), action: "execute", note: "تم التنفيذ" });
    logAudit("customer", req.customerId, req.customerName, "transfer", executedBy,
      { "المندوب": { old: req.previousRepId, new: req.newRepId }, "المنطقة": { old: req.previousTerritoryId, new: newRep?.territoryId ?? "—" } },
      "تنفيذ النقل");
  },

  // ─── السجلات ───
  getRepAssignments(repId?: string): RepresentativeAssignment[] {
    if (repId) return repAssignments.filter(a => a.repId === repId).sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
    return [...repAssignments].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  },

  getCustomerAssignments(customerId?: string, repId?: string): CustomerAssignment[] {
    let list = [...customerAssignmentsList];
    if (customerId) list = list.filter(a => a.customerId === customerId);
    if (repId) list = list.filter(a => a.repId === repId);
    return list.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
  },

  getRecentAssignments(limit: number = 10): (RepresentativeAssignment | CustomerAssignment)[] {
    return [...repAssignments, ...customerAssignmentsList]
      .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
      .slice(0, limit);
  },

  // ─── سجل التدقيق ───
  getOrganizationAuditLog(filters: { entityType?: string; entityId?: string; action?: string; dateFrom?: string; dateTo?: string }): OrganizationAuditLog[] {
    let list = [...auditLogs];
    if (filters.entityType) list = list.filter(l => l.entityType === filters.entityType);
    if (filters.entityId) list = list.filter(l => l.entityId === filters.entityId);
    if (filters.action) list = list.filter(l => l.action === filters.action);
    if (filters.dateFrom) list = list.filter(l => l.performedAt >= filters.dateFrom!);
    if (filters.dateTo) list = list.filter(l => l.performedAt <= filters.dateTo!);
    return list.sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  },

  // ─── طلبات النقل ───
  getTransferRequests(status?: CustomerTransferRequest["status"]): CustomerTransferRequest[] {
    if (status) return transferRequests.filter(t => t.status === status).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return [...transferRequests].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  },

  // ─── الحصول على بيانات ───
  getTerritories() { return [...territoriesList]; },
  getTeams() { return [...teamsList]; },
  getBranches() { return [...branches]; },
};
