import { useState, useEffect, useMemo } from "react";
import { RefreshCw, ArrowLeftRight, CheckCircle, XCircle, Play, AlertTriangle } from "lucide-react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/FormControls";
import { DataTable } from "@/components/data-table/DataTable";
import type { Column } from "@/components/data-table/DataTable";
import { useAuthStore } from "@/store/auth";
import { can } from "@/config/permissions";
import { organizationService } from "@/services/organization.service";
import { transferValidationService } from "@/services/transferValidation.service";
import { customers } from "@/mock/customers";
import { reps, supervisors } from "@/mock/users";
import { territories } from "@/mock/organization";
import type { CustomerTransferRequest, PreTransferValidation } from "@/types";
import { formatDate } from "@/utils/format";
import { toast } from "@/store/ui";

export function CustomerTransferPage() {
  const { user } = useAuthStore();
  const canManage = can("organization.manage", user?.role ?? "GENERAL_MANAGER");
  const [requests, setRequests] = useState<CustomerTransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [newTransferModal, setNewTransferModal] = useState(false);
  const [transferCustomerId, setTransferCustomerId] = useState("");
  const [transferNewRep, setTransferNewRep] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferDebt, setTransferDebt] = useState<"previous_rep" | "new_rep" | "policy">("policy");
  const [validation, setValidation] = useState<PreTransferValidation | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      setRequests(await organizationService.getTransferRequests());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const tabs = useMemo(() => [
    { key: "pending", label: `معلّق (${requests.filter(r => r.status === "pending").length})`, content: null },
    { key: "approved", label: `معتمد (${requests.filter(r => r.status === "approved").length})`, content: null },
    { key: "rejected", label: `مرفوض (${requests.filter(r => r.status === "rejected").length})`, content: null },
    { key: "executed", label: `منفّذ (${requests.filter(r => r.status === "executed").length})`, content: null },
  ], [requests]);

  const filtered = useMemo(() => requests.filter(r => r.status === activeTab), [requests, activeTab]);

  useEffect(() => {
    if (transferCustomerId) {
      const v = transferValidationService.validateCustomerTransfer(transferCustomerId, transferNewRep);
      setValidation(v);
    }
  }, [transferCustomerId, transferNewRep]);

  async function handleCreateTransfer() {
    if (!transferCustomerId || !transferNewRep || !transferReason.trim()) {
      toast.error("يرجى ملء جميع الحقول"); return;
    }
    const v = transferValidationService.validateCustomerTransfer(transferCustomerId, transferNewRep);
    if (!v.canTransfer) {
      toast.error(`لا يمكن النقل: ${v.blockers.join(", ")}`); return;
    }
    try {
      const actor = user?.id ?? "system";
      await organizationService.createCustomerTransfer(transferCustomerId, transferNewRep, transferReason, transferDebt, actor, v);
      toast.success("تم إنشاء طلب النقل بنجاح");
      setNewTransferModal(false);
      resetTransferForm();
      await loadData();
    } catch (err: any) { toast.error(err.message ?? "فشل إنشاء الطلب"); }
  }

  async function handleApprove(id: string) {
    try {
      const actor = user?.id ?? "system";
      await organizationService.approveCustomerTransfer(id, actor);
      toast.success("تم اعتماد طلب النقل"); await loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleExecute(id: string) {
    try {
      const actor = user?.id ?? "system";
      await organizationService.executeCustomerTransfer(id, actor);
      toast.success("تم تنفيذ النقل بنجاح"); await loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { toast.error("يرجى إدخال سبب الرفض"); return; }
    try {
      const actor = user?.id ?? "system";
      await organizationService.rejectCustomerTransfer(rejectModal.id, actor, rejectReason);
      toast.success("تم رفض طلب النقل");
      setRejectModal({ open: false, id: "" }); setRejectReason(""); await loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  function resetTransferForm() {
    setTransferCustomerId(""); setTransferNewRep(""); setTransferReason(""); setTransferDebt("policy"); setValidation(null);
  }

  const columns: Column<CustomerTransferRequest>[] = [
    {
      key: "customerName", header: "العميل",
      render: (r) => <div><div className="font-medium text-sm">{r.customerName}</div><div className="text-xs muted">{r.customerCode}</div></div>,
    },
    {
      key: "previousRepName", header: "من (مندوب)",
      render: (r) => <span className="text-sm">{r.previousRepName}</span>,
    },
    {
      key: "newRepName", header: "إلى (مندوب)",
      render: (r) => <span className="text-sm">{r.newRepName}</span>,
    },
    {
      key: "requestedAt", header: "التاريخ",
      render: (r) => <span className="text-xs muted">{formatDate(r.requestedAt)}</span>,
    },
    {
      key: "status", header: "الحالة",
      render: (r) => (
        <Badge tone={r.status === "pending" ? "warning" : r.status === "approved" ? "info" : r.status === "executed" ? "success" : "danger"}>
          {r.status === "pending" ? "معلّق" : r.status === "approved" ? "معتمد" : r.status === "executed" ? "منفّذ" : "مرفوض"}
        </Badge>
      ),
    },
    {
      key: "actions", header: "الإجراء",
      render: (r) => (
        <div className="flex gap-1">
          {r.status === "pending" && canManage && (
            <>
              <Button variant="ghost" size="sm" icon={<CheckCircle size={14} />} onClick={(e) => { e.stopPropagation(); handleApprove(r.id); }}>اعتماد</Button>
              <Button variant="ghost" size="sm" icon={<XCircle size={14} />} onClick={(e) => { e.stopPropagation(); setRejectModal({ open: true, id: r.id }); }}>رفض</Button>
            </>
          )}
          {r.status === "approved" && canManage && (
            <Button variant="ghost" size="sm" icon={<Play size={14} />} onClick={(e) => { e.stopPropagation(); handleExecute(r.id); }}>تنفيذ</Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={32} className="animate-spin mx-auto mb-4" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المبيعات والتوزيع", path: "/customers" }, { label: "إدارة الهيكل والتوزيع", path: "/organization/dashboard" }, { label: "نقل العملاء" }]}
        title="نقل العملاء"
        description="نقل العملاء بين المندوبين مع اعتماد وتحقق"
        actions={
          canManage ? (
            <Button variant="primary" icon={<ArrowLeftRight size={15} />} onClick={() => setNewTransferModal(true)}>طلب نقل جديد</Button>
          ) : null
        }
      />

      <Card>
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} searchable searchPlaceholder="بحث بالاسم..."
          searchKeys={(r) => `${r.customerName} ${r.previousRepName} ${r.newRepName}`} pageSize={10} />
      </Card>

      {/* ─── Modal طلب نقل جديد ─── */}
      <Modal open={newTransferModal} onClose={() => { setNewTransferModal(false); resetTransferForm(); }} title="طلب نقل جديد" size="lg">
        <div className="form-grid">
          <div className="field-span-6">
            <label className="form-label">العميل</label>
            <select className="form-control" value={transferCustomerId} onChange={(e) => setTransferCustomerId(e.target.value)}>
              <option value="">اختر العميل...</option>
              {customers.filter(c => c.status === "active").map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div className="field-span-6">
            <label className="form-label">المندوب الجديد</label>
            <select className="form-control" value={transferNewRep} onChange={(e) => setTransferNewRep(e.target.value)}>
              <option value="">اختر المندوب...</option>
              {reps.filter(r => r.status === "active").map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="field-span-6">
            <Input label="سبب النقل" placeholder="سبب النقل..." value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
          </div>
          <div className="field-span-6">
            <label className="form-label">مسؤولية الدين</label>
            <select className="form-control" value={transferDebt} onChange={(e) => setTransferDebt(e.target.value as any)}>
              <option value="policy">حسب السياسة</option>
              <option value="previous_rep">المندوب السابق</option>
              <option value="new_rep">المندوب الجديد</option>
            </select>
          </div>

          {/* ─── نتائج التحقق ─── */}
          {validation && (
            <div className="field-span-12">
              <label className="form-label">نتائج التحقق قبل النقل</label>
              <div className={`p-3 rounded border ${validation.canTransfer ? "border-[var(--color-success-border)] bg-[var(--color-success-bg)]" : "border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {validation.canTransfer ? <CheckCircle size={16} style={{ color: "var(--color-success)" }} /> : <AlertTriangle size={16} style={{ color: "var(--color-danger)" }} />}
                  <span className="font-medium text-sm">{validation.canTransfer ? "يمكن النقل" : "لا يمكن النقل"}</span>
                </div>
                {validation.blockers.length > 0 && (
                  <div className="mb-1">
                    {validation.blockers.map((b, i) => <div key={i} className="text-xs text-[var(--color-danger)]">• {b}</div>)}
                  </div>
                )}
                {validation.warnings.length > 0 && (
                  <div>
                    {validation.warnings.map((w, i) => <div key={i} className="text-xs text-[var(--color-warning)]">⚠ {w}</div>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="page-actions mt-4">
          <Button variant="secondary" onClick={() => { setNewTransferModal(false); resetTransferForm(); }}>إلغاء</Button>
          <Button variant="primary" icon={<ArrowLeftRight size={15} />} onClick={handleCreateTransfer} disabled={validation ? !validation.canTransfer : true}>إنشاء طلب النقل</Button>
        </div>
      </Modal>

      {/* ─── Modal رفض ─── */}
      <Modal open={rejectModal.open} onClose={() => { setRejectModal({ open: false, id: "" }); setRejectReason(""); }} title="رفض طلب النقل" size="sm">
        <Input label="سبب الرفض" placeholder="سبب الرفض..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        <div className="page-actions mt-4">
          <Button variant="secondary" onClick={() => { setRejectModal({ open: false, id: "" }); setRejectReason(""); }}>إلغاء</Button>
          <Button variant="danger" icon={<XCircle size={15} />} onClick={handleReject}>تأكيد الرفض</Button>
        </div>
      </Modal>
    </div>
  );
}
