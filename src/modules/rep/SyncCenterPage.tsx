import { useMemo, useState } from "react";
import { RefreshCw, CheckCircle2, Clock, XCircle, Wifi, WifiOff } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { syncQueueByRep } from "@/mock/repField";
import { repPolicies } from "@/config/repPolicies";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { toast } from "@/store/ui";
import { formatTime } from "@/utils/format";
import type { SyncQueueItem } from "@/types";

const entityLabels: Record<string, string> = {
  trip: "الجولة",
  visit: "الزيارة",
  sale: "فاتورة بيع",
  collection: "سند تحصيل",
  return: "مرتجع",
  expense: "مصروف",
  count: "جرد مخزون",
  closing: "إقفال يوم",
  deposit: "تسليم نقدية",
  loading: "استلام بضاعة",
};

export function SyncCenterPage() {
  const { user } = useAuthStore();
  const me = user!;
  const policy = repPolicies.sync;

  const [items, setItems] = useState<SyncQueueItem[]>(syncQueueByRep(me.id));
  const [autoSync, setAutoSync] = useState<boolean>(policy.autoSync);
  const [syncing, setSyncing] = useState(false);

  const stats = useMemo(() => ({
    synced: items.filter((i) => i.status === "synced").length,
    pending: items.filter((i) => i.status === "pending").length,
    failed: items.filter((i) => i.status === "failed").length,
  }), [items]);

  const syncNow = (onlyFailed = false) => {
    setSyncing(true);
    window.setTimeout(() => {
      const now = "2026-08-14T" + new Date().toTimeString().slice(0, 8);
      setItems((prev) =>
        prev.map((i) =>
          i.status === "failed" || (!onlyFailed && i.status === "pending")
            ? { ...i, status: "synced" as const, syncedAt: now, retries: i.retries ?? 0, error: undefined }
            : i
        )
      );
      setSyncing(false);
      toast.success("اكتملت المزامنة", "أُرسلت جميع المعاملات المعلقة إلى الخادم");
    }, 900);
  };

  const retryOne = (id: string) => {
    const now = "2026-08-14T" + new Date().toTimeString().slice(0, 8);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "synced" as const, syncedAt: now, retries: (i.retries ?? 0) + 1, error: undefined } : i)));
    toast.success("أعيدت محاولة المزامنة بنجاح");
  };

  const toggleAuto = () => {
    const next = !autoSync;
    setAutoSync(next);
    toast[next ? "info" : "warning"](next ? "فُعّلت المزامنة التلقائية" : "أُوقفت المزامنة التلقائية", "ستُحفظ المعاملات محلياً حتى تعاود الاتصال");
  };

  const columns: Column<SyncQueueItem>[] = [
    { key: "createdAt", header: "الوقت", sortable: true, sortValue: (r) => r.createdAt, priority: "secondary", render: (r) => <span className="num">{formatTime(r.createdAt.slice(11, 19))}</span> },
    { key: "entityType", header: "المعاملة", priority: "primary", render: (r) => (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {r.status === "synced" ? <CheckCircle2 size={15} style={{ color: "var(--color-success)" }} /> : r.status === "failed" ? <XCircle size={15} style={{ color: "var(--color-danger)" }} /> : <Clock size={15} style={{ color: "var(--color-warning)" }} />}
        <span>
          {entityLabels[r.entityType] ?? r.entityType}
          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.entityNumber ?? r.entityId}</div>
        </span>
      </span>
    ) },
    { key: "operation", header: "العملية", priority: "optional", render: (r) => (r.operation === "create" ? "إنشاء" : r.operation === "update" ? "تحديث" : r.operation) },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => (
      <Badge tone={r.status === "synced" ? "success" : r.status === "failed" ? "danger" : "warning"} dot>
        {r.status === "synced" ? "متزامن" : r.status === "failed" ? "فشل" : "معلق"}
      </Badge>
    ) },
    { key: "retries", header: "المحاولات", priority: "optional", render: (r) => <span className="num">{r.retries ?? 0}</span> },
    { key: "error", header: "الخطأ", priority: "optional", render: (r) => (r.error ? <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-danger)" }}>{r.error}</span> : "—") },
    { key: "actions", header: "إجراء", priority: "primary", render: (r) => (
      r.status === "failed" ? <Button size="sm" variant="primary" icon={<RefreshCw size={13} />} onClick={() => retryOne(r.id)}>إعادة محاولة</Button>
      : r.status === "pending" ? <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={() => retryOne(r.id)}>مزامنة</Button>
      : <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.syncedAt ? formatTime(r.syncedAt.slice(11, 19)) : ""}</span>
    ) },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "مركز المزامنة" }]}
        title="مركز المزامنة"
        description="حالة إرسال معاملات المندوب إلى الخادم — يعمل دون اتصال ويزامن لاحقاً"
        actions={<Button variant="primary" icon={<RefreshCw size={15} />} onClick={() => syncNow(false)} disabled={syncing || (stats.pending === 0 && stats.failed === 0)}>{syncing ? "جارٍ المزامنة..." : "تزامن الآن"}</Button>}
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>متزامنة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{stats.synced}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>معلقة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{stats.pending}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>فاشلة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-danger)" }}>{stats.failed}</b></div></Card>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المزامنة التلقائية</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                {autoSync ? <Wifi size={16} style={{ color: "var(--color-success)" }} /> : <WifiOff size={16} style={{ color: "var(--color-warning)" }} />}
                <b style={{ fontSize: "var(--font-size-sm)" }}>{autoSync ? "مفعّلة" : "متوقفة"}</b>
                <button className="btn btn-sm" style={{ marginInlineStart: "auto" }} onClick={toggleAuto}>{autoSync ? "إيقاف" : "تفعيل"}</button>
              </div>
            </div>
          </Card>
        </div>
      </StickyPageHeader>

      <Card title="سجل المعاملات" subtitle={`الحد الأقصى لإعادة المحاولة: ${policy.retryMax}`}>
        <div className="card-body">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(r) => r.id}
            pageSize={10}
            emptyTitle="لا توجد معاملات"
            emptyDescription="كل العمليات تمت مزامنتها."
          />
        </div>
      </Card>

      {stats.failed > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 0 }}>
          <XCircle size={17} />
          <div>
            <div className="alert-title">معاملات فاشلة ({stats.failed})</div>
            <div>يوجد إنترنت الآن — أعد محاولة المزامنة أو أعِد المحاولة لكل معاملة على حدة.</div>
          </div>
        </div>
      )}
    </div>
  );
}
