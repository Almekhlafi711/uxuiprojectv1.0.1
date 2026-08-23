import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/FormControls";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { formatDateTime } from "@/utils/format";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import type { AuditLog } from "@/types";

const actionMeta: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  create: { label: "إنشاء", tone: "success" },
  update: { label: "تحديث", tone: "warning" },
  approve: { label: "اعتماد", tone: "success" },
  reject: { label: "رفض", tone: "danger" },
  adjust: { label: "تسوية", tone: "neutral" },
};

export function ActivityPage() {
  const { data: logs, loading } = useData(() => mockApi.audit.list());
  const [actionFilter, setActionFilter] = useState("");

  const filtered = useMemo(() => {
    let rows = logs ?? [];
    if (actionFilter) rows = rows.filter((l) => l.action === actionFilter);
    return [...rows].sort((a, b) => b.at.localeCompare(a.at));
  }, [logs, actionFilter]);

  const columns: Column<AuditLog>[] = [
    { key: "at", header: "الوقت", sortable: true, sortValue: (l) => l.at, priority: "primary", render: (l) => <span className="num">{formatDateTime(l.at)}</span> },
    { key: "actor", header: "المستخدم", sortable: true, sortValue: (l) => l.actor, priority: "primary", render: (l) => <b>{l.actor}</b> },
    { key: "action", header: "الإجراء", priority: "primary", render: (l) => {
      const m = actionMeta[l.action] ?? { label: l.action, tone: "neutral" as const };
      return <Badge tone={m.tone} dot>{m.label}</Badge>;
    } },
    { key: "entity", header: "الكيان", sortable: true, sortValue: (l) => l.entity, priority: "secondary", render: (l) => l.entity },
    { key: "entityId", header: "المعرف", priority: "optional", render: (l) => <span className="num">{l.entityId}</span> },
    { key: "values", header: "التغيير", priority: "secondary", render: (l) => (
      <span style={{ fontSize: "var(--font-size-xs)", direction: "ltr", display: "inline-block" }}>
        {l.oldValue !== "-" && <span style={{ color: "var(--color-danger)" }}>{l.oldValue} → </span>}
        <span style={{ color: "var(--color-success)" }}>{l.newValue}</span>
      </span>
    ) },
    { key: "reason", header: "السبب", priority: "optional", render: (l) => <span style={{ fontSize: "var(--font-size-xs)" }}>{l.reason ?? "—"}</span> },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "سجل النشاط" }]}
        title="سجل نشاط الفريق"
        description={`سجل التدقيق — ${supervisorPolicies.activity.readOnly ? "للقراءة فقط" : "قابل للإدارة"}`}
      />

      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="سجل التدقيق" subtitle="أحداث المستخدمين ضمن نطاق فريقك">
          <FilterBar>
            <Select
              label="الإجراء"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="الكل"
              options={[
                { value: "create", label: "إنشاء" },
                { value: "update", label: "تحديث" },
                { value: "approve", label: "اعتماد" },
                { value: "reject", label: "رفض" },
                { value: "adjust", label: "تسوية" },
              ]}
            />
          </FilterBar>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(l) => l.id}
            loading={loading}
            searchPlaceholder="بحث باسم المستخدم أو الكيان..."
            searchKeys={(l) => `${l.actor} ${l.entity} ${l.entityId}`}
            emptyTitle="لا توجد أحداث مسجلة"
            pageSize={10}
          />
        </Card>
      </div>
    </div>
  );
}
