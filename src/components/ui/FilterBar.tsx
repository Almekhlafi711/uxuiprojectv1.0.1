import { useState, type ReactNode } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "./Button";
import { Drawer } from "./Drawer";

const GAP = "var(--space-3)";
const GAP_SM = "var(--space-2)";

export interface FilterBarProps {
  children: ReactNode;
  mobileDrawer?: boolean;
  drawerTitle?: string;
}

export function FilterBar({ children, mobileDrawer = true, drawerTitle = "الفلاتر" }: FilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!mobileDrawer) {
    return <div className="filters-bar" role="search" aria-label="التصفية">{children}</div>;
  }

  return (
    <>
      <div className="filters-bar" role="search" aria-label="التصفية">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: GAP, flex: 1 }}>
            {children}
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<Filter size={14} />}
            onClick={() => setDrawerOpen(true)}
            style={{ display: "none" }}
            className="filter-drawer-toggle"
          >
            فلاتر
          </Button>
        </div>
      </div>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        width="100%"
      >
        <div className="filters-bar" style={{ flexDirection: "column", alignItems: "stretch", gap: GAP }}>
          <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
            {children}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: GAP_SM, marginTop: GAP_SM }}>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>إغلاق</Button>
            <Button variant="primary" onClick={() => setDrawerOpen(false)}>تطبيق</Button>
          </div>
        </div>
      </Drawer>
    </>
  );
}