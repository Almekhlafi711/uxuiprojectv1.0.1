import { useEffect, useState } from "react";
import { Play, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { mockApi } from "@/services/mockApi";
import { getDataScope, visibleCashBoxIds, visibleRepIds, visibleUserIds, visibleUsers, type DataScope } from "@/services/scope";
import { users } from "@/mock/users";
import { customers } from "@/mock/customers";
import { cashBoxes } from "@/mock/cash";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatNumber } from "@/utils/format";

interface CheckResult {
  label: string;
  ok: boolean;
  total: number;
  leaked: number;
  note: string;
}

interface ScopeResult {
  scope: DataScope;
  results: CheckResult[];
}

type OwnedFn = (r: Record<string, unknown>, s: DataScope, ownIds: Set<string>) => boolean;

type Runner = {
  key: string;
  label: string;
  fetch: () => Promise<unknown[]>;
  owned: OwnedFn;
};

const ownBoxIdSet = (s: DataScope): Set<string> => new Set(cashBoxes.filter((b) => b.ownerId === s.userId).map((b) => b.id));

const repOwned: OwnedFn = (r, s) => r.repId === s.userId;
const teamRepOwned: OwnedFn = (r, s) => typeof r.repId === "string" && visibleRepIds(s).includes(r.repId);

/** Representative scope (self). */
const RUNNERS: Runner[] = [
  { key: "customers", label: "العملاء", fetch: () => mockApi.customers.list(), owned: repOwned },
  { key: "sales", label: "المبيعات", fetch: () => mockApi.sales.list(), owned: repOwned },
  { key: "collections", label: "التحصيل", fetch: () => mockApi.collections.list(), owned: repOwned },
  { key: "returns", label: "المرتجعات", fetch: () => mockApi.returns.list(), owned: repOwned },
  { key: "visits", label: "الزيارات", fetch: () => mockApi.visits.list(), owned: repOwned },
  { key: "routes", label: "خطط السير", fetch: () => mockApi.routes.list(), owned: repOwned },
  { key: "vanStock", label: "مخزون السيارة", fetch: () => mockApi.inventory.vanStock(), owned: repOwned },
  { key: "stockRequests", label: "طلبات البضاعة", fetch: () => mockApi.inventory.requests(), owned: repOwned },
  { key: "stockTransfers", label: "تحويلات المخزون", fetch: () => mockApi.inventory.transfers(), owned: (r, s) => r.toRepId === s.userId },
  { key: "stockMovements", label: "حركة المخزون", fetch: () => mockApi.inventory.movements(), owned: repOwned },
  { key: "cashBoxes", label: "صناديق النقد", fetch: () => mockApi.cash.boxes(), owned: (r, s) => r.ownerId === s.userId },
  { key: "cashMovements", label: "حركات الصندوق", fetch: () => mockApi.cash.movements(), owned: (r, s) => ownBoxIdSet(s).has(String(r.cashBoxId)) || r.relatedRepId === s.userId },
  { key: "targets", label: "الأهداف", fetch: () => mockApi.targets.list(), owned: (r, s) => r.ownerId === s.userId || r.ownerId === s.supervisorId },
  { key: "custody", label: "العهد", fetch: () => mockApi.custody.list(), owned: (r, s) => r.assignedToId === s.userId },
  { key: "leaves", label: "الإجازات", fetch: () => mockApi.leaves.list(), owned: (r, s) => r.employeeId === s.userId },
  { key: "gps", label: "GPS", fetch: () => mockApi.gps.locations(), owned: (r, s) => r.userId === s.userId || r.userId === s.supervisorId },
  { key: "notifications", label: "الإشعارات", fetch: () => mockApi.notifications.list(), owned: (r, s) => r.recipientId === s.userId },
  { key: "messages", label: "المراسلات", fetch: () => mockApi.messages.list(), owned: (r, s) => Array.isArray(r.participants) && (r.participants as string[]).includes(s.userId) },
  { key: "approvals", label: "طلبات الاعتماد", fetch: () => mockApi.approvals.list(), owned: (r, s) => r.requestedById === s.userId },
  {
    key: "archive",
    label: "الأرشيف",
    fetch: () => mockApi.archive.list(),
    owned: (r, s, ownIds) => {
      const me = users.find((u) => u.id === s.userId);
      if (me && r.createdBy === me.name) return true;
      if (r.entityType === "employee" && r.entityId === s.userId) return true;
      return ownIds.has(String(r.entityId));
    },
  },
  { key: "territories", label: "المناطق", fetch: () => mockApi.organization.territories(), owned: (r, s) => r.id === s.territoryId },
  { key: "users", label: "المستخدمون", fetch: () => mockApi.users.list(), owned: (r, s) => r.id === s.userId || r.id === s.supervisorId },
  { key: "warehouseStock", label: "مخزون المستودع", fetch: () => mockApi.inventory.warehouseStock(), owned: () => true },
];

/** Supervisor scope (team). */
const SUPERVISOR_RUNNERS: Runner[] = [
  { key: "customers", label: "العملاء", fetch: () => mockApi.customers.list(), owned: (r, s) => r.repId === s.userId || r.supervisorId === s.supervisorId || r.territoryId === s.territoryId },
  { key: "sales", label: "المبيعات", fetch: () => mockApi.sales.list(), owned: teamRepOwned },
  { key: "collections", label: "التحصيل", fetch: () => mockApi.collections.list(), owned: teamRepOwned },
  { key: "returns", label: "المرتجعات", fetch: () => mockApi.returns.list(), owned: teamRepOwned },
  { key: "visits", label: "الزيارات", fetch: () => mockApi.visits.list(), owned: teamRepOwned },
  { key: "routes", label: "خطط السير", fetch: () => mockApi.routes.list(), owned: teamRepOwned },
  { key: "vanStock", label: "مخزون السيارة", fetch: () => mockApi.inventory.vanStock(), owned: teamRepOwned },
  { key: "stockRequests", label: "طلبات البضاعة", fetch: () => mockApi.inventory.requests(), owned: teamRepOwned },
  { key: "stockTransfers", label: "تحويلات المخزون", fetch: () => mockApi.inventory.transfers(), owned: (r, s) => typeof r.toRepId === "string" && visibleRepIds(s).includes(r.toRepId) },
  { key: "stockMovements", label: "حركة المخزون", fetch: () => mockApi.inventory.movements(), owned: (r, s) => !r.repId || (typeof r.repId === "string" && visibleRepIds(s).includes(r.repId)) },
  { key: "cashBoxes", label: "صناديق النقد", fetch: () => mockApi.cash.boxes(), owned: (r, s) => typeof r.ownerId === "string" && visibleUserIds(s).includes(r.ownerId) },
  { key: "cashMovements", label: "حركات الصندوق", fetch: () => mockApi.cash.movements(), owned: (r, s) => visibleCashBoxIds(s).includes(String(r.cashBoxId)) || (typeof r.relatedRepId === "string" && visibleRepIds(s).includes(r.relatedRepId)) },
  { key: "targets", label: "الأهداف", fetch: () => mockApi.targets.list(), owned: (r, s) => typeof r.ownerId === "string" && visibleUserIds(s).includes(r.ownerId) },
  { key: "custody", label: "العهد", fetch: () => mockApi.custody.list(), owned: (r, s) => typeof r.assignedToId === "string" && visibleUserIds(s).includes(r.assignedToId) },
  { key: "leaves", label: "الإجازات", fetch: () => mockApi.leaves.list(), owned: (r, s) => typeof r.employeeId === "string" && visibleUserIds(s).includes(r.employeeId) },
  { key: "gps", label: "GPS", fetch: () => mockApi.gps.locations(), owned: (r, s) => typeof r.userId === "string" && visibleUserIds(s).includes(r.userId) },
  { key: "notifications", label: "الإشعارات", fetch: () => mockApi.notifications.list(), owned: (r, s) => !r.recipientId || (typeof r.recipientId === "string" && visibleUserIds(s).includes(r.recipientId)) },
  { key: "messages", label: "المراسلات", fetch: () => mockApi.messages.list(), owned: (r, s) => Array.isArray(r.participants) && (r.participants as string[]).includes(s.userId) },
  { key: "approvals", label: "طلبات الاعتماد", fetch: () => mockApi.approvals.list(), owned: (r, s) => typeof r.requestedById === "string" && visibleUserIds(s).includes(r.requestedById) },
  {
    key: "archive",
    label: "الأرشيف",
    fetch: () => mockApi.archive.list(),
    owned: (r, s) => {
      const team = visibleUsers(s);
      const me = users.find((u) => u.id === s.userId);
      if (me && r.createdBy === me.name) return true;
      if (r.createdBy && team.some((u) => u.name === r.createdBy)) return true;
      if (r.entityType === "employee" && typeof r.entityId === "string" && visibleUserIds(s).includes(r.entityId)) return true;
      return true;
    },
  },
  { key: "territories", label: "المناطق", fetch: () => mockApi.organization.territories(), owned: (r, s) => r.id === s.territoryId || r.supervisorId === s.supervisorId },
  { key: "users", label: "المستخدمون", fetch: () => mockApi.users.list(), owned: (r, s) => typeof r.id === "string" && visibleUserIds(s).includes(r.id) },
  { key: "warehouseStock", label: "مخزون المستودع", fetch: () => mockApi.inventory.warehouseStock(), owned: () => true },
  { key: "audit", label: "سجل التدقيق", fetch: () => mockApi.audit.list(), owned: (r, s) => {
    const teamNames = new Set(visibleUsers(s).map((u) => u.name));
    const teamIds = new Set<string>([...visibleRepIds(s), ...visibleUserIds(s)]);
    return teamNames.has(String(r.actor)) || teamIds.has(String(r.entityId));
  } },
  { key: "teamDailyPlans", label: "خطط اليوم (فريق)", fetch: () => mockApi.team.dailyPlans(), owned: (r, s) => typeof r.repId === "string" && visibleRepIds(s).includes(r.repId) },
  { key: "teamTrips", label: "جولات الفريق", fetch: () => mockApi.team.trips(), owned: (r, s) => typeof r.repId === "string" && visibleRepIds(s).includes(r.repId) },
  { key: "teamExpenses", label: "مصروفات الفريق", fetch: () => mockApi.team.tripExpenses(), owned: (r, s) => typeof r.repId === "string" && visibleRepIds(s).includes(r.repId) },
  { key: "teamClosings", label: "إقفالات الفريق", fetch: () => mockApi.team.dailyClosings(), owned: (r, s) => typeof r.repId === "string" && visibleRepIds(s).includes(r.repId) },
  { key: "teamTargetOrgs", label: "مؤسسات مستهدفة", fetch: () => mockApi.team.targetOrganizations(), owned: (r, s) => typeof r.requestedById === "string" && visibleRepIds(s).includes(r.requestedById) },
  { key: "teamCounts", label: "جرد الفريق", fetch: () => mockApi.team.inventoryCounts(), owned: (r, s) => typeof r.repId === "string" && visibleRepIds(s).includes(r.repId) },
  { key: "teamDeposits", label: "توريدات الفريق", fetch: () => mockApi.team.deposits(), owned: (r, s) => typeof r.repId === "string" && visibleRepIds(s).includes(r.repId) },
];

const ID_SOURCES = ["customers", "sales", "collections", "returns", "visits", "routes", "stockRequests", "custody", "cashBoxes", "teamDailyPlans", "teamTrips", "teamExpenses", "teamClosings", "teamTargetOrgs", "teamCounts", "teamDeposits"];

const REP_A = "u-rp-01";
const REP_B = "u-rp-02";
const SUP_A = "u-sp-01";
const SUP_B = "u-sp-02";

const check = async (runner: Runner, scope: DataScope, ownIds: Set<string>): Promise<CheckResult> => {
  const rows = (await runner.fetch()) as Record<string, unknown>[];
  if (runner.key === "warehouseStock") {
    const ok = scope.scopeType === "self" ? rows.length === 0 : true;
    return { label: runner.label, ok, total: rows.length, leaked: 0, note: ok ? (scope.scopeType === "self" ? "مُخفى تماماً للمندوب" : "متاح للمشرف") : "تسريب! المستودع العام ظهر للمندوب" };
  }
  const leakedRows = rows.filter((x) => !runner.owned(x, scope, ownIds));
  const leakIds = leakedRows.slice(0, 3).map((x) => String(x.id ?? x.number ?? "?")).join("، ");
  return {
    label: runner.label,
    ok: leakedRows.length === 0,
    total: rows.length,
    leaked: leakedRows.length,
    note: leakedRows.length > 0 ? `خارج النطاق: ${leakIds}` : "",
  };
};

interface RunConfig {
  userIds: string[];
  runners: Runner[];
  title: string;
}

export function DataScopeTestPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ScopeResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setRunning(true);
    setFinished(false);
    setError("");
    setResults([]);
    const original = useAuthStore.getState().user;
    const outcomes: ScopeResult[] = [];
    const configs: RunConfig[] = [
      { userIds: [REP_A, REP_B], runners: RUNNERS, title: "مندوب ضد مندوب" },
      { userIds: [SUP_A, SUP_B], runners: SUPERVISOR_RUNNERS, title: "مشرف ضد مشرف" },
    ];
    try {
      for (const cfg of configs) {
        for (const userId of cfg.userIds) {
          useAuthStore.setState({ user: users.find((u) => u.id === userId) ?? null });
          const scope = getDataScope(useAuthStore.getState().user);
          if (!scope) throw new Error(`تعذر إنشاء نطاق بيانات لـ ${userId}`);
          const runners = cfg.runners;
          const ownIds = new Set<string>();
          const ran = await Promise.all(
            runners.map(async (r) => ({ r, rows: (await r.fetch()) as Record<string, unknown>[] }))
          );
          for (const { r, rows } of ran) {
            if (ID_SOURCES.includes(r.key)) rows.forEach((x) => ownIds.add(String(x.id)));
          }
          const resultsForUser = await Promise.all(
            runners.map((r) => check(r, scope, ownIds))
          );
          outcomes.push({ scope, results: resultsForUser });
        }
      }
      setResults(outcomes);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      useAuthStore.setState({ user: original });
      setRunning(false);
      setFinished(true);
    }
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allOk = results.length > 0 && results.every((r) => r.results.every((c) => c.ok));
  const total = results.reduce((s, r) => s + r.results.length, 0);
  const passed = results.reduce((s, r) => s + r.results.filter((c) => c.ok).length, 0);

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "اختبار عزل البيانات (تطوير)" }]}
        title="اختبار عزل البيانات — المندوبين والمشرفين"
        description="تحقق تلقائي: مندوب «أ»/مشرف «أ» لا يستطيع الوصول لأي بيانات تخص مندوب/مشرف «ب» عبر طبقة الخدمات"
        actions={
          <Button variant="primary" icon={<RefreshCw size={15} />} onClick={() => void run()} disabled={running}>
            {running ? "جارٍ التنفيذ..." : "إعادة التشغيل"}
          </Button>
        }
      >
        <div className="stat-grid">
          <Card><div className="stat-card-body"><span className="muted">الحالة</span><b style={{ fontSize: "var(--font-size-xl)", color: allOk ? "var(--color-success)" : "var(--color-danger)" }}>{finished ? (allOk ? "ناجح ✓" : "فشل ✗") : "..."}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted">فحوصات ناجحة</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatNumber(passed)} / {formatNumber(total)}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted">فريق المشرف «أ»</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{visibleRepIds({ role: "SUPERVISOR", userId: SUP_A, scopeType: "team", supervisorId: SUP_A }).length} مندوب</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted">فريق المشرف «ب»</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{visibleRepIds({ role: "SUPERVISOR", userId: SUP_B, scopeType: "team", supervisorId: SUP_B }).length} مندوب</b></div></Card>
        </div>
      </StickyPageHeader>

      {error && <div className="alert alert-danger" style={{ marginBottom: "var(--space-4)" }}>{error}</div>}

      <div className="stack">
        {results.map((r) => {
          const repName = users.find((u) => u.id === r.scope.userId)?.name ?? r.scope.userId;
          return (
            <Card key={r.scope.userId} title={`النطاق: ${repName} (${r.scope.userId}) — ${r.scope.scopeType}`}>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>المصدر / الكيان</th>
                      <th className="numeric">الصفوف</th>
                      <th className="numeric">خارج النطاق</th>
                      <th>النتيجة</th>
                      <th>التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.results.map((c) => (
                      <tr key={c.label}>
                        <td style={{ fontWeight: 500 }}>{c.label}</td>
                        <td className="numeric num">{formatNumber(c.total)}</td>
                        <td className="numeric num" style={{ color: c.leaked > 0 ? "var(--color-danger)" : undefined }}>{formatNumber(c.leaked)}</td>
                        <td>
                          <Badge tone={c.ok ? "success" : "danger"}>{c.ok ? "مقبول" : "تسريب"}</Badge>
                        </td>
                        <td className="muted" style={{ fontSize: "var(--font-size-sm)" }}>{c.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}

        {results.length === 4 && (
          <Card title="النتيجة النهائية">
            {allOk ? (
              <div className="alert alert-success" style={{ marginBottom: 0 }}>
                <ShieldCheck size={17} />
                <div>
                  <div className="alert-title">عزل البيانات مكتمل — لا يوجد أي تسريب بين المندوبين ولا بين المشرفين</div>
                  <div>كل المصادر التي اختُبرت ترجع بيانات نطاق المستخدم الحالي فقط (أو ترفض البيانات بالكامل).</div>
                </div>
              </div>
            ) : (
              <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                <ShieldAlert size={17} />
                <div>
                  <div className="alert-title">يوجد تسريب بيانات — راجع الصفوف المرفوضة أعلاه</div>
                  <div>أي صف «خارج النطاق» غير صفري يعني وصول مستخدم لبيانات خارج نطاقه.</div>
                </div>
              </div>
            )}
          </Card>
        )}

        <div className="alert alert-info">
          <Play size={15} />
          <div style={{ fontSize: "var(--font-size-sm)" }}>
            يُشغَّل هذا الاختبار على طبقة الخدمات (mockApi) مع تبديل المستخدم الحالي بين المندوبين ثم بين المشرفين —
            إنه يثبت أن حماية البيانات محمية من المصدر وليست مجرد إخفاء للواجهة.
          </div>
        </div>
      </div>
    </div>
  );
}
