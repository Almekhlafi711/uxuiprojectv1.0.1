/**
 * Customer Transaction Service — CENTRAL execution layer for customer CRUD.
 *
 * Every operation:
 *   1. Audit log (who/what/when)
 */
import { customers } from "@/mock/customers";
import { addAuditLog, genAuditId } from "@/store/transactions";

interface CustomerInput {
  name: string;
  type: string;
  phone: string;
  address: string;
  territoryId: string;
  repId: string;
  creditLimit: number;
  paymentTerms: string;
  notes: string;
}

interface CustomerResult {
  success: boolean;
  customer?: typeof customers[number];
  reason?: string;
}

export function createCustomer(input: CustomerInput, actor: { id: string; role: string; scope: string }): CustomerResult {
  const id = `cust-${Date.now()}`;
  const code = `CUST-${String(customers.length + 1).padStart(4, "0")}`;
  const newCustomer: typeof customers[number] = {
    id,
    code,
    name: input.name,
    type: input.type as typeof customers[number]["type"],
    phone: input.phone,
    address: input.address,
    territoryId: input.territoryId,
    repId: input.repId,
    supervisorId: "",
    creditLimit: input.creditLimit,
    balance: 0,
    paymentTerms: input.paymentTerms as typeof customers[number]["paymentTerms"],
    status: "active",
    notes: input.notes,
    createdAt: new Date().toISOString().slice(0, 10),
    lat: 0,
    lng: 0,
    visitedCount: 0,
    targetFlag: false,
  };
  customers.push(newCustomer);
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "customer.created",
    entity: "customer",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify(newCustomer),
  });
  return { success: true, customer: newCustomer };
}

export function updateCustomer(id: string, input: Partial<CustomerInput>, actor: { id: string; role: string; scope: string }): CustomerResult {
  const idx = customers.findIndex((c) => c.id === id);
  if (idx === -1) return { success: false, reason: "العميل غير موجود" };
  const old = { ...customers[idx] };
  Object.assign(customers[idx], input);
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "customer.updated",
    entity: "customer",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    oldValue: JSON.stringify(old),
    newValue: JSON.stringify(customers[idx]),
  });
  return { success: true, customer: customers[idx] };
}
