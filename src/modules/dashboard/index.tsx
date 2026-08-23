import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { getDataScope } from "@/services/scope";
import { SalesManagerDashboard } from "./SalesManagerDashboard";
import { GeneralManagerDashboard } from "./GeneralManagerDashboard";

/** Role-aware dashboard dispatcher.
 * Every dashboard reads DataScope so no user sees data outside their scope.
 * No Global Dashboard exists — the default branch delegates to GM scope.
 */
export function DashboardPage() {
  const { user } = useAuthStore();
  if (!user) return null;
  const scope = getDataScope(user);
  switch (user.role) {
    case "REPRESENTATIVE":
      return <Navigate to="/rep/dashboard" replace />;
    case "SUPERVISOR":
      return <Navigate to="/supervisor/dashboard" replace />;
    case "SALES_MANAGER":
      return <SalesManagerDashboard />;
    case "GENERAL_MANAGER":
      return <GeneralManagerDashboard />;
    case "SYSTEM_ADMIN":
      return <Navigate to="/settings" replace />;
    case "AUDITOR":
    case "FINANCE":
      return <Navigate to="/reports" replace />;
    case "HR":
      return <Navigate to="/leaves" replace />;
    case "DISTRIBUTION_OFFICER":
      return <Navigate to="/distribution-officer" replace />;
    case "DISTRIBUTOR":
      return <Navigate to="/distributor" replace />;
    case "WAREHOUSE":
      return <Navigate to="/inventory" replace />;
    default:
      if (!scope || scope.scopeType === "none") return <Navigate to="/login" replace />;
      return <GeneralManagerDashboard />;
  }
}