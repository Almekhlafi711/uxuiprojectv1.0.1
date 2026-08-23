import { useEffect, useRef, useState, type ReactNode } from "react";

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  menuClassName?: string;
  closeOnSelect?: boolean;
}

export function Dropdown({ trigger, children, align = "start", menuClassName = "", closeOnSelect = true }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="dropdown" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className={`dropdown-menu ${align === "end" ? "end" : ""} ${menuClassName}`} onClick={() => closeOnSelect && setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  danger = false,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button className={`dropdown-item ${danger ? "danger" : ""}`} onClick={onClick} role="menuitem">
      {icon}
      {children}
    </button>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <div className="dropdown-label">{children}</div>;
}

export function DropdownSeparator() {
  return <div className="dropdown-separator" />;
}