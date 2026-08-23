import { useMemo, useState } from "react";
import { Archive as ArchiveIcon, FileText, Users, Clock, History } from "lucide-react";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { StatCard } from "@/components/ui/StatCard";
import { toast } from "@/store/ui";
import { unlockArchive } from "@/services/archive.service";
import { formatDateShort, formatDateTime, formatNumber } from "@/utils/format";
import { can } from "@/config/permissions";
import { useAuthStore } from "@/store/auth";
import type { ArchiveRecord } from "@/types";

const typeTone: Record<string, "success" | "info" | "warning" | "neutral"> = {
  "مستند استلام": "info",
  "عقد": "success",
  "فاتورة": "warning",
  "تقرير جرد": "neutral",
  "محضر تسوية": "warning",
  "سند قبض": "success",
  "خطة سير": "info",
};

const typeOptions = [
  { value: "", label: "الكل" },
  { value: "مستند استلام", label: "مستند استلام" },
  { value: "عقد", label: "عقد" },
  { value: "فاتورة", label: "فاتورة" },
  { value: "تقرير جرد", label: "تقرير جرد" },
  { value: "محضر تسوية", label: "محضر تسوية" },
  { value: "سند قبض", label: "سند قبض" },
  { value: "خطة سير", label: "خطة سير" },
];

interface TargetCustomer {
  id: string;
  name: string;
  city: string;
  status: "draft" | "under_review" | "approved" | "rejected" | "converted";
  requestedBy: string;
  date: string;
}

interface ChangeRequest {
  id: string;
  archiveId: string;
  archiveTitle: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  status: "pending" | "reviewing" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  note?: string;
}

const targetCustomers: TargetCustomer[] = [
  { id: "tc-001", name: "شركة المستقبل للتجارة", city: "الرياض", status: "approved", requestedBy: "عبدالرحمن الدوسري", date: "2026-08-10" },
  { id: "tc-002", name: "مؤسسة النور للمواد الغذائية", city: "جدة", status: "under_review", requestedBy: "أحمد الزهراني", date: "2026-08-12" },
  { id: "tc-003", name: "شركة الأفق للتوزيع", city: "الدمام", status: "draft", requestedBy: "سالم الهاجري", date: "2026-08-14" },
  { id: "tc-004", name: "مؤسسة الريادة للتجزئة", city: "الرياض", status: "rejected", requestedBy: "ماجد الشمري", date: "2026-08-08" },
  { id: "tc-005", name: "شركة البيان للمواد الاستهلاكية", city: "مكة", status: "converted", requestedBy: "ناصر القحطاني", date: "2026-08-01" },
];

const changeRequests: ChangeRequest[] = [
  { id: "cr-001", archiveId: "ar-001", archiveTitle: "مستند استلام GRN-2025-0102", requestedBy: "المحاسب", requestedAt: "2026-08-10T09:00:00", reason: "خطأ في كمية الاستلام - المطلوب 150 وحدة بدلاً من 120", status: "approved", reviewedBy: "خالد العتيبي", reviewedAt: "2026-08-10T15:35:00", note: "تم التدقيق والموافقة" },
  { id: "cr-002", archiveId: "ar-005", archiveTitle: "محضر تسوية صندوق — ناصر القحطاني", requestedBy: "ناصر القحطاني", requestedAt: "2026-08-12T10:00:00", reason: "تعديل مبلغ التسوية ليعكس الحركات الفعلية", status: "reviewing", reviewedBy: "فهد المطيري", reviewedAt: "2026-08-13T14:00:00" },
  { id: "cr-003", archiveId: "ar-003", archiveTitle: "فاتورة مبيعات INV-2026-0835", requestedBy: "أحمد الزهراني", requestedAt: "2026-08-14T08:30:00", reason: "إضافة خصم 5% على المنتجات defects", status: "pending" },
  { id: "cr-004", archiveId: "ar-007", archiveTitle: "خطة سير معتمدة — الرياض الشمالي (أ)", requestedBy: "سالم الهاجري", requestedAt: "2026-08-13T11:00:00", reason: "إضافة 3 عملاء جدد للمسار", status: "rejected", reviewedBy: "ماجد الشمري", reviewedAt: "2026-08-14T09:00:00", note: "لا يمكن التعديل أثناء فترة المتابعة" },
];

const targetStatusLabels: Record<string, string> = {
  draft: "مسودة",
  under_review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  converted: "محوّل لعميل",
};

const targetStatusTones: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  draft: "neutral",
  under_review: "warning",
  approved: "success",
  rejected: "danger",
  converted: "info",
};

const changeStatusLabels: Record<string, string> = {
  pending: "بانتظار المراجعة",
  reviewing: "قيد المراجعة",
  approved: "موافق عليه",
  rejected: "مرفوض",
};

const changeStatusTones: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  reviewing: "info",
  approved: "success",
  rejected: "danger",
};

export function ArchivePage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.archive.list());
  const [activeTab, setActiveTab] = useState("documents");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [detail, setDetail] = useState<ArchiveRecord | null>(null);
  const [changeDetail, setChangeDetail] = useState<ChangeRequest | null>(null);
  const [changeStatusFilter, setChangeStatusFilter] = useState("");
  const [targetStatusFilter, setTargetStatusFilter] = useState("");
  const [localChanges, setLocalChanges] = useState<ChangeRequest[]>(changeRequests);

  const canEdit = can("archive.edit", user?.role ?? "GENERAL_MANAGER");
  const canOverride = can("archive.override", user?.role ?? "GENERAL_MANAGER");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (typeFilter) rows = rows.filter((r) => r.type === typeFilter);
    return rows;
  }, [data, statusFilter, typeFilter]);

  const filteredChanges = useMemo(() => {
    if (!changeStatusFilter) return localChanges;
    return localChanges.filter((cr) => cr.status === changeStatusFilter);
  }, [changeStatusFilter, localChanges]);

  const filteredTargets = useMemo(() => {
    if (!targetStatusFilter) return targetCustomers;
    return targetCustomers.filter((tc) => tc.status === targetStatusFilter);
  }, [targetStatusFilter]);

  const lockedCount = (data ?? []).filter((r) => r.locked).length;
  const totalArchived = (data ?? []).length;
  const documentCount = (data ?? []).filter((r) => r.entityType === "stock_receiving" || r.entityType === "invoice" || r.entityType === "collection" || r.entityType === "stock_count" || r.entityType === "cash_settlement" || r.entityType === "route_plan" || r.entityType === "distributor").length;
  const pendingChanges = changeRequests.filter((cr) => cr.status === "pending" || cr.status === "reviewing").length;

  const docColumns: Column<ArchiveRecord>[] = [
    { key: "title", header: "المستند", sortable: true, sortValue: (r) => r.title, render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FileText size={14} style={{ color: "var(--color-text-faint)", flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 500 }}>{r.title}</div>
          <div className="faint num" style={{ fontSize: "var(--font-size-xs)", direction: "ltr", textAlign: "right" }}>{r.entityId}</div>
        </div>
      </div>
    ) },
    { key: "type", header: "النوع", render: (r) => <Badge tone={typeTone[r.type] ?? "neutral"}>{r.type}</Badge> },
    { key: "version", header: "الإصدار", numeric: true, sortable: true, sortValue: (r) => r.version, render: (r) => <span className="num">v{r.version}</span> },
    { key: "createdAt", header: "تاريخ الإنشاء", sortable: true, sortValue: (r) => r.createdAt, render: (r) => <span className="num">{formatDateShort(r.createdAt)}</span> },
    { key: "updatedAt", header: "آخر تحديث", sortable: true, sortValue: (r) => r.updatedAt, render: (r) => <span className="num">{formatDateShort(r.updatedAt)}</span> },
    { key: "createdBy", header: "بواسطة", sortable: true, sortValue: (r) => r.createdBy, render: (r) => r.createdBy },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "locked",
      header: "قفل",
      render: (r) => (r.locked ? <Badge tone="danger" dot>مقفل — تعديل يتطلب اعتماد</Badge> : <Badge tone="success">مفتوح</Badge>),
    },
  ];

  const targetColumns: Column<TargetCustomer>[] = [
    { key: "name", header: "العميل المستهدف", render: (t) => <b>{t.name}</b> },
    { key: "city", header: "المدينة", render: (t) => t.city },
    { key: "requestedBy", header: "المتقدم", render: (t) => t.requestedBy },
    { key: "date", header: "التاريخ", render: (t) => <span className="num">{formatDateShort(t.date)}</span> },
    { key: "status", header: "الحالة", render: (t) => <Badge tone={targetStatusTones[t.status]}>{targetStatusLabels[t.status]}</Badge> },
  ];

  const changeColumns: Column<ChangeRequest>[] = [
    { key: "archiveTitle", header: "المستند", render: (cr) => (
      <div>
        <div style={{ fontWeight: 500 }}>{cr.archiveTitle}</div>
        <div className="faint num" style={{ fontSize: "var(--font-size-xs)" }}>{cr.id}</div>
      </div>
    ) },
    { key: "requestedBy", header: "مقدم الطلب", render: (cr) => cr.requestedBy },
    { key: "requestedAt", header: "التاريخ", render: (cr) => <span className="num">{formatDateShort(cr.requestedAt.split("T")[0])}</span> },
    { key: "reason", header: "السبب", render: (cr) => <span style={{ fontSize: "var(--font-size-sm)" }}>{cr.reason}</span> },
    { key: "status", header: "الحالة", render: (cr) => <Badge tone={changeStatusTones[cr.status]}>{changeStatusLabels[cr.status]}</Badge> },
  ];

  const versionHistory = detail ? [
    { version: detail.version, date: detail.updatedAt, by: detail.createdBy, reason: detail.reason },
    ...(detail.version > 1 ? [{ version: detail.version - 1, date: detail.createdAt, by: detail.createdBy, reason: "الإصدار الأصلي" }] : []),
    ...(detail.version > 2 ? [{ version: detail.version - 2, date: detail.createdAt, by: "نظام المبيعات", reason: "إنشاء أولي" }] : []),
  ] : [];

  const tabs = [
    {
      key: "documents",
      label: "الوثائق",
      count: filtered.length,
      content: (
        <DataTable
          columns={docColumns}
          rows={filtered}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          onRetry={refetch}
          searchPlaceholder="بحث بالعنوان أو المرجع..."
          searchKeys={(r) => `${r.title} ${r.entityId} ${r.createdBy}`}
          exportFilename="archive"
          pageSize={10}
          emptyTitle="لا توجد مستندات مطابقة"
          onRowClick={(r) => setDetail(r)}
        />
      ),
    },
    {
      key: "targets",
      label: "العملاء المستهدفون",
      count: filteredTargets.length,
      content: (
        <DataTable
          columns={targetColumns}
          rows={filteredTargets}
          rowKey={(t) => t.id}
          searchPlaceholder="بحث بالاسم أو المدينة..."
          searchKeys={(t) => `${t.name} ${t.city} ${t.requestedBy}`}
          exportFilename="target-customers"
          pageSize={10}
          emptyTitle="لا يوجد عملاء مستهدفون"
        />
      ),
    },
    {
      key: "changes",
      label: "طلبات التعديل",
      count: filteredChanges.length,
      content: (
        <DataTable
          columns={changeColumns}
          rows={filteredChanges}
          rowKey={(cr) => cr.id}
          searchPlaceholder="بحث بالمستند أو السبب..."
          searchKeys={(cr) => `${cr.archiveTitle} ${cr.reason} ${cr.requestedBy}`}
          exportFilename="change-requests"
          pageSize={10}
          emptyTitle="لا توجد طلبات تعديل"
          onRowClick={(cr) => setChangeDetail(cr)}
        />
      ),
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الأرشيف" }]}
        title="الأرشيف المركزي"
        description={`${formatNumber(totalArchived)} مستند · ${formatNumber(lockedCount)} مقفلة`}
        actions={
          canEdit ? (
            <Button variant="secondary" icon={<FileText size={15} />} onClick={async () => {
              try {
                await mockApi.archive.create({ title: "مستند جديد", type: "مستند استلام", entityType: "stock_receiving", entityId: `grn-${Date.now()}` });
                refetch();
                toast.success("تم إنشاء المستند الجديد");
              } catch { toast.error("فشل الإنشاء"); }
            }}>
              مستند جديد
            </Button>
          ) : null
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <StatCard label="إجمالي المُؤرشف" value={formatNumber(totalArchived)} hint="مستندات محفوظة" icon={<ArchiveIcon size={14} />} />
          <StatCard label="الوثائق" value={formatNumber(documentCount)} hint="مستندات وأPREFIX" icon={<FileText size={14} />} />
          <StatCard label="العملاء المستهدفون" value={formatNumber(targetCustomers.length)} hint="عملاء محتملون" icon={<Users size={14} />} />
          <StatCard label="طلبات التعديل المعلقة" value={formatNumber(pendingChanges)} hint="تحتاج مراجعة" icon={<Clock size={14} />} />
        </div>

        <FilterBar>
          {activeTab === "documents" && (
            <>
              <Select
                label="الحالة"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="الكل"
                options={[
                  { value: "draft", label: "مسودة" },
                  { value: "submitted", label: "مقدم" },
                  { value: "approved", label: "معتمد" },
                  { value: "locked", label: "مقفل" },
                ]}
              />
              <Select
                label="النوع"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                placeholder="الكل"
                options={typeOptions}
              />
            </>
          )}
          {activeTab === "targets" && (
            <Select
              label="الحالة"
              value={targetStatusFilter}
              onChange={(e) => setTargetStatusFilter(e.target.value)}
              placeholder="الكل"
              options={[
                { value: "draft", label: "مسودة" },
                { value: "under_review", label: "قيد المراجعة" },
                { value: "approved", label: "معتمد" },
                { value: "rejected", label: "مرفوض" },
                { value: "converted", label: "محوّل لعميل" },
              ]}
            />
          )}
          {activeTab === "changes" && (
            <Select
              label="الحالة"
              value={changeStatusFilter}
              onChange={(e) => setChangeStatusFilter(e.target.value)}
              placeholder="الكل"
              options={[
                { value: "pending", label: "بانتظار المراجعة" },
                { value: "reviewing", label: "قيد المراجعة" },
                { value: "approved", label: "موافق عليه" },
                { value: "rejected", label: "مرفوض" },
              ]}
            />
          )}
        </FilterBar>
      </StickyPageHeader>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.title ?? "المستند"}
        footer={<>
          <Button variant="secondary" onClick={() => setDetail(null)}>إغلاق</Button>
          {detail?.locked && canOverride && (
            <Button variant="primary" onClick={() => {
              if (detail) unlockArchive(detail.id, { id: user?.id ?? "system" });
              setDetail(null);
              toast.success("تم فتح قفل المستند", "التعديل مسجل في سجل التدقيق");
            }}>
              فتح القفل لتعديله
            </Button>
          )}
        </>}
      >
        {detail && (
          <div className="stack-sm">
            <div className="flex-between"><span className="muted">المرجع</span><b className="num" style={{ direction: "ltr" }}>{detail.entityId}</b></div>
            <div className="flex-between"><span className="muted">النوع</span><Badge tone={typeTone[detail.type] ?? "neutral"}>{detail.type}</Badge></div>
            <div className="flex-between"><span className="muted">الإصدار</span><b className="num">v{detail.version}</b></div>
            <div className="flex-between"><span className="muted">تاريخ الإنشاء / التحديث</span><span className="num">{formatDateShort(detail.createdAt)} ← {formatDateShort(detail.updatedAt)}</span></div>
            <div className="flex-between"><span className="muted">بواسطة</span><span>{detail.createdBy}</span></div>
            {detail.reason && (
              <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                سبب آخر تعديل: {detail.reason}
              </div>
            )}
            {detail.locked ? (
              <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                هذا المستند مقفل — أي تعديل ينشئ طلب اعتماد بسير رسمي ويُسجل في سجل التدقيق.
              </div>
            ) : (
              <div className="alert alert-success" style={{ marginBottom: 0 }}>
                المستند مفتوح للتعديل مع حفظ الإصدارات السابقة.
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)", marginTop: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-2)" }}>
                <History size={14} />
                <b style={{ fontSize: "var(--font-size-sm)" }}>سجل الإصدارات</b>
              </div>
              <div className="stack-xs">
                {versionHistory.map((v) => (
                  <div key={v.version} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 6, background: v.version === detail.version ? "var(--color-primary-soft)" : "var(--color-surface-alt)", fontSize: "var(--font-size-sm)" }}>
                    <div>
                      <span className="num" style={{ fontWeight: 500 }}>v{v.version}</span>
                      {v.version === detail.version && <span className="num" style={{ color: "var(--color-success)", fontSize: "var(--font-size-xs)", marginRight: 6 }}>الحالي</span>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="faint">{v.by}</div>
                      <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{formatDateShort(v.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={changeDetail !== null}
        onClose={() => setChangeDetail(null)}
        title="تفاصيل طلب التعديل"
        footer={<>
          <Button variant="secondary" onClick={() => setChangeDetail(null)}>إغلاق</Button>
          {changeDetail?.status === "pending" && (
            <Button variant="primary" onClick={() => {
              setLocalChanges((prev) => prev.map((cr) => cr.id === changeDetail.id ? { ...cr, status: "approved" as const, reviewedBy: "المدير", reviewedAt: new Date().toISOString() } : cr));
              setChangeDetail(null);
              toast.success("تم قبول طلب التعديل", "جارٍ تحديث المستند");
            }}>
              اعتماد التعديل
            </Button>
          )}
        </>}
      >
        {changeDetail && (
          <div className="stack-sm">
            <div className="flex-between"><span className="muted">المستند</span><b>{changeDetail.archiveTitle}</b></div>
            <div className="flex-between"><span className="muted">رقم الطلب</span><span className="num">{changeDetail.id}</span></div>
            <div className="flex-between"><span className="muted">مقدم الطلب</span><span>{changeDetail.requestedBy}</span></div>
            <div className="flex-between"><span className="muted">التاريخ</span><span className="num">{formatDateTime(changeDetail.requestedAt)}</span></div>
            <div className="flex-between"><span className="muted">الحالة</span><Badge tone={changeStatusTones[changeDetail.status]}>{changeStatusLabels[changeDetail.status]}</Badge></div>
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--color-surface-alt)", fontSize: "var(--font-size-sm)" }}>
              <div className="muted" style={{ marginBottom: 4 }}>سبب التعديل:</div>
              {changeDetail.reason}
            </div>
            {changeDetail.reviewedBy && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)", marginTop: "var(--space-2)" }}>
                <div className="muted" style={{ marginBottom: 4, fontSize: "var(--font-size-sm)" }}>流水 المراجعة:</div>
                <div className="flex-between"><span className="muted">المراجع</span><span>{changeDetail.reviewedBy}</span></div>
                <div className="flex-between"><span className="muted">تاريخ المراجعة</span><span className="num">{formatDateTime(changeDetail.reviewedAt ?? "")}</span></div>
                {changeDetail.note && <div className="flex-between"><span className="muted">ملاحظة</span><span>{changeDetail.note}</span></div>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}