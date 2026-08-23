/**
 * Loading/Receiving Service — execution layer for stock receiving.
 *
 * receiveStock(): adds items to vanStock + creates StockMovement + audit.
 * Used by LoadingPage (warehouse receipt) and ReceivingPage (transfer receipt).
 */
import { vanStock, warehouseStock } from "@/mock/inventory";
import { stockMovements } from "@/mock/inventory";
import {
  addStockMovement,
  addAuditLog,
  genStockMovementId,
  genAuditId,
} from "@/store/transactions";
import { newStockMovements } from "@/store/transactions";
import type { CheckActor } from "@/services/workflow";

export interface ReceiveStockInput {
  repId: string;
  items: { productId: string; productName: string; qty: number; condition: "good" | "damaged" }[];
  source: "warehouse" | "transfer";
  refNumber?: string;
  warehouseId?: string; // المستودع المصدر — افتراضي wh-01
}

export interface ReceiveResult {
  success: boolean;
  reason?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Idempotency: تتبع المراجع المُستلمة لمنع الاستلام المزدوج */
const processedRefs = new Set<string>();

/**
 * Add items to van stock (receiving).
 * Mutates the in-memory vanStock array.
 */
const addVanStock = (repId: string, items: ReceiveStockInput["items"]) => {
  const van = vanStock.find((v) => v.repId === repId);
  if (!van) return;
  for (const item of items) {
    if (item.condition === "damaged") {
      // التالف لا يدخل المتاح، بل يُسجل في damagedQty
      const slot = van.items.find((i) => i.productId === item.productId);
      if (slot) slot.damagedQty = (slot.damagedQty ?? 0) + item.qty;
      else van.items.push({ productId: item.productId, productName: item.productName, qty: 0, damagedQty: item.qty });
      continue;
    }
    const slot = van.items.find((i) => i.productId === item.productId);
    if (slot) {
      slot.qty += item.qty;
    } else {
      van.items.push({
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        damagedQty: 0,
      });
    }
  }
  van.updatedAt = today();
};

const deductWarehouseStock = (warehouseId: string, items: ReceiveStockInput["items"]) => {
  for (const item of items) {
    if (item.condition === "damaged") continue;
    const slot = warehouseStock.find((s) => s.warehouseId === warehouseId && s.productId === item.productId);
    if (slot) {
      // خصم من المتاح — لا نسمح بالسالب (حجز مسبق يمنع)
      slot.available = Math.max(0, slot.available - item.qty);
      // تقليل inTransit إذا كان محجوزاً مسبقاً
      if (slot.inTransit > 0) slot.inTransit = Math.max(0, slot.inTransit - Math.min(item.qty, slot.inTransit));
    }
  }
};

/**
 * Receive stock from warehouse or transfer — محرك تشغيلي مترابط
 * يخصم من المستودع + يضيف للسيارة + ينشئ حركتين + يمنع التكرار
 */
export const receiveStock = (
  input: ReceiveStockInput,
  actor: CheckActor
): ReceiveResult => {
  if (input.items.length === 0) return { success: false, reason: "لا توجد بنود للاستلام" };

  const validItems = input.items.filter((i) => i.qty > 0);
  if (validItems.length === 0) return { success: false, reason: "جميع الكميات صفر" };

  // Idempotency: منع الاستلام المزدوج لنفس المرجع
  const ref = input.refNumber ?? "";
  if (ref) {
    if (processedRefs.has(ref)) return { success: false, reason: "تم استلام هذا المرجع مسبقاً — منع تكرار" };
    const exists = [...stockMovements, ...newStockMovements()].some((m) => m.refNumber === ref);
    if (exists) {
      processedRefs.add(ref);
      return { success: false, reason: "المرجع مرتبط بحركة سابقة — تم الاستلام مسبقاً" };
    }
  }

  const whId = input.warehouseId ?? "wh-01";

  // 1) خصم من المستودع (فقط لمصدر warehouse، التحويل يُخصم عند الإرسال)
  if (input.source === "warehouse") {
    deductWarehouseStock(whId, validItems);
  }

  // 2) إضافة لمخزون السيارة (يدعم تالف)
  addVanStock(input.repId, validItems);

  for (const item of validItems) {
    // حركة خروج من المستودع (للتتبع المزدوج)
    if (input.source === "warehouse" && item.condition === "good") {
      addStockMovement({
        id: genStockMovementId(),
        type: "transfer_out",
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        fromWarehouseId: whId,
        repId: input.repId,
        date: today(),
        refNumber: input.refNumber ?? `RECV-${Date.now()}`,
        createdBy: actor.id,
        notes: `إصدار من المستودع للمندوب`,
      });
    }
    // حركة دخول للسيارة
    addStockMovement({
      id: genStockMovementId(),
      type: item.condition === "damaged" ? "damage" : "receiving",
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
      repId: input.repId,
      date: today(),
      refNumber: input.refNumber ?? `RECV-${Date.now()}`,
      createdBy: actor.id,
      notes: `استلام ${input.source === "warehouse" ? "من المستودع" : "تحويل وارد"}${item.condition === "damaged" ? " — تالف" : ""}`,
    });
  }

  if (ref) processedRefs.add(ref);

  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "stock.received",
    entity: "loading_order",
    entityId: input.refNumber ?? "",
    at: today(),
    newValue: JSON.stringify({ items: validItems.map((i) => ({ productId: i.productId, qty: i.qty, condition: i.condition })), warehouseId: whId, source: input.source }),
  });

  return { success: true };
};
