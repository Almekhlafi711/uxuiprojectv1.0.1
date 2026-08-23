/**
 * Custody Transaction Service — issue/return custody records with audit.
 */
import { custodyRecords } from "@/mock/custody";
import { addAuditLog, genAuditId } from "@/store/transactions";

interface CustodyInput {
  assetType: string;
  assignedToId: string;
  assignedToRole: string;
  assetName: string;
  serialNumber: string;
}

interface CustodyResult {
  success: boolean;
  custodyId?: string;
  reason?: string;
}

export function issueCustody(input: CustodyInput, actor: { id: string }): CustodyResult {
  if (!input.assignedToId) return { success: false, reason: "اختر المستلم" };
  if (!input.assetName.trim()) return { success: false, reason: "اسم الأصل مطلوب" };
  const id = `custody-${Date.now()}`;
  const newRecord = {
    id,
    assetType: input.assetType as "car" | "phone" | "tablet" | "pos" | "printer" | "cashbox",
    assetName: input.assetName,
    serialNumber: input.serialNumber,
    assignedToId: input.assignedToId,
    assignedToRole: input.assignedToRole as "REPRESENTATIVE" | "SUPERVISOR" | "GENERAL_MANAGER",
    issuedAt: new Date().toISOString().slice(0, 10),
    status: "issued" as const,
    condition: "good" as const,
  };
  custodyRecords.push(newRecord);
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "custody.issued",
    entity: "custody",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify(newRecord),
  });
  return { success: true, custodyId: id };
}

export function returnCustody(id: string, condition: "good" | "damaged", actor: { id: string }): CustodyResult {
  const idx = custodyRecords.findIndex((r) => r.id === id);
  if (idx === -1) return { success: false, reason: "العهدة غير موجودة" };
  const old = { ...custodyRecords[idx] };
  custodyRecords[idx].status = "returned";
  custodyRecords[idx].condition = condition;
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "custody.returned",
    entity: "custody",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    oldValue: JSON.stringify(old),
    newValue: JSON.stringify(custodyRecords[idx]),
  });
  return { success: true };
}
