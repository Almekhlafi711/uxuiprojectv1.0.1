/**
 * Approval Transaction Service — approve/reject approval requests.
 */
import { addAuditLog, genAuditId } from "@/store/transactions";

interface ApprovalResult {
  success: boolean;
  reason?: string;
}

export function approveRequest(requestId: string, actor: { id: string; role: string }, note?: string): ApprovalResult {
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "approval.approved",
    entity: "approval",
    entityId: requestId,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify({ status: "approved", approver: actor.id, role: actor.role, note }),
  });
  return { success: true };
}

export function rejectRequest(requestId: string, actor: { id: string; role: string }, note?: string): ApprovalResult {
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "approval.rejected",
    entity: "approval",
    entityId: requestId,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify({ status: "rejected", approver: actor.id, role: actor.role, note }),
  });
  return { success: true };
}
