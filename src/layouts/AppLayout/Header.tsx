import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, LogOut, Menu, User as UserIcon, Settings, KeyRound, Users, Package, HandCoins, Plus, ShoppingCart, FileText, CreditCard, MessagesSquare, LayoutGrid, LayoutDashboard, Truck, Warehouse, MapPinned, Banknote, Shield, BarChart3, UserCog, Boxes } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";
import { notifications } from "@/mock/admin";
import { customers } from "@/mock/customers";
import { invoices } from "@/mock/sales";
import { products } from "@/mock/products";
import { collections } from "@/mock/collections";
import { roleLabel } from "@/config/permissions";
import { getDataScope, canAccessCustomer, canAccessInvoice, canAccessCollection, canAccessNotification } from "@/services/scope";
import { timeAgo, initials } from "@/utils/format";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/Dropdown";
import { mockApi } from "@/services/mockApi";
import type { Conversation } from "@/types";

const typeColors: Record<string, { bg: string; color: string }> = {
  approval: { bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
  credit: { bg: "var(--color-danger-bg)", color: "var(--color-danger)" },
  inventory: { bg: "var(--color-info-bg)", color: "var(--color-info)" },
  stock_request: { bg: "var(--color-info-bg)", color: "var(--color-info)" },
  leave: { bg: "var(--color-success-bg)", color: "var(--color-success)" },
  collection: { bg: "var(--color-primary-soft)", color: "var(--color-primary)" },
  archive: { bg: "var(--color-neutral-bg)", color: "var(--color-secondary)" },
  return: { bg: "var(--color-warning-bg)", color: "var(--color-warning)" },
  route: { bg: "var(--color-info-bg)", color: "var(--color-info)" },
};

const appLauncherItems = [
  { label: "الرئيسية", icon: LayoutDashboard, path: "/dashboard", bg: "#71639e", desc: "لوحة التحكم" },
  { label: "العملاء", icon: Users, path: "/customers", bg: "#2f6fa8", desc: "إدارة العملاء" },
  { label: "المبيعات", icon: ShoppingCart, path: "/sales", bg: "#2f6fa8", desc: "الفواتير والمبيعات" },
  { label: "المخزون", icon: Warehouse, path: "/inventory", bg: "#c2700e", desc: "المستودعات" },
  { label: "الميدان", icon: MapPinned, path: "/visits", bg: "#2f7d4f", desc: "الزيارات والمسارات" },
  { label: "التحصيل", icon: Banknote, path: "/collections", bg: "#7c3aed", desc: "المدفوعات" },
  { label: "المالية", icon: HandCoins, path: "/cash", bg: "#7c3aed", desc: "الصندوق والخزينة" },
  { label: "التقارير", icon: BarChart3, path: "/reports", bg: "#64748b", desc: "التحليلات" },
  { label: "الموافقات", icon: Shield, path: "/approvals", bg: "#b3403a", desc: "سير العمل" },
  { label: "المنتجات", icon: Package, path: "/products", bg: "#c2700e", desc: "كتالوج المنتجات" },
  { label: "التوزيع", icon: Truck, path: "/routes", bg: "#2f7d4f", desc: "إدارة المسارات" },
  { label: "الإدارة", icon: UserCog, path: "/users", bg: "#64748b", desc: "المستخدمين" },
] as const;

export function Header() {
  const { user, logout } = useAuthStore();
  const { setSidebarMobileOpen } = useUiStore();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [myConvs, setMyConvs] = useState<Conversation[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scope = getDataScope(user);
  const scopedNotifications = useMemo(() => (scope ? notifications.filter((n) => canAccessNotification(scope, n)) : []), [scope]);
  const scopedCustomers = useMemo(() => (scope ? customers.filter((c) => canAccessCustomer(scope, c)) : []), [scope]);
  const scopedInvoices = useMemo(() => (scope ? invoices.filter((i) => canAccessInvoice(scope, i)) : []), [scope]);
  const scopedCollections = useMemo(() => (scope ? collections.filter((c) => canAccessCollection(scope, c)) : []), [scope]);
  const unread = scopedNotifications.filter((n) => !n.read).length;
  const unreadMsgs = useMemo(() => {
    if (!user) return 0;
    return myConvs.filter((c) => {
      if (!c.messages.length) return false;
      const last = c.messages[c.messages.length - 1];
      return last.senderId !== user.id && !c.readBy?.includes(user.id);
    }).length;
  }, [myConvs, user]);

  useEffect(() => {
    mockApi.messages.listAll().then((cs) => setMyConvs(cs)).catch(() => {});
  }, []);

  const goMessages = useCallback(() => {
    const role = user?.role;
    if (role === "REPRESENTATIVE") navigate("/rep/messages");
    else if (role === "SUPERVISOR") navigate("/supervisor/messages");
    else navigate("/messages");
  }, [user, navigate]);

  const handleGlobalSearch = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "m") {
      e.preventDefault();
      goMessages();
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
      setQuery("");
    }
  }, [goMessages]);

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalSearch);
    return () => document.removeEventListener("keydown", handleGlobalSearch);
  }, [handleGlobalSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setQuery("");
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) setQuickActionsOpen(false);
      if (launcherRef.current && !launcherRef.current.contains(e.target as Node)) setLauncherOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (launcherOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [launcherOpen]);

  if (!user) return null;

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";
  const q = query.trim().toLowerCase();
  const results = q
    ? {
        customers: scopedCustomers.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)).slice(0, 4),
        invoices: scopedInvoices.filter((i) => i.invoiceNumber.toLowerCase().includes(q) || i.number.toLowerCase().includes(q)).slice(0, 4),
        products: products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)).slice(0, 4),
        collections: scopedCollections.filter((c) => c.number.toLowerCase().includes(q)).slice(0, 3),
      }
    : { customers: [], invoices: [], products: [], collections: [] };

  const total = results.customers.length + results.invoices.length + results.products.length + results.collections.length;

  const go = (path: string) => {
    setSearchOpen(false);
    setNotifOpen(false);
    setQuickActionsOpen(false);
    setQuery("");
    navigate(path);
  };

  const quickActions = [
    { label: "عميل جديد", icon: Users, path: "/customers", color: "var(--section-sales)" },
    { label: "فاتورة مبيعات", icon: ShoppingCart, path: "/sales", color: "var(--section-sales)" },
    { label: "سند قبض", icon: CreditCard, path: "/collections", color: "var(--section-finance)" },
    { label: "تقرير", icon: FileText, path: "/reports", color: "var(--section-reports)" },
  ];

  return (
    <>
    <header className="app-header">
      {/* Fiori ShellBar: Waffle + Brand (Odoo App Switcher + Fluent) */}
      <div ref={launcherRef} style={{ position: "relative" }}>
        <button
          className={`header-btn waffle-btn ${launcherOpen ? "active" : ""}`}
          onClick={() => setLauncherOpen((o) => !o)}
          aria-label="مطلق التطبيقات"
          aria-expanded={launcherOpen}
          title="التطبيقات (Odoo Home)"
        >
          <LayoutGrid size={19} strokeWidth={1.7} />
        </button>
      </div>
      <button className="header-btn header-menu-mobile" onClick={() => setSidebarMobileOpen(true)} aria-label="فتح القائمة">
        <Menu size={19} />
      </button>
      <div className="header-logo">
        <span className="logo-mark">
          <svg width="20" height="20" viewBox="0 0 32 32"><path d="M8 22V10h3v9h9v3H8zm6-9V9h10v10h-3v-6h-7z" fill="#fff" /></svg>
        </span>
        <span>
          <span className="logo-text" style={{ display: "block" }}>نظام التوزيع الميداني</span>
          <span className="logo-sub">ERP — إدارة المبيعات والتحصيل</span>
        </span>
      </div>
      <div className="header-divider" />

      <div className="header-search" ref={searchRef}>
        <span className="hs-icon"><Search size={15} /></span>
        <input
          ref={searchInputRef}
          className="input"
          placeholder="بحث شامل: عميل، فاتورة، منتج، مندوب..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          aria-label="البحث الشامل"
        />
        <span className="hs-kbd">Ctrl K</span>
        {searchOpen && q && (
          <div className="global-search-panel" role="dialog" aria-label="نتائج البحث">
            {total === 0 && (
              <div className="state-block" style={{ padding: "var(--space-6)" }}>
                <div className="state-desc">لا توجد نتائج لـ «{query}»</div>
              </div>
            )}
            {results.customers.length > 0 && (
              <>
                <div className="gs-group-title">العملاء ({results.customers.length})</div>
                {results.customers.map((c) => (
                  <button key={c.id} className="gs-item" onClick={() => go(`/customers/${c.id}`)}>
                    <Users size={15} style={{ color: "var(--color-primary)" }} />
                    <span className="gs-main">
                      <span className="gs-title">{c.name}</span>
                      <span className="gs-sub">{c.code} · {c.phone}</span>
                    </span>
                  </button>
                ))}
              </>
            )}
            {results.invoices.length > 0 && (
              <>
                <div className="gs-group-title">الفواتير ({results.invoices.length})</div>
                {results.invoices.map((i) => (
                  <button key={i.id} className="gs-item" onClick={() => go(`/sales/${i.id}`)}>
                    <KeyRound size={15} style={{ color: "var(--color-info)" }} />
                    <span className="gs-main">
                      <span className="gs-title">{i.invoiceNumber}</span>
                      <span className="gs-sub">{customerName(i.customerId)}</span>
                    </span>
                  </button>
                ))}
              </>
            )}
            {results.products.length > 0 && (
              <>
                <div className="gs-group-title">المنتجات ({results.products.length})</div>
                {results.products.map((p) => (
                  <button key={p.id} className="gs-item" onClick={() => go("/products")}>
                    <Package size={15} style={{ color: "var(--color-warning)" }} />
                    <span className="gs-main">
                      <span className="gs-title">{p.name}</span>
                      <span className="gs-sub">{p.code}</span>
                    </span>
                  </button>
                ))}
              </>
            )}
            {results.collections.length > 0 && (
              <>
                <div className="gs-group-title">سندات القبض ({results.collections.length})</div>
                {results.collections.map((c) => (
                  <button key={c.id} className="gs-item" onClick={() => go("/collections")}>
                    <HandCoins size={15} style={{ color: "var(--color-success)" }} />
                    <span className="gs-main">
                      <span className="gs-title">{c.number}</span>
                      <span className="gs-sub">{c.amount.toLocaleString("ar-SA")} ر.س</span>
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="header-actions">
        <div ref={quickActionsRef} style={{ position: "relative" }}>
          <button
            className="header-btn quick-action-trigger"
            onClick={() => setQuickActionsOpen((o) => !o)}
            aria-label="إجراءات سريعة"
            aria-expanded={quickActionsOpen}
          >
            <Plus size={18} />
          </button>
          {quickActionsOpen && (
            <div className="quick-actions-panel">
              <div className="qap-title">إجراءات سريعة</div>
              {quickActions.map((action) => (
                <button key={action.label} className="qap-item" onClick={() => go(action.path)}>
                  <span className="qap-icon" style={{ background: action.color + "15", color: action.color }}>
                    <action.icon size={16} />
                  </span>
                  <span className="qap-label">{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={notifRef} style={{ position: "relative" }}>
          <button className="header-btn" onClick={() => setNotifOpen((o) => !o)} aria-label={`الإشعارات (${unread} غير مقروء)`} aria-expanded={notifOpen}>
            <Bell size={18} />
            {unread > 0 && <span className="header-badge num">{unread}</span>}
          </button>
          {notifOpen && (
            <div className="notif-panel">
              <div className="notif-header">
                <h4>مركز الإشعارات</h4>
                <button
                  className="btn-ghost"
                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: "var(--font-size-xs)", color: "var(--color-primary)" }}
                >
                  تعيين الكل كمقروء
                </button>
              </div>
              {scopedNotifications.slice(0, 8).map((n) => {
                const colors = typeColors[n.type] ?? typeColors.approval;
                return (
                  <div
                    key={n.id}
                    className={`notif-item ${n.read ? "" : "unread"}`}
                    onClick={() => n.relatedPath && go(n.relatedPath)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="notif-icon" style={{ background: colors.bg, color: colors.color }}>
                      <Bell size={14} />
                    </span>
                    <span className="notif-body">
                      <span className="notif-title">{n.title}</span>
                      <span className="notif-desc">{n.description}</span>
                      <span className="notif-time">{timeAgo(n.time)}</span>
                    </span>
                    {n.priority === "high" && <span className="badge badge-danger" style={{ fontSize: 10 }}>عاجل</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          className="header-btn"
          onClick={goMessages}
          aria-label={`المراسلات (${unreadMsgs} غير مقروء)`}
          style={{ position: "relative" }}
        >
          <MessagesSquare size={18} />
          {unreadMsgs > 0 && <span className="header-badge num">{unreadMsgs}</span>}
          <span className="hs-kbd" style={{ position: "absolute", bottom: -2, left: -4, fontSize: "8px", padding: "0 3px", borderRadius: 3, background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.7)" }}>Ctrl M</span>
        </button>

        <div className="header-divider" />

        <Dropdown
          align="end"
          closeOnSelect={false}
          trigger={
            <div className="user-chip">
              <span className="avatar">{initials(user.name)}</span>
              <span className="uc-name header-user-name">
                {user.name}
                <span className="uc-role">{roleLabel[user.role]}</span>
              </span>
            </div>
          }
        >
          <DropdownLabel>الحساب</DropdownLabel>
          <DropdownItem onClick={() => navigate("/settings")} icon={<UserIcon size={15} />}>
            ملفي الشخصي
          </DropdownItem>
          <DropdownItem onClick={() => navigate("/settings")} icon={<Settings size={15} />}>
            الإعدادات
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            danger
            onClick={() => {
              logout();
              navigate("/login");
            }}
            icon={<LogOut size={15} />}
          >
            تسجيل الخروج
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
    {/* Odoo Home + Fiori Launchpad Hybrid */}
    {launcherOpen && (
      <div className="app-launcher-backdrop" onClick={() => setLauncherOpen(false)} aria-hidden="true" />
    )}
    <div className={`app-launcher ${launcherOpen ? "open" : ""}`} role="dialog" aria-label="مطلق التطبيقات" aria-hidden={!launcherOpen}>
      <div className="launcher-header">
        <div className="launcher-brand">
          <span className="launcher-logo"><Boxes size={18} /></span>
          <div>
            <div className="launcher-title">التطبيقات</div>
            <div className="launcher-sub">نظام التوزيع الميداني — اختر التطبيق</div>
          </div>
        </div>
        <button className="launcher-close" onClick={() => setLauncherOpen(false)} aria-label="إغلاق">
          <span style={{ fontSize: 20, lineHeight: 1 }}>×</span>
        </button>
      </div>
      <div className="launcher-search-hint">
        <Search size={13} /> اضغط <kbd>Ctrl K</kbd> للبحث الشامل · <kbd>Ctrl M</kbd> للمراسلات
      </div>
      <div className="launcher-grid">
        {appLauncherItems.map((app) => (
          <button
            key={app.label}
            className="launcher-item"
            onClick={() => { setLauncherOpen(false); navigate(app.path); }}
          >
            <span className="launcher-icon" style={{ background: app.bg }}>
              <app.icon size={24} strokeWidth={1.7} />
            </span>
            <span className="launcher-label">{app.label}</span>
            <span className="launcher-desc">{app.desc}</span>
          </button>
        ))}
      </div>
      <div className="launcher-footer">
        <span className="launcher-footer-hint">نصيحة: استخدم البحث الشامل للوصول السريع لأي عميل أو فاتورة</span>
      </div>
    </div>
    </>
  );
}
