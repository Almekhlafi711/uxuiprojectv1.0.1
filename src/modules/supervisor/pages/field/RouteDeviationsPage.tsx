import { useState } from "react";
import { AlertTriangle, MapPin } from "lucide-react";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { mockApi } from "@/services/mockApi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/FormControls";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { supervisorPolicies } from "@/config/supervisorPolicies";
import { routeDeviation, userByIdForGps } from "@/mock/gps";
import { toast } from "@/store/ui";
import { formatNumber } from "@/utils/format";

interface DeviationRow {
  userId: string;
  name: string;
  deviationKm: number;
  plannedRouteId: string;
  locationName: string;
  lastCheck: string;
}

export function RouteDeviationsPage() {
  const threshold = supervisorPolicies.exceptionThresholds.routeDeviationThresholdMeters / 1000;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DeviationRow | null>(null);
  const [note, setNote] = useState("");

  const rows: DeviationRow[] = routeDeviation
    .filter((d) => d.status === "deviation" && d.deviationKm > threshold)
    .map((d) => {
      const user = userByIdForGps(d.userId);
      return {
        userId: d.userId,
        name: user?.name ?? d.userId,
        deviationKm: d.deviationKm,
        plannedRouteId: `rp-${d.userId.slice(-3)}`,
        locationName: d.locationName,
        lastCheck: d.lastCheck,
      };
    });

  const columns: Column<DeviationRow>[] = [
    { key: "name", header: "المندوب", priority: "primary", render: (r) => <b>{r.name}</b> },
    { key: "locationName", header: "الموقع", priority: "primary", render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPin size={13} />{r.locationName}</div>
    ) },
    { key: "deviationKm", header: "مقدار الانحراف", numeric: true, sortable: true, sortValue: (r) => r.deviationKm, priority: "primary", render: (r) => <span className="num">{formatNumber(r.deviationKm)} كم</span> },
    { key: "lastCheck", header: "آخر فحص", priority: "secondary", render: (r) => <span className="num">{r.lastCheck}</span> },
    { key: "route", header: "الخطة", priority: "secondary", render: (r) => <Badge tone="neutral">{r.plannedRouteId}</Badge> },
    { key: "actions", header: "", priority: "primary", render: (r) => (
      <Button variant="ghost" size="sm" icon={<AlertTriangle size={14} />} onClick={() => { setSelected(r); setOpen(true); }}>إصدار تنبيه</Button>
    ) },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "المتابعة الميدانية" }, { label: "انحرافات المسار" }]}
        title="تحليل انحراف المسار"
        description={`الحد الأدنى للانحراف: ${threshold} كم — انحرافات تم اكتشافها اليوم`}
        quickActions={<Badge tone="danger" dot>{rows.length} انحراف نشط</Badge>}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="قائمة الانحرافات" subtitle="المناديب الذين خرجوا عن المسار المخطط">
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.userId} searchPlaceholder="بحث بالمندوب أو الموقع..." searchKeys={(r) => `${r.name} ${r.locationName}`} emptyTitle="لا توجد انحرافات اليوم" pageSize={10} />
        </Card>
        <Card title="القاعدة" subtitle="سياسة المتابعة">
          <ul style={{ display: "grid", gap: 6, fontSize: "var(--font-size-sm)", paddingLeft: 20 }}>
            <li>ينحرف المندوب عن المسار المخطط بأكثر من {threshold} كم</li>
            <li>النظام لا يعرض أخطأ للمندوب — بل ينبه المشرف للمراجعة</li>
            <li>المشرف يراجع ويتواصل مع المندوب؛ لا ينفّذ الزيارة نيابةً عنه</li>
          </ul>
        </Card>
      </div>

      <Modal open={open} title="إصدار تنبيه للمندوب" size="md" onClose={() => setOpen(false)}>
        {selected && (
          <div className="stack" style={{ gap: 12 }}>
            <div><b>{selected.name}</b></div>
            <div className="muted">الوقت: {selected.lastCheck}</div>
            <div className="muted">الموقع: {selected.locationName}</div>
            <div className="muted">مقدار الانحراف: {selected.deviationKm} كم عن الخطة {selected.plannedRouteId}</div>
            <Textarea label="ملاحظة التنبيه" value={note} onChange={(e) => setNote(e.target.value)} placeholder="أرسل توجيهًا أو طلب توضيحًا..." />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button variant="primary" size="sm" onClick={async () => { try { await mockApi.team.sendDeviationAlert(selected.userId, note); toast.success(`تم إرسال التنبيه إلى ${selected.name}`); setOpen(false); setNote(""); } catch { toast.error("فشل إرسال التنبيه"); } }}>إرسال</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
