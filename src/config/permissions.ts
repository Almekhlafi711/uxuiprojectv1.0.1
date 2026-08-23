/**
 * Permissions facade (backward-compatible).
 *
 * Single source of truth is now `src/config/authority.ts`.
 * This module re-exports the canonical API so existing imports (`can`,
 * `roleLabel`, `roleLevel`) keep working without duplication.
 */
import type { Role } from "@/types";
import {
  can as canAuthority,
  roleLabel as _roleLabel,
  roleLevel as _roleLevel,
} from "@/config/authority";

export { roleLabel } from "@/config/authority";
export { roleLevel } from "@/config/authority";
export { hasPermission } from "@/config/authority";
export { dataScopeOf } from "@/config/authority";
export { sodMatrix } from "@/config/authority";

/** Legacy permission check (used by PermissionRoute + all page components). */
export const can = (permission: string, role: Role): boolean => canAuthority(permission as any, role);
