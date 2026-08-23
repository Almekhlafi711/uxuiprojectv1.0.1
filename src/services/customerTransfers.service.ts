/**
 * Customer Transfer Service — transfer customer between reps with debt responsibility.
 */
import { customers } from "@/mock/customers";
import { addAuditLog, genAuditId } from "@/store/transactions";

interface TransferResult {
  success: boolean;
  transferId?: string;
  reason?: string;
}

export function transferCustomer(
  customerId: string,
  fromRepId: string,
  toRepId: string,
  reason: string,
  actor: { id: string }
): TransferResult {
  if (!toRepId) return { success: false, reason: "اختر المندوب المستقبل" };
  if (fromRepId === toRepId) return { success: false, reason: "المندوبان متطابقان" };
  const idx = customers.findIndex((c) => c.id === customerId);
  if (idx === -1) return { success: false, reason: "العميل غير موجود" };
  const old = { ...customers[idx] };
  customers[idx].repId = toRepId;
  const id = `ct-${Date.now()}`;
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "customer_transfer.executed",
    entity: "customer_transfer",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    oldValue: JSON.stringify({ repId: fromRepId }),
    newValue: JSON.stringify({ repId: toRepId, reason }),
  });
  return { success: true, transferId: id };
}
