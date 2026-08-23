/**
 * Products Transaction Service — CRUD for products.
 * No workflow needed — products are admin-managed.
 */
import { products } from "@/mock/products";
import { addAuditLog, genAuditId } from "@/store/transactions";
import type { Product } from "@/types";

interface ProductInput {
  name: string;
  code: string;
  categoryId: string;
  brand: string;
  unit: string;
  packSize: string;
  costPrice: number;
  sellPrice: number;
  discountRate: number;
  reorderLevel?: number;
}

interface ProductResult {
  success: boolean;
  product?: Product;
  reason?: string;
}

export function createProduct(input: ProductInput, actor: { id: string }): ProductResult {
  const id = `prod-${Date.now()}`;
  const newProduct: Product = {
    id,
    name: input.name,
    code: input.code,
    categoryId: input.categoryId,
    brand: input.brand,
    unit: input.unit,
    packSize: input.packSize,
    costPrice: input.costPrice,
    sellPrice: input.sellPrice,
    discountRate: input.discountRate,
    status: "active",
    reorderLevel: input.reorderLevel ?? 0,
  };
  products.push(newProduct);
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "product.created",
    entity: "product",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify(newProduct),
  });
  return { success: true, product: newProduct };
}

export function updateProduct(id: string, input: Partial<ProductInput>, actor: { id: string }): ProductResult {
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return { success: false, reason: "المنتج غير موجود" };
  const old = { ...products[idx] };
  Object.assign(products[idx], input);
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "product.updated",
    entity: "product",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    oldValue: JSON.stringify(old),
    newValue: JSON.stringify(products[idx]),
  });
  return { success: true, product: products[idx] };
}
