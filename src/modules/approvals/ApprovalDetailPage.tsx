import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ApprovalTimeline } from "@/components/workflow/ApprovalTimeline";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/FormControls";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { approveRequest, rejectRequest } from "@/services/approval.service";
import { formatMoney, formatDateShort } from "@/utils/format";
import { roleLabel } from "@/config/permissions";
import type { ApprovalRequest } from "@/types";

const typeLabels: Record<string, string> = {
  discount: "خصم استثنائي",
  credit_override: "تجاوز حد ائتماني",
  stock_transfer: "تحويل مخزون",
  leave: "إجازة",
  route_plan: "خطة سير",
  target: "أهداف",
  custody: "عهدة",
  archive_change: "تعديل أرشيف",
  price_change: "تعديل سعر",
  customer_transfer: "تحويل عميل",
};

export function ApprovalDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { data: approval, loading, error, refetch } = useData<ApprovalRequest>(
    () =>
      mockApi.approvals.getById(id ?? "").then((a) => {
        if (!a) throw new Error("الطلب غير موجود");
        return a;
      }),
    [id]
  );
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");

  if (loading) return <LoadingState label="جارٍ تحميل الطلب..." />;
  if (error || !approval) return <ErrorState message={error ?? "الطلب غير موجود"} onRetry={refetch} />;

  const myStep = approval.steps.find((s) => s.level === approval.currentLevel && s.role === user?.role && s.status === "pending");
  const canDecide = !!myStep && ["pending", "submitted", "under_review"].includes(approval.status);
  const requester = users.find((u) => u.id === approval.requestedById);

  const confirm = () => {
    if (decision === "approve") {
      approveRequest(approval.id, { id: user?.id ?? "", role: user?.role ?? "" }, note || undefined);
      toast.success("تم الاعتماد", note ? `ملاحظة: ${note}` : undefined);
    } else {
      rejectRequest(approval.id, { id: user?.id ?? "", role: user?.role ?? "" }, note || undefined);
      toast.error("تم رفض الطلب", note ? `السبب: ${note}` : undefined);
    }
    setDecision(null);
    setNote("");
    refetch();
  };

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الاعتمادات", path: "/approvals" }, { label: approval.number }]}
        title={`طلب الاعتماد ${approval.number}`}
        description={`${approval.title} · ${formatDateShort(approval.date)}`}
        actions={
          <Link to="/approvals" className="btn btn-ghost" style={{ textDecoration: "none" }}>
            <ArrowLeft size={15} /> رجوع
          </Link>
        }
      />

      <div className="grid-2-1">
        <div className="stack">
          <Card title="تفاصيل الطلب">
            <div className="stack-sm">
              <div className="flex-between"><span className="muted">النوع</span><Badge tone="neutral">{typeLabels[approval.type] ?? approval.type}</Badge></div>
              <div className="flex-between"><span className="muted">مقدم الطلب</span><b>{approval.requestedBy}{requester ? ` (${requester.name === approval.requestedBy ? "من الملف الداخلي" : requester.name})` : ""}</b></div>
              <div className="flex-between"><span className="muted">المبلغ المرتبط</span>{approval.amount ? <b className="num">{formatMoney(approval.amount)}</b> : <span className="faint">غير مالي</span>}</div>
              <div className="flex-between"><span className="muted">الأولوية</span>{approval.priority === "high" ? <Badge tone="danger" dot>عالية</Badge> : approval.priority === "low" ? <Badge tone="neutral">منخفضة</Badge> : <Badge tone="info">عادية</Badge>}</div>
              <div className="flex-between"><span className="muted">الحالة</span><StatusBadge status={approval.status} /></div>
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                {approval.description}
              </div>
            </div>
          </Card>

          <Card title="سير الاعتماد">
            <ApprovalTimeline steps={approval.steps} />
          </Card>

          <Card title="الوثيقة المرتبطة" subtitle={approval.relatedId ?? "بدون مرجع"}>
            <div className="stack-sm">
              {approval.relatedId ? (
                <Alert variant="info" title="رابط العملية الأصلية">
                  رقم المرجع: <b className="num" style={{ direction: "ltr" }}>{approval.relatedId}</b> — تظهر تفاصيله كاملة عند ربط النظام الخلفي.
                </Alert>
              ) : (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا يوجد مستند مرتبط بهذا الطلب.</div>
              )}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title="قرارك" subtitle={canDecide ? `أنت المعتمد الحالي — مستوى ${myStep.level} (${roleLabel[myStep.role]})` : "لا يمكنك الاعتماد في هذه المرحلة"}>
{canDecide ? (
                <div className="stack">
                  <Textarea label="ملاحظة القرار" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة اختيارية تظهر في سجل الاعتماد..." />
                  <div className="decision-buttons">
                    <Button variant="secondary" onClick={() => setDecision("reject")} icon={<XCircle size={15} />}>رفض</Button>
                    <Button variant="primary" onClick={() => setDecision("approve")} icon={<CheckCircle2 size={15} />}>اعتماد</Button>
                  </div>
                </div>
            ) : (
              <Alert variant="warning" title="الطلب ليس في مستوى قرارك">
                الحالة: {approval.status === "approved" ? "معتمد مسبقاً" : approval.status === "rejected" ? "مرفوض" : "بانتظار مستوى آخر"}.
              </Alert>
            )}
          </Card>

          <Card title="معلومات سريعة">
            <div className="stack-sm">
              <div className="flex-between"><span className="muted">المستوى الحالي</span><b className="num">{approval.currentLevel} / {approval.totalLevels}</b></div>
              <div className="flex-between"><span className="muted">المعتمد المتوقع</span><span>{roleLabel[approval.steps[approval.currentLevel - 1]?.role ?? "SUPERVISOR"]}</span></div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={decision !== null}
        onClose={() => setDecision(null)}
        title={decision === "approve" ? "تأكيد الاعتماد" : "تأكيد الرفض"}
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setDecision(null)}>إلغاء</Button>
          <Button variant={decision === "approve" ? "primary" : "secondary"} onClick={confirm}>
            {decision === "approve" ? "اعتماد الطلب" : "رفض الطلب"}
          </Button>
        </>}
      >
        <p className="muted" style={{ fontSize: "var(--font-size-sm)" }}>
          {decision === "approve"
            ? "سيُنتقل الطلب للمستوى التالي من الاعتماد أو يُقفل كمعتمد إن كان المستوى الأخير."
            : "سيُغلق الطلب كمرفوض ويعاد للطالب مع سبب الرفض."}
        </p>
      </Modal>
    </div>
  );
}