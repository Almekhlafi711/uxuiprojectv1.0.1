import { useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileCheck2, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { approvals, pendingApprovals } from "@/mock/approvals";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Checkbox, Textarea } from "@/components/ui/FormControls";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { WorkflowSteps } from "@/components/ui/Progress";
import { Timeline, type TimelineStep } from "@/components/ui/Progress";
import { formatMoney, formatDateShort, formatNumber } from "@/utils/format";
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

type TabType = "all" | "route_plan" | "target" | "leave" | "discount" | "credit_override" | "custody" | "archive_change";

const TABS: { key: TabType; label: string; filter?: string }[] = [
  { key: "all", label: "الكل" },
  { key: "route_plan", label: "خطط السير", filter: "route_plan" },
  { key: "target", label: "الأهداف", filter: "target" },
  { key: "leave", label: "الإجازات", filter: "leave" },
  { key: "discount", label: "الخصومات", filter: "discount" },
  { key: "credit_override", label: "الائتمان", filter: "credit_override" },
  { key: "custody", label: "الأصول", filter: "custody" },
  { key: "archive_change", label: "الأرشيف", filter: "archive_change" },
];

export function ApprovalsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useData(() => mockApi.approvals.list());
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailModal, setDetailModal] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (typeFilter) rows = rows.filter((a) => a.type === typeFilter);
    if (statusFilter) rows = rows.filter((a) => a.status === statusFilter);
    return rows;
  }, [data, typeFilter, statusFilter]);

  const tabFiltered = useMemo(() => {
    if (activeTab === "all") return filtered;
    const tab = TABS.find((t) => t.key === activeTab);
    if (tab?.filter) return filtered.filter((a) => a.type === tab.filter);
    return filtered;
  }, [filtered, activeTab]);

  const pending = pendingApprovals().length;
  const awaitingMe = (data ?? []).filter((a) => {
    const step = a.steps[a.currentLevel - 1];
    return step && step.status === "pending" && step.role === user?.role;
  }).length;

  const tabCounts = useMemo(() => {
    const counts: Record<TabType, number> = { all: 0, route_plan: 0, target: 0, leave: 0, discount: 0, credit_override: 0, custody: 0, archive_change: 0 };
    filtered.forEach((a) => {
      counts.all++;
      if (a.type in counts) counts[a.type as TabType]++;
    });
    return counts;
  }, [filtered]);

  const avgProcessingDays = useMemo(() => {
    const completed = (data ?? []).filter((a) => a.status === "approved" || a.status === "rejected");
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, a) => {
      const lastStep = a.steps[a.steps.length - 1];
      if (lastStep?.at) {
        const diff = new Date(lastStep.at).getTime() - new Date(a.date).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }
      return sum + 1;
    }, 0);
    return Math.round(total / completed.length);
  }, [data]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === tabFiltered.length) return new Set();
      return new Set(tabFiltered.map((a) => a.id));
    });
  }, [tabFiltered]);

  const handleBulkAction = useCallback(() => {
    setBulkAction(null);
    setSelectedIds(new Set());
    refetch();
  }, [refetch]);

  const buildWorkflowSteps = (request: ApprovalRequest) => {
    return request.steps.map((step) => ({
      label: roleLabel[step.role] ?? step.role,
      status: step.status === "approved" ? "done" as const
        : step.status === "rejected" ? "failed" as const
        : step.level === request.currentLevel ? "current" as const
        : "pending" as const,
      meta: step.by && step.at ? `${step.by} — ${formatDateShort(step.at)}` : undefined,
      note: step.note,
    }));
  };

  const columns: Column<ApprovalRequest>[] = [
    {
      key: "select",
      header: "",
      priority: "primary",
      render: (r) => (
        <Checkbox
          label=""
          checked={selectedIds.has(r.id)}
          onChange={() => toggleSelect(r.id)}
        />
      ),
    },
    {
      key: "number",
      header: "الطلب",
      sortable: true,
      sortValue: (r) => r.number,
      priority: "primary",
      render: (r) => (
        <Link to={`/approvals/${r.id}`} style={{ fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
          {r.number}
        </Link>
      ),
    },
    { key: "title", header: "الموضوع", sortable: true, sortValue: (r) => r.title, priority: "primary", render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.title}</div>
        <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.description.slice(0, 60)}...</div>
      </div>
    ) },
    { key: "type", header: "النوع", priority: "secondary", render: (r) => <Badge tone="neutral">{typeLabels[r.type] ?? r.type}</Badge> },
    { key: "by", header: "مقدم الطلب", sortable: true, sortValue: (r) => r.requestedBy, priority: "secondary", render: (r) => r.requestedBy },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "amount", header: "المبلغ", numeric: true, sortable: true, sortValue: (r) => r.amount ?? 0, priority: "secondary", render: (r) => (r.amount ? <span className="num" style={{ fontWeight: 600 }}>{formatMoney(r.amount)}</span> : <span className="faint">—</span>) },
    {
      key: "progress",
      header: "مرحلة الاعتماد",
      priority: "primary",
      render: (r) => <span className="num" style={{ fontSize: "var(--font-size-sm)" }}>{r.currentLevel} / {r.totalLevels} <span className="faint">({roleLabel[r.steps[r.currentLevel - 1]?.role ?? "SUPERVISOR"]})</span></span>,
    },
    { key: "priority", header: "الأولوية", priority: "primary", render: (r) => (r.priority === "high" ? <Badge tone="danger" dot>عالية</Badge> : r.priority === "low" ? <Badge tone="neutral">منخفضة</Badge> : <Badge tone="info">عادية</Badge>) },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الاعتمادات" }]}
        title="طلبات الاعتماد"
        description="سير الاعتماد متعدد المستويات حسب نوع الطلب وصلاحيات الدور"
      >

      <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
        <StatCard label="معلقة حالياً" value={formatNumber(pending)} hint="كل الطلبات المفتوحة" icon={<FileCheck2 size={14} />} />
        <StatCard label="بانتظار مراجعتي" value={formatNumber(awaitingMe)} hint="بمستوى دورك الحالي" icon={<Clock size={14} />} />
        <StatCard label="معتمدة" value={formatNumber((data ?? []).filter((a) => a.status === "approved").length)} hint="إجمالي الطلبات" icon={<CheckCircle2 size={14} />} />
        <StatCard label="مرفوضة" value={formatNumber((data ?? []).filter((a) => a.status === "rejected").length)} hint="تحتاج إعادة تقديم" icon={<XCircle size={14} />} />
      </div>

      <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
        <StatCard label="متوسط معالجة" value={`${avgProcessingDays} يوم`} hint="للمعالجة من التقديم للقرار" icon={<Clock size={14} />} />
        <StatCard label="خصومات" value={formatNumber(tabCounts.discount)} hint="طلبات خصومات" icon={<AlertTriangle size={14} />} />
        <StatCard label="ائتمان" value={formatNumber(tabCounts.credit_override)} hint="طلبات ائتمان" icon={<AlertTriangle size={14} />} />
        <StatCard label="أصول" value={formatNumber(tabCounts.custody)} hint="طلبات أصول" icon={<AlertTriangle size={14} />} />
      </div>

      <Tabs
        tabs={TABS.map((t) => ({
          key: t.key,
          label: t.label,
          count: tabCounts[t.key],
          content: null,
        }))}
        active={activeTab}
        onChange={(key) => setActiveTab(key as TabType)}
      />

      {selectedIds.size > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-3) var(--space-4)",
          background: "var(--color-primary-subtle)",
          borderRadius: "var(--radius-md)",
          marginBottom: "var(--space-4)",
        }}>
          <span style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>
            {selectedIds.size} طلب محدد
          </span>
          <Button
            variant="primary"
            size="sm"
            icon={<CheckCircle2 size={14} />}
            onClick={() => setBulkAction("approve")}
          >
            اعتماد الكل
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<XCircle size={14} />}
            onClick={() => setBulkAction("reject")}
          >
            رفض الكل
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            إلغاء التحديد
          </Button>
        </div>
      )}

      <FilterBar>
        <Select
          label="النوع"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          placeholder="كل الأنواع"
          options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Select
          label="الحالة"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="الكل"
          options={[
            { value: "pending", label: "جديد" },
            { value: "submitted", label: "مقدم" },
            { value: "under_review", label: "قيد المراجعة" },
            { value: "approved", label: "معتمد" },
            { value: "rejected", label: "مرفوض" },
          ]}
        />
      </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={tabFiltered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث برقم الطلب أو الموضوع..."
        searchKeys={(r) => `${r.number} ${r.title} ${r.requestedBy}`}
        exportFilename="approvals"
        pageSize={12}
        emptyTitle="لا توجد طلبات اعتماد مطابقة"
        onRowClick={(r) => setDetailModal(r)}
      />

      <Modal
        open={!!detailModal}
        onClose={() => { setDetailModal(null); setRejectReason(""); }}
        title={detailModal ? `طلب اعتماد ${detailModal.number}` : ""}
        size="lg"
        footer={
          detailModal && detailModal.status !== "approved" && detailModal.status !== "rejected" ? (
            <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
              <Button variant="danger" icon={<XCircle size={14} />} onClick={() => setBulkAction("reject")}>
                رفض
              </Button>
              <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={() => setBulkAction("approve")}>
                اعتماد
              </Button>
            </div>
          ) : undefined
        }
      >
        {detailModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>الموضوع</div>
                <div style={{ fontWeight: 600 }}>{detailModal.title}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>النوع</div>
                <Badge tone="neutral">{typeLabels[detailModal.type] ?? detailModal.type}</Badge>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>الحالة</div>
                <StatusBadge status={detailModal.status} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>مقدم الطلب</div>
                <div>{detailModal.requestedBy}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>التاريخ</div>
                <div className="num">{formatDateShort(detailModal.date)}</div>
              </div>
              {detailModal.amount && (
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>المبلغ</div>
                  <div className="num" style={{ fontWeight: 600 }}>{formatMoney(detailModal.amount)}</div>
                </div>
              )}
            </div>

            <div>
              <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginBottom: 4 }}>الوصف</div>
              <div style={{ fontSize: "var(--font-size-sm)", lineHeight: 1.6 }}>{detailModal.description}</div>
            </div>

            <Card title="مراحل الاعتماد">
              <WorkflowSteps steps={buildWorkflowSteps(detailModal)} />
            </Card>

            {detailModal.steps.some((s) => s.by) && (
              <Card title="سجل المراجعة">
                <Timeline steps={buildWorkflowSteps(detailModal).filter((s) => s.status === "done" || s.status === "failed")} />
              </Card>
            )}

            {(bulkAction === "approve" || bulkAction === "reject") && (
              <Card title={bulkAction === "approve" ? "approval理由" : "رفض الطلب"}>
                <Textarea
                  label={bulkAction === "approve" ? "ملاحظات الاعتماد" : "سبب الرفض"}
                  placeholder={bulkAction === "approve" ? "أدخل ملاحظات (اختياري)..." : "أدخل سبب الرفض..."}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required={bulkAction === "reject"}
                />
                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                  <Button variant="secondary" onClick={() => { setBulkAction(null); setRejectReason(""); }}>
                    إلغاء
                  </Button>
                  <Button
                    variant={bulkAction === "approve" ? "primary" : "danger-solid"}
                    onClick={handleBulkAction}
                    disabled={bulkAction === "reject" && !rejectReason.trim()}
                  >
                    {bulkAction === "approve" ? "تأكيد الاعتماد" : "تأكيد الرفض"}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!bulkAction}
        onClose={() => { setBulkAction(null); setRejectReason(""); }}
        title={bulkAction === "approve" ? "اعتماد مجمع" : "رفض مجمع"}
        size="sm"
        footer={
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button variant="secondary" onClick={() => { setBulkAction(null); setRejectReason(""); }}>
              إلغاء
            </Button>
            <Button
              variant={bulkAction === "approve" ? "primary" : "danger-solid"}
              onClick={handleBulkAction}
              disabled={bulkAction === "reject" && !rejectReason.trim()}
            >
              {bulkAction === "approve" ? `اعتماد ${selectedIds.size} طلب` : `رفض ${selectedIds.size} طلب`}
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div className="faint" style={{ fontSize: "var(--font-size-sm)" }}>
            سيتم {bulkAction === "approve" ? "اعتماد" : "رفض"} {selectedIds.size} طلب اعتماد.
          </div>
          {bulkAction === "reject" && (
            <Textarea
              label="سبب الرفض"
              placeholder="أدخل سبب الرفض..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
