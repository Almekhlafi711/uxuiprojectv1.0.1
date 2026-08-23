import type { ReactNode } from "react";
import type { Crumb } from "@/components/ui/PageHeader";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";

/** Sticky supervisor page header with quick actions (same pattern as the rep dashboard). */
export function SupervisorPageHeader({
  crumbs,
  title,
  description,
  actions,
  quickActions,
}: {
  crumbs?: Crumb[];
  title: string;
  description?: string;
  actions?: ReactNode;
  quickActions?: ReactNode;
}) {
  return (
    <StickyPageHeader crumbs={crumbs} title={title} description={description} actions={actions}>
      {quickActions}
    </StickyPageHeader>
  );
}
