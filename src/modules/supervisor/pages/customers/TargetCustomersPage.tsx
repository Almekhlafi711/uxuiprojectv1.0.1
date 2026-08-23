import { useState } from "react";
import { Send } from "lucide-react";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/FormControls";
import { FileUpload, type UploadedFile } from "@/components/ui/FileUpload";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { mockApi } from "@/services/mockApi";
import { toast } from "@/store/ui";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { formatDateShort } from "@/utils/format";
import type { TargetOrganization, User } from "@/types";

const statusLabels: Record<TargetOrganization["status"], string> = {
  draft: "مسودة",
  under_review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  converted: "محوّل لعميل",
};

const statusTones: Record<TargetOrganization["status"], "success" | "warning" | "danger" | "info" | "neutral" | "primary"> = {
  draft: "neutral",
  under_review: "warning",
  approved: "success",
  rejected: "danger",
  converted: "info",
};

export function TargetCustomersPage() {
  const { targetOrganizations, customers, reps } = useTeamData();
  const pending = targetOrganizations.filter((t) => t.status === "under_review");
  const [selected, setSelected] = useState<TargetOrganization | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | "forward">("approve");
  const [note, setNote] = useState("");
  const [reviewAttachments, setReviewAttachments] = useState<UploadedFile[]>([]);

  const columns: Column<TargetOrganization>[] = [
    { key: "name", header: "المؤسسة/العميل المستهدف", priority: "primary", render: (t) => <b>{t.name}</b> },
    { key: "rep", header: "المندوب", priority: "primary", render: (t) => {
      const rep = reps.find((r) => r.id === t.requestedById);
      return rep ? <span>{rep.name}</span> : <span className="muted">{t.requestedById}</span>;
    } },
    { key: "city", header: "المدينة", priority: "secondary", render: (t) => <span>{t.city}</span> },
    { key: "date", header: "تاريخ الطلب", priority: "secondary", sortable: true, sortValue: (t) => t.date, render: (t) => <span className="num">{formatDateShort(t.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (t) => (
      <Badge tone={statusTones[t.status]} dot>{statusLabels[t.status]}</Badge>
    ) },
    { key: "actions", header: "", priority: "primary", render: (t) => (
      <Button variant="ghost" size="sm" onClick={() => setSelected(t)}>مراجعة</Button>
    ) },
  ];

  const handleDecision = async () => {
    if (!selected) return;
    try {
      if (decision === "approve") {
        await mockApi.team.approveTargetOrg(selected.id, true);
        toast.success(`تم اعتماد ${selected.name} — سيصبح متاحاً للمندوب للمتابعة`);
      } else if (decision === "reject") {
        await mockApi.team.approveTargetOrg(selected.id, false, note || undefined);
        toast.warning(`مرفوض: ${selected.name} — ${note || "بدون ملاحظة"}`);
      } else {
        await mockApi.team.forwardTargetOrg(selected.id);
        toast.info(`تم تحويل ${selected.name} إلى مدير المبيعات للمراجعة`);
      }
      setSelected(null);
      setReviewAttachments([]);
    } catch {
      toast.error("فشل تنفيذ القرار");
    }
  };

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "العملاء" }, { label: "العملاء المستهدفون" }]}
        title="مراجعة العملاء المستهدفين"
        description="Target Customers — المشرف يراجع، ويدير المسار للاعتماد أو الترحيل."
        quickActions={<Badge tone="warning" dot>معلق: {pending.length}</Badge>}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="قائمة المراجعة" subtitle={`معلق: ${pending.length} — محوّل: ${targetOrganizations.filter((t) => t.status === "converted").length}`}>
          <DataTable columns={columns} rows={targetOrganizations} rowKey={(t) => t.id} searchPlaceholder="بحث بالمؤسسة أو المندوب..." searchKeys={(t) => `${t.name} ${t.requestedById}`} emptyTitle="لا توجد طلبات" pageSize={10} />
        </Card>
      </div>

      <Modal open={selected !== null} title={`مراجعة: ${selected?.name ?? ""}`} size="lg" onClose={() => setSelected(null)}>
        {selected && (
          <div className="stack" style={{ gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, fontSize: "var(--font-size-sm)" }}>
              <b>النوع</b><span>{selected.orgType}</span>
              <b>المدينة</b><span>{selected.city}</span>
              <b>الحالة القانونية</b><span>{selected.legalName ?? "—"}</span>
              <b>المالك/المسؤول</b><span>{selected.contactPerson?.name ?? "—"}</span>
              <b>الاتصال</b><span>{selected.phones?.join(" / ") ?? "—"}</span>
              <b>الموقع</b><span>{selected.district ?? "—"}</span>
              <b>المنتجات المتوقعة</b><span>{selected.expectedProducts ?? "—"}</span>
              <b>الحجم</b><span>{selected.expectedVolume ?? "—"}</span>
              <b>شروط الدفع</b><span>{selected.paymentTerms ?? "—"}</span>
              <b>الحد الأقصى للائتمان</b><span>{selected.creditRequirement ?? "—"}</span>
              <b>المندوب المرسل</b><span>{reps.find((r) => r.id === selected.requestedById)?.name ?? selected.requestedById}</span>
              <b>الوثائق</b><span>{selected.attachments?.length ?? 0} مرفق</span>
            </div>
            <Textarea label="ملاحظتك في المراجعة" value={note} onChange={(e) => setNote(e.target.value)} placeholder="اكتب ملاحظتك هنا..." />
            <FileUpload label="إرفاق وثائق العميل المستهدف" hint="صور السجل التجاري، التراخيص، وثائق أخرى" files={reviewAttachments} onChange={setReviewAttachments} />
            <Select value={decision} onChange={(e) => setDecision(e.target.value as "approve" | "reject" | "forward")} options={[
              { value: "approve", label: "اعتماد وتحويل للتنفيذ" },
              { value: "reject", label: "رفض" },
              { value: "forward", label: "تحويل لمدير المبيعات" },
            ]} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>إلغاء</Button>
              <Button variant="primary" size="sm" icon={<Send size={14} />} onClick={handleDecision}>تنفيذ القرار</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
