import { useMemo } from "react";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { getDataScope, visibleRepIds, type DataScope } from "@/services/scope";
import { supervisorPolicies, SYSTEM_TODAY } from "@/config/supervisorPolicies";
import { useAuthStore } from "@/store/auth";
import type { User, Visit, Invoice, Collection, DailyClosing, SupervisorNote, AssetRequest, CustomerTransferRecord, CustomerSuspension } from "@/types";
import { routeDeviation } from "@/mock/gps";

export interface RepStat {
  rep: User;
  todayVisits: number;
  todayPlannedVisits: number;
  completedVisits: number;
  todaySales: number;
  todayCollections: number;
  targetSales: number;
  targetCollections: number;
  isInField: boolean;
  offline: boolean;
  closingStatus: "done" | "draft" | "none";
}

/**
 * Single source of team data for the supervisor module.
 * Every list is already row-level scoped (team) by the service layer.
 */
export function useTeamData() {
  const user = useAuthStore((s) => s.user);
  const scope = useMemo(() => getDataScope(user), [user]);

  const { data: reps, loading: repsLoading } = useData(() => mockApi.team.representatives());
  const { data: dailyPlans } = useData(() => mockApi.team.dailyPlans());
  const { data: trips } = useData(() => mockApi.team.trips());
  const { data: visits } = useData(() => mockApi.visits.list());
  const { data: sales } = useData(() => mockApi.sales.list());
  const { data: collections } = useData(() => mockApi.collections.list());
  const { data: targets } = useData(() => mockApi.targets.list());
  const { data: returns } = useData(() => mockApi.returns.list());
  const { data: closings } = useData(() => mockApi.team.dailyClosings());
  const { data: deposits } = useData(() => mockApi.team.deposits());
  const { data: gps } = useData(() => mockApi.gps.locations());
  const { data: approvals } = useData(() => mockApi.approvals.list());
  const { data: notes } = useData(() => mockApi.team.notes());
  const { data: customers } = useData(() => mockApi.customers.list());
  const { data: stockRequests } = useData(() => mockApi.inventory.requests());
  const { data: stockTransfers } = useData(() => mockApi.inventory.transfers());
  const { data: stockMovements } = useData(() => mockApi.inventory.movements());
  const { data: vanStock } = useData(() => mockApi.inventory.vanStock());
  const { data: warehouseStock } = useData(() => mockApi.inventory.warehouseStock());
  const { data: cashBoxes } = useData(() => mockApi.cash.boxes());
  const { data: cashMovements } = useData(() => mockApi.cash.movements());
  const { data: custody } = useData(() => mockApi.custody.list());
  const { data: assetRequests } = useData(() => mockApi.assets.requests());
  const { data: customerTransfers } = useData(() => mockApi.customers.transfers());
  const { data: customerSuspensions } = useData(() => mockApi.customers.suspensions());
  const { data: targetOrganizations } = useData(() => mockApi.team.targetOrganizations());
  const { data: inventoryCounts } = useData(() => mockApi.team.inventoryCounts());
  const { data: teamDeposits } = useData(() => mockApi.team.deposits());
  const { data: loadingOrders } = useData(() => mockApi.team.loadingOrders());
  const { data: auditLogs } = useData(() => mockApi.audit.list());

  const visibleRepIdSet = useMemo(() => new Set(visibleRepIds(scope ?? {} as DataScope)), [scope]);

  const statByRep = useMemo(() => {
    const map = new Map<string, RepStat>();
    (reps ?? []).forEach((rep) => {
      const today = SYSTEM_TODAY;
      const tVisits = (visits ?? []).filter((v) => v.repId === rep.id && v.date === today);
      const todayPlannedVisits = (dailyPlans ?? [])
        .filter((p) => p.repId === rep.id && p.date === today)
        .reduce((acc, p) => acc + p.entries.length, 0);
      const monthTargets = (targets ?? []).find(
        (t) => t.ownerId === rep.id && t.period === "monthly" && t.startDate <= today && today <= t.endDate,
      );
      const activeTrips = (trips ?? []).filter((t) => t.repId === rep.id && t.date === today);
      const gpsRow = (gps ?? []).find((g) => g.userId === rep.id);
      const closing = (closings ?? []).find((c) => c.repId === rep.id && c.date === today);
      const gpsDeviation = routeDeviation.find((r) => r.userId === rep.id);
      const offline = (gpsRow && gpsRow.updatedAt
        ? new Date(gpsRow.updatedAt).getTime() < Date.now() - supervisorPolicies.gps.offlineAfterMinutes * 60 * 1000
        : !gpsRow);

      map.set(rep.id, {
        rep,
        todayVisits: tVisits.length,
        todayPlannedVisits,
        completedVisits: tVisits.filter((v) => v.result === "visited" || v.result === "completed").length,
        todaySales: (sales ?? []).filter((s) => s.repId === rep.id && s.date === today).reduce((a, s) => a + (s.net ?? s.total), 0),
        todayCollections: (collections ?? []).filter((c) => c.repId === rep.id && c.date === today).reduce((a, c) => a + c.amount, 0),
        targetSales: monthTargets?.salesAmount ?? 0,
        targetCollections: monthTargets?.collectionAmount ?? 0,
        isInField: activeTrips.some((t) => t.status === "in_progress" || t.status === "paused"),
        offline: !!offline,
        closingStatus: closing ? (closing.status === "draft" ? "draft" : "done") : "none",
      });
    });
    return map;
  }, [reps, visits, dailyPlans, targets, trips, gps, closings, sales, collections]);

  const totals = useMemo(() => {
    let todaySales = 0;
    let todayCollections = 0;
    let targetSales = 0;
    let targetCollections = 0;
    let planned = 0;
    let completed = 0;
    let inField = 0;
    let offline = 0;
    (reps ?? []).forEach((r) => {
      const s = statByRep.get(r.id);
      if (!s) return;
      todaySales += s.todaySales;
      todayCollections += s.todayCollections;
      targetSales += s.targetSales;
      targetCollections += s.targetCollections;
      planned += s.todayPlannedVisits;
      completed += s.completedVisits;
      if (s.isInField) inField += 1;
      if (s.offline) offline += 1;
    });
    const pendingApprovals = (approvals ?? [])
      .filter((a) => ["pending", "submitted", "under_review"].includes(a.status)).length;
    const draftClosings = (reps ?? []).filter((r) => statByRep.get(r.id)?.closingStatus === "draft").length;
    const doneClosings = (reps ?? []).filter((r) => statByRep.get(r.id)?.closingStatus === "done").length;
    const lateReps = (reps ?? []).filter((r) => statByRep.get(r.id)?.offline).length;
    return {
      todaySales,
      todayCollections,
      targetSales,
      targetCollections,
      planned,
      completed,
      inField,
      offline,
      lateReps,
      pendingApprovals,
      draftClosings,
      doneClosings,
      teamSize: (reps ?? []).length,
    };
  }, [reps, statByRep, approvals]);

  const supervisorAlerts = useMemo(() => {
    const alerts: Array<{ type: string; repId: string; repName: string; message: string; severity: "high" | "warning" | "info" }> = [];
    (reps ?? []).forEach((rep) => {
      const s = statByRep.get(rep.id);
      const dev = routeDeviation.find((d) => d.userId === rep.id);
      if (s?.offline) alerts.push({ type: "gps_offline", repId: rep.id, repName: rep.name, message: "GPS غير متصل ولا يزال دون اتصال", severity: s.isInField ? "high" : "warning" });
      if (dev?.status === "deviation") alerts.push({ type: "route_deviation", repId: rep.id, repName: rep.name, message: `خرج عن المسار (${dev.deviationKm} كم)`, severity: dev.deviationKm > 3 ? "high" : "warning" });
    });
    (approvals ?? []).filter((a) => ["pending", "submitted", "under_review"].includes(a.status)).forEach((a) => {
      alerts.push({ type: "pending_approval", repId: "", repName: "", message: `طلب اعتماد معلق: ${a.title}`, severity: "info" });
    });
    return alerts;
  }, [reps, statByRep, approvals]);

  return {
    reps: reps ?? [],
    repsLoading,
    dailyPlans: dailyPlans ?? [],
    trips: trips ?? [],
    tripsByRep: (repId: string) => (trips ?? []).filter((t) => t.repId === repId),
    visits: visits ?? [],
    visitsByRep: (repId: string, date?: string) => (visits ?? []).filter((v) => v.repId === repId && (!date || v.date === date)),
    sales: sales ?? [],
    collections: collections ?? [],
    targets: targets ?? [],
    returns: returns ?? [],
    closings: closings ?? [],
    deposits: deposits ?? [],
    gps: gps ?? [],
    approvals: approvals ?? [],
    notes: notes ?? [],
    customers: customers ?? [],
    stockRequests: stockRequests ?? [],
    stockTransfers: stockTransfers ?? [],
    stockMovements: stockMovements ?? [],
    vanStock: vanStock ?? [],
    warehouseStock: warehouseStock ?? [],
    cashBoxes: cashBoxes ?? [],
    cashMovements: cashMovements ?? [],
    custody: custody ?? [],
    assetRequests: assetRequests ?? [],
     customerTransfers: customerTransfers ?? [],
    customerSuspensions: customerSuspensions ?? [],
    targetOrganizations: targetOrganizations ?? [],
    inventoryCounts: inventoryCounts ?? [],
    teamDeposits: teamDeposits ?? [],
    loadingOrders: loadingOrders ?? [],
    auditLogs: auditLogs ?? [],
    statByRep,
    totals,
    supervisorAlerts,
    today: SYSTEM_TODAY,
    gpsIntervalMinutes: supervisorPolicies.gps.intervalMinutes,
    offlineAfterMinutes: supervisorPolicies.gps.offlineAfterMinutes,
    scope,
    visibleRepIds: () => Array.from(visibleRepIdSet),
  };
}

export type TeamData = ReturnType<typeof useTeamData>;

