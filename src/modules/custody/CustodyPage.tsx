import { useMemo, useState, useCallback } from "react";
import { Plus, Package, CheckCircle2, XCircle, FileText, Camera, Eye } from "lucide-react";
import { custodyRecords, assetTypeLabels } from "@/mock/custody";
import { auditLogs as mockAuditLogs } from "@/mock/admin";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input, Textarea } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { toast } from "@/store/ui";
import { formatDateShort, formatDateTime } from "@/utils/format";
import { can } from "@/config/permissions";
import { issueCustody } from "@/services/custody.service";
import { roleLabel } from "@/config/permissions";
import type { CustodyRecord, AssetRequest, AuditLog } from "@/types";

type TabKey = "custody" | "requests" | "archived";

const assetRequestStatusLabels: Record<string, string> = {
  pending_approval: "بانتظار الاعتماد",
  approved: "معتمد",
  rejected: "مرفوض",
  handed_over: "تم التسليم",
  returned: "تم الإرجاع",
  archived: "مؤرشف",
};

export function CustodyPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.custody.list());
  const { data: assetRequestsData, loading: loadingReqs, error: errorReqs, refetch: refetchReqs } = useData(() => mockApi.assets.requests());
  const [activeTab, setActiveTab] = useState<TabKey>("custody");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<CustodyRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionTarget, setActionTarget] = useState<{ request: AssetRequest; approve: boolean } | null>(null);

  const assignedName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const canManage = can("custody.manage", user?.role ?? "GENERAL_MANAGER");
  const canApproveAssets = user?.role === "SALES_MANAGER" || user?.role === "GENERAL_MANAGER";

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (user?.role === "REPRESENTATIVE") rows = rows.filter((r) => r.assignedToId === user.id);
    if (typeFilter) rows = rows.filter((r) => r.assetType === typeFilter);
    if (statusFilter) {
      if (statusFilter === "active") rows = rows.filter((r) => r.status === "issued");
      else if (statusFilter === "archived") rows = rows.filter((r) => r.status === "returned");
      else rows = rows.filter((r) => r.status === statusFilter);
    }
    return rows;
  }, [data, user?.role, user?.id, typeFilter, statusFilter]);

  const archivedCustody = useMemo(() => (data ?? []).filter((r) => r.status === "returned"), [data]);
  const pendingRequests = useMemo(() => (assetRequestsData ?? []).filter((r) => r.status === "pending_approval"), [assetRequestsData]);
  const activeCustody = useMemo(() => (data ?? []).filter((r) => r.status === "issued"), [data]);

  const custodyAuditLogs = useMemo(() => {
    const custodyIds = new Set((data ?? []).map((r) => r.id));
    return mockAuditLogs.filter((l) => l.entity === "custody" || custodyIds.has(l.entityId));
  }, [data]);

  const handleApproveRequest = useCallback(async () => {
    if (!actionTarget) return;
    try {
      await mockApi.assets.approve(actionTarget.request.id, actionTarget.approve, rejectReason || undefined);
      toast.success(actionTarget.approve ? "تم اعتماد الطلب" : "تم رفض الطلب");
      setActionTarget(null);
      setRejectReason("");
      refetchReqs();
    } catch {
      toast.error("حدث خطأ");
    }
  }, [actionTarget, rejectReason, refetchReqs]);

  const TABS: TabItem[] = [
    { key: "custody", label: "العهد", count: (data ?? []).length, content: null },
    { key: "requests", label: "طلبات الأصول", count: pendingRequests.length, content: null },
    { key: "archived", label: "الأرشيف", count: archivedCustody.length, content: null },
  ];

  const custodyColumns: Column<CustodyRecord>[] = [
    { key: "asset", header: "الأصل", sortable: true, sortValue: (r) => r.assetName, render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.assetName}</div>
        <div className="faint num" style={{ fontSize: "var(--font-size-xs)", direction: "ltr", textAlign: "right" }}>{r.serialNumber}</div>
      </div>
    ) },
    { key: "type", header: "النوع", render: (r) => <Badge tone="neutral">{assetTypeLabels[r.assetType]}</Badge> },
    { key: "holder", header: "الحائز", sortable: true, sortValue: (r) => assignedName(r.assignedToId), render: (r) => (
      <div>
        <b>{assignedName(r.assignedToId)}</b>
        <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{roleLabel[r.assignedToRole]}</div>
      </div>
    ) },
    { key: "issuedAt", header: "تاريخ التسليم", sortable: true, sortValue: (r) => r.issuedAt, render: (r) => <span className="num">{formatDateShort(r.issuedAt)}</span> },
    { key: "returned", header: "الإرجاع", render: (r) => (r.returnedAt ? <span className="num">{formatDateShort(r.returnedAt)}</span> : <span className="faint">—</span>) },
    { key: "condition", header: "الحالة", render: (r) => (r.condition === "good" ? <Badge tone="success" dot>سليم</Badge> : r.condition === "damaged" ? <Badge tone="danger" dot>تالف</Badge> : r.condition === "lost" ? <Badge tone="danger" dot>مفقود</Badge> : <Badge tone="warning" dot>يحتاج صيانة</Badge>) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "", render: (r) => (
      <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={(e) => { e.stopPropagation(); setDetailItem(r); }}>تفاصيل</Button>
    ) },
  ];

  const requestColumns: Column<AssetRequest>[] = [
    { key: "number", header: "رقم الطلب", sortable: true, sortValue: (r) => r.number, render: (r) => <span style={{ fontWeight: 600 }}>{r.number}</span> },
    { key: "assetType", header: "نوع الأصل", render: (r) => <Badge tone="neutral">{assetTypeLabels[r.assetType] ?? r.assetType}</Badge> },
    { key: "beneficiary", header: "المستفيد", sortable: true, sortValue: (r) => r.beneficiaryName, render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.beneficiaryName}</div>
        <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.requestedBy}</div>
      </div>
    ) },
    { key: "reason", header: "السبب", render: (r) => <span style={{ fontSize: "var(--font-size-sm)" }}>{r.reason.slice(0, 50)}{r.reason.length > 50 ? "..." : ""}</span> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "status", header: "الحالة", render: (r) => <Badge tone={r.status === "pending_approval" ? "warning" : r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : r.status === "handed_over" ? "info" : "neutral"} dot>{assetRequestStatusLabels[r.status] ?? r.status}</Badge> },
    { key: "actions", header: "", render: (r) => canApproveAssets && r.status === "pending_approval" ? (
      <div style={{ display: "flex", gap: "var(--space-1)" }}>
        <Button variant="primary" size="sm" icon={<CheckCircle2 size={14} />} onClick={(e) => { e.stopPropagation(); setActionTarget({ request: r, approve: true }); }}>اعتماد</Button>
        <Button variant="danger" size="sm" icon={<XCircle size={14} />} onClick={(e) => { e.stopPropagation(); setActionTarget({ request: r, approve: false }); }}>رفض</Button>
      </div>
    ) : null },
  ];

  const archivedColumns: Column<CustodyRecord>[] = [
    { key: "asset", header: "الأصل", sortable: true, sortValue: (r) => r.assetName, render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.assetName}</div>
        <div className="faint num" style={{ fontSize: "var(--font-size-xs)", direction: "ltr", textAlign: "right" }}>{r.serialNumber}</div>
      </div>
    ) },
    { key: "holder", header: "الحائز السابق", sortable: true, sortValue: (r) => assignedName(r.assignedToId), render: (r) => (
      <div>
        <b>{assignedName(r.assignedToId)}</b>
        <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{roleLabel[r.assignedToRole]}</div>
      </div>
    ) },
    { key: "issuedAt", header: "تاريخ التسليم", sortable: true, sortValue: (r) => r.issuedAt, render: (r) => <span className="num">{formatDateShort(r.issuedAt)}</span> },
    { key: "returnedAt", header: "تاريخ الإرجاع", sortable: true, sortValue: (r) => r.returnedAt ?? "", render: (r) => <span className="num">{r.returnedAt ? formatDateShort(r.returnedAt) : "—"}</span> },
    { key: "condition", header: "الحالة", render: (r) => (r.condition === "good" ? <Badge tone="success" dot>سليم</Badge> : r.condition === "damaged" ? <Badge tone="danger" dot>تالف</Badge> : <Badge tone="warning" dot>يحتاج صيانة</Badge>) },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const auditColumns: Column<AuditLog>[] = [
    { key: "at", header: "التاريخ", sortable: true, sortValue: (r) => r.at, render: (r) => <span className="num">{formatDateTime(r.at)}</span> },
    { key: "actor", header: "المحرر", sortable: true, sortValue: (r) => r.actor, render: (r) => <span style={{ fontWeight: 500 }}>{r.actor}</span> },
    { key: "action", header: "الإجراء", render: (r) => <Badge tone="neutral">{r.action}</Badge> },
    { key: "entityId", header: "الكائن", render: (r) => <span className="num">{r.entityId}</span> },
    { key: "oldValue", header: "القيمة القديمة", render: (r) => <span className="faint" style={{ fontSize: "var(--font-size-sm)" }}>{r.oldValue?.slice(0, 40) ?? "—"}</span> },
    { key: "newValue", header: "القيمة الجديدة", render: (r) => <span style={{ fontSize: "var(--font-size-sm)" }}>{r.newValue?.slice(0, 40) ?? "—"}</span> },
    { key: "reason", header: "السبب", render: (r) => <span style={{ fontSize: "var(--font-size-sm)" }}>{r.reason ?? "—"}</span> },
  ];

  const tabContent = useMemo(() => {
    if (activeTab === "custody") return (
      <>
        <FilterBar>
          <Select
            label="النوع"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="الكل"
            options={Object.entries(assetTypeLabels).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Select
            label="الحالة"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="الكل"
            options={[
              { value: "active", label: "نشطة (مسلمة)" },
              { value: "pending", label: "معلقة" },
              { value: "returned", label: "معادة" },
              { value: "archived", label: "مؤرشفة" },
            ]}
          />
        </FilterBar>
        <DataTable
          columns={custodyColumns}
          rows={filtered}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          onRetry={refetch}
          searchPlaceholder="بحث بالأصل أو الحائز..."
          searchKeys={(r) => `${r.assetName} ${r.serialNumber} ${assignedName(r.assignedToId)}`}
          exportFilename="custody"
          pageSize={10}
          emptyTitle="لا توجد عهد مطابقة"
          onRowClick={(r) => setDetailItem(r)}
        />
      </>
    );
    if (activeTab === "requests") return (
      <DataTable
        columns={requestColumns}
        rows={assetRequestsData ?? []}
        rowKey={(r) => r.id}
        loading={loadingReqs}
        error={errorReqs}
        onRetry={refetchReqs}
        searchPlaceholder="بحث برقم الطلب أو المستفيد..."
        searchKeys={(r) => `${r.number} ${r.beneficiaryName} ${r.requestedBy}`}
        exportFilename="asset-requests"
        pageSize={10}
        emptyTitle="لا توجد طلبات أصول"
      />
    );
    return (
      <>
        <Card title="الأرشيف" subtitle="العهد المُعادة والمؤرشفة">
          <DataTable
            columns={archivedColumns}
            rows={archivedCustody}
            rowKey={(r) => r.id}
            loading={loading}
            searchPlaceholder="بحث بالأصل..."
            searchKeys={(r) => `${r.assetName} ${r.serialNumber}`}
            pageSize={10}
            emptyTitle="لا توجد عهد مؤرشفة"
            onRowClick={(r) => setDetailItem(r)}
          />
        </Card>
        <Card title="سجل التغييرات" subtitle="آخر التعديلات على سجلات العهد" className="mt-4">
          <DataTable
            columns={auditColumns}
            rows={custodyAuditLogs}
            rowKey={(r) => r.id}
            searchPlaceholder="بحث بالمحرر أو الإجراء..."
            searchKeys={(r) => `${r.actor} ${r.action} ${r.entityId}`}
            pageSize={8}
            emptyTitle="لا توجد سجلات تغييرات"
            exportFilename="custody-audit"
          />
        </Card>
      </>
    );
  }, [activeTab, filtered, loading, error, refetch, typeFilter, statusFilter, assetRequestsData, loadingReqs, errorReqs, refetchReqs, archivedCustody, custodyAuditLogs, requestColumns, custodyColumns, archivedColumns, auditColumns]);

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "العهد" }]}
        title="العهد والأصول"
        description="الأصول المسلمة للمناديب والمشرفين — السيارات والأجهزة"
        actions={
          canManage ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>تسليم عهدة</Button>
          ) : null
        }
      >

      <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
        <StatCard label="إجمالي العهد" value={String((data ?? []).length)} hint="جميع الأصول المسجلة" icon={<Package size={14} />} />
        <StatCard label="طلبات معلقة" value={String(pendingRequests.length)} hint="بانتظار اعتماد المدير" icon={<FileText size={14} />} />
        <StatCard label="عهد نشطة" value={String(activeCustody.length)} hint="قيد الاستخدام" icon={<Package size={14} />} />
        <StatCard label="مؤرشفة" value={String(archivedCustody.length)} hint="عهد معادة" icon={<Package size={14} />} />
      </div>

      <Tabs tabs={TABS} active={activeTab} onChange={(key) => setActiveTab(key as TabKey)} />
      </StickyPageHeader>

      {tabContent}

      <Card className="mt-4">
        <div className="alert alert-info" style={{ marginBottom: 0 }}>
          إجراءات العهد: تسليم ← توقيع إقرار ← متابعة دورية ← استلام عند الإرجاع مع فحص الحالة. أي تلف يُسجل ويُرسل لطلب اعتماد استبدال تلقائياً.
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="تسليم عهدة جديدة"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => { const r = issueCustody({ assetType: "car", assignedToId: "", assignedToRole: "REPRESENTATIVE", assetName: "", serialNumber: "" }, { id: user?.id ?? "" }); if (r.success) { toast.success("تم تسجيل العهدة — يُنشأ إقرار استلام للتوقيع"); setOpen(false); } else toast.error("فشل", r.reason); }}>تسجيل العهدة</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-6">
            <Select label="نوع الأصل" defaultValue="car" options={Object.entries(assetTypeLabels).map(([v, l]) => ({ value: v, label: l }))} />
          </div>
          <div className="field-span-6">
            <Select label="المستلم" placeholder="موظف" options={users.map((u) => ({ value: u.id, label: `${u.name} — ${roleLabel[u.role]}` }))} />
          </div>
          <div className="field-span-6"><Input label="اسم الأصل" placeholder="مثال: تويوتا هيلوكس 2024" /></div>
          <div className="field-span-6"><Input label="الرقم التسلسلي" placeholder="VEH-00XXX" /></div>
          <div className="field-span-12">
            <div className="alert alert-warning" style={{ marginBottom: 0 }}>
              يتطلب التسليم توقيع المستلم إلكترونياً في النظام قبل تفعيل العهدة.
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem ? `تفاصيل العهدة — ${detailItem.assetName}` : ""}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setDetailItem(null)}>إغلاق</Button>}
      >
        {detailItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>اسم الأصل</div>
                <div style={{ fontWeight: 600 }}>{detailItem.assetName}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>الرقم التسلسلي</div>
                <div className="num">{detailItem.serialNumber}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>النوع</div>
                <Badge tone="neutral">{assetTypeLabels[detailItem.assetType]}</Badge>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>الحائز</div>
                <div style={{ fontWeight: 500 }}>{assignedName(detailItem.assignedToId)}</div>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{roleLabel[detailItem.assignedToRole]}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>تاريخ التسليم</div>
                <div className="num">{formatDateShort(detailItem.issuedAt)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>الحالة الفيزيائية</div>
                <div>{detailItem.condition === "good" ? <Badge tone="success" dot>سليم</Badge> : detailItem.condition === "damaged" ? <Badge tone="danger" dot>تالف</Badge> : detailItem.condition === "lost" ? <Badge tone="danger" dot>مفقود</Badge> : <Badge tone="warning" dot>يحتاج صيانة</Badge>}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>الحالة النظامية</div>
                <StatusBadge status={detailItem.status} />
              </div>
              {detailItem.returnedAt && (
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>تاريخ الإرجاع</div>
                  <div className="num">{formatDateShort(detailItem.returnedAt)}</div>
                </div>
              )}
            </div>

            {detailItem.notes && (
              <div>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>ملاحظات</div>
                <div style={{ fontSize: "var(--font-size-sm)", lineHeight: 1.6, padding: "var(--space-3)", background: "var(--color-surface-secondary)", borderRadius: "var(--radius-md)" }}>{detailItem.notes}</div>
              </div>
            )}

            <Card title="الصور والمستندات">
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <div style={{ width: 120, height: 120, border: "2px dashed var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)" }}>
                  <Camera size={20} />
                  <span>صورة الأصل</span>
                </div>
                <div style={{ width: 120, height: 120, border: "2px dashed var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)" }}>
                  <FileText size={20} />
                  <span>إقرار الاستلام</span>
                </div>
                <div style={{ width: 120, height: 120, border: "2px dashed var(--color-border)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)" }}>
                  <FileText size={20} />
                  <span>مستندات إضافية</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Modal>

      <Modal
        open={!!actionTarget}
        onClose={() => { setActionTarget(null); setRejectReason(""); }}
        title={actionTarget?.approve ? "اعتماد طلب الأصل" : "رفض طلب الأصل"}
        size="sm"
        footer={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button variant="secondary" onClick={() => { setActionTarget(null); setRejectReason(""); }}>إلغاء</Button>
            <Button
              variant={actionTarget?.approve ? "primary" : "danger-solid"}
              onClick={handleApproveRequest}
              disabled={!actionTarget?.approve && !rejectReason.trim()}
            >
              {actionTarget?.approve ? "تأكيد الاعتماد" : "تأكيد الرفض"}
            </Button>
          </div>
        }
      >
        {actionTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div>
              <div className="faint" style={{ fontSize: "var(--font-size-sm)" }}>الطلب: <b>{actionTarget.request.number}</b></div>
              <div className="faint" style={{ fontSize: "var(--font-size-sm)" }}>المستفيد: {actionTarget.request.beneficiaryName}</div>
            </div>
            {actionTarget.approve ? (
              <Textarea label="ملاحظات الاعتماد (اختياري)" placeholder="أدخل ملاحظات..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            ) : (
              <Textarea label="سبب الرفض" placeholder="أدخل سبب الرفض..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}