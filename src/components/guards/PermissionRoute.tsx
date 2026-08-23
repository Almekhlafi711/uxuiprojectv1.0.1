import { Navigate, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { can } from "@/config/permissions";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/types";

/**
 * Route-level authorization guard.
 * Blocks direct URL access for roles that lack the permission (403 / Access Denied).
 * An optional `roles` allow-list restricts the route further regardless of permissions.
 * An optional `condition` flag gates access (e.g. a feature toggle) → 404 when disabled.
 */
export function PermissionRoute({ permission, roles, condition = true, children }: {
  permission: string;
  roles?: Role[];
  condition?: boolean;
  children: ReactNode;
}) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  if (!condition) {
    return (
      <div style={{ padding: "var(--space-6)" }}>
        <EmptyState
          title="غير متاح — 404"
          description="هذه الوحدة غير مفعّلة في إعدادات المؤسسة."
          icon={<ShieldAlert size={40} strokeWidth={1.4} style={{ color: "var(--color-text-faint)" }} />}
          action={<Button variant="primary" size="sm" onClick={() => navigate("/supervisor/dashboard")}>العودة للرئيسية</Button>}
        />
      </div>
    );
  }

  const denied = !can(permission, user.role) || (roles && roles.length > 0 && !roles.includes(user.role));

  if (denied) {
    return (
      <div style={{ padding: "var(--space-6)" }}>
        <EmptyState
          title="غير مصرح — 403"
          description="لا تملك صلاحية الوصول إلى هذه الصفحة. لا يعرض النظام أي بيانات من خارج نطاقك."
          icon={<ShieldAlert size={40} strokeWidth={1.4} style={{ color: "var(--color-danger)" }} />}
          action={<Button variant="primary" size="sm" onClick={() => navigate("/dashboard")}>العودة للرئيسية</Button>}
        />
      </div>
    );
  }

  return <>{children}</>;
}
