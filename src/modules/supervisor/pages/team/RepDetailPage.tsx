import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Phone, MapPin, CalendarDays, Wallet, ClipboardCheck, BadgeCheck, UserX, UserCheck } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/FormControls";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { Progress } from "@/components/ui/Progress";
import { formatMoney, formatNumber, formatDate, formatDateShort, initials } from "@/utils/format";
import { supervisorPolicies, SYSTEM_TODAY } from "@/config/supervisorPolicies";
import { toast } from "@/store/ui";
import type { Visit, Invoice, Collection, DailyClosing, SupervisorNote } from "@/types";

const assetTypeLabels: Record<string, string> = {
  car: "سيارة", phone: "هاتف", tablet: "تابلت", pos: "جهاز POS", printer: "طابعة", cashbox: "صندوق",
};

export function RepDetailPage() {
  const { repId = "" } = useParams();
  const { reps, statByRep, trips, dailyPlans, visits, sales, collections, closings, targets, gps, notes, customers } = useTeamData();
  const { data: custody } = useData(() => mockApi.custody.list());
  const { data: vanStock } = useData(() => mockApi.inventory.vanStock());

  const rep = reps.find((r) => r.id === repId);
  const stat = statByRep.get(repId);

  const repVisits = useMemo(() => (visits ?? []).filter((v) => v.repId === repId && v.date === SYSTEM_TODAY), [visits, repId]);
  const repSales = useMemo(() => (sales ?? []).filter((s) => s.repId === repId && s.date === SYSTEM_TODAY), [sales, repId]);
  const repCollections = useMemo(() => (collections ?? []).filter((c) => c.repId === repId && c.date === SYSTEM_TODAY), [collections, repId]);
  const repTrips = useMemo(() => (trips ?? []).filter((t) => t.repId === repId && t.date === SYSTEM_TODAY), [trips, repId]);
  const repClosing = useMemo(() => (closings ?? []).find((c) => c.repId === repId && c.date === SYSTEM_TODAY), [closings, repId]);
  const todayPlan = useMemo(() => (dailyPlans ?? []).find((p) => p.repId === repId && p.date === SYSTEM_TODAY), [dailyPlans, repId]);
  const monthTarget = useMemo(
    () => (targets ?? []).find((t) => t.ownerId === repId && t.period === "monthly" && t.startDate <= SYSTEM_TODAY && SYSTEM_TODAY <= t.endDate),
    [targets, repId],
  );
  const repNotes = useMemo(() => (notes ?? []).filter((n) => n.repId === repId), [notes, repId]);
  const repGps = useMemo(() => (gps ?? []).find((g) => g.userId === repId), [gps, repId]);
  const repCustody = useMemo(() => (custody ?? []).filter((c) => c.assignedToId === repId), [custody, repId]);
  const repStock = useMemo(() => (vanStock ?? []).find((v) => v.repId === repId), [vanStock, repId]);
  const repCustomers = useMemo(() => (customers ?? []).filter((c) => c.repId === repId), [customers, repId]);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  if (!rep) {
    return <ErrorState message="المندوب غير موجود في نطاق فريقك" />;
  }

  const salesRatio = monthTarget && monthTarget.salesAmount > 0 ? Math.min(100, Math.round((stat?.todaySales ?? 0) / monthTarget.salesAmount * 100)) : 0;

  const visitColumns: Column<Visit>[] = [
    { key: "customer", header: "العميل", sortable: true, sortValue: (v) => customers.find((c) => c.id === v.customerId)?.name ?? "", priority: "primary", render: (v) => (
      <Link to={`/supervisor/customers/${v.customerId}`} style={{ fontWeight: 600 }}>{customers.find((c) => c.id === v.customerId)?.name ?? "—"}</Link>
    ) },
    { key: "time", header: "الوقت", priority: "primary", render: (v) => <span className="num">{v.checkInAt ?? "—"}</span> },
    { key: "result", header: "النتيجة", priority: "primary", render: (v) => (
      <Badge tone={v.result === "visited" || v.result === "completed" ? "success" : v.result === "not_found" || v.result === "closed" ? "warning" : "neutral"}>
        {v.result === "visited" || v.result === "completed" ? "تمت الزيارة" : v.result === "not_found" ? "غير موجود" : v.result === "closed" ? "مغلق" : "بدون بيع"}
      </Badge>
    ) },
    { key: "notes", header: "ملاحظات", priority: "secondary", render: (v) => <span style={{ fontSize: "var(--font-size-xs)" }}>{v.notes ?? "—"}</span> },
  ];

  const noteColumns: Column<SupervisorNote>[] = [
    { key: "date", header: "التاريخ", priority: "primary", render: (n) => <span className="num">{formatDateShort(n.date)}</span> },
    { key: "type", header: "النوع", priority: "primary", render: (n) => (
      <Badge tone={n.type === "performance" ? "success" : n.type === "administrative" ? "warning" : "neutral"}>
        {n.type === "performance" ? "أداء" : n.type === "administrative" ? "إداري" : "تشغيلي"}
      </Badge>
    ) },
    { key: "body", header: "المحتوى", priority: "primary", render: (n) => <span style={{ fontSize: "var(--font-size-xs)" }}>{n.body}</span> },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "فريقي", path: "/supervisor/team" }, { label: rep.name }]}
        title={rep.name}
        description={rep.email}
        actions={<Link to="/supervisor/team"><Button variant="ghost">العودة للفريق</Button></Link>}
      />

      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
            <span className="avatar avatar-lg" style={{ background: "var(--color-brand)" }}>{initials(rep.name)}</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700 }}>{rep.name}</div>
              <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>
                مندوب مبيعات · انضم {formatDate(rep.joinedAt)}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 8, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                {rep.phone && <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Phone size={13} /> {rep.phone}</span>}
                <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><MapPin size={13} /> منطقة {rep.territoryId}</span>
                <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><ClipboardCheck size={13} /> {formatNumber(repCustomers.length)} عميل</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
              <Badge tone={rep.status === "active" ? "success" : rep.status === "suspended" ? "danger" : "neutral"} dot>{rep.status === "active" ? "نشط" : rep.status === "suspended" ? "موقوف" : "غير نشط"}</Badge>
              <Badge tone={repGps ? "success" : "danger"} dot>{repGps ? "متصفح متصل" : "خارج التغطية"}</Badge>
              {rep.status === "active" ? (
                <Button variant="danger-solid" size="sm" icon={<UserX size={14} />} onClick={() => setSuspendOpen(true)}>إيقاف المندوب</Button>
              ) : rep.status === "suspended" ? (
                <Button variant="primary" size="sm" icon={<UserCheck size={14} />} onClick={async () => { try { await mockApi.team.activateRep(rep.id); toast.success(`تم تفعيل المندوب: ${rep.name}`); } catch { toast.error("فشل تفعيل المندوب"); } }}>تفعيل المندوب</Button>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="stat-grid">
          <StatCard label="زيارات اليوم" value={`${formatNumber(stat?.completedVisits ?? 0)} / ${formatNumber(stat?.todayPlannedVisits ?? 0)}`} hint="مكتمل / مخطط" icon={<MapPin size={14} />} />
          <StatCard label="مبيعات اليوم" value={formatMoney(stat?.todaySales ?? 0)} hint={`هدف الشهر ${formatMoney(monthTarget?.salesAmount ?? 0)}`} icon={<Wallet size={14} />} />
          <StatCard label="تحصيل اليوم" value={formatMoney(stat?.todayCollections ?? 0)} hint={`هدف التحصيل ${formatMoney(monthTarget?.collectionAmount ?? 0)}`} icon={<Wallet size={14} />} />
          <StatCard label="إقفال اليوم" value={stat?.closingStatus === "done" ? "مكتمل" : stat?.closingStatus === "draft" ? "مسودة" : "لم يُرسل"} hint={repClosing ? `متوقع ${formatMoney(repClosing.expectedCash)}` : undefined} icon={<BadgeCheck size={14} />} />
        </div>

        {monthTarget && (
          <Card title="تقدم الأهداف الشهرية" subtitle={`${formatDateShort(monthTarget.startDate)} — ${formatDateShort(monthTarget.endDate)}`}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: 6 }}>
                  <span>المبيعات</span><span className="num">{formatMoney(monthTarget.salesAmount)}</span>
                </div>
                <Progress value={salesRatio} tone="success" />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: 6 }}>
                  <span>التحصيل</span><span className="num">{formatMoney(monthTarget.collectionAmount)}</span>
                </div>
                <Progress value={monthTarget.collectionAmount > 0 ? Math.min(100, Math.round((stat?.todayCollections ?? 0) / monthTarget.collectionAmount * 100)) : 0} tone="default" />
              </div>
            </div>
            {monthTarget.lines && monthTarget.lines.length > 0 && (
              <div style={{ marginTop: 14, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                أهداف كمية: {monthTarget.lines.map((l) => `${l.productName} ${formatNumber(l.quantity)} ${l.unit === "carton" ? "كرتون" : "وحدة"}`).join(" · ")}
              </div>
            )}
          </Card>
        )}

        <Card title="جولة اليوم" subtitle={todayPlan ? `خطة معتمدة — ${todayPlan.entries.length} زيارة` : "لا توجد خطة لليوم"}>
          {repTrips.length > 0 && (
            <div className="muted" style={{ fontSize: "var(--font-size-xs)", marginBottom: 10 }}>
              جولة {repTrips[0].number} · بدأت {repTrips[0].startTime} · الحالة: {repTrips[0].status === "in_progress" ? "جارٍ التنفيذ" : repTrips[0].status === "completed" ? "مكتملة" : "معلقة"}
            </div>
          )}
          <DataTable
            columns={visitColumns}
            rows={repVisits}
            rowKey={(v) => v.id}
            searchPlaceholder="بحث بالعميل..."
            searchKeys={(v) => customers.find((c) => c.id === v.customerId)?.name ?? ""}
            emptyTitle="لا توجد زيارات مسجلة اليوم"
            pageSize={8}
          />
        </Card>

        <Card title="مبيعات وتحصيل اليوم" subtitle={`مبيعات: ${formatMoney(repSales.reduce((a, s) => a + s.net, 0))} · تحصيل: ${formatMoney(repCollections.reduce((a, c) => a + c.amount, 0))}`}>
          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            <div>
              <div className="section-block-title" style={{ marginBottom: 8 }}>فواتير اليوم</div>
              {repSales.length === 0 ? <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد فواتير اليوم.</div> : (
                <div className="list-group">
                  {repSales.map((s: Invoice) => (
                    <div key={s.id} className="list-group-row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{s.number}</div>
                        <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{customers.find((c) => c.id === s.customerId)?.name}</div>
                      </div>
                      <span className="num" style={{ fontWeight: 600 }}>{formatMoney(s.net)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="section-block-title" style={{ marginBottom: 8 }}>سندات القبض</div>
              {repCollections.length === 0 ? <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد سندات قبض اليوم.</div> : (
                <div className="list-group">
                  {repCollections.map((c: Collection) => (
                    <div key={c.id} className="list-group-row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{c.number}</div>
                        <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{customers.find((x) => x.id === c.customerId)?.name}</div>
                      </div>
                      <span className="num" style={{ fontWeight: 600 }}>{formatMoney(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <Card title="ملاحظات المشرف" subtitle={`السياسة: الإقفال ${supervisorPolicies.planning.planApprovalRole}`}>
            {repNotes.length === 0 ? (
              <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد ملاحظات مسجلة.</div>
            ) : (
              <DataTable columns={noteColumns} rows={repNotes} rowKey={(n) => n.id} pageSize={5} />
            )}
          </Card>

          <Card title="العهد والمخزون المتنقل">
            {repCustody.length === 0 && !repStock ? (
              <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>لا توجد عهد أو مخزون متنقل.</div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {repCustody.map((c) => (
                  <div key={c.id} className="list-group-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>{c.assetName}</div>
                      <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{assetTypeLabels[c.assetType]} · {c.serialNumber}</div>
                    </div>
                    <Badge tone={c.status === "issued" ? "success" : "neutral"}>{c.status === "issued" ? "مسلَّم" : c.status === "returned" ? "مُعاد" : "محوَّل"}</Badge>
                  </div>
                ))}
                {repStock && (
                  <div className="list-group-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>المخزون المتنقل</div>
                      <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{repStock.items.reduce((a, i) => a + i.qty, 0)} وحدة · تحديث {formatDateShort(repStock.updatedAt)}</div>
                    </div>
                    <Link to="/supervisor/inventory"><Button variant="ghost" size="sm">التفاصيل</Button></Link>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={suspendOpen} title="إيقاف المندوب" size="md" onClose={() => { setSuspendOpen(false); setSuspendReason(""); }}>
        <div className="stack" style={{ gap: 12 }}>
          <div>هل تريد إيقاف المندوب <b>{rep.name}</b>؟</div>
          <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>سيتم تغيير حالة المندوب إلى "موقوف" ولن يستطيع تنفيذ أي عمليات حتى يتم تفعيله مرة أخرى.</div>
          <Textarea label="سبب الإيقاف" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} required placeholder="سبب الإيقاف..." />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" size="sm" onClick={() => { setSuspendOpen(false); setSuspendReason(""); }}>إلغاء</Button>
            <Button variant="danger-solid" size="sm" onClick={async () => {
              if (!suspendReason) { toast.warning("يرجى ذكر سبب الإيقاف"); return; }
              try {
                await mockApi.team.suspendRep(rep.id, suspendReason);
                toast.success(`تم إيقاف المندوب: ${rep.name}`);
                setSuspendOpen(false);
                setSuspendReason("");
              } catch { toast.error("فشل إيقاف المندوب"); }
            }}>إيقاف المندوب</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
