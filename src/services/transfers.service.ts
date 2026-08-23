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

  const gate = canTransition({ entityType: "stock_transfer", from: "draft", action: "submit", to: "submitted", actor });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  deductVanStock(input.fromRepId, input.items);

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

  for (const item of input.items) {
    addStockMovement({
      id: genStockMovementId(),
      type: "transfer_out",
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      repId: input.fromRepId,
      date,
      refNumber: transfer.number,
      createdBy: actor.id,
      notes: `تحويل صادر — ${transfer.number}`,
    });
  }

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

export const receiveTransfer = (transferId: string, actor: CheckActor): TransferResult => {
  const tr = findStockTransfer(transferId);
  if (!tr) return { success: false, reason: "التحويل غير موجود" };

  const gate = canTransition({ entityType: "stock_transfer", from: "in_transit", action: "receive", actor });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  const oldStatus = tr.status;
  tr.status = "received";

  if (tr.toRepId) {
    addVanStock(tr.toRepId, tr.items);
  }

  for (const item of tr.items) {
    addStockMovement({
      id: genStockMovementId(),
      type: "transfer_in",
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      repId: tr.toRepId,
      date: today(),
      refNumber: tr.number,
      createdBy: actor.id,
      notes: `تحويل وارد — ${tr.number}`,
    });
  }

  addAuditLog({ id: genAuditId(), actor: actor.id, action: "stock_transfer.received", entity: "stock_transfer", entityId: tr.id, at: today(), oldValue: oldStatus, newValue: "received" });
  return { success: true, transfer: tr };
};

export const rejectTransfer = (transferId: string, actor: CheckActor, reason: string): TransferResult => {
  const tr = findStockTransfer(transferId);
  if (!tr) return { success: false, reason: "التحويل غير موجود" };

  const gate = canTransition({ entityType: "stock_transfer", from: "in_transit", action: "reject", actor });
  if (!gate.allowed) return { success: false, reason: gate.reason };

  if (tr.toRepId) {
    const van = vanStock.find((v) => v.repId === tr.toRepId);
    if (van) {
      for (const item of tr.items) {
        const slot = van.items.find((i) => i.productId === item.productId);
        if (slot) slot.qty = Math.max(0, slot.qty - item.qty);
      }
      van.updatedAt = today();
    }
  }

  if (tr.createdBy) {
    addVanStock(tr.createdBy, tr.items);
  }

  const oldStatus = tr.status;
  tr.status = "rejected";
  addAuditLog({ id: genAuditId(), actor: actor.id, action: "stock_transfer.rejected", entity: "stock_transfer", entityId: tr.id, at: today(), oldValue: oldStatus, newValue: "rejected", reason });
  return { success: true, transfer: tr };
};
