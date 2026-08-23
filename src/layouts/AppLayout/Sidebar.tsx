import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { navigation } from "@/config/navigation";
import { supervisorNavigation } from "@/config/supervisorNavigation";
import { repModules, activeRepModule } from "@/config/repNavigation";
import { can, roleLabel } from "@/config/permissions";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";
import { pendingApprovals } from "@/mock/approvals";

const sectionColorMap: Record<string, string> = {
  "المبيعات والتوزيع": "sales",
  "المخزون": "inventory",
  "المخزون والمالية": "inventory",
  "الميدان": "field",
  "الميدان والتخطيط": "field",
  "الصندوق": "finance",
  "صندوق المشرف": "finance",
  "التقارير والتحليلات": "reports",
  "الإدارة": "admin",
  "الطلبات والإدارة": "admin",
  "فريقي": "admin",
  "التخطيط": "field",
  "المتابعة الميدانية": "field",
  "العملاء والديون": "sales",
  "المراسلات": "admin",
  "الرئيسية": "admin",
};

const repSectionColorMap: Record<string, string> = {
  home: "admin",
  sales: "sales",
  field: "field",
  inventory: "inventory",
  targets: "sales",
  admin: "admin",
};

export function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen, setSidebarMobileOpen } = useUiStore();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  if (!user) return null;

  const role = user.role;
  const approvalCount = role === "GENERAL_MANAGER" || role === "SALES_MANAGER" || role === "SUPERVISOR" ? pendingApprovals().length : 0;

  const isRep = role === "REPRESENTATIVE";
  const navConfig = role === "SUPERVISOR" ? supervisorNavigation : navigation;

  const visibleSections = navConfig
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => ({
          ...item,
          children: item.children?.filter((c) => {
            if (c.show === false) return false;
            if (c.roles && !c.roles.includes(role)) return false;
            if (c.permissions && c.permissions.length && !c.permissions.some((p) => can(p, role))) return false;
            return true;
          }),
        }))
        .filter((item) => {
          if (item.show === false) return false;
          if (item.roles && !item.roles.includes(role)) return false;
          return !item.permissions || item.permissions.some((p) => can(p, role));
        }),
    }))
    .filter((section) => section.items.length > 0 && section.show !== false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const toggleGroup = (path: string) => setOpenGroups((g) => ({ ...g, [path]: !g[path] }));
  const toggleSection = (title: string) => setOpenSections((s) => ({ ...s, [title]: !s[title] }));

  return (
    <>
      {sidebarMobileOpen && (
        <div className="sidebar-mobile-backdrop" onClick={() => setSidebarMobileOpen(false)} aria-hidden="true" />
      )}
      <aside className="app-sidebar" aria-label="التنقل الرئيسي">
        <nav className="sidebar-nav">
          {isRep ? (
            repModules.map((m) => {
              const active = activeRepModule(location.pathname)?.key === m.key;
              const Icon = m.icon;
              const visible = !m.children.length || m.children.some((c) => can(c.permission, role));
              if (!visible) return null;
              const hasChildren = m.children.length > 0;
              const open = openGroups[m.key] ?? active;
              if (hasChildren) {
                return (
                  <div key={m.key}>
                    <button
                      className={`sidebar-item ${active ? "active" : ""} ${open ? "open" : ""}`}
                      onClick={() => setOpenGroups((g) => ({ ...g, [m.key]: !g[m.key] }))}
                      aria-expanded={open}
                      data-tooltip={m.label}
                      data-section={repSectionColorMap[m.key]}
                    >
                      <span className="si-icon"><Icon size={18} strokeWidth={1.8} /></span>
                      <span className="si-label">{m.label}</span>
                      <span className="si-chevron"><ChevronDown size={14} /></span>
                    </button>
                    {open && !sidebarCollapsed && (
                      <div className="sidebar-submenu">
                        {m.children.filter((c) => can(c.permission, role)).map((child) => {
                          const CIcon = child.icon;
                          const cActive = location.pathname === child.path || location.pathname.startsWith(child.path + "/");
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              className={`sidebar-subitem ${cActive ? "active" : ""}`}
                              onClick={() => setSidebarMobileOpen(false)}
                            >
                              <CIcon size={14} strokeWidth={1.7} />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={m.key}
                  to={m.path}
                  className={`sidebar-item ${active ? "active" : ""}`}
                  onClick={() => setSidebarMobileOpen(false)}
                  data-tooltip={m.label}
                  data-section={repSectionColorMap[m.key]}
                >
                  <span className="si-icon"><Icon size={18} strokeWidth={1.8} /></span>
                  <span className="si-label">{m.label}</span>
                </Link>
              );
            })
          ) : (
            visibleSections.map((section) => {
              const sectionColor = sectionColorMap[section.title] || "admin";
              const sectionActive = section.items.some((it) => isActive(it.path) || it.children?.some((c) => isActive(c.path)));
              const sectionOpen = openSections[section.title] ?? sectionActive;
              return (
                <div key={section.title}>
                  <button
                    className={`sidebar-section-header ${sectionOpen ? "open" : ""} ${sectionActive ? "active" : ""}`}
                    onClick={() => toggleSection(section.title)}
                    aria-expanded={sectionOpen}
                    data-tooltip={section.title}
                  >
                    <span className="s-section-label">{section.title}</span>
                    <span className="s-section-chevron"><ChevronDown size={14} strokeWidth={1.8} /></span>
                  </button>
                  {sectionOpen && !sidebarCollapsed && (
                    <div className="sidebar-section-body">
                      {section.items.map((item) => {
                    const active = isActive(item.path);
                    const hasChildren = !!item.children?.length;
                    const open = openGroups[item.path] ?? (active && hasChildren);
                    const Icon = item.icon;
                    if (hasChildren) {
                      return (
                        <div key={item.path}>
                          <button
                            className={`sidebar-item ${active ? "active" : ""} ${open ? "open" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(item.path);
                            }}
                            aria-expanded={open}
                            data-tooltip={item.label}
                            data-section={sectionColor}
                          >
                            <span className="si-icon"><Icon size={18} strokeWidth={1.8} /></span>
                            <span className="si-label">{item.label}</span>
                            {item.path === "/approvals" && approvalCount > 0 && <span className="si-badge num">{approvalCount}</span>}
                            <span className="si-chevron"><ChevronDown size={14} /></span>
                          </button>
                          {open && !sidebarCollapsed && (
                            <div className="sidebar-submenu">
                              {item.children!.map((child) => {
                                const cActive = isActive(child.path);
                                const CIcon = child.icon;
                                return (
                                  <Link
                                    key={child.path}
                                    to={child.path}
                                    className={`sidebar-subitem ${cActive ? "active" : ""}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSidebarMobileOpen(false);
                                    }}
                                  >
                                    <CIcon size={14} strokeWidth={1.7} />
                                    {child.label}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`sidebar-item ${active ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSidebarMobileOpen(false);
                        }}
                        data-tooltip={item.label}
                        data-section={sectionColor}
                      >
                        <span className="si-icon"><Icon size={18} strokeWidth={1.8} /></span>
                        <span className="si-label">{item.label}</span>
                        {item.path === "/approvals" && approvalCount > 0 && <span className="si-badge num">{approvalCount}</span>}
                      </Link>
                    );
                  })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-collapse-btn" onClick={toggleSidebar} aria-label={sidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}>
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            <span className="sb-label">{sidebarCollapsed ? "توسيع" : "طي القائمة"}</span>
          </button>
          <div className="sb-label" style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-faint)", paddingInlineStart: "var(--space-2)" }}>
            دورك: {roleLabel[role]}
          </div>
        </div>
      </aside>
    </>
  );
}
