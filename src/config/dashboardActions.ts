import type { QuickAction } from "@/components/dashboard/DashboardQuickActions";
import {
  Users,
  ShoppingCart,
  HandCoins,
  Undo2,
  Package,
  MapPin,
  ClipboardCheck,
  Wallet,
  Truck,
  FileText,
  CalendarCheck,
  FileCheck2,
} from "lucide-react";
import React from "react";

/**
 * Unified Common Functions — مصدر واحد لكل العمليات السريعة
 * تُفلتر حسب الصلاحية عبر DashboardQuickActions (can(permission, role))
 * مستلهم من EIFSP 11 نطاق بترتيب تشغيلي: Master -> Field -> Sales -> Collections -> Inventory
 */
export const unifiedQuickActions: QuickAction[] = [
  {
    id: "new-customer",
    label: "عميل جديد",
    icon: React.createElement(Users, { size: 16, strokeWidth: 1.7 }),
    route: "/customers/new",
    permission: "customers.create",
    variant: "secondary",
  },
  {
    id: "new-sale",
    label: "فاتورة مبيعات",
    icon: React.createElement(ShoppingCart, { size: 16, strokeWidth: 1.7 }),
    route: "/sales/new",
    permission: "sales.create",
    variant: "primary",
  },
  {
    id: "new-collection",
    label: "سند قبض",
    icon: React.createElement(HandCoins, { size: 16, strokeWidth: 1.7 }),
    route: "/collections",
    permission: "collections.create",
    variant: "secondary",
  },
  {
    id: "new-return",
    label: "مرتجع",
    icon: React.createElement(Undo2, { size: 16, strokeWidth: 1.7 }),
    route: "/returns",
    permission: "returns.create",
    variant: "secondary",
  },
  {
    id: "new-visit",
    label: "زيارة جديدة",
    icon: React.createElement(MapPin, { size: 16, strokeWidth: 1.7 }),
    route: "/visits",
    permission: "visits.create",
    variant: "secondary",
  },
  {
    id: "plan-trip",
    label: "خطة جولة",
    icon: React.createElement(ClipboardCheck, { size: 16, strokeWidth: 1.7 }),
    route: "/rep/plan",
    permission: "trips.view",
    variant: "secondary",
  },
  {
    id: "van-inventory",
    label: "مخزون السيارة",
    icon: React.createElement(Truck, { size: 16, strokeWidth: 1.7 }),
    route: "/rep/van",
    permission: "inventory.view",
    variant: "secondary",
  },
  {
    id: "cash-box",
    label: "الصندوق",
    icon: React.createElement(Wallet, { size: 16, strokeWidth: 1.7 }),
    route: "/cash",
    permission: "cash.view",
    variant: "secondary",
  },
  {
    id: "products",
    label: "المنتجات",
    icon: React.createElement(Package, { size: 16, strokeWidth: 1.7 }),
    route: "/products",
    permission: "products.view",
    variant: "secondary",
  },
  {
    id: "reports",
    label: "التقارير",
    icon: React.createElement(FileText, { size: 16, strokeWidth: 1.7 }),
    route: "/reports",
    permission: "reports.view",
    variant: "secondary",
  },
  // Supervisor specific — تظهر فقط للمشرف حسب الصلاحية
  {
    id: "team",
    label: "فريقي",
    icon: React.createElement(Users, { size: 16, strokeWidth: 1.7 }),
    route: "/supervisor/team",
    permission: "supervisor.team",
    variant: "primary",
  },
  {
    id: "field-tracking",
    label: "متابعة ميدانية",
    icon: React.createElement(MapPin, { size: 16, strokeWidth: 1.7 }),
    route: "/supervisor/field",
    permission: "supervisor.field",
    variant: "secondary",
  },
  {
    id: "sup-approvals",
    label: "طلبات الاعتماد",
    icon: React.createElement(FileCheck2, { size: 16, strokeWidth: 1.7 }),
    route: "/supervisor/requests",
    permission: "supervisor.requests",
    variant: "secondary",
  },
  {
    id: "calendar-check",
    label: "خطط اليوم",
    icon: React.createElement(CalendarCheck, { size: 16, strokeWidth: 1.7 }),
    route: "/supervisor/planning/daily",
    permission: "supervisor.planning",
    variant: "secondary",
  },
];

// ===== Per-module quick actions — لكل موديول داشبورد ملخص + عمليات سريعة خاصة =====
export const planningActions: QuickAction[] = [
  { id: "plan-route", label: "خطة سير", icon: React.createElement(MapPin, { size: 16, strokeWidth: 1.7 }), route: "/routes", permission: "routes.view" },
  { id: "plan-daily", label: "جدول اليوم", icon: React.createElement(CalendarCheck, { size: 16, strokeWidth: 1.7 }), route: "/supervisor/planning/daily", permission: "supervisor.planning" },
  { id: "plan-targets", label: "الأهداف", icon: React.createElement(CalendarCheck, { size: 16, strokeWidth: 1.7 }), route: "/targets", permission: "targets.view" },
  { id: "plan-assign", label: "توزيع العملاء", icon: React.createElement(Users, { size: 16, strokeWidth: 1.7 }), route: "/organization/transfers", permission: "organization.manage" },
];

export const inventoryActions: QuickAction[] = [
  { id: "inv-request", label: "طلب بضاعة", icon: React.createElement(Package, { size: 16, strokeWidth: 1.7 }), route: "/inventory/requests", permission: "inventory.view" },
  { id: "inv-transfer", label: "تحويل مخزون", icon: React.createElement(Truck, { size: 16, strokeWidth: 1.7 }), route: "/inventory/transfers", permission: "inventory.view" },
  { id: "inv-van", label: "مخزون السيارة", icon: React.createElement(Truck, { size: 16, strokeWidth: 1.7 }), route: "/inventory/van", permission: "inventory.view" },
  { id: "inv-movements", label: "حركة المخزون", icon: React.createElement(FileText, { size: 16, strokeWidth: 1.7 }), route: "/inventory/movements", permission: "inventory.view" },
];

export const cashActions: QuickAction[] = [
  { id: "cash-view", label: "الصناديق", icon: React.createElement(Wallet, { size: 16, strokeWidth: 1.7 }), route: "/cash", permission: "cash.view" },
  { id: "cash-deposit", label: "توريد", icon: React.createElement(HandCoins, { size: 16, strokeWidth: 1.7 }), route: "/cash", permission: "cash.view" },
  { id: "cash-reconcile", label: "تسوية", icon: React.createElement(FileCheck2, { size: 16, strokeWidth: 1.7 }), route: "/cash", permission: "cash.view" },
];

export const reportsActions: QuickAction[] = [
  { id: "rep-profits", label: "تحليل الربحية", icon: React.createElement(FileText, { size: 16, strokeWidth: 1.7 }), route: "/profitability", permission: "profitability.view" },
  { id: "rep-products", label: "ربحية المنتجات", icon: React.createElement(Package, { size: 16, strokeWidth: 1.7 }), route: "/product-profitability", permission: "profitability.view" },
  { id: "rep-reports", label: "التقارير", icon: React.createElement(FileText, { size: 16, strokeWidth: 1.7 }), route: "/reports", permission: "reports.view" },
];

export const messagesActions: QuickAction[] = [
  { id: "msg-new", label: "رسالة جديدة", icon: React.createElement(Users, { size: 16, strokeWidth: 1.7 }), route: "/messages", permission: "messages.view", variant: "primary" },
];
