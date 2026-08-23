import type { ReactNode } from "react";
import type { Status } from "@/types";
import { statusLabels, statusTones, type BadgeTone } from "@/utils/status";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
}

export function Badge({ tone = "neutral", children, dot = false }: BadgeProps) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge tone={statusTones[status]} dot>
      {statusLabels[status]}
    </Badge>
  );
}