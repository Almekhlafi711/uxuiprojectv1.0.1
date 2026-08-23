import { useState } from "react";
import { PackageCheck, Plus, CheckCircle2, Send } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { mockApi } from "@/services/mockApi";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { toast } from "@/store/ui";
import { formatDateShort } from "@/utils/format";
import type { AssetRequest, User } from "@/types";

export function AssetRequestsPage() {
  const { assetRequests, reps } = useTeamData();
  const [modalOpen, setModalOpen] = useState(false);

  const columns: Column<AssetRequest>[] = [
    { key: "number", header: "الرقم", priority: "primary", render: (a) => <b>{a.number}</b> },
    { key: "asset", header: "الأصل", priority: "primary", render: (a) => (
      <div style={{ display: "flex", flexDirection: "column" }}><span>{a.assetName ?? a.assetType}</span><span className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{a.assetNumber ?? "—"}</span></div>
    ) },
    { key: "beneficiary", header: "المستفيد", priority: "primary", render: (a) => <span>{a.beneficiaryName} ({a.beneficiaryId})</span> },
    { key: "requestedBy", header: "من فعل الطلب", priority: "primary", render: (a) => <span>{a.requestedBy} ({a.requestedById})</span> },
    { key: "date", header: "تاريخ الطلب", priority: "secondary", render: (a) => <span className="num">{formatDateShort(a.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (a) => (
      <Badge tone={
        a.status === "pending_approval" ? "warning" : a.status === "approved" ? "success" : a.status === "handed_over" ? "success"
        : a.status === "rejected" ? "danger" : a.status === "returned" ? "neutral" : "info"
      } dot>{
        a.status === "pending_approval" ? "بانتظار مدير" : a.status === "approved" ? "معتمد" : a.status === "handed_over" ? "منحوت" : a.status === "rejected" ? "مرفوض" : a.status === "returned" ? "مُعاد" : a.status
      }</Badge>
    ) },
    { key: "approvedBy", header: "مدعوم من قبل", priority: "secondary", render: (a) => <Badge tone={a.approvedBy ? "success" : "neutral"}>{a.approvedBy ?? "—"}</Badge> },
    { key: "actions", header: "", priority: "primary", render: (a) => {
      const isOwn = a.requestedById === a.beneficiaryId;
      const canApprove = a.status === "pending_approval" && !supervisorPolicies.assetApprovalWorkflow.supervisorCannotApproveOwn && !isOwn;
      return canApprove ? (
        <Button variant="ghost" size="sm" icon={<CheckCircle2 size={14} />} onClick={async () => { try { await mockApi.assets.approve(a.id, true); toast.success(`تم اعتماد ${a.number}`); } catch { toast.error(`فشل اعتماد ${a.number}`); } }}>اعتماد</Button>
      ) : <span className="muted">غير مسموح</span>;
    } },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "الأصود والعهد" }, { label: "طلبات العهد" }]}
        title="طلبات الأصول"
        description={`الموافقة: ${supervisorPolicies.assetApprovalWorkflow.role} — المشرف لا يعتمد طلبًا ينشئه بنفسه`}
        actions={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>طلب أصل</Button>}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="طلبات الأصص" subtitle={`معلق على مدير المبيعات: ${assetRequests.filter((a) => a.status === "pending_approval").length}`}>
          <DataTable columns={columns} rows={assetRequests} rowKey={(a) => a.id} searchPlaceholder="بحث بالرقم أو المستفيد..." searchKeys={(a) => `${a.number} ${a.beneficiaryName}`} emptyTitle="لا توجد طلبات" pageSize={8} />
        </Card>
      </div>

      <Modal open={modalOpen} title="طلب أصل جديد" size="lg" onClose={() => setModalOpen(false)}>
        <NewAssetRequestForm reps={reps} onSubmit={async (data) => {
          try {
            await mockApi.assets.create(data);
            toast.success("تم إرسال طلب الأصل إلى مدير المبيعات للموافقة");
            setModalOpen(false);
          } catch {
            toast.error("فشل إرسال طلب الأصل");
          }
        }} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}

function NewAssetRequestForm({ reps, onSubmit, onCancel }: { reps: User[]; onSubmit: (data: { assetType: string; beneficiaryId: string; beneficiaryName: string; reason: string; expectedDate?: string; notes?: string }) => void; onCancel: () => void }) {
  const [assetType, setAssetType] = useState("laptop");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [reason, setReason] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="stack" style={{ gap: 12 }}>
      <Select label="نوع الأصل" value={assetType} onChange={(e) => setAssetType(e.target.value)} options={[
        { value: "laptop", label: "لاب توب" }, { value: "tablet", label: "تابلت" }, { value: "phone", label: "هاتف" }, { value: "pos", label: "جهاز POS" },
      ]} />
      <Select label="المستفيد (مندوب)" value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)} placeholder="اختر المندوب" options={reps.map((r) => ({ value: r.id, label: r.name }))} />
      <Input label="التاريخ المتوقع" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
      <Textarea label="السبب" value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="لماذا هذا الأصل مطلوب؟..." />
      <Textarea label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية (اختياري)..." />
      <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>سيتم إرسال الطلب إلى مدير المبيعات ({supervisorPolicies.assetApprovalWorkflow.role}) للموافقة. لن يظهر زر اعتماد للمشرف على طلبه الخاص.</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>إلغاء</Button>
        <Button variant="primary" size="sm" icon={<Send size={14} />} onClick={() => {
          if (!beneficiaryId || !reason) { toast.warning("يرجى تعبئة جميع الحقول المطلوبة"); return; }
          const bRep = reps.find((r) => r.id === beneficiaryId);
          onSubmit({ assetType, beneficiaryId, beneficiaryName: bRep?.name ?? beneficiaryId, reason, expectedDate: expectedDate || undefined, notes: notes || undefined });
        }}>إرسال للاعتماد</Button>
      </div>
    </div>
  );
}
