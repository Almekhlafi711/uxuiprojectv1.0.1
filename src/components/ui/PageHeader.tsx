import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";

export interface Crumb {
  label: string;
  path?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="مسار التنقل">
      <Link to="/dashboard" className="breadcrumb-home" aria-label="الرئيسية">
        <Home size={14} />
      </Link>
      <span className="separator" aria-hidden="true"><ChevronLeft size={13} /></span>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {item.path && !last ? (
              <>
                <Link to={item.path}>{item.label}</Link>
                <span className="separator" aria-hidden="true"><ChevronLeft size={13} /></span>
              </>
            ) : (
              <span className="current">{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
        {children}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}