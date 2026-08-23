import type { ReactNode } from "react";
import { Breadcrumbs, PageHeader, type Crumb } from "./PageHeader";

/**
 * Shared page header row: Breadcrumbs + [title, description, actions] +
 * an optional extra block (filter bar / quick actions / stat grid) passed
 * as children. Rendered as a normal (non-sticky) flow element so that only
 * the module-level TopNav controls sticky behaviour.
 */
export function StickyPageHeader({
  crumbs,
  title,
  description,
  actions,
  children,
}: {
  crumbs?: Crumb[];
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="dashboard-page-header">
      {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </header>
  );
}
