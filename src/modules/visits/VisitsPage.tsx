import { useMemo, useState } from "react";
import { Plus, MapPin } from "lucide-react";
import { visits, visitResultLabels } from "@/mock/visits";
import { customers } from "@/mock/customers";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MockMap } from "@/components/maps/MockMap";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatDateShort, formatNumber } from "@/utils/format";
import { can } from "@/config/permissions";
import type { Visit } from "@/types";

export function VisitsPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.visits.list());
  const [resultFilter, setResultFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mapMode, setMapMode] = useState(false);
  const [open, setOpen] = useState(false);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";
  const repName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const isRep = user?.role === "REPRESENTATIVE";
  const canCreate = can("visits.create", user?.role ?? "REPRESENTATIVE");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (isRep) rows = rows.filter((v) => v.repId === user.id);
    if (resultFilter) rows = rows.filter((v) => v.result === resultFilter);
    if (dateFrom) rows = rows.filter((v) => v.date >= dateFrom);
    if (dateTo) rows = rows.filter((v) => v.date <= dateTo);
    return rows;
  }, [data, isRep, user?.id, resultFilter, dateFrom, dateTo]);

  const completedCount = filtered.filter((v) => v.result === "completed" || v.result === "visited").length;
  const successRate = filtered.length ? Math.round((completedCount / filtered.length) * 100) : 0;

  const columns: Column<Visit>[] = [
    { key: "customer", header: "العميل", sortable: true, sortValue: (r) => customerName(r.customerId), priority: "primary", render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{customerName(r.customerId)}</div>
        {!r.planned && <Badge tone="info">زيارة إضافية</Badge>}
      </div>
    ) },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => repName(r.repId), priority: "secondary", render: (r) => repName(r.repId) },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    {
      key: "time",
      header: "الوقت",
      priority: "secondary",
      render: (r) => (
        <span className="num" style={{ whiteSpace: "nowrap", fontSize: "var(--font-size-sm)" }}>
          {r.checkInAt ? `${r.checkInAt} → ${r.checkOutAt ?? "..."}` : "—"}
        </span>
      ),
    },
    { key: "result", header: "النتيجة", priority: "primary", render: (r) => {
      const tone = r.result === "completed" || r.result === "visited" ? "success" : r.result === "not_found" ? "warning" : "danger";
      return <Badge tone={tone} dot>{visitResultLabels[r.result]}</Badge>;
    } },
    { key: "outcome", header: "النتيجة التجارية", sortable: true, sortValue: (r) => r.outcome ?? "", priority: "optional", render: (r) => <span style={{ fontSize: "var(--font-size-sm)" }}>{r.outcome ?? "—"}</span> },
    {
      key: "geo",
      header: "الموقع",
      priority: "optional",
      render: (r) => (
        <span className="num" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
          {(r.distanceFromRoute ?? 0) > 0.5 ? `انحراف ${formatNumber(r.distanceFromRoute ?? 0)} كم` : "ضمن المسار"}
        </span>
      ),
    },
  ];

  const mapMarkers = filtered
    .filter((v) => v.lat && v.lng)
    .map((v) => ({
      id: v.id,
      x: Math.min(95, Math.max(5, ((v.lng - 39) / 7.8) * 100)),
      y: Math.min(95, Math.max(5, ((24.95 - v.lat) / 3.45) * 100)),
      label: customerName(v.customerId),
      kind: "customer" as const,
      sublabel: visitResultLabels[v.result],
    }));

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الزيارات الميدانية" }]}
        title="الزيارات الميدانية"
        description={`${filtered.length} زيارة · نسبة الإنجاز ${successRate}%`}
        actions={
          <>
            <Button variant="secondary" icon={<MapPin size={15} />} onClick={() => setMapMode((m) => !m)}>
              {mapMode ? "عرض الجدول" : "عرض الخريطة"}
            </Button>
            {canCreate && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>تسجيل زيارة</Button>
            )}
          </>
        }
      >
        <FilterBar>
          <Select
            label="النتيجة"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            placeholder="الكل"
            options={Object.entries(visitResultLabels).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Input label="من تاريخ" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="إلى تاريخ" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </FilterBar>
      </StickyPageHeader>

      {mapMode ? (
        <Card title="خريطة الزيارات">
          <MockMap markers={mapMarkers} height={420} />
          <div className="muted" style={{ fontSize: "var(--font-size-xs)", marginTop: 8 }}>
            خريطة توضيحية (غير حقيقية) — تعرض مواقع الزيارات حسب بيانات GPS التجريبية.
          </div>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          onRetry={refetch}
          searchPlaceholder="بحث بالعميل أو المندوب..."
          searchKeys={(r) => `${customerName(r.customerId)} ${repName(r.repId)}`}
          exportFilename="visits"
          pageSize={12}
          emptyTitle="لا توجد زيارات مطابقة"
          initialSort={{ key: "date", dir: "desc" }}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="تسجيل زيارة"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => { toast.success("تم تسجيل الزيارة — تُضاف لسجل اليوم"); setOpen(false); }}>تسجيل الزيارة</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-12">
            <Select label="العميل" placeholder="اختر عميلاً من منطقتك" options={customers.filter((c) => c.status === "active").map((c) => ({ value: c.id, label: c.name }))} />
          </div>
          <div className="field-span-6"><Input label="وقت الدخول" type="time" /></div>
          <div className="field-span-6"><Input label="وقت الخروج" type="time" /></div>
          <div className="field-span-6">
            <Select label="النتيجة" defaultValue="completed" options={Object.entries(visitResultLabels).map(([v, l]) => ({ value: v, label: l }))} />
          </div>
          <div className="field-span-6">
            <Select label="النتيجة التجارية" placeholder="بيع / تحصيل / عرض" options={[
              { value: "sale", label: "بيع" },
              { value: "collection", label: "تحصيل" },
              { value: "quote", label: "عرض أسعار" },
              { value: "none", label: "بدون نتيجة" },
            ]} />
          </div>
        </div>
      </Modal>
    </div>
  );
}