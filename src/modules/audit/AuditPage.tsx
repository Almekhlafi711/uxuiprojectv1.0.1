import { useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/utils/status";
import { Input, Select } from "@/components/ui/FormControls";
import { formatDateTime } from "@/utils/format";
import { auditLogs } from "@/mock/admin";
import type { AuditLog } from "@/types";

const actionMeta: Record<string, { label: string; tone: BadgeTone }> = {
  approve: { label: "اعتماد", tone: "success" },
  reject: { label: "رفض", tone: "danger" },
  create: { label: "إنشاء", tone: "info" },
  update: { label: "تعديل", tone: "neutral" },
  adjust: { label: "تسوية", tone: "warning" },
};

export function AuditPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => Promise.resolve(auditLogs));
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const rows = useMemo(() => {
    let all = data ?? [];
    if (entityFilter) all = all.filter((l) => l.entity.toLowerCase().includes(entityFilter.toLowerCase()));
    if (actionFilter) all = all.filter((l) => l.action === actionFilter);
    return [...all].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [data, entityFilter, actionFilter]);

  const columns: Column<AuditLog>[] = [
    { key: "at", header: "التاريخ", sortable: true, sortValue: (l) => l.at, render: (l) => <span className="num">{formatDateTime(l.at)}</span> },
    { key: "actor", header: "المستخدم", render: (l) => l.actor },
    {
      key: "action",
      header: "الإجراء",
      render: (l) => {
        const m = actionMeta[l.action] ?? { label: l.action, tone: "neutral" as BadgeTone };
        return <Badge tone={m.tone}>{m.label}</Badge>;
      },
    },
    { key: "entity", header: "الكيان", render: (l) => <code>{l.entity}</code> },
    { key: "entityId", header: "المعرف", render: (l) => <span className="num">{l.entityId}</span> },
    { key: "oldValue", header: "القيمة السابقة", render: (l) => <span className="faint">{l.oldValue ?? "—"}</span> },
    { key: "newValue", header: "القيمة الجديدة", render: (l) => <span className="faint">{l.newValue ?? "—"}</span> },
    { key: "reason", header: "السبب", render: (l) => l.reason ?? "—" },
  ];

  return (
    <div className="page">
      <StickyPageHeader crumbs={[{ label: "الرئيسية", path: "/" }, { label: "سجل التدقيق" }]} title="سجل التدقيق والمراجعة" description="تدقيق كل التغييرات الحساسة (3.23 / 3.34)" />

      <Card>
        <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <Input placeholder="بحث بالكيان (مثل Customer)" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} />
          <Select
            label=""
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={[
              { value: "", label: "كل الإجراءات" },
              { value: "approve", label: "اعتماد" },
              { value: "reject", label: "رفض" },
              { value: "create", label: "إنشاء" },
              { value: "update", label: "تعديل" },
              { value: "adjust", label: "تسوية" },
            ]}
          />
        </div>
        <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={refetch} rowKey={(l) => l.id} />
      </Card>
    </div>
  );
}
