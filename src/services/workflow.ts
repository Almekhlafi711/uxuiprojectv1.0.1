/**
 * Workflow Engine (central)
 *
 * Source of Truth for "is a state transition ALLOWED right now?".
 *
 * Responsibilities:
 * - read workflowMatrix (C5 matrix) from authority.ts
 * - enforce Role + Permission + Data Scope + SoD + Policy
 * - verify Current State + Action + Required Conditions
 *
 * It performs NO execution and mutates NO data. The caller (a thin Business
 * Service) decides what happens after `canTransition` returns allowed=true.
 *
 * authority.ts = ماذا يسمح النظام؟
 * workflow.ts   = هل يسمح بالانتقال الآن؟
 */
import { workflowMatrix, sodMatrix, hasPermission, dataScopeOf, roleLevel } from "@/config/authority";
import type { Role } from "@/types";
import type { ScopeType } from "@/config/authority";

export type TransitionAction =
  | "create"
  | "submit"
  | "approve"
  | "reject"
  | "post"
  | "cancel"
  | "receive"
  | "return"
  | "inspect"
  | "accept"
  | "send";

export interface CheckActor {
  id: string;
  role: Role;
  scope: ScopeType;
  owns: boolean;
}

export interface TransitionCheck {
  entityType: string;
  from: string;
  action: TransitionAction;
  actor: CheckActor;
  // explicit target state (required for branch transitions like return→submitted vs return→posted)
  to?: string;
  // optional runtime policy gate (caller can inject business rule)
  condition?: (ctx: TransitionCheck) => true | string;
  // optional extra permission override (default: derived from action)
  permission?: string;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
  to?: string;
  requires: PermissionKey[];
}

type PermissionKey = string;

export interface ActorContext {
  role: Role;
  permission: string;
  scope: ScopeType;
  // whether the actor's data scope includes the target record
  owns: boolean;
}

/**
 * Maps a lifecycle ACTION to its target state and the permission it requires.
 * This keeps the "what action means" logic in ONE place.
 */
const ACTION_TARGET: Record<TransitionAction, { to: string; permission: string }> = {
  create: { to: "draft", permission: "sales.create" },
  submit: { to: "submitted", permission: "sales.submit" },
  approve: { to: "approved", permission: "sales.approve" },
  reject: { to: "rejected", permission: "sales.reject" },
  post: { to: "posted", permission: "sales.post" },
  cancel: { to: "cancelled", permission: "sales.cancel" },
  receive: { to: "received", permission: "inventory.transfer.receive" },
  return: { to: "returned", permission: "sales.return" },
  inspect: { to: "inspection", permission: "returns.inspect" },
  accept: { to: "accepted", permission: "inventory.transfer.accept" },
  send: { to: "sent", permission: "inventory.transfer.send" },
};

/**
 * Resolve the target "to" state for an action (does not mutate matrix).
 * For actions that are not single-targeted (e.g. a transition that branches),
 * the caller must supply `to` explicitly via TransitionCheck.to.
 */
const resolveTarget = (action: TransitionAction, explicitTo?: string): string => explicitTo ?? ACTION_TARGET[action].to;

/**
 * SoD check: actor must not hold a permission that conflicts with the
 * action's required permission on the SAME document lifecycle.
 */
const violatesSoD = (actor: CheckActor, permission: string): string | undefined => {
  for (const rule of sodMatrix) {
    if ((rule.a === permission && hasPermission(actor.role, rule.b)) ||
        (rule.b === permission && hasPermission(actor.role, rule.a))) {
      return rule.reason;
    }
  }
  return undefined;
};

/**
 * Central transition gate.
 *
 * Returns { allowed, reason?, to, requires }.
 */
export const canTransition = (ctx: TransitionCheck): TransitionResult => {
  const to = resolveTarget(ctx.action, ctx.to);
  const permission = ctx.permission ?? ACTION_TARGET[ctx.action].permission;
  const requires: PermissionKey[] = [permission];

  // 1. Role permission
  if (!hasPermission(ctx.actor.role, permission)) {
    return { allowed: false, reason: `دور ${ctx.actor.role} ليس له إذن "${permission}"`, to, requires };
  }

  // 2. SoD
  const sodReason = violatesSoD(ctx.actor, permission);
  if (sodReason) {
    return { allowed: false, reason: `انتهاك SoD: ${sodReason}`, to, requires };
  }

  // 3. Data scope — actor must own/be in-scope
  if (!ctx.actor.owns) {
    return { allowed: false, reason: "خارج نطاق البيانات المسموحة لهذا الدور", to, requires };
  }

  // 4. Role hierarchy (lower level cannot act on higher level records)
  if (requires.some((p) => p.endsWith(".approve") || p.endsWith(".post"))) {
    if (roleLevel[ctx.actor.role] > 3) {
      return { allowed: false, reason: "المندوب غير مخول بالموافقة/الترحيل", to, requires };
    }
  }

  // 5. Current state → target state is in the matrix for this entityType
  const matrix = workflowMatrix[ctx.entityType];
  if (!matrix) {
    return { allowed: false, reason: `نوع الكيان "${ctx.entityType}" غير معرّف في المصفوفة`, to, requires };
  }
  const legal = matrix.some((t) => t.from === ctx.from && t.to === to);
  if (!legal) {
    return { allowed: false, reason: `انتقال غير قانوني: ${ctx.from} → ${to}`, to, requires };
  }

  // 6. Caller-injected business condition (e.g. credit verdict, stock availability)
  if (ctx.condition) {
    const verdict = ctx.condition(ctx);
    if (verdict !== true) {
      return { allowed: false, reason: `شرط أعمال غير موفق: ${verdict}`, to, requires };
    }
  }

  return { allowed: true, to, requires };
};

/**
 * Convenience: describe the allowed actions for a given entity+role+state.
 */
export const allowedActions = (
  entityType: string,
  from: string,
  role: Role,
  owns: boolean,
): TransitionAction[] => {
  const actor: CheckActor = { id: "", role, scope: dataScopeOf[role], owns };
  const out: TransitionAction[] = [];
  for (const action of (Object.keys(ACTION_TARGET) as TransitionAction[])) {
    const res = canTransition({ entityType, from, action, actor });
    if (res.allowed) out.push(action);
  }
  return out;
};
