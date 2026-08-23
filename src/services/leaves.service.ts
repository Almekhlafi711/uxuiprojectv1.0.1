/**
 * Leaves Transaction Service — submit leave requests with audit.
 */
import { addAuditLog, genAuditId } from "@/store/transactions";

interface LeaveInput {
  type: string;
  days: number;
  fromDate: string;
  toDate: string;
  reason: string;
}

interface LeaveResult {
  success: boolean;
  leaveId?: string;
  reason?: string;
}

export function submitLeave(input: LeaveInput, actor: { id: string }): LeaveResult {
  if (!input.reason.trim()) return { success: false, reason: "سبب الإجازة مطلوب" };
  if (input.days <= 0) return { success: false, reason: "عدد الأيام غير صحيح" };
  const id = `leave-${Date.now()}`;
  const newLeave = { id, ...input, employeeId: actor.id, status: "pending" as const };
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "leave.submitted",
    entity: "leave",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify(newLeave),
  });
  return { success: true, leaveId: id };
}
