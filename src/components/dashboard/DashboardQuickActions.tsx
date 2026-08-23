import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { can } from "@/config/permissions";

export interface QuickAction {
  id: string;
  label: string;
  icon: ReactNode;
  route: string;
  permission: string;
  variant?: "primary" | "secondary";
}

/**
 * Permission-aware quick action buttons rendered inside a page header.
 * Only actions whose permission is granted to the current role are shown.
 */
export function DashboardQuickActions({ actions, sticky }: { actions: QuickAction[]; sticky?: boolean }) {
  const { user } = useAuthStore();
  const role = user?.role;
  if (!role) return null;
  const visible = actions.filter((a) => can(a.permission, role));
  if (visible.length === 0) return null;
  const content = (
    <div className="quick-actions" role="group" aria-label="إجراءات سريعة">
      {visible.map((a) => (
        <Link
          key={a.id}
          to={a.route}
          className={`btn btn-${a.variant ?? "secondary"} btn-sm quick-action-btn`}
          aria-label={a.label}
        >
          {a.icon}
          <span>{a.label}</span>
        </Link>
      ))}
    </div>
  );
  if (sticky) {
    return <div className="quick-actions-sticky">{content}</div>;
  }
  return content;
}
