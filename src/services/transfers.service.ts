/**
 * Stock Transfers Transaction Service — CENTRAL execution layer.
 *
 * Lifecycle:
 *   createTransfer()  -> rep submits (draft -> submitted)
 *   approveTransfer() -> supervisor approves (submitted -> approved)
 *   receiveTransfer() -> receiving rep accepts (in_transit -> received -> accepted)
 *   rejectTransfer()  -> receiving rep rejects (in_transit -> rejected)
 */
import { vanStock } from "@/mock/inventory";
import {
  addStockTransfer,
  addStockMovement,
  addAuditLog,
  findStockTransfer,
  genTransferId,
  genTransferNumber,
  genStockMovementId,
  genAuditId,
} from "@/store/transactions";
import { canTransition, type CheckActor } from "@/services/workflow";
import type { StockTransfer } from "@/types";

export interface CreateTransferInput {
  fromRepId: string;
  toRepId: string;
  items: { productId: string; productName: string; qty: number }[];
  notes?: string;
}

export interface TransferResult {
  success: boolean;
  transfer?: StockTransfer;
  reason?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const deductVanStock = (repId: string, items: CreateTransferInput["items"]) => {
  const van = vanStock.find((v) => v.repId === repId);
  if (!van) return;
  for (const item of items) {
    const slot = van.items.find((i) => i.productId === item.productId);
    if (slot) slot.qty = Math.max(0, slot.qty - item.qty);
  }
  van.updatedAt = today();
};

const addVanStock = (repId: string, items: { productId: string; productName: string; qty: number }[]) => {
  const van = vanStock.find((v) => v.repId === repId);
  if (!van) return;
  for (const item of items) {
    const slot = van.items.find((i) => i.productId === item.productId);
    if (slot) {
      slot.qty += item.qty;
    } else {
      van.items.push({ productId: item.productId, productName: item.productName, qty: item.qty, damagedQty: 0 });
    }
  }
  van.updatedAt = today();
};

export const createTransfer = (input: CreateTransferInput, actor: CheckActor): TransferResult => {
  if (input.items.length === 0) return { success: false, reason: "لا توجد بنود للتحويل" };
  if (input.fromRepId === input.toRepId) return { success: false, reason: "لا يمكن التحويل لنفس المندوب" };

  // تحقق توفر المخزون قبل الحجز (لا خصم بعد)
  const van = vanStock.find((v) => v.repId === input.fromRepId);
  for (const it of input.items) {
    const have = van?.items.find((s) => s.productId === it.productId)?.qty ?? 0;
    if (have < it.qty) return { success: false, reason: `المتاح غير كاف لـ ${it.productName}: طلب ${it.qty} ومتوفر ${have}` };
  }

  const gate = canTransition({ entityType: "stock_transfer", from: "draft", action: "submit", to: "submitted", actor });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  // حجز فقط — لا خصم فعلي حتى الإرسال (P0-2)
  const date = today();
  const transfer: StockTransfer = {
    id: genTransferId(),
    number: genTransferNumber(),
    status: "submitted",
    fromWarehouseId: "wh-01",
    toRepId: input.toRepId,
    items: input.items,
    createdBy: input.fromRepId,
    date,
    notes: input.notes,
  };
  addStockTransfer(transfer);

  addAuditLog({ id: genAuditId(), actor: actor.id, action: "stock_transfer.submitted", entity: "stock_transfer", entityId: transfer.id, at: date, newValue: JSON.stringify(transfer) });
  return { success: true, transfer };
};

export const approveTransfer = (transferId: string, actor: CheckActor): TransferResult => {
  const tr = findStockTransfer(transferId);
  if (!tr) return { success: false, reason: "التحويل غير موجود" };

  const gate = canTransition({ entityType: "stock_transfer", from: "submitted", action: "approve", actor });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const oldStatus = tr.status;
  tr.status = "approved";
  tr.approvedBy = actor.id;
  addAuditLog({ id: genAuditId(), actor: actor.id, action: "stock_transfer.approved", entity: "stock_transfer", entityId: tr.id, at: today(), oldValue: oldStatus, newValue: "approved" });
  return { success: true, transfer: tr };
};

export const dispatchTransfer = (transferId: string, actor: CheckActor): TransferResult => {
  const tr = findStockTransfer(transferId);
  if (!tr) return { success: false, reason: "التحويل غير موجود" };
  const gate = canTransition({ entityType: "stock_transfer", from: "approved", action: "send", actor });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  // خصم فعلي من المصدر + حركة OUT (PICKING→DISPATCHED)
  deductVanStock(tr.createdBy, tr.items);
  for (const item of tr.items) {
    addStockMovement({
      id: genStockMovementId(),
      type: "transfer_out",
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      repId: tr.createdBy,
      date: today(),
      refNumber: tr.number,
      createdBy: actor.id,
      notes: `تحويل صادر — إرسال ${tr.number}`,
    });
  }
  const oldStatus = tr.status;
  tr.status = "sent";
  addAuditLog({ id: genAuditId(), actor: actor.id, action: "stock_transfer.sent", entity: "stock_transfer", entityId: tr.id, at: today(), oldValue: oldStatus, newValue: "sent" });

  // انتقال تلقائي sent → in_transit إذا مسموح (لتسهيل الميدان)
  const gate2 = canTransition({ entityType: "stock_transfer", from: "sent", action: "transit", actor });
  if (gate2.allowed) {
    tr.status = "in_transit";
    addAuditLog({ id: genAuditId(), actor: actor.id, action: "stock_transfer.in_transit", entity: "stock_transfer", entityId: tr.id, at: today(), oldValue: "sent", newValue: "in_transit" });
  }
  return { success: true, transfer: tr };
};

export const transitTransfer = (transferId: string, actor: CheckActor): TransferResult => {
  const tr = findStockTransfer(transferId);
  if (!tr) return { success: false, reason: "التحويل غير موجود" };
  const gate = canTransition({ entityType: "stock_transfer", from: "sent", action: "transit", actor });
  if (!gate.allowed) return { success: false, reason: gate.reason };
  const oldStatus = tr.status;
  tr.status = "in_transit";
  addAuditLog({ id: genAuditId(), actor: actor.id, action: "stock_transfer.in_transit", entity: "stock_transfer", entityId: tr.id, at: today(), oldValue: oldStatus, newValue: "in_transit" });
  return { success: true, transfer: tr };
};

export const receiveTransfer = (
  transferId: string,
  actor: CheckActor,
  receivedItems?: { productId: string; qty: number; condition?: "good" | "damaged" }[]
): TransferResult => {
  const tr = findStockTransfer(transferId);
  if (!tr) return { success: false, reason: "التحويل غير موجود" };

  const gate = canTransition({ entityType: "stock_transfer", from: "in_transit", action: "receive", actor });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const toAdd: { productId: string; productName: string; qty: number; condition: "good" | "damaged" }[] = [];
  let hasDifference = false;

  if (receivedItems && receivedItems.length) {
    for (const exp of tr.items) {
      const rec = receivedItems.find((r) => r.productId === exp.productId);
      const qty = rec ? rec.qty : 0;
      const cond = rec?.condition ?? "good";
      if (qty < exp.qty) hasDifference = true;
      if (qty > 0) {
        toAdd.push({ productId: exp.productId, productName: exp.productName, qty, condition: cond });
      }
      // فرق يُسجل كـ shortage — لا يُضاف للمستلم
      if (qty < exp.qty && qty > 0) {
        addAuditLog({ id: genAuditId(), actor: actor.id, action: "stock_transfer.partial", entity: "stock_transfer", entityId: tr.id, at: today(), oldValue: `${exp.qty}`, newValue: `${qty}`, reason: `فرق استلام ${exp.qty - qty} وحدة` });
      }
    }
  } else {
    for (const it of tr.items) toAdd.push({ productId: it.productId, productName: it.productName, qty: it.qty, condition: "good" });
  }

  const oldStatus = tr.status;
  tr.status = "received";

  if (tr.toRepId && toAdd.length) {
    const van = vanStock.find((v) => v.repId === tr.toRepId);
    if (van) {
      for (const it of toAdd) {
        if (it.condition === "damaged") {
          const slot = van.items.find((s) => s.productId === it.productId);
          if (slot) slot.damagedQty = (slot.damagedQty ?? 0) + it.qty;
          else van.items.push({ productId: it.productId, productName: it.productName, qty: 0, damagedQty: it.qty });
          addStockMovement({ id: genStockMovementId(), type: "damage", productId: it.productId, productName: it.productName, qty: it.qty, repId: tr.toRepId, date: today(), refNumber: tr.number, createdBy: actor.id, notes: `تحويل وارد تالف — ${tr.number}` });
        } else {
          addVanStock(tr.toRepId, [{ productId: it.productId, productName: it.productName, qty: it.qty } as never]);
          addStockMovement({ id: genStockMovementId(), type: "transfer_in", productId: it.productId, productName: it.productName, qty: it.qty, repId: tr.toRepId, date: today(), refNumber: tr.number, createdBy: actor.id, notes: `تحويل وارد — ${tr.number}${hasDifference ? " (استلام جزئي)" : ""}` });
        }
      }
      van.updatedAt = today();
    }
  }

  addAuditLog({ id: genAuditId(), actor: actor.id, action: "stock_transfer.received", entity: "stock_transfer", entityId: tr.id, at: today(), oldValue: oldStatus, newValue: "received", reason: hasDifference ? "استلام جزئي — فرق يُحقق" : undefined });
  return { success: true, transfer: tr };
};

export const rejectTransfer = (transferId: string, actor: CheckActor, reason: string): TransferResult => {
  const tr = findStockTransfer(transferId);
  if (!tr) return { success: false, reason: "التحويل غير موجود" };

  const gate = canTransition({ entityType: "stock_transfer", from: "in_transit", action: "reject", actor });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  // المرفوض في الطريق — يُعاد للمُرسل دون خصم من المستلم (لم يستلم بعد)
  if (tr.createdBy) {
    addVanStock(tr.createdBy, tr.items);
    for (const item of tr.items) {
      addStockMovement({
        id: genStockMovementId(),
        type: "transfer_in",
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        repId: tr.createdBy,
        date: today(),
        refNumber: tr.number,
        createdBy: actor.id,
        notes: `مرتجع مرفوض — إعادة للمُرسل ${tr.number}`,
      });
    }
  }

  const oldStatus = tr.status;
  tr.status = "rejected";
  addAuditLog({ id: genAuditId(), actor: actor.id, action: "stock_transfer.rejected", entity: "stock_transfer", entityId: tr.id, at: today(), oldValue: oldStatus, newValue: "rejected", reason });
  return { success: true, transfer: tr };
};
