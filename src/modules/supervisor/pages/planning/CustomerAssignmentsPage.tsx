import { useState } from "react";
import { Users, UserCheck, UserX, PauseCircle } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { mockApi } from "@/services/mockApi";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/FormControls";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { toast } from "@/store/ui";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import type { Customer } from "@/types";

export function CustomerAssignmentsPage() {
  const { customers, reps, customerTransfers } = useTeamData();
  const teamCustomers = customers.filter((c) => c.repId && reps.some((r) => r.id === c.repId));
  const suspendedCustomers = customers.filter((c) => c.status === "suspended");
  const [assigning, setAssigning] = useState<Customer | null>(null);
  const [newRepId, setNewRepId] = useState("");
  const [reason, setReason] = useState("");
  const [showSuspended, setShowSuspended] = useState(false);

  const columns: Column<Customer>[] = [
    { key: "name", header: "العميل", priority: "primary", render: (c) => (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <b>{c.name}</b>
        <span className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{c.code ?? c.id}</span>
      </div>
    ) },
    { key: "rep", header: "المندوب الحالي", priority: "primary", render: (c) => {
      const rep = reps.find((r) => r.id === c.repId);
      return <span style={{ display: "flex", alignItems: "center", gap: 6 }}><UserCheck size={13} />{rep?.name ?? "—"}</span>;
    } },
    { key: "status", header: "الحالة", priority: "secondary", render: (c) => <Badge tone={c.status === "suspended" ? "danger" : c.status === "inactive" ? "neutral" : "success"} dot>{c.status === "suspended" ? "موقوف" : c.status === "inactive" ? "غير نشط" : "نشط"}</Badge> },
    { key: "actions", header: "", priority: "primary", render: (c) => (
      <Button variant="ghost" size="sm" onClick={() => setAssigning(c)}>إعادة تعيين</Button>
    ) },
  ];

  const handleTransfer = async () => {
    if (!assigning || !newRepId || !reason) { toast.warning("يرجى اختيار المندوب والسبب"); return; }
    try {
      const newRep = reps.find((r) => r.id === newRepId);
      await mockApi.customers.createTransfer({
        customerId: assigning.id,
        customerName: assigning.name,
        previousRepId: assigning.repId,
        previousRep: reps.find((r) => r.id === assigning.repId)?.name ?? assigning.repId,
        newRepId,
        newRep: newRep?.name ?? newRepId,
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason,
        debtResponsibility: supervisorPolicies.customerTransfer.debtResponsibility,
        transferredById: "supervisor-current",
      });
      toast.success(`تم جدولة تحويل ${assigning.name} إلى ${newRep?.name ?? newRepId} — بانتظار التنفيذ`);
      setAssigning(null);
    } catch {
      toast.error("فشل جدولة التحويل");
    }
  };

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "التخطيط" }, { label: "توزيع العملاء" }]}
        title="توزيع العملاء على المناديب"
        description="إعادة توزيع عملاء الفريق ضمن النطاق — يُحفظ التاريخ تلقائيًا"
        actions={<Button variant="primary" size="sm" icon={<PauseCircle size={14} />} onClick={() => setShowSuspended(true)}>العملاء المعلقون</Button>}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="عملاء الفريق" subtitle={`${teamCustomers.length} عميل`}>
          <DataTable
            columns={columns}
            rows={teamCustomers}
            rowKey={(c) => c.id}
            searchPlaceholder="بحث بالعميل أو المندوب..."
            searchKeys={(c) => `${c.name} ${reps.find((r) => r.id === c.repId)?.name ?? ""}`}
            emptyTitle="لا يوجد عملاء"
            pageSize={10}
          />
        </Card>
        <Card title="تحويلات الأسبوع" subtitle={`آخر ${customerTransfers.length} تحويل — يُحفظ التاريخ`}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>العميل</th><th>من</th><th>إلى</th><th>التاريخ</th><th>الحالة</th></tr>
              </thead>
              <tbody>
                {customerTransfers.map((t) => (
                  <tr key={t.id}>
                    <td>{t.customerName}</td>
                    <td>{t.previousRep}</td>
                    <td>{t.newRep}</td>
                    <td className="num">{t.effectiveDate}</td>
                    <td><Badge tone={t.status === "executed" ? "success" : "warning"}>{t.status === "executed" ? "منفذ" : "معلق"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={assigning !== null} title="إعادة تعيين العميل" size="md" onClose={() => setAssigning(null)}>
        {assigning && (
          <div className="stack" style={{ gap: 12 }}>
            <div><b>{assigning.name}</b></div>
            <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المندوب الحالي: {reps.find((r) => r.id === assigning.repId)?.name ?? "—"}</div>
            <Select
              label="المندوب الجديد"
              value={newRepId}
              onChange={(e) => setNewRepId(e.target.value)}
              placeholder="اختر المندوب الجديد"
              options={reps.filter((r) => r.id !== assigning.repId).map((r) => ({ value: r.id, label: `${r.name} — ${r.territoryId}` }))}
            />
            <Textarea
              label="السبب (مطلوب)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="لماذا تتم إعادة التعيين؟..."
              required
            />
            <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>مسؤولية الديون: {supervisorPolicies.customerTransfer.debtResponsibility === "new_rep" ? "المندوب الجديد" : "المندوب السابق"} — يُحفظ التاريخ تلقائيًا.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setAssigning(null)}>إلغاء</Button>
              <Button variant="primary" size="sm" onClick={handleTransfer}>جدولة التحويل</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showSuspended} title="العملاء الموقوفون" onClose={() => setShowSuspended(false)}>
        {suspendedCustomers.length === 0 ? (
          <div className="muted" style={{ fontSize: "var(--font-size-sm)", padding: "var(--space-4)", textAlign: "center" }}>لا يوجد عملاء موقوفون حالياً.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>العميل</th><th>المندوب</th><th>الحالة</th><th>إجراء</th></tr>
              </thead>
              <tbody>
                {suspendedCustomers.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b><br /><span className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{c.code ?? c.id}</span></td>
                    <td>{reps.find((r) => r.id === c.repId)?.name ?? "—"}</td>
                    <td><Badge tone="danger" dot>موقوف</Badge></td>
                    <td><Button variant="ghost" size="sm" onClick={() => { setAssigning(c); setShowSuspended(false); }}>إعادة تعيين</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
