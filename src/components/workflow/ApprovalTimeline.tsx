import type { ApprovalStep } from "@/types";
import { roleLabel } from "@/config/permissions";
import { formatDateTime } from "@/utils/format";
import { Badge } from "@/components/ui/Badge";

export function ApprovalTimeline({ steps }: { steps: ApprovalStep[] }) {
  return (
    <div className="timeline" role="list" aria-label="سجل الاعتماد">
      {steps.map((step, i) => {
        const done = step.status === "approved";
        const failed = step.status === "rejected";
        const current = !done && !failed && steps.slice(0, i).every((s) => s.status === "approved");
        return (
          <div key={i} className="timeline-item">
            <div className="timeline-rail">
              <span className={`timeline-dot ${done ? "done" : failed ? "failed" : current ? "current" : "pending"}`} aria-hidden="true" />
              {i < steps.length - 1 && <span className="timeline-line" aria-hidden="true" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-title">
                المستوى {step.level} — {roleLabel[step.role]}
                {done && <Badge tone="success">معتمد</Badge>}
                {failed && <Badge tone="danger">مرفوض</Badge>}
                {current && <Badge tone="primary">بانتظار الاعتماد</Badge>}
                {!done && !failed && !current && <Badge tone="neutral">قادم</Badge>}
              </div>
              <div className="timeline-meta">
                {step.by && <span>بواسطة: {step.by}</span>}
                {step.at && <span>{formatDateTime(step.at)}</span>}
              </div>
              {step.note && <div className="timeline-note">{step.note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}