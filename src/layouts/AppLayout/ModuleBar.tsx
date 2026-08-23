import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { navigation } from "@/config/navigation";
import { supervisorNavigation } from "@/config/supervisorNavigation";
import { repModules } from "@/config/repNavigation";

/**
 * ModuleBar — شريط الموديولات الثابت في رأس الصفحة
 * يعرض مجموعات الشريط الجانبي كأزرار أفقية (التخطيط / المخزون / الصندوق / التقارير / المراسلات)
 * يمكن التنقل بسهولة بين الموديولات من الرأس، ثابت sticky
 * يظهر لكل الأدوار: مندوب / مشرف / مدير مبيعات / مدير عام
 */
export function ModuleBar() {
  const { user } = useAuthStore();
  const location = useLocation();
  if (!user) return null;

  const isRep = user.role === "REPRESENTATIVE";
  const isSup = user.role === "SUPERVISOR";

  let modules: { label: string; path: string; active: boolean }[] = [];

  if (isRep) {
    modules = repModules.map((m) => {
      const active = location.pathname === m.path || location.pathname.startsWith(m.path + "/") || m.children.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path + "/"));
      return { label: m.label, path: m.path, active };
    });
  } else {
    const nav = isSup ? supervisorNavigation : navigation;
    // نأخذ كل عنوان قسم كمُوديول في الرأس (الأقرب حسب الأهمية)
    modules = nav
      .filter((s) => s.show !== false && s.items.length > 0)
      .map((section) => {
        // أول عنصر في القسم هو مسار الموديول
        const firstPath = section.items[0]?.path ?? "/";
        const active = section.items.some((it) => location.pathname === it.path || location.pathname.startsWith(it.path + "/") || it.children?.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path + "/")));
        return { label: section.title, path: firstPath, active };
      });
  }

  return (
    <nav className="app-modulebar" aria-label="شريط الموديولات">
      <div className="modulebar-inner">
        {modules.map((m) => (
          <Link key={m.label} to={m.path} className={`modulebar-item ${m.active ? "active" : ""}`} aria-current={m.active ? "page" : undefined}>
            {m.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
