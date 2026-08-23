import type { PreTransferValidation } from "@/types";
import { customers } from "@/mock/customers";
import { invoices } from "@/mock/sales";
import { returns } from "@/mock/returns";

export const transferValidationService = {
  validateCustomerTransfer(customerId: string, _newRepId: string): PreTransferValidation {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return { canTransfer: false, blockers: ["العميل غير موجود"], warnings: [], pendingItems: { sales: 0, collections: 0, returns: 0, custody: 0, cashbox: 0, inventory: 0, goals: 0, routes: 0, visits: 0 } };
    }

    const pendingSales = invoices.filter(i => i.customerId === customerId && (i.status === "pending" || i.status === "draft"));
    const pendingReturns = returns.filter(r => r.customerId === customerId && r.status === "pending");

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (pendingSales.length > 0) blockers.push(`${pendingSales.length} فاتورة مبيعات معلقة`);
    if (pendingReturns.length > 0) warnings.push(`${pendingReturns.length} مرتجع معلق`);
    if (customer.balance > customer.creditLimit) warnings.push(`العميل تجاوز حد الائتمان (${customer.balance.toLocaleString("ar-SA")} > ${customer.creditLimit.toLocaleString("ar-SA")})`);

    return {
      canTransfer: blockers.length === 0,
      blockers,
      warnings,
      pendingItems: {
        sales: pendingSales.length,
        collections: 0,
        returns: pendingReturns.length,
        custody: 0,
        cashbox: 0,
        inventory: 0,
        goals: 0,
        routes: 0,
        visits: 0,
      },
    };
  },
};
