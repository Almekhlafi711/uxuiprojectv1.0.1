import type { LucideIcon } from "lucide-react";
import type { Role } from "@/types";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  HandCoins,
  Undo2,
  Warehouse,
  Truck,
  Wallet,
  Map as MapIcon,
  CalendarCheck,
  MapPin,
  Target,
  ShieldCheck,
  FileCheck2,
  LineChart,
  FileText,
  Coins,
  FolderArchive,
  MessagesSquare,
  Palmtree,
  UserCog,
  Building2,
  Settings,
  LayoutGrid,
  Banknote,
  RefreshCw,
  Route as RouteIcon,
  BarChart3,
  PieChart,
  UserCheck,
  History,
  ArrowLeftRight,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
  module: string;
  permissions?: string[];
  roles?: Role[];
  show?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
  show?: boolean;
}

export const navigation: NavSection[] = [
  {
    title: "الرئيسية",
    items: [
      { path: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, module: "dashboard", permissions: ["dashboard.view"] },
    ],
  },
  // الأقرب حسب الأهمية التشغيلية: التخطيط → المبيعات → المخزون → الصندوق → التقارير
  {
    title: "التخطيط",
    items: [
      { path: "/planning", label: "لوحة التخطيط", icon: LayoutDashboard, module: "planning", permissions: ["routes.view"] },
      { path: "/routes", label: "خطط السير", icon: MapIcon, module: "routes", permissions: ["routes.view"] },
      { path: "/visits", label: "الزيارات والجولات", icon: CalendarCheck, module: "visits", permissions: ["visits.view"] },
      { path: "/gps", label: "GPS والتتبع", icon: MapPin, module: "gps", permissions: ["gps.view"] },
      { path: "/gps/tracking-overview", label: "تتبع الفريق", icon: MapPin, module: "gps", permissions: ["gps.view"], roles: ["GENERAL_MANAGER", "SALES_MANAGER"] },
      { path: "/targets", label: "الأهداف", icon: Target, module: "targets", permissions: ["targets.view"] },
      { path: "/targets/supervisor-plans", label: "خطط المشرفين", icon: Target, module: "targets", permissions: ["targets.view"], roles: ["GENERAL_MANAGER", "SALES_MANAGER"] },
      { path: "/organization/transfers", label: "توزيع العملاء", icon: ArrowLeftRight, module: "organization", permissions: ["organization.manage"], roles: ["GENERAL_MANAGER", "SALES_MANAGER"] },
    ],
  },
  {
    title: "المبيعات والتوزيع",
    items: [
      { path: "/customers", label: "العملاء", icon: Users, module: "customers", permissions: ["customers.view"] },
      { path: "/products", label: "المنتجات والأسعار", icon: Package, module: "products", permissions: ["products.view"] },
      { path: "/sales", label: "المبيعات", icon: ShoppingCart, module: "sales", permissions: ["sales.view"] },
      { path: "/collections", label: "التحصيل والذمم", icon: HandCoins, module: "collections", permissions: ["collections.view"] },
      { path: "/returns", label: "المرتجعات", icon: Undo2, module: "returns", permissions: ["returns.view"] },
      { path: "/credit", label: "الائتمان والخصومات", icon: ShieldCheck, module: "credit", permissions: ["credit.view"] },
      {
        path: "/organization",
        label: "إدارة الهيكل والتوزيع",
        icon: Building2,
        module: "organization",
        permissions: ["organization.manage"],
        roles: ["GENERAL_MANAGER", "SALES_MANAGER"],
        children: [
          { path: "/organization/dashboard", label: "نظرة عامة", icon: LayoutDashboard, module: "organization" },
          { path: "/organization/territories", label: "المناطق", icon: MapIcon, module: "organization" },
          { path: "/organization/reps", label: "المندوبين", icon: Users, module: "organization" },
          { path: "/organization/supervisors", label: "المشرفين", icon: UserCog, module: "organization" },
          { path: "/organization/assignments", label: "تعيين العملاء", icon: UserCheck, module: "organization" },
          { path: "/organization/history", label: "سجل التعيينات", icon: History, module: "organization" },
          { path: "/organization/audit", label: "سجل التدقيق", icon: ShieldCheck, module: "organization" },
        ],
      },
    ],
  },
  {
    title: "المخزون",
    items: [
      {
        path: "/inventory",
        label: "المخزون",
        icon: Warehouse,
        module: "inventory",
        permissions: ["inventory.view"],
        children: [
          { path: "/inventory/warehouse", label: "مخزون المستودع", icon: Warehouse, module: "inventory", roles: ["GENERAL_MANAGER", "SALES_MANAGER", "SUPERVISOR", "WAREHOUSE"] },
          { path: "/inventory/van", label: "مخزون المندوب / السيارة", icon: Truck, module: "inventory" },
          { path: "/inventory/transfers", label: "التحويلات", icon: Truck, module: "inventory" },
          { path: "/inventory/requests", label: "طلبات البضاعة", icon: Package, module: "inventory" },
          { path: "/inventory/movements", label: "حركة المخزون", icon: LayoutGrid, module: "inventory" },
        ],
      },
      { path: "/distribution-officer", label: "مسؤول التوزيع", icon: Truck, module: "distribution-officer", permissions: ["distributor.manage"], roles: ["GENERAL_MANAGER", "SALES_MANAGER", "DISTRIBUTION_OFFICER"] },
      { path: "/distributor", label: "بوابة الموزع", icon: Package, module: "distributor", permissions: ["distributor.view"], roles: ["DISTRIBUTOR"] },
    ],
  },
  {
    title: "الصندوق",
    items: [
      { path: "/cash", label: "الصناديق والتسويات", icon: Wallet, module: "cash", permissions: ["cash.view"] },
      { path: "/organization/cost-centers", label: "مراكز التكلفة", icon: LayoutGrid, module: "organization", permissions: ["organization.manage"], roles: ["GENERAL_MANAGER", "SALES_MANAGER"] },
    ],
  },
  {
    title: "التقارير والتحليلات",
    items: [
      { path: "/profitability-dashboard", label: "لوحة تحكم الربحية", icon: BarChart3, module: "profitability", permissions: ["profitability.view"] },
      { path: "/profitability", label: "تحليل الربحية", icon: LineChart, module: "profitability", permissions: ["profitability.view"] },
      { path: "/product-profitability", label: "ربحية المنتجات", icon: PieChart, module: "profitability", permissions: ["profitability.view"] },
      { path: "/commission", label: "العمولات والمكافآت", icon: Coins, module: "commission", permissions: ["commission.view"] },
      { path: "/reports", label: "التقارير", icon: FileText, module: "reports", permissions: ["reports.view"] },
      { path: "/audit", label: "سجل التدقيق", icon: ShieldCheck, module: "audit", permissions: ["audit.view"] },
    ],
  },
  // المراسلات وحدة مستقلة بتصميم واتساب — أسفل التقارير مباشرة (مطلبك)
  {
    title: "المراسلات",
    items: [
      { path: "/messages", label: "المراسلات", icon: MessagesSquare, module: "messages", permissions: ["messages.view"] },
    ],
  },
  {
    title: "الإدارة",
    items: [
      { path: "/approvals", label: "طلبات الاعتماد", icon: FileCheck2, module: "approvals", permissions: ["approvals.view"] },
      { path: "/custody", label: "العهد والأصول", icon: Banknote, module: "custody", permissions: ["custody.view"] },
      { path: "/archive", label: "الأرشيف", icon: FolderArchive, module: "archive", permissions: ["archive.view"] },
      { path: "/leaves", label: "الإجازات", icon: Palmtree, module: "leaves", permissions: ["leaves.view"] },
      { path: "/users", label: "المستخدمون والصلاحيات", icon: UserCog, module: "users", permissions: ["users.view"] },
      { path: "/settings", label: "الإعدادات", icon: Settings, module: "settings", permissions: ["settings.view"] },
      { path: "/policy", label: "مركز السياسات", icon: Settings, module: "policy", permissions: ["policy.manage"], roles: ["SYSTEM_ADMIN", "GENERAL_MANAGER"] },
    ],
  },
];

export const moduleLabels: Record<string, string> = {
  dashboard: "لوحة التحكم",
  customers: "العملاء",
  products: "المنتجات والأسعار",
  sales: "المبيعات",
  collections: "التحصيل والذمم",
  returns: "المرتجعات",
  inventory: "المخزون",
  cash: "الصناديق والتسويات",
  custody: "العهد والأصول",
  routes: "المناطق وخطط السير",
  visits: "الزيارات والجولات",
  gps: "GPS والتتبع",
  targets: "الأهداف والأداء",
  credit: "الائتمان والخصومات",
  approvals: "طلبات الاعتماد",
  profitability: "الربحية والتحليلات",
  commission: "العمولات والمكافآت",
  policy: "مركز السياسات",
  audit: "سجل التدقيق",
  "distribution-officer": "إدارة التوزيع",
  distributor: "بوابة الموزع",
  reports: "التقارير",
  archive: "الأرشيف",
  messages: "المراسلات",
  leaves: "الإجازات",
  users: "المستخدمون والصلاحيات",
  organization: "الهيكل التنظيمي",
  settings: "الإعدادات",
};
