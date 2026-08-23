import { useState, useEffect, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Drawer } from "@/components/ui/Drawer";
import { DataTable } from "@/components/data-table/DataTable";
import type { Column } from "@/components/data-table/DataTable";
import { organizationService } from "@/services/organization.service";
import type { OrganizationAuditLog } from "@/types";
import { formatDateTime } from "@/utils/format";

const ACTION_LABELS: Record<string, string> = {
  create: "إنشاء", update: "تعديل", assign: "تعيين", reassign: "إعادة تعيين",
  transfer: "نقل", activate: "تفعيل", suspend: "تعليق", delete: "حذف",
};
const ACTION_TONES: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  create: "success", update: "info", assign: "info", reassign: "warning",
  transfer: "warning", activate: "success", suspend: "danger", delete: "danger",
};
const TYPE_LABELS: Record<string, string> = {
  rep: "مندوب", supervisor: "مشرف", territory: "منطقة", team: "فريق", customer: "عميل", branch: "فرع",
};

export function AuditLogPage() {
  const [logs, setLogs] = useState<OrganizationAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<OrganizationAuditLog | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      setLogs(await organizationService.getOrganizationAuditLog({}));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    let list = [...logs];
    if (typeFilter !== "all") list = list.filter(l => l.entityType === typeFilter);
    if (actionFilter !== "all") list = list.filter(l => l.action === actionFilter);
    return list;
  }, [logs, typeFilter, actionFilter]);

  const columns: Column<OrganizationAuditLog>[] = [
    {
      key: "entityType", header: "النوع",
      render: (r) => <Badge tone="neutral">{TYPE_LABELS[r.entityType] ?? r.entityType}</Badge>,
    },
    {
      key: "entityName", header: "الاسم",
      render: (r) => <span className="font-medium text-sm">{r.entityName}</span>,
    },
    {
      key: "action", header: "الإجراء",
      render: (r) => <Badge tone={ACTION_TONES[r.action] ?? "neutral"}>{ACTION_LABELS[r.action] ?? r.action}</Badge>,
    },
    {
      key: "performedByName", header: "بواسطة",
      render: (r) => <span className="text-sm">{r.performedByName}</span>,
    },
    {
      key: "performedAt", header: "التاريخ",
      render: (r) => <span className="text-xs muted">{formatDateTime(r.performedAt)}</span>,
    },
    {
      key: "details", header: "التفاصيل",
      render: (r) => {
        const count = Object.keys(r.details).length;
        return <span className="text-xs muted">{count} تغيير{count !== 1 ? "ات" : ""}</span>;
      },
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
        crumbs={[{ label: "المبيعات والتوزيع", path: "/customers" }, { label: "إدارة الهيكل التوزيعي", path: "/organization/dashboard" }, { label: "سجل التدقيق" }]}
        title="سجل التدقيق التنظيمي"
        description="جميع التغييرات على الهيكل التنظيمي مع القيم القديمة والجديدة"
      />

      <div className="grid-3 mb-6">
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{logs.length}</div>
          <div className="text-sm muted">إجمالي السجلات</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-sales)" }}>{logs.filter(l => l.action === "transfer").length}</div>
          <div className="text-sm muted">عمليات نقل</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-field)" }}>{logs.filter(l => l.action === "assign").length}</div>
          <div className="text-sm muted">عمليات تعيين</div>
        </Card>
      </div>

      <Card>
        <FilterBar>
          <Select label="نوع الكيان" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            options={[{ value: "all", label: "الكل" }, ...Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
          <Select label="الإجراء" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            options={[{ value: "all", label: "الكل" }, ...Object.entries(ACTION_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
        </FilterBar>
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} searchable searchPlaceholder="بحث..."
          searchKeys={(r) => r.entityName + " " + r.performedByName + " " + (ACTION_LABELS[r.action] ?? "")} onRowClick={(r) => setSelectedLog(r)} pageSize={15} />
      </Card>

      <Drawer open={!!selectedLog} onClose={() => setSelectedLog(null)} title="تفاصيل التغيير" width="520px">
        {selectedLog && (
          <div className="stack">
            <div className="form-grid">
              <div className="field-span-6">
                <label className="form-label">النوع</label>
                <Badge tone="neutral">{TYPE_LABELS[selectedLog.entityType]}</Badge>
              </div>
              <div className="field-span-6">
                <label className="form-label">الإجراء</label>
                <Badge tone={ACTION_TONES[selectedLog.action]}>{ACTION_LABELS[selectedLog.action]}</Badge>
              </div>
              <div className="field-span-6">
                <label className="form-label">الاسم</label>
                <div className="font-medium">{selectedLog.entityName}</div>
                <div className="text-xs muted">{selectedLog.entityId}</div>
              </div>
              <div className="field-span-6">
                <label className="form-label">بواسطة</label>
                <div className="font-medium">{selectedLog.performedByName}</div>
                <div className="text-xs muted">{formatDateTime(selectedLog.performedAt)}</div>
              </div>
              {selectedLog.notes && (
                <div className="field-span-12">
                  <label className="form-label">ملاحظات</label>
                  <p className="text-sm">{selectedLog.notes}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">التغييرات</h4>
              <div className="stack-sm">
                {Object.entries(selectedLog.details).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-[var(--color-neutral-100)] last:border-0">
                    <span className="text-sm font-medium">{key}</span>
                    <div className="flex items-center gap-2 text-sm">
                      {val.old !== null && val.old !== undefined ? (
                        <span className="line-through text-[var(--color-danger)]">{String(val.old)}</span>
                      ) : <span className="muted">-</span>}
                      <span className="muted">←</span>
                      {val.new !== null && val.new !== undefined ? (
                        <span className="text-[var(--color-success)]">{String(val.new)}</span>
                      ) : <span className="muted">-</span>}
                    </div>
                  </div>
                ))}
                {Object.keys(selectedLog.details).length === 0 && (
                  <p className="muted text-center py-4">لا توجد تفاصيل تغييرات</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
