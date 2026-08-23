/**
 * Stock Requests Service (Admin) — create stock requests and transfers.
 */
import { addStockRequest, addStockTransfer, addAuditLog, genAuditId } from "@/store/transactions";
import type { StockRequest, StockTransfer } from "@/types";

interface StockRequestInput {
  warehouseId: string;
  items: { productId: string; productName: string; qty: number }[];
  notes?: string;
}

interface StockRequestResult {
  success: boolean;
  requestId?: string;
  reason?: string;
}

export function createStockRequest(input: StockRequestInput, actor: { id: string }): StockRequestResult {
  if (!input.items.length) return { success: false, reason: "أضف منتجات" };
  const id = `sr-${Date.now()}`;
  const request: StockRequest = {
    id,
    number: `SR-2026-${String(Date.now()).slice(-4)}`,
    warehouseId: input.warehouseId,
    repId: actor.id,
    items: input.items,
    status: "draft",
    date: new Date().toISOString().slice(0, 10),
    notes: input.notes,
  };
  addStockRequest(request);
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "stock_request.created",
    entity: "stock_request",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify(request),
  });
  return { success: true, requestId: id };
}

interface StockTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: { productId: string; productName: string; qty: number }[];
  notes?: string;
}

export function createAdminTransfer(input: StockTransferInput, actor: { id: string }): StockRequestResult {
  if (!input.items.length) return { success: false, reason: "أضف منتجات" };
  const id = `st-${Date.now()}`;
  const transfer: StockTransfer = {
    id,
    number: `ST-2026-${String(Date.now()).slice(-4)}`,
    fromWarehouseId: input.fromWarehouseId,
    toWarehouseId: input.toWarehouseId,
    items: input.items,
    status: "draft",
    createdBy: actor.id,
    date: new Date().toISOString().slice(0, 10),
    notes: input.notes,
  };
  addStockTransfer(transfer);
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "stock_transfer.created",
    entity: "stock_transfer",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify(transfer),
  });
  return { success: true, requestId: id };
}
