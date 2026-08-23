import { useMemo, useState, useEffect } from "react";
import { MapPin, Navigation, Wifi, WifiOff, Battery, AlertTriangle, CheckCircle2, XCircle, Clock, Target, MapPin as MapPinIcon, Route } from "lucide-react";
import { dailyPlanByRepDate, activeTripByRep } from "@/mock/repField";
import { customers } from "@/mock/customers";
import { visits } from "@/mock/visits";
import { useAuthStore } from "@/store/auth";
import { repPolicies } from "@/config/repPolicies";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { MockMap, type MapMarker, type MapRouteLine } from "@/components/maps/MockMap";
import { formatTime, formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";

const TODAY = "2026-08-14";

export function RepGpsPage() {
  const { user } = useAuthStore();
  const me = user!;

  const plan = dailyPlanByRepDate(me.id, TODAY);
  const trip = activeTripByRep(me.id);
  const myVisitsToday = visits.filter((v) => v.repId === me.id && v.date === TODAY);

  const [tracking, setTracking] = useState(trip?.status === "in_progress" && trip?.gpsEnabled);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy: number; timestamp: string } | null>(null);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const mapMarkers = useMemo<MapMarker[]>(() => {
    const markers: MapMarker[] = [];

    if (currentLocation) {
      markers.push({
        id: "me",
        x: 50,
        y: 50,
        label: me.name,
        kind: "rep",
        sublabel: "موقعي الحالي",
      });
    }

    const points = (plan?.entries ?? [])
      .map((e) => customers.find((c) => c.id === e.customerId))
      .filter((c): c is NonNullable<typeof c> => !!c && !!c.lat && !!c.lng);

    if (points.length > 0) {
      const lats = points.map((p) => p.lat);
      const lngs = points.map((p) => p.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const pad = 0.05;
      const px = (lng: number) => ((lng - (minLng - pad)) / (maxLng - minLng + pad * 2)) * 100;
      const py = (lat: number) => ((maxLat + pad - lat) / (maxLat - minLat + pad * 2)) * 100;

      points.forEach((p) => {
        const visit = myVisitsToday.find((v) => v.customerId === p.id);
        markers.push({
          id: p.id,
          x: +px(p.lng).toFixed(1),
          y: +py(p.lat).toFixed(1),
          label: p.name,
          kind: "customer",
          sublabel: visit ? (visit.result === "completed" ? "مكتملة" : visit.result === "not_found" ? "مغلقة" : "مخططة") : "مخططة",
        });
      });
    }

    return markers;
  }, [plan, me.name, currentLocation, myVisitsToday]);

  const mapRoutes = useMemo<MapRouteLine[]>(() => {
    const pts = (plan?.entries ?? [])
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
  }, [plan]);

  const gpsEnabled = trip?.gpsEnabled ?? false;
  const tripStatus = trip?.status ?? "not_started";
  const distanceKm = trip?.distanceKm ?? 0;
  const startTime = trip?.startTime ?? "--:--";

  const completedVisits = myVisitsToday.filter((v) => v.result === "completed").length;
  const plannedVisits = plan?.entries.length ?? 0;
  const progressPct = plannedVisits > 0 ? Math.round((completedVisits / plannedVisits) * 100) : 0;

  const startTracking = () => {
    if (!gpsEnabled) {
      toast.warning("GPS معطل", "يجب تفعيل GPS من إعدادات الجهاز والسماح للتطبيق بالوصول للموقع");
      return;
    }
    setTracking(true);
    setCurrentLocation({ lat: 24.85, lng: 46.65, accuracy: 10, timestamp: new Date().toISOString() });
    setLastSync(new Date().toISOString());
    toast.success("بدأ التتبع", "يتم تسجيل موقعك وربطه بالجولة والزيارات");
  };

  const stopTracking = () => {
    setTracking(false);
    toast.info("أوقف التتبع", "سيتم حفظ المسار الحالي");
  };

  const simulateLocationUpdate = () => {
    if (tracking && currentLocation) {
      const newLat = currentLocation.lat + (Math.random() - 0.5) * 0.002;
      const newLng = currentLocation.lng + (Math.random() - 0.5) * 0.002;
      setCurrentLocation({ lat: newLat, lng: newLng, accuracy: Math.max(5, Math.random() * 20), timestamp: new Date().toISOString() });
      setBatteryLevel((prev) => Math.max(10, prev - Math.random() * 0.5));
      if (Math.random() < 0.1) setLastSync(new Date().toISOString());
    }
  };

  useEffect(() => {
    if (!tracking) return;
    const interval = setInterval(simulateLocationUpdate, 5000);
    return () => clearInterval(interval);
  }, [tracking]);

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "GPS / موقعي" }]}
        title="تتبع موقعي والمسار"
        description="موقعك الحالي، المسار المخطط، حالة GPS، ومزامنة البيانات"
        actions={
          tracking ? (
            <Button variant="danger-solid" icon={<XCircle size={15} />} onClick={stopTracking}>إيقاف التتبع</Button>
          ) : (
            <Button variant="primary" icon={<Wifi size={15} />} onClick={startTracking} disabled={!gpsEnabled}>بدء التتبع</Button>
          )
        }
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>حالة GPS</span><div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>{gpsEnabled ? <Wifi size={18} style={{ color: "var(--color-success)" }} /> : <WifiOff size={18} style={{ color: "var(--color-danger)" }} />}<b style={{ fontSize: "var(--font-size-lg)", color: gpsEnabled ? "var(--color-success)" : "var(--color-danger)" }}>{gpsEnabled ? "مفعل" : "معطل"}</b></div><div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>مطلوب أثناء الجولة: {repPolicies.gpsRequiredForTrip ? "نعم" : "لا"}</div></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>التتبع</span><div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>{tracking ? <MapPinIcon size={18} style={{ color: "var(--color-primary)", animation: "pulse 1.5s infinite" }} /> : <XCircle size={18} style={{ color: "var(--color-text-muted)" }} />}<b style={{ fontSize: "var(--font-size-lg)", color: tracking ? "var(--color-primary)" : "var(--color-text-muted)" }}>{tracking ? "نشط" : "متوقف"}</b></div>{currentLocation && <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>آخر تحديث: {new Date(currentLocation.timestamp).toLocaleTimeString("ar-SA")} · دقة ±{currentLocation.accuracy.toFixed(0)} م</div>}</div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الجولة</span><div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>{tripStatus === "in_progress" ? <Navigation size={18} style={{ color: "var(--color-success)" }} /> : tripStatus === "completed" ? <CheckCircle2 size={18} style={{ color: "var(--color-success)" }} /> : <Clock size={18} style={{ color: "var(--color-warning)" }} />}<b style={{ fontSize: "var(--font-size-lg)" }}>{tripStatus === "in_progress" ? "قيد التنفيذ" : tripStatus === "completed" ? "مكتملة" : "لم تبدأ"}</b></div>{trip && <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>بدأت {formatTime(startTime)} · مسافة {distanceKm} كم</div>}</div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>البطارية</span><div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}><Battery size={18} style={{ color: batteryLevel > 30 ? "var(--color-success)" : "var(--color-danger)" }} /><b style={{ fontSize: "var(--font-size-lg)", color: batteryLevel > 30 ? "var(--color-success)" : "var(--color-danger)" }}>{Math.round(batteryLevel)}%</b></div><Progress value={batteryLevel} tone={batteryLevel > 30 ? "success" : "danger"} /></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تقدم الزيارات</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{completedVisits} / {plannedVisits}</b><Progress value={progressPct} tone={progressPct >= 100 ? "success" : progressPct >= 50 ? "default" : "warning"} /></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>آخر مزامنة</span><b className="num" style={{ fontSize: "var(--font-size-lg)" }}>{lastSync ? new Date(lastSync).toLocaleTimeString("ar-SA") : "—"}</b><div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: 4 }}>{lastSync ? "متصل" : "لا توجد مزامنة حديثة"}</div></div></Card>
        </div>
      </StickyPageHeader>

      {(!gpsEnabled || !tracking) && (
        <div className="alert alert-warning" style={{ marginBottom: "var(--space-4)" }}>
          <AlertTriangle size={18} />
          <div>
            <div className="alert-title">{!gpsEnabled ? "GPS معطل" : "التتبع متوقف"}</div>
            <div>{!gpsEnabled ? "يجب تفعيل GPS للبدء بالجولة وتسجيل الزيارات بدقة." : "ابدأ التتبع لتسجيل موقعك وربطه بالمسار المخطط."}</div>
          </div>
        </div>
      )}

      <div className="grid-2-1" style={{ marginBottom: "var(--space-4)" }}>
        <div className="stack">
          <Card title="خريطة المسار والموقع" subtitle={tracking ? "تحديث مباشر كل 5 ثوانٍ" : "اضغط 'بدء التتبع' لعرض موقعك"}>
            <div style={{ height: 400 }}>
              {mapMarkers.length > 0 ? (
                <MockMap
                  markers={mapMarkers}
                  routes={mapRoutes}
                  legend={[
                    { label: "موقعي الحالي", color: "var(--color-primary)" },
                    { label: "عميل مخطط", color: "var(--color-info)" },
                    { label: "زيارة مكتملة", color: "var(--color-success)" },
                  ]}
                  height={400}
                />
              ) : (
                <div className="card-body" style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <Target size={48} style={{ color: "var(--color-text-muted)", marginBottom: 16 }} />
                  <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد زيارات مخططة اليوم أو لم يتم تفعيل التتبع</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title="زيارات اليوم على الخريطة">
            <div className="card-body">
              {!plan || plan.entries.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد زيارات مخططة اليوم</div>
              ) : (
                <div className="stack-sm">
                  {plan!.entries.map((e) => {
                    const cust = customers.find((c) => c.id === e.customerId);
                    const visit = myVisitsToday.find((v) => v.customerId === e.customerId);
                    const distanceFromRoute = visit?.distanceFromRoute ?? 0;
                    const isDeviated = distanceFromRoute > 0.5;
                    return (
                      <div key={e.customerId} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="num" style={{ fontSize: "var(--font-size-sm)", minWidth: 24 }}>{e.order}</span>
                          <div>
                            <b style={{ fontSize: "var(--font-size-sm)" }}>{cust?.name}</b>
                            <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{formatTime(e.plannedTime)} · {cust?.lat && cust?.lng ? `${cust.lat.toFixed(4)}, ${cust.lng.toFixed(4)}` : "بدون إحداثيات"}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {visit && (
                            <Badge tone={visit.result === "completed" ? "success" : visit.result === "not_found" ? "warning" : "info"} dot>{visit.result === "completed" ? "مكتملة" : visit.result === "not_found" ? "مغلقة" : "تمت"}</Badge>
                          )}
                          {isDeviated && (
                            <Badge tone="danger" dot>{distanceFromRoute.toFixed(1)} كم انحراف</Badge>
                          )}
                          {!visit && !isDeviated && <Badge tone="neutral" dot>مخططة</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card title="سجل التتبع اليومي" subtitle={`${myVisitsToday.length} زيارة مسجلة`}>
            <div className="card-body">
              {myVisitsToday.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد زيارات مسجلة اليوم</div>
              ) : (
                <div className="stack-sm">
                  {myVisitsToday.slice(0, 10).map((v) => {
                    const cust = customers.find((c) => c.id === v.customerId);
                    return (
                      <div key={v.id} className="flex-between" style={{ borderBottom: "1px solid var(--color-divider)", paddingBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <MapPin size={14} />
                          <div>
                            <b style={{ fontSize: "var(--font-size-sm)" }}>{cust?.name}</b>
                            <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{v.checkInAt ? `دخول ${formatTime(v.checkInAt)}` : "—"} {v.checkOutAt ? `· خروج ${formatTime(v.checkOutAt)}` : ""}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Badge tone={v.result === "completed" ? "success" : v.result === "not_found" || v.result === "closed" ? "warning" : "info"} dot>{v.outcome}</Badge>
                          {v.distanceFromRoute && v.distanceFromRoute > 0.5 && (
                            <span className="faint" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-danger)" }}>{v.distanceFromRoute} كم انحراف</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card title="إعدادات GPS" subtitle="سياسة التتبع: {repPolicies.gpsRequiredForTrip ? 'إلزامي' : 'اختياري'}" className="mt-4">
            <div className="card-body stack-sm">
              <div className="flex-between">
                <span style={{ fontSize: "var(--font-size-sm)" }}>تسجيل الموقع عند Check-in</span>
                <Badge tone="success">مفعل</Badge>
              </div>
              <div className="flex-between">
                <span style={{ fontSize: "var(--font-size-sm)" }}>تسجيل الموقع عند Check-out</span>
                <Badge tone="success">مفعل</Badge>
              </div>
              <div className="flex-between">
                <span style={{ fontSize: "var(--font-size-sm)" }}>تتبع مستمر أثناء الجولة</span>
                <Badge tone={tracking ? "success" : "neutral"}>التتبع: {tracking ? "نشط" : "متوقف"}</Badge>
              </div>
              <div className="flex-between">
                <span style={{ fontSize: "var(--font-size-sm)" }}>اكتشاف الانحراف عن المسار</span>
                <Badge tone="info">نصف قطر 0.5 كم</Badge>
              </div>
              <div className="flex-between">
                <span style={{ fontSize: "var(--font-size-sm)" }}>الحفظ المحلي عند انقطاع الاتصال</span>
                <Badge tone="success">مفعل</Badge>
              </div>
              <div className="flex-between">
                <span style={{ fontSize: "var(--font-size-sm)" }}>المزامنة التلقائية عند عودة الاتصال</span>
                <Badge tone="success">مفعل</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}