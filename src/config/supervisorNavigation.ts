import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Map as MapIcon,
  Route as RouteIcon,
  BusFront,
  CalendarCheck,
  ClipboardCheck,
  HandCoins,
  PauseCircle,
  Warehouse,
  ShoppingCart,
  ReceiptText,
  Wallet,
  PackageCheck,
  Package,
  FileText,
  MessagesSquare,
  BookMarked,
  FileCheck2,
  AlertCircle,
  History,
  Target,
  ClipboardList,
  TrendingDown,
  Activity,
  CreditCard,
} from "lucide-react";
import type { NavSection } from "@/config/navigation";
import { supervisorPolicies } from "@/config/supervisorPolicies";

export const supervisorNavigation: NavSection[] = [
  {
    title: "لوحة المشرف",
    items: [
      { path: "/supervisor/dashboard", label: "لوحة المشرف", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    title: "فريقي",
    items: [
      {
        path: "/supervisor/team",
        label: "المناديب",
        icon: Users,
        module: "supervisor",
        children: [
          { path: "/supervisor/team/performance", label: "الأداء", icon: TrendingDown, module: "supervisor" },
          { path: "/supervisor/team/notes", label: "ملاحظات", icon: BookMarked, module: "supervisor" },
        ],
      },
      { path: "/supervisor/activity", label: "سجل النشاط", icon: History, module: "supervisor" },
    ],
  },
  {
    title: "التخطيط",
    items: [
      { path: "/supervisor/planning/routes", label: "خطط السير", icon: RouteIcon, module: "supervisor" },
      { path: "/supervisor/planning/daily", label: "جداول اليوم", icon: CalendarCheck, module: "supervisor" },
      { path: "/supervisor/planning/targets", label: "الأهداف", icon: Target, module: "supervisor" },
      { path: "/supervisor/planning/assignments", label: "توزيع العملاء", icon: ClipboardList, module: "supervisor" },
    ],
  },
  {
    title: "المتابعة الميدانية",
    items: [
      { path: "/supervisor/field", label: "متابعة الفريق", icon: Activity, module: "supervisor" },
      { path: "/supervisor/gps", label: "خريطة الفريق", icon: MapPin, module: "supervisor" },
      { path: "/supervisor/gps/live", label: "المواقع الحية", icon: MapIcon, module: "supervisor" },
      { path: "/supervisor/gps/trips", label: "الجولات", icon: BusFront, module: "supervisor" },
      { path: "/supervisor/gps/visits", label: "الزيارات", icon: ClipboardCheck, module: "supervisor" },
      { path: "/supervisor/gps/deviations", label: "انحرافات المسار", icon: AlertCircle, module: "supervisor" },
    ],
  },
  {
    title: "العملاء والديون",
    items: [
      { path: "/supervisor/customers", label: "العملاء", icon: HandCoins, module: "supervisor" },
      { path: "/supervisor/customers/transfers", label: "تحويل العملاء", icon: ReceiptText, module: "supervisor", show: supervisorPolicies.customerTransfer.allowed },
      { path: "/supervisor/customers/suspended", label: "العملاء الموقوفون", icon: PauseCircle, module: "supervisor" },
      { path: "/supervisor/customers/targets", label: "العملاء المستهدفون", icon: Target, module: "supervisor" },
      { path: "/supervisor/debts", label: "ديون العملاء", icon: CreditCard, module: "supervisor" },
      { path: "/supervisor/debts/aging", label: "أعمار الديون", icon: TrendingDown, module: "supervisor" },
    ],
  },
  {
    title: "المخزون",
    items: [
      { path: "/supervisor/inventory", label: "نظرة عامة", icon: Warehouse, module: "supervisor" },
      { path: "/supervisor/inventory/requests", label: "طلبات البضاعة", icon: FileText, module: "supervisor" },
      { path: "/supervisor/inventory/prepare", label: "تجهيز البضاعة", icon: Package, module: "supervisor" },
      { path: "/supervisor/inventory/transfers", label: "تحويلات المخزون", icon: RouteIcon, module: "supervisor" },
      { path: "/supervisor/inventory/receiving", label: "استلام", icon: ClipboardCheck, module: "supervisor" },
    ],
    show: supervisorPolicies.features.supervisorWarehouse,
  },
  {
    title: "الصندوق",
    items: [
      { path: "/supervisor/cash", label: "نظرة عامة", icon: Wallet, module: "supervisor" },
      { path: "/supervisor/cash/movements", label: "حركات", icon: ReceiptText, module: "supervisor" },
      { path: "/supervisor/cash/deposits", label: "توريدات", icon: ShoppingCart, module: "supervisor" },
      { path: "/supervisor/cash/reconciliation", label: "تسوية", icon: PackageCheck, module: "supervisor" },
    ],
    show: supervisorPolicies.features.supervisorCashBox,
  },
  // المراسلات وحدة مستقلة بتصميم واتساب — أسفل التقارير/الصندوق (قبل الإدارة)
  {
    title: "المراسلات",
    items: [
      { path: "/supervisor/messages", label: "المراسلات", icon: MessagesSquare, module: "supervisor" },
    ],
  },
  {
    title: "الطلبات والإدارة",
    items: [
      { path: "/supervisor/requests", label: "طلبات الاعتماد", icon: FileCheck2, module: "supervisor" },
      { path: "/supervisor/assets", label: "العهد", icon: PackageCheck, module: "supervisor" },
      { path: "/supervisor/assets/requests", label: "طلبات الأصول", icon: FileText, module: "supervisor" },
    ],
  },
];
