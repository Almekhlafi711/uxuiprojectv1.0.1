import type { ReactNode } from "react";
import { organizationConfig } from "@/config/organizationConfig";

interface PolicyGuardProps {
  policy: string;
  action?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PolicyGuard({ policy, fallback = null, children }: PolicyGuardProps) {
  const config = organizationConfig as unknown as Record<string, unknown>;
  if (policy in config) {
    const value = config[policy];
    if (value === false || value === "not_allowed" || value === "optional") {
      return <>{fallback}</>;
    }
  }
  return <>{children}</>;
}
