import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { can } from "@/config/permissions";
import { repModules, activeRepModule } from "@/config/repNavigation";
import { navigation } from "@/config/navigation";
import { supervisorNavigation } from "@/config/supervisorNavigation";

/** Sticky sub-module navigation bar — يعرض أبناء المجموعة النشطة في رأس الصفحة لكل الأدوار */
export function TopNav() {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return null;

  const isRep = user.role === "REPRESENTATIVE";
  const isSup = user.role === "SUPERVISOR";

  let label = "";
  let rawChildren: { path: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; permission?: string; roles?: string[]; permissions?: string[] }[] = [];

  if (isRep) {
    const module = activeRepModule(location.pathname);
    if (!module || module.children.length === 0) return null;
    const children = module.children.filter((c) => can(c.permission, user.role));
    if (children.length === 0) return null;
    label = module.label;
    rawChildren = children as unknown as typeof rawChildren;
  } else {
    const nav = isSup ? supervisorNavigation : navigation;
    const activeSection = nav.find((section) =>
      section.items.some((it) => {
        const hit = location.pathname === it.path || location.pathname.startsWith(it.path + "/");
        const childHit = it.children?.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path + "/"));
        return hit || !!childHit;
      })
    );
    if (!activeSection) return null;
    // إذا كان العنصر النشط له children (مثل المخزون/الهيكل) اعرض أبناءه، وإلا اعرض عناصر القسم كلها
    const activeItem = activeSection.items.find((it) => location.pathname === it.path || location.pathname.startsWith(it.path + "/") || it.children?.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path + "/")));
    if (activeItem?.children?.length) {
      label = activeItem.label;
      rawChildren = activeItem.children as unknown as typeof rawChildren;
    } else {
      label = activeSection.title;
      rawChildren = activeSection.items as unknown as typeof rawChildren;
    }
    // فلترة بالصلاحيات
    rawChildren = rawChildren.filter((c) => {
      const perms = (c as unknown as { permissions?: string[] }).permissions ?? ((c as unknown as { permission?: string }).permission ? [(c as unknown as { permission: string }).permission] : undefined);
      if (perms && perms.length && !perms.some((p) => can(p, user.role))) return false;
      const roles = (c as unknown as { roles?: string[] }).roles;
      if (roles && !roles.includes(user.role)) return false;
      return true;
    });
    if (rawChildren.length <= 1) return null;
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="app-topnav" aria-label={`تنقل وحدة ${label}`}>
      <span className="topnav-module-label">{label}</span>
      <div className="topnav-items">
        {rawChildren.map((c) => {
          const Icon = c.icon;
          const active = isActive(c.path);
          return (
            <Link key={c.path} to={c.path} className={`topnav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} title={c.label}>
              <Icon size={16} strokeWidth={active ? 2.2 : 1.9} />
              <span>{c.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}