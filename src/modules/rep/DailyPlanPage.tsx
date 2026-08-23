import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlayCircle, Flag, Car, Navigation, Wifi, WifiOff,
  CheckCircle2, XCircle, ClipboardEdit, CircleDot,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { customers } from "@/mock/customers";
import { users } from "@/mock/users";
import { todayVisits } from "@/mock/visits";
import { dailyPlanByRepDate, activeTripByRep } from "@/mock/repField";
import { stockByRep } from "@/mock/inventory";
import { cashBoxes } from "@/mock/cash";
import { policyConfig } from "@/mock/policy";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card, SectionBlock } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { MockMap, type MapMarker, type MapRouteLine } from "@/components/maps/MockMap";
import { Input, Textarea, Select } from "@/components/ui/FormControls";
import { toast } from "@/store/ui";
import { mockApi } from "@/services/mockApi";
import { formatMoney, formatQty, formatTime } from "@/utils/format";

const TODAY = "2026-08-14";

export function DailyPlanPage() {
  const { user } = useAuthStore();
  const me = user!;
  const navigate = useNavigate();

  const plan = dailyPlanByRepDate(me.id, TODAY);
  const baseTrip = activeTripByRep(me.id);
  const [tripOverride, setTripOverride] = useState<"ended" | null>(null);
  const [planOverride, setPlanOverride] = useState<"submitted" | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeNote, setChangeNote] = useState("");

  const trip = tripOverride === "ended" && baseTrip ? { ...baseTrip, status: "completed" as const } : baseTrip;
  const effectivePlan = planOverride === "submitted" && plan ? { ...plan, status: "submitted" as const } : plan;

  const myVan = stockByRep(me.id);
  const myBox = cashBoxes.find((b) => b.ownerId === me.id);
  const myVisitsToday = todayVisits().filter((v) => v.repId === me.id);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";
  const customerType = (id: string) => {
    const c = customers.find((x) => x.id === id);
    return c ? c.type : "—";
  };
  const typeLabel: Record<string, string> = {
    retailer: "تموينات", wholesaler: "موزع جملة", supermarket: "سوبر ماركت", restaurant: "مطعم/كافيه", kiosk: "كشك",
  };

  const checks = useMemo(() => {
    const routeApproved = !!effectivePlan && effectivePlan.status === "approved";
    const gpsOn = true;
    const vanLoaded = myVan.length > 0;
    const boxReady = !!myBox;
    return { routeApproved, gpsOn, vanLoaded, boxReady };
  }, [effectivePlan, myVan, myBox]);

  const allChecksPass = Object.values(checks).every(Boolean);
  const salesToday = myVisitsToday.filter((v) => v.result === "completed").length;
  const planDone = effectivePlan?.entries.filter((e) => e.status !== "pending").length ?? 0;
  const visitPct = effectivePlan ? Math.round((planDone / Math.max(1, effectivePlan.entries.length)) * 100) : 0;

  const mapMarkers = useMemo<MapMarker[]>(() => {
    const points = (effectivePlan?.entries ?? [])
      .map((e) => customers.find((c) => c.id === e.customerId))
      .filter((c): c is NonNullable<typeof c> => !!c && !!c.lat && !!c.lng);
    if (points.length === 0) return [];
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 0.05;
    const px = (lng: number) => ((lng - (minLng - pad)) / (maxLng - minLng + pad * 2)) * 100;
    const py = (lat: number) => ((maxLat + pad - lat) / (maxLat - minLat + pad * 2)) * 100;
    const markers = points.map<MapMarker>((p) => ({
      id: p.id,
      x: +px(p.lng).toFixed(1),
      y: +py(p.lat).toFixed(1),
      label: p.name,
      kind: "customer",
    }));
    markers.push({ id: "me", x: 50, y: 82, label: me.name, kind: "rep", sublabel: "موقعي الحالي" });
    return markers;
  }, [effectivePlan, me.name]);

  const mapRoutes = useMemo<MapRouteLine[]>(() => {
    const pts = (effectivePlan?.entries ?? [])
      .map((e) => customers.find((c) => c.id === e.customerId))
      .filter((c): c is NonNullable<typeof c> => !!c && !!c.lat && !!c.lng);
    if (pts.length < 2) return [];
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 0.05;
    const px = (lng: number) => ((lng - (minLng - pad)) / (maxLng - minLng + pad * 2)) * 100;
    const py = (lat: number) => ((maxLat + pad - lat) / (maxLat - minLat + pad * 2)) * 100;
    return pts.slice(0, -1).map((p, i) => ({
      id: `r-${i}`,
      x1: +px(p.lng).toFixed(1),
      y1: +py(p.lat).toFixed(1),
      x2: +px(pts[i + 1].lng).toFixed(1),
      y2: +py(pts[i + 1].lat).toFixed(1),
    }));
  }, [effectivePlan]);

  const [tripLoading, setTripLoading] = useState(false);

  const startTrip = async () => {
    if (!effectivePlan) return;
    setTripLoading(true);
    try {
      await mockApi.rep.startTrip(effectivePlan.id);
      toast.success("بدأت الجولة الميدانية", "تم تسجيل انطلاق الجولة وموقع البداية");
      setStartOpen(false);
    } catch {
      toast.error("فشل بدء الجولة", "حدث خطأ أثناء محاولة بدء الجولة");
    } finally {
      setTripLoading(false);
    }
  };

  const endTrip = async () => {
    if (!baseTrip) return;
    setTripLoading(true);
    try {
      await mockApi.rep.endTrip(baseTrip.id);
      toast.success("تم إنهاء الجولة", "سيتم تثبيت نقطة النهاية والمزامنة");
      setTripOverride("ended");
      setEndOpen(false);
    } catch {
      toast.error("فشل إنهاء الجولة", "حدث خطأ أثناء محاولة إنهاء الجولة");
    } finally {
      setTripLoading(false);
    }
  };

  const sendChange = () => {
    toast.info("أُرسل طلب تعديل الخطة للمشرف", changeNote || "بانتظار المراجعة");
    setPlanOverride("submitted");
    setChangeOpen(false);
  };

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "خطة اليوم والجولة" }]}
        title="خطة اليوم والجولة"
        description="الزيارات المخطط لها اليوم، الجولة الميدانية وتتبع GPS"
        actions={
          trip && trip.status === "in_progress" ? (
            <Button variant="danger-solid" icon={<Flag size={15} />} onClick={() => setEndOpen(true)}>إنهاء الجولة</Button>
          ) : (
            <Button variant="primary" icon={<PlayCircle size={15} />} onClick={() => setStartOpen(true)}>بدء الجولة</Button>
          )
        }
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>حالة الجولة</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {trip && trip.status === "in_progress" ? (
                  <><span className="pulse-dot" /><Badge tone="success" dot>{trip.number}</Badge></>
                ) : trip ? (
                  <Badge tone="neutral" dot>منتهية</Badge>
                ) : (
                  <Badge tone="warning" dot>لم تبدأ بعد</Badge>
                )}
              </div>
              {trip?.startTime && <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>بداية {formatTime(trip.startTime)} · مسافة {formatQty(trip.distanceKm ?? 0)} كم</div>}
            </div>
          </Card>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تتبع GPS</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                {trip?.gpsEnabled ? <Wifi size={15} style={{ color: "var(--color-success)" }} /> : <WifiOff size={15} style={{ color: "var(--color-danger)" }} />}
                <b style={{ fontSize: "var(--font-size-sm)" }}>{trip?.gpsEnabled ? "مفعل" : "معطل"}</b>
              </div>
              <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>السياسة: مطلوب أثناء الجولة النشطة</div>
            </div>
          </Card>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المركبة</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Car size={15} />
                <b style={{ fontSize: "var(--font-size-sm)" }}>{trip?.vehicle ? `${trip.vehicle.model} · ${trip.vehicle.plate}` : "غير محددة (اختياري)"}</b>
              </div>
              <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>سياسة تعيين المركبة: {policyConfig.features ? "اختياري" : "غير مطلوب"}</div>
            </div>
          </Card>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تقدم خطة اليوم</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <CircleDot size={15} />
                <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{planDone} / {effectivePlan?.entries.length ?? 0} زيارة</b>
              </div>
              <Progress value={visitPct} tone={visitPct >= 100 ? "success" : visitPct >= 50 ? "default" : "warning"} />
            </div>
          </Card>
        </div>
      </StickyPageHeader>

      <div className="grid-2-1">
        <div className="stack">
          <SectionBlock
            title="زيارات اليوم"
            actions={effectivePlan?.status === "approved" ? (
              <Button variant="ghost" size="sm" icon={<ClipboardEdit size={14} />} onClick={() => setChangeOpen(true)}>طلب تعديل الخطة</Button>
            ) : undefined}
          >
            <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>#</th>
                    <th>المنشأة / العميل</th>
                    <th>النشاط</th>
                    <th>الوقت</th>
                    <th>الحالة</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(effectivePlan?.entries ?? []).map((e) => {
                    const visited = myVisitsToday.find((v) => v.customerId === e.customerId);
                    return (
                      <tr key={e.customerId}>
                        <td className="num">{e.order}</td>
                        <td>
                          <b style={{ fontSize: "var(--font-size-sm)" }}>{customerName(e.customerId)}</b>
                          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{typeLabel[customerType(e.customerId)]}</div>
                        </td>
                        <td><Badge tone={e.status === "completed" ? "success" : e.status === "not_found" ? "warning" : "neutral"} dot>{typeLabel[customerType(e.customerId)]}</Badge></td>
                        <td className="num">{formatTime(e.plannedTime)}</td>
                        <td>
                          {e.status === "completed" ? <Badge tone="success" dot>منفذة</Badge>
                            : e.status === "not_found" ? <Badge tone="warning" dot>المحل مغلق</Badge>
                            : <Badge tone="neutral" dot>مخطط لها</Badge>}
                        </td>
                        <td>
                          <Button size="sm" variant={e.status === "completed" ? "ghost" : "primary"} icon={<Navigation size={13} />}
                            onClick={() => navigate(`/rep/visit/${e.customerId}`)}>
                            {visited?.result === "completed" ? "الملخص" : "زيارة"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {effectivePlan && effectivePlan.entries.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-faint)" }}>لا توجد زيارة مخطط لها اليوم</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionBlock>

          <Card title="أهداف اليوم" subtitle={`الخطة من مصدر: ${effectivePlan?.source === "route" ? "خطة سير معتمدة" : "يدوي"}`}>
            <div className="card-body stack-sm">
              <div>
                <div className="flex-between mb-2">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مبيعات اليوم</span>
                  <span className="num" style={{ fontWeight: 600 }}>{formatMoney(effectivePlan?.salesTarget ?? 0)}</span>
                </div>
                <Progress value={100} tone="default" label="هدف اليوم" />
              </div>
              <div>
                <div className="flex-between mb-2">
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تحصيل اليوم</span>
                  <span className="num" style={{ fontWeight: 600 }}>{formatMoney(effectivePlan?.collectionTarget ?? 0)}</span>
                </div>
                <Progress value={100} tone="success" label="هدف اليوم" />
              </div>
              <div className="flex-between" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 8 }}>
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الزيارات المنجزة</span>
                <b className="num" style={{ fontSize: "var(--font-size-sm)" }}>{salesToday} زيارة مكتملة</b>
              </div>
            </div>
          </Card>
        </div>

        <div className="stack">
          <SectionBlock title="الجولة على الخريطة">
            {mapMarkers.length > 0 ? (
              <MockMap
                markers={mapMarkers}
                routes={mapRoutes}
                legend={[
                  { label: "عميل/منشأة", color: "var(--color-primary)" },
                  { label: "موقعي", color: "var(--color-success)" },
                ]}
                height={360}
              />
            ) : (
              <div className="card-body">
                <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد بيانات للموقع بعد.</div>
              </div>
            )}
          </SectionBlock>

          <SectionBlock title="فريق العمل">
            <div className="card-body">
              <div className="flex-between">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المشرف</span>
                <b style={{ fontSize: "var(--font-size-sm)" }}>{users.find((u) => u.id === me.supervisorId)?.name ?? "—"}</b>
              </div>
              <div className="flex-between">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الخطة</span>
                <StatusBadge status={effectivePlan?.status ?? "pending"} />
              </div>
            </div>
          </SectionBlock>
        </div>
      </div>

      <Modal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        title="بدء الجولة الميدانية"
        footer={<>
          <Button variant="secondary" onClick={() => setStartOpen(false)}>إلغاء</Button>
          <Button variant="primary" icon={<PlayCircle size={15} />} disabled={!allChecksPass || tripLoading} loading={tripLoading} onClick={startTrip}>بدء الجولة</Button>
        </>}
      >
        <div className="stack-sm">
          <div className="form-grid">
            <div className="field-span-12">
              <Select
                label="المركبة (اختياري)"
                placeholder="بدون مركبة (اختياري)"
                defaultValue={baseTrip?.vehicle?.id ?? ""}
                options={[
                  { value: "vh-001", label: "تويوتا هيلوكس 2024 — أ ب ج 1234" },
                  { value: "vh-002", label: "نيسان باترول 2023 — د ه و 5678" },
                ]}
                helper="المركبة اختيارية حسب السياسة"
              />
            </div>
            <div className="field-span-12">
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <b>فحوصات ما قبل الانطلاق:</b>
                <div className="stack-sm" style={{ marginTop: 8 }}>
                  <div className="flex-between">
                    <span style={{ fontSize: "var(--font-size-sm)" }}>خطة سير معتمدة</span>
                    {checks.routeApproved ? <CheckCircle2 size={16} style={{ color: "var(--color-success)" }} /> : <XCircle size={16} style={{ color: "var(--color-danger)" }} />}
                  </div>
                  <div className="flex-between">
                    <span style={{ fontSize: "var(--font-size-sm)" }}>تفعيل تتبع GPS</span>
                    {checks.gpsOn ? <CheckCircle2 size={16} style={{ color: "var(--color-success)" }} /> : <XCircle size={16} style={{ color: "var(--color-danger)" }} />}
                  </div>
                  <div className="flex-between">
                    <span style={{ fontSize: "var(--font-size-sm)" }}>تجهيز مخزون السيارة</span>
                    {checks.vanLoaded ? <CheckCircle2 size={16} style={{ color: "var(--color-success)" }} /> : <XCircle size={16} style={{ color: "var(--color-danger)" }} />}
                  </div>
                  <div className="flex-between">
                    <span style={{ fontSize: "var(--font-size-sm)" }}>تهيئة صندوق التحصيل</span>
                    {checks.boxReady ? <CheckCircle2 size={16} style={{ color: "var(--color-success)" }} /> : <XCircle size={16} style={{ color: "var(--color-danger)" }} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={changeOpen} onClose={() => setChangeOpen(false)} title="طلب تعديل الخطة" footer={<>
        <Button variant="secondary" onClick={() => setChangeOpen(false)}>إلغاء</Button>
        <Button variant="primary" icon={<ClipboardEdit size={15} />} onClick={sendChange}>إرسال الطلب</Button>
      </>}>
        <Textarea label="سبب التعديل" rows={4} value={changeNote} onChange={(e) => setChangeNote(e.target.value)}
          placeholder="مثال: تأخر الزيارة الأولى، إضافة منشأة مستهدفة..." />
        <div className="alert alert-warning" style={{ marginTop: 8, marginBottom: 0 }}>
          سيُعتمد التعديل من المشرف قبل تطبيقه على خطة اليوم.
        </div>
      </Modal>

      <ConfirmDialog
        open={endOpen}
        onClose={() => setEndOpen(false)}
        onConfirm={endTrip}
        title="إنهاء الجولة"
        message="سيتم تسجيل نقطة النهاية والمسافة المقطوعة، وربطها بإقفال اليوم."
        confirmLabel="إنهاء الجولة"
      />

    </div>
  );
}
