import { Check, Circle } from "lucide-react";

export function Progress({
  value,
  tone = "default",
  label,
}: {
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
  label?: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div className={`progress ${tone}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${v}%` }} />
      </div>
      {label && <span className="faint" style={{ fontSize: "var(--font-size-xs)", whiteSpace: "nowrap" }}>{label}</span>}
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const parts = name.trim().split(/\s+/);
  const init = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0]?.slice(0, 2) ?? "؟";
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {init}
    </span>
  );
}

export interface TimelineStep {
  label: string;
  status: "done" | "current" | "pending" | "failed";
  meta?: string;
  note?: string;
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="timeline">
      {steps.map((s, i) => (
        <div key={i} className="timeline-item">
          <div className="timeline-rail">
            <span className={`timeline-dot ${s.status}`} aria-hidden="true">
              {s.status === "done" && <Check size={0} />}
            </span>
            {i < steps.length - 1 && <span className="timeline-line" aria-hidden="true" />}
          </div>
          <div className="timeline-content">
            <div className="timeline-title">
              {s.label}
              {s.status === "current" && <span className="badge badge-primary">قيد التنفيذ</span>}
              {s.status === "done" && <Check size={13} style={{ color: "var(--color-success)" }} />}
              {s.status === "failed" && <Circle size={12} style={{ color: "var(--color-danger)" }} />}
            </div>
            {s.meta && <div className="timeline-meta">{s.meta}</div>}
            {s.note && <div className="timeline-note">{s.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkflowSteps({ steps }: { steps: { label: string; status: "done" | "current" | "failed" | "pending" }[] }) {
  return (
    <div className="workflow-steps" role="list" aria-label="مراحل العملية">
      {steps.map((s, i) => (
        <div key={i} style={{ display: "contents" }}>
          {i > 0 && <span className={`workflow-connector ${s.status === "done" ? "done" : ""}`} aria-hidden="true" />}
          <span className={`workflow-step ${s.status}`} role="listitem">
            <span className="ws-num">{s.status === "done" ? "✓" : i + 1}</span>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}