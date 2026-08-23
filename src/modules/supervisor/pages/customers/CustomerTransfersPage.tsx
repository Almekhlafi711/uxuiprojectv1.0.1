import { useState } from "react";
import { ReceiptText, UserCheck, Calendar, FileText, Send } from "lucide-react";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { mockApi } from "@/services/mockApi";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { toast } from "@/store/ui";
import type { CustomerTransferRecord } from "@/types";

export function CustomerTransfersPage() {
  const { customerTransfers, customers, reps } = useTeamData();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [newRepId, setNewRepId] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");

  const columns: Column<CustomerTransferRecord>[] = [
    { key: "customer", header: "العميل", priority: "primary", render: (r) => <b>{r.customerName}</b> },
    { key: "from", header: "من", priority: "primary", render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><UserCheck size={13} />{r.previousRep}</div>
    ) },
    { key: "to", header: "إلى", priority: "primary", render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><UserCheck size={13} />{r.newRep}</div>
    ) },
    { key: "date", header: "التاريخ", priority: "secondary", render: (r) => <span className="num">{r.effectiveDate}</span> },
    { key: "debt", header: "مسؤولية الدين", priority: "secondary", render: (r) => (
      <Badge tone={r.debtResponsibility === "new_rep" ? "success" : "neutral"}>{r.debtResponsibility === "new_rep" ? "المندوب الجديد" : r.debtResponsibility === "previous_rep" ? "المندوب السابق" : "حسب السياسة"}</Badge>
    ) },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => (
      <Badge tone={r.status === "executed" ? "success" : r.status === "pending" ? "warning" : r.status === "approved" ? "info" : "neutral"} dot>{r.status === "executed" ? "تم التنفيذ" : r.status === "approved" ? "معتمد" : r.status === "pending" ? "معلق" : r.status}</Badge>
    ) },
    { key: "history", header: "السجل", priority: "optional", render: (r) => (
      <div style={{ display: "grid", gap: 2, fontSize: "var(--font-size-xs)" }}>
        {(r.auditTrail ?? []).map((a, i) => <span key={i}>{a.at.slice(0, 10)} · {a.by} · {a.action}</span>)}
      </div>
    ) },
  ];

  const handleTransfer = async () => {
    const c = customers.find((c) => c.id === customerId);
    const rep = reps.find((r) => r.id === newRepId);
    if (!c || !rep || !reason || !effectiveDate) { toast.warning("يرجى تعبئة جميع الحقول"); return; }
    try {
      await mockApi.customers.createTransfer({
        customerId: c.id,
        customerName: c.name,
        previousRepId: c.repId,
        previousRep: reps.find((r) => r.id === c.repId)?.name ?? c.repId,
        newRepId,
        newRep: rep.name,
        effectiveDate,
        reason,
        debtResponsibility: supervisorPolicies.customerTransfer.debtResponsibility,
        transferredById: "supervisor-current",
      });
      toast.success(`تم جدولة تحويل ${c.name} إلى ${rep.name} بتاريخ ${effectiveDate}`);
      setWizardOpen(false);
    } catch {
      toast.error("فشل جدولة التحويل");
    }
  };

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "العملاء" }, { label: "تحويل العملاء" }]}
        title="تحويل العملاء بين المناديب"
        description={`نطاق الفريق — مسؤولية الديون: ${supervisorPolicies.customerTransfer.debtResponsibility === "new_rep" ? "المندوب الجديد" : "المندوب السابق"} — يُحفظ التاريخ`}
        actions={<Button variant="primary" size="sm" icon={<ReceiptText size={14} />} onClick={() => setWizardOpen(true)}>تحويل جديد</Button>}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="سجل التحويلات" subtitle={`إجمالي: ${customerTransfers.length}`}>
            <DataTable columns={columns} rows={customerTransfers} rowKey={(r) => r.id} searchPlaceholder="بحث بالعميل..." searchKeys={(r) => r.customerName} initialSort={{ key: "effectiveDate", dir: "desc" }} emptyTitle="لا توجد تحويلات" pageSize={10} />
        </Card>
        <Card title="مبدأ التحويل" subtitle="لا يُحذف — يُنهي الإسناد القديم ويبدأ الإسناد الجديد مع الحفاظ على السجل">
          <ul style={{ display: "grid", gap: 6, fontSize: "var(--font-size-sm)", paddingLeft: 20 }}>
            <li>التحويل يحفظ Previous Assignment كـ Ended مع تاريخ النهاية</li>
            <li>التحويل يخلق New Assignment كـ Active مع تاريخ البداية</li>
            <li>الديون تنتقل وفق Policy ({supervisorPolicies.customerTransfer.debtResponsibility})</li>
            <li>الفواتير والتحصيل والتاريخ السابق لا يُحذف — يبقى مرتبطًا بالمندوب السابق</li>
          </ul>
        </Card>
      </div>

      <Modal open={wizardOpen} title="معالج تحويل العميل" size="lg" onClose={() => setWizardOpen(false)}>
        <div className="stack" style={{ gap: 12 }}>
          <Select label="العميل" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="اختر العميل" options={customers.filter((c) => c.repId && reps.some((r) => r.id === c.repId)).map((c) => ({ value: c.id, label: `${c.name} (${c.code ?? c.id})` }))} />
          <Select label="المندوب الجديد" value={newRepId} onChange={(e) => setNewRepId(e.target.value)} placeholder="اختر المندوب" options={reps.map((r) => ({ value: r.id, label: `${r.name} (${r.territoryId})` }))} />
          <Input label="تاريخ فعالية التحويل" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required />
          <Textarea label="السبب" value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="سبب التحويل..." />
          <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>مسؤولية الديون تُحدد وفق السياسة. السجل كامل يُأرشف.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" size="sm" onClick={() => setWizardOpen(false)}>إلغاء</Button>
            <Button variant="primary" size="sm" icon={<Send size={14} />} onClick={handleTransfer}>جدولة التحويل</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
