import { useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { users, reps, supervisors } from "@/mock/users";
import { territories, teams } from "@/mock/organization";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/FormControls";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { CURRENT_MONTH } from "@/config/date";
import {
  getAllRepsProfitabilityEnhanced,
  getTeamProfitability,
  getTerritoryProfitabilityFull,
} from "@/services/profitability.service";
import type { TeamProfitability, TerritoryProfitabilityFull } from "@/types";
import type { RepProfitabilityEnhanced } from "@/services/profitability.service";
import { RepDetailDrawer } from "./RepDetailDrawer";
import { TeamDetailDrawer } from "./TeamDetailDrawer";
import { TerritoryDetailDrawer } from "./TerritoryDetailDrawer";
import { formatMoney, formatPercent } from "@/utils/format";

type Tab = "rep" | "team" | "territory";

const CLASSIFICATION_LABELS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  excellent: { label: "ممتاز", tone: "success" },
  profitable: { label: "مربح", tone: "success" },
  low_margin: { label: "هامش منخفض", tone: "warning" },
  review: { label: "يحتاج مراجعة", tone: "warning" },
  unprofitable: { label: "غير مربح", tone: "danger" },
};

export function ProfitabilityPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState(CURRENT_MONTH);
  const [branchFilter, setBranchFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [tab, setTab] = useState<Tab>("rep");

  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);

  const isManager = user?.role === "GENERAL_MANAGER" || user?.role === "SALES_MANAGER";

  const repData = useMemo(() => getAllRepsProfitabilityEnhanced(period), [period]);
  const teamData = useMemo(() => getTeamProfitability(period), [period]);
  const territoryData = useMemo(() => getTerritoryProfitabilityFull(period), [period]);

  const filteredReps = useMemo(() => {
    let rows = repData;
    if (territoryFilter) rows = rows.filter((r) => r.territoryId === territoryFilter);
    if (user?.role === "SUPERVISOR") rows = rows.filter((r) => r.supervisorId === user.id);
    if (user?.role === "REPRESENTATIVE") rows = rows.filter((r) => r.repId === user.id);
    return rows;
  }, [repData, territoryFilter, user?.role, user?.id]);

  const filteredTeams = useMemo(() => {
    let rows = teamData;
    if (territoryFilter) {
      const team = teams.find((t) =>
        t.territoryIds.includes(territoryFilter) && t.id === t.id
      );
      if (team) rows = rows.filter((r) => r.teamId === team.id);
    }
    if (user?.role === "SUPERVISOR") rows = rows.filter((r) => r.supervisorId === user.id);
    return rows;
  }, [teamData, territoryFilter, user?.role, user?.id]);

  const filteredTerritories = useMemo(() => {
    let rows = territoryData;
    if (territoryFilter) rows = rows.filter((r) => r.territoryId === territoryFilter);
    if (branchFilter) {
      const branchTerritories = territories.filter((t) => {
        const branchName = t.branchId === "b-01" ? "الرياض" : t.branchId === "b-02" ? "جدة" : "الدمام";
        return branchName === branchFilter || t.branchId === branchFilter;
      });
      rows = rows.filter((r) => branchTerritories.some((t) => t.id === r.territoryId));
    }
    return rows;
  }, [territoryData, territoryFilter, branchFilter]);

  const kpis = useMemo(() => {
    if (tab === "rep") {
      const totalRevenue = filteredReps.reduce((s, r) => s + r.revenue, 0);
      const totalCogs = filteredReps.reduce((s, r) => s + r.cogs, 0);
      const totalGross = filteredReps.reduce((s, r) => s + r.grossProfit, 0);
      const totalDirect = filteredReps.reduce((s, r) => s + r.operatingCosts.total + r.commission, 0);
      const totalContribution = filteredReps.reduce((s, r) => s + r.netContribution, 0);
      const totalNet = totalContribution;
      return { revenue: totalRevenue, cogs: totalCogs, gross: totalGross, direct: totalDirect, contribution: totalContribution, net: totalNet };
    }
    if (tab === "team") {
      const totalRevenue = filteredTeams.reduce((s, r) => s + r.revenue, 0);
      const totalCogs = filteredTeams.reduce((s, r) => s + r.cogs, 0);
      const totalGross = filteredTeams.reduce((s, r) => s + r.grossProfit, 0);
      const totalDirect = filteredTeams.reduce((s, r) => s + r.directCosts, 0);
      const totalContribution = filteredTeams.reduce((s, r) => s + r.contributionProfit, 0);
      const totalNet = filteredTeams.reduce((s, r) => s + r.netProfit, 0);
      return { revenue: totalRevenue, cogs: totalCogs, gross: totalGross, direct: totalDirect, contribution: totalContribution, net: totalNet };
    }
    const totalRevenue = filteredTerritories.reduce((s, r) => s + r.revenue, 0);
    const totalCogs = filteredTerritories.reduce((s, r) => s + r.cogs, 0);
    const totalGross = filteredTerritories.reduce((s, r) => s + r.grossProfit, 0);
    const totalDirect = filteredTerritories.reduce((s, r) => s + r.directCosts, 0);
    const totalContribution = filteredTerritories.reduce((s, r) => s + r.contributionProfit, 0);
    const totalNet = filteredTerritories.reduce((s, r) => s + r.netProfit, 0);
    return { revenue: totalRevenue, cogs: totalCogs, gross: totalGross, direct: totalDirect, contribution: totalContribution, net: totalNet };
  }, [tab, filteredReps, filteredTeams, filteredTerritories]);

  const repColumns: Column<RepProfitabilityEnhanced>[] = [
    {
      key: "rep", header: "المندوب", sortable: true,
      sortValue: (r) => r.repName,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.repName}</div>
          <div style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-muted)" }}>
            {r.territoryName} • {r.supervisorName}
          </div>
        </div>
      ),
    },
    {
      key: "revenue", header: "المبيعات", numeric: true, sortable: true,
      sortValue: (r) => r.revenue,
      render: (r) => <span className="num">{formatMoney(r.revenue)}</span>,
    },
    {
      key: "cogs", header: "COGS", numeric: true, sortable: true,
      sortValue: (r) => r.cogs,
      render: (r) => <span className="num" style={{ color: "var(--color-text-muted)" }}>{formatMoney(r.cogs)}</span>,
    },
    {
      key: "gross", header: "Gross Profit", numeric: true, sortable: true,
      sortValue: (r) => r.grossProfit,
      render: (r) => <span className="num" style={{ fontWeight: 600, color: "var(--color-success)" }}>{formatMoney(r.grossProfit)}</span>,
    },
    {
      key: "direct", header: "التشغيل", numeric: true, sortable: true,
      sortValue: (r) => r.operatingCosts.total + r.commission,
      render: (r) => <span className="num" style={{ color: "var(--color-danger)" }}>{formatMoney(r.operatingCosts.total + r.commission)}</span>,
    },
    {
      key: "contribution", header: "Contribution", numeric: true, sortable: true,
      sortValue: (r) => r.netContribution,
      render: (r) => (
        <span className="num" style={{ fontWeight: 600, color: r.netContribution >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
          {formatMoney(r.netContribution)}
        </span>
      ),
    },
    {
      key: "margin", header: "الهامش", numeric: true, sortable: true,
      sortValue: (r) => r.grossMargin,
      render: (r) => <span className="num">{formatPercent(r.grossMargin / 100)}</span>,
    },
    {
      key: "target", header: "الإنجاز", numeric: true, sortable: true,
      sortValue: (r) => r.targetAchievement,
      render: (r) => <span className="num">{r.targetAchievement.toFixed(0)}%</span>,
    },
    {
      key: "class", header: "الحالة",
      render: (r) => {
        const cls = CLASSIFICATION_LABELS[r.classification] ?? CLASSIFICATION_LABELS.profitable;
        return <Badge tone={cls.tone}>{cls.label}</Badge>;
      },
    },
  ];

  const teamColumns: Column<TeamProfitability>[] = [
    {
      key: "team", header: "الفريق", sortable: true,
      sortValue: (r) => r.teamName,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.teamName}</div>
          <div style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-muted)" }}>
            المشرف: {r.supervisorName}
          </div>
        </div>
      ),
    },
    {
      key: "repCount", header: "المناديب", numeric: true,
      render: (r) => <span className="num">{r.repCount}</span>,
    },
    {
      key: "revenue", header: "المبيعات", numeric: true, sortable: true,
      sortValue: (r) => r.revenue,
      render: (r) => <span className="num">{formatMoney(r.revenue)}</span>,
    },
    {
      key: "gross", header: "Gross Profit", numeric: true, sortable: true,
      sortValue: (r) => r.grossProfit,
      render: (r) => <span className="num" style={{ fontWeight: 600, color: "var(--color-success)" }}>{formatMoney(r.grossProfit)}</span>,
    },
    {
      key: "direct", header: "التشغيل", numeric: true, sortable: true,
      sortValue: (r) => r.directCosts,
      render: (r) => <span className="num" style={{ color: "var(--color-danger)" }}>{formatMoney(r.directCosts)}</span>,
    },
    {
      key: "contribution", header: "Contribution", numeric: true, sortable: true,
      sortValue: (r) => r.contributionProfit,
      render: (r) => (
        <span className="num" style={{ fontWeight: 600, color: r.contributionProfit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
          {formatMoney(r.contributionProfit)}
        </span>
      ),
    },
    {
      key: "net", header: "صافي الربح", numeric: true, sortable: true,
      sortValue: (r) => r.netProfit,
      render: (r) => (
        <span className="num" style={{ fontWeight: 600, color: r.netProfit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
          {formatMoney(r.netProfit)}
        </span>
      ),
    },
    {
      key: "margin", header: "الهامش", numeric: true, sortable: true,
      sortValue: (r) => r.grossMargin,
      render: (r) => <span className="num">{formatPercent(r.grossMargin / 100)}</span>,
    },
    {
      key: "target", header: "الإنجاز", numeric: true, sortable: true,
      sortValue: (r) => r.targetAchievement,
      render: (r) => <span className="num">{r.targetAchievement.toFixed(0)}%</span>,
    },
    {
      key: "class", header: "الحالة",
      render: (r) => {
        const cls = CLASSIFICATION_LABELS[r.classification] ?? CLASSIFICATION_LABELS.profitable;
        return <Badge tone={cls.tone}>{cls.label}</Badge>;
      },
    },
  ];

  const territoryColumns: Column<TerritoryProfitabilityFull>[] = [
    {
      key: "territory", header: "المنطقة", sortable: true,
      sortValue: (r) => r.territoryName,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.territoryName}</div>
          <div style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-muted)" }}>
            {r.branchName} • {r.teamCount} فرق
          </div>
        </div>
      ),
    },
    {
      key: "repCount", header: "المناديب", numeric: true,
      render: (r) => <span className="num">{r.repCount}</span>,
    },
    {
      key: "revenue", header: "المبيعات", numeric: true, sortable: true,
      sortValue: (r) => r.revenue,
      render: (r) => <span className="num">{formatMoney(r.revenue)}</span>,
    },
    {
      key: "gross", header: "Gross Profit", numeric: true, sortable: true,
      sortValue: (r) => r.grossProfit,
      render: (r) => <span className="num" style={{ fontWeight: 600, color: "var(--color-success)" }}>{formatMoney(r.grossProfit)}</span>,
    },
    {
      key: "direct", header: "التشغيل", numeric: true, sortable: true,
      sortValue: (r) => r.directCosts,
      render: (r) => <span className="num" style={{ color: "var(--color-danger)" }}>{formatMoney(r.directCosts)}</span>,
    },
    {
      key: "contribution", header: "Contribution", numeric: true, sortable: true,
      sortValue: (r) => r.contributionProfit,
      render: (r) => (
        <span className="num" style={{ fontWeight: 600, color: r.contributionProfit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
          {formatMoney(r.contributionProfit)}
        </span>
      ),
    },
    {
      key: "net", header: "صافي الربح", numeric: true, sortable: true,
      sortValue: (r) => r.netProfit,
      render: (r) => (
        <span className="num" style={{ fontWeight: 600, color: r.netProfit >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
          {formatMoney(r.netProfit)}
        </span>
      ),
    },
    {
      key: "margin", header: "الهامش", numeric: true, sortable: true,
      sortValue: (r) => r.grossMargin,
      render: (r) => <span className="num">{formatPercent(r.grossMargin / 100)}</span>,
    },
    {
      key: "costPerVisit", header: "تكلفة/زيارة", numeric: true, sortable: true,
      sortValue: (r) => r.costPerVisit,
      render: (r) => <span className="num">{formatMoney(r.costPerVisit)}</span>,
    },
    {
      key: "costPerCustomer", header: "تكلفة/عميل", numeric: true, sortable: true,
      sortValue: (r) => r.costPerCustomer,
      render: (r) => <span className="num">{formatMoney(r.costPerCustomer)}</span>,
    },
    {
      key: "target", header: "الإنجاز", numeric: true, sortable: true,
      sortValue: (r) => r.targetAchievement,
      render: (r) => <span className="num">{r.targetAchievement.toFixed(0)}%</span>,
    },
    {
      key: "class", header: "الحالة",
      render: (r) => {
        const cls = CLASSIFICATION_LABELS[r.classification] ?? CLASSIFICATION_LABELS.profitable;
        return <Badge tone={cls.tone}>{cls.label}</Badge>;
      },
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "تحليل الربحية" }]}
        title="تحليل الربحية"
        description="الربح الإجمالي والمساهمة عبر المناديب والفرق والمناطق"
      >
        <FilterBar>
          <Select
            label="الفترة"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: "2026-08", label: "أغسطس 2026" },
              { value: "2026-07", label: "يوليو 2026" },
              { value: "2026-06", label: "يونيو 2026" },
            ]}
          />
          {isManager && (
            <>
              <Select
                label="المنطقة"
                value={territoryFilter}
                onChange={(e) => setTerritoryFilter(e.target.value)}
                placeholder="كل المناطق"
                options={territories.map((t) => ({ value: t.id, label: t.name }))}
              />
            </>
          )}
        </FilterBar>
      </StickyPageHeader>

      <div className="profitability-kpi-grid" style={{ marginBottom: "var(--space-4)" }}>
        <div className="kpi-compact">
          <div className="kpi-compact-label">إجمالي المبيعات</div>
          <div className="kpi-compact-value">{formatMoney(kpis.revenue)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">تكلفة البضاعة</div>
          <div className="kpi-compact-value" style={{ color: "var(--color-text-muted)" }}>{formatMoney(kpis.cogs)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">Gross Profit</div>
          <div className="kpi-compact-value" style={{ color: "var(--color-success)" }}>{formatMoney(kpis.gross)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">تكاليف التشغيل</div>
          <div className="kpi-compact-value" style={{ color: "var(--color-danger)" }}>{formatMoney(kpis.direct)}</div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">Contribution Profit</div>
          <div className="kpi-compact-value" style={{ color: kpis.contribution >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
            {formatMoney(kpis.contribution)}
          </div>
        </div>
        <div className="kpi-compact">
          <div className="kpi-compact-label">صافي الربحية</div>
          <div className="kpi-compact-value" style={{ color: kpis.net >= 0 ? "var(--color-success)" : "var(--color-danger)", fontWeight: 700 }}>
            {formatMoney(kpis.net)}
          </div>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={(k) => setTab(k as Tab)}
        tabs={[
          { key: "rep", label: "المندوبون", content: null },
          { key: "team", label: "الفرق", content: null },
          { key: "territory", label: "المناطق", content: null },
        ]}
      />

      <div style={{ marginTop: "var(--space-4)" }}>
        {tab === "rep" && (
          <DataTable
            columns={repColumns}
            rows={filteredReps}
            rowKey={(r) => r.repId}
            searchPlaceholder="بحث بالاسم..."
            searchKeys={(r) => r.repName}
            onRowClick={(r) => setSelectedRep(r.repId)}
            pageSize={10}
            emptyTitle="لا توجد بيانات ربحية للمناديب"
          />
        )}
        {tab === "team" && (
          <DataTable
            columns={teamColumns}
            rows={filteredTeams}
            rowKey={(r) => r.teamId}
            searchPlaceholder="بحث بالفريق..."
            searchKeys={(r) => r.teamName}
            onRowClick={(r) => setSelectedTeam(r.teamId)}
            pageSize={10}
            emptyTitle="لا توجد بيانات ربحية للفرق"
          />
        )}
        {tab === "territory" && (
          <DataTable
            columns={territoryColumns}
            rows={filteredTerritories}
            rowKey={(r) => r.territoryId}
            searchPlaceholder="بحث بالمنطقة..."
            searchKeys={(r) => r.territoryName}
            onRowClick={(r) => setSelectedTerritory(r.territoryId)}
            pageSize={10}
            emptyTitle="لا توجد بيانات ربحية للمناطق"
          />
        )}
      </div>

      {selectedRep && (
        <RepDetailDrawer
          repId={selectedRep}
          period={period}
          onClose={() => setSelectedRep(null)}
        />
      )}
      {selectedTeam && (
        <TeamDetailDrawer
          teamId={selectedTeam}
          period={period}
          onClose={() => setSelectedTeam(null)}
        />
      )}
      {selectedTerritory && (
        <TerritoryDetailDrawer
          territoryId={selectedTerritory}
          period={period}
          onClose={() => setSelectedTerritory(null)}
        />
      )}
    </div>
  );
}
