import type { ReactNode } from "react";
import { Inbox, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({ title, description, icon, action }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state-block">
      <div className="state-icon">{icon ?? <Inbox size={40} strokeWidth={1.4} />}</div>
      <div>
        <div className="state-title">{title}</div>
        {description && <div className="state-desc">{description}</div>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = "جارٍ تحميل البيانات..." }: { label?: string }) {
  return (
    <div className="state-block">
      <div className="state-icon"><Loader2 size={32} strokeWidth={1.6} className="spin" style={{ animation: "spin 1s linear infinite" }} /></div>
      <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>{label}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-block error" role="alert">
      <div className="state-icon"><AlertTriangle size={36} strokeWidth={1.6} /></div>
      <div>
        <div className="state-title">تعذر تحميل البيانات</div>
        <div className="state-desc">{message}</div>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={<RefreshCw size={14} />}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-wrap" aria-hidden="true">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><div className="skeleton" style={{ height: 12, width: 80 }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><div className="skeleton" style={{ height: 12, width: c === 0 ? 120 : 70 }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}