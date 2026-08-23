import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  HandCoins,
  Undo2,
  Truck,
  Wallet,
  MapPin,
  Route as RouteIcon,
  CalendarCheck,
  ClipboardList,
  ArrowLeftRight,
  FolderArchive,
  MessagesSquare,
  Palmtree,
  RefreshCw,
  FileText,
  Target,
  Banknote,
  Box,
  ClipboardCheck,
} from "lucide-react";

export interface RepNavChild {
  path: string;
  label: string;
  icon: LucideIcon;
  permission: string;
}

export interface RepModule {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  children: RepNavChild[];
}

export const repModules: RepModule[] = [
  {
    key: "home",
    label: "الرئيسية",
    icon: LayoutDashboard,
    path: "/rep/dashboard",
    children: [],
  },
  // الأقرب حسب الأهمية: الميدان أولاً (خطة + زيارات)
  {
    key: "field",
    label: "الميدان",
    icon: MapPin,
    path: "/rep/plan",
    children: [
      { path: "/rep/plan", label: "خطة اليوم والجولة", icon: RouteIcon, permission: "trips.view" },
      { path: "/visits", label: "الزيارات", icon: CalendarCheck, permission: "visits.view" },
      { path: "/rep/gps", label: "GPS / موقعي", icon: MapPin, permission: "gps.view" },
    ],
  },
  {
    key: "sales",
    label: "البيع والتوزيع",
    icon: ShoppingCart,
    path: "/rep/customers",
    children: [
      { path: "/rep/customers", label: "العملاء", icon: Users, permission: "customers.view" },
      { path: "/rep/products", label: "المنتجات والأسعار", icon: Package, permission: "products.view" },
      { path: "/sales", label: "المبيعات", icon: ShoppingCart, permission: "sales.view" },
      { path: "/collections", label: "التحصيل", icon: HandCoins, permission: "collections.view" },
      { path: "/returns", label: "المرتجعات", icon: Undo2, permission: "returns.view" },
    ],
  },
  {
    key: "inventory",
    label: "المخزون والمالية",
    icon: Box,
    path: "/rep/van",
    children: [
      { path: "/rep/van", label: "مخزوني / السيارة", icon: Box, permission: "inventory.view" },
      { path: "/rep/stock-requests", label: "طلبات البضاعة", icon: ClipboardList, permission: "inventory.request" },
      { path: "/rep/stock-transfers", label: "تحويلات المخزون", icon: ArrowLeftRight, permission: "inventory.view" },
      { path: "/rep/cash", label: "الصندوق والتسويات", icon: Wallet, permission: "cash.view" },
      { path: "/rep/closing", label: "إقفال اليوم", icon: ClipboardCheck, permission: "closing.view" },
      { path: "/rep/loading", label: "استلام البضاعة", icon: Package, permission: "loading.view" },
      { path: "/rep/receiving", label: "استلام التحويلات", icon: Truck, permission: "inventory.view" },
    ],
  },
  {
    key: "targets",
    label: "العملاء المستهدفون",
    icon: Target,
    path: "/rep/targets-org",
    children: [
      { path: "/rep/targets-org", label: "المؤسسات المستهدفة", icon: Target, permission: "targets.org.view" },
    ],
  },
  // المراسلات وحدة مستقلة بتصميم واتساب — أسفل التقارير (قبل الإدارة)
  {
    key: "messages",
    label: "المراسلات",
    icon: MessagesSquare,
    path: "/rep/messages",
    children: [],
  },
  {
    key: "admin",
    label: "الإداري",
    icon: FolderArchive,
    path: "/rep/custody",
    children: [
      { path: "/rep/custody", label: "العهد والأصول", icon: Banknote, permission: "custody.view" },
      { path: "/archive", label: "الأرشيف", icon: FolderArchive, permission: "archive.view" },
      { path: "/leaves", label: "الإجازات", icon: Palmtree, permission: "leaves.view" },
      { path: "/rep/sync", label: "مركز المزامنة", icon: RefreshCw, permission: "sync.view" },
      { path: "/rep/reports", label: "تقاريري", icon: FileText, permission: "reports.view" },
    ],
  },
];

export function activeRepModule(pathname: string): RepModule | undefined {
  for (const m of repModules) {
    if (pathname === m.path || pathname.startsWith(m.path + "/")) return m;
    for (const c of m.children) {
      if (pathname === c.path || pathname.startsWith(c.path + "/")) return m;
    }
  }
  if (pathname.startsWith("/rep/visit/")) return repModules.find((m) => m.key === "field");
  return undefined;
}
