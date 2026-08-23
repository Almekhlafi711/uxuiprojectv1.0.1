/**
 * Targets Transaction Service — create targets with audit.
 */
import { addAuditLog, genAuditId } from "@/store/transactions";

interface TargetInput {
  ownerId: string;
  ownerType: string;
  period: string;
  salesAmount: number;
  collectionAmount: number;
  visitsCount: number;
  newCustomers: number;
  startDate: string;
}

interface TargetResult {
  success: boolean;
  targetId?: string;
  reason?: string;
}

export function createTarget(input: TargetInput, actor: { id: string }): TargetResult {
  if (!input.ownerId) return { success: false, reason: "اختر المالك" };
  const id = `tgt-${Date.now()}`;
  const newTarget = { id, ...input, status: "draft" as const };
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "target.created",
    entity: "target",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify(newTarget),
  });
  return { success: true, targetId: id };
}
