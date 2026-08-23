import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

type AlertVariant = "success" | "warning" | "danger" | "info";

const icons: Record<AlertVariant, ReactNode> = {
  success: <CheckCircle2 size={17} />,
  warning: <AlertTriangle size={17} />,
  danger: <XCircle size={17} />,
  info: <Info size={17} />,
};

export function Alert({
  variant = "info",
  title,
  children,
  onClose,
}: {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className={`alert alert-${variant}`} role={variant === "danger" ? "alert" : "status"}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icons[variant]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div className="alert-title">{title}</div>}
        {children}
      </div>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="إغلاق">
          <X size={14} />
        </button>
      )}
    </div>
  );
}