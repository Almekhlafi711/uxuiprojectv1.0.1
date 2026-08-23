import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { ModuleBar } from "./ModuleBar";

export function AppLayout() {
  const { user } = useAuthStore();
  const { sidebarCollapsed, sidebarMobileOpen } = useUiStore();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${sidebarMobileOpen ? "sidebar-mobile-open" : ""}`}>
      <Header />
      <Sidebar />
      <main className="app-main">
        <ModuleBar />
        <TopNav />
        <div className="app-content page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>
      <footer className="app-footer">
        نظام التوزيع الميداني — ERP v1.0.1 · جميع البيانات المعروضة تجريبية (Mock Data)
      </footer>
    </div>
  );
}