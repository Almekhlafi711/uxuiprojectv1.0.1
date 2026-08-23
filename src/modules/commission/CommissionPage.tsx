import { useMemo, useState } from "react";
import { Coins, Gift, Calculator, Download, Check } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { can } from "@/config/permissions";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/utils/status";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { formatMoney, formatPercent } from "@/utils/format";
import { toast } from "@/store/ui";
import type {
  CommissionRun,
  CommissionBasis,
  CommissionRunStatus,
  BonusRun,
  BonusRunStatus,
} from "@/types";

const basisLabel: Record<CommissionBasis, string> = {
  net_sales: "المبيعات الصافية",
  collections: "التحصيل النقدي",
  gross_profit: "الربح الإجمالي",
  target: "الهدف",
  hybrid: "هجينة (مبيعات + تحصيل)",
};

const commissionStatusMeta: Record<CommissionRunStatus, { label: string; tone: BadgeTone }> = {
  provisional: { label: "أولي", tone: "neutral" },
  under_review: { label: "قيد المراجعة", tone: "warning" },
  final: { label: "نهائي", tone: "info" },
  approved: { label: "معتمد", tone: "success" },
  exported: { label: "مصدّر", tone: "success" },
};

const bonusStatusMeta: Record<BonusRunStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "مسودة", tone: "neutral" },
  approved: { label: "معتمد", tone: "success" },
  paid: { label: "مدفوع", tone: "success" },
};

export function CommissionPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<"commission" | "bonus">("commission");
  const [selectedRun, setSelectedRun] = useState<CommissionRun | null>(null);
  const [selectedBonus, setSelectedBonus] = useState<BonusRun | null>(null);

  const runs = useData(() => mockApi.commission.listRuns());
  const bonus = useData(() => mockApi.bonus.listRuns());
  const policies = useData(() => mockApi.commission.listPolicies());

  const isRep = user?.role === "REPRESENTATIVE";
  const canApprove = user ? can("commission.approve", user.role) : false;
  const canExport = user ? can("commission.export", user.role) : false;
  const canBonusApprove = user ? can("bonus.approve", user.role) : false;

  const repRuns = useMemo(() => {
    if (!isRep || !user) return runs.data ?? [];
    return (runs.data ?? []).filter((r) => r.lines.some((l) => l.repId === user.id));
  }, [runs.data, isRep, user]);

  const repBonus = useMemo(() => {
    if (!isRep || !user) return bonus.data ?? [];
    return (bonus.data ?? []).filter((r) => r.lines.some((l) => l.repId === user.id));
  }, [bonus.data, isRep, user]);

  const runColumns: Column<CommissionRun>[] = [
    { key: "period", header: "الفترة", sortable: true, render: (r) => <span className="num">{r.period}</span> },
    {
      key: "basis",
      header: "الأساس",
      render: (r) => <Badge tone="neutral">{basisLabel[r.basis]}</Badge>,
    },
    {
      key: "status",
      header: "الحالة",
      render: (r) => {
        const m = commissionStatusMeta[r.status];
        return <Badge tone={m.tone}>{m.label}</Badge>;
      },
    },
    {
      key: "total",
      header: "إجمالي العمولة",
      numeric: true,
      sortable: true,
      sortValue: (r) => r.totalAmount,
      render: (r) => <span className="num">{formatMoney(r.totalAmount)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedRun(r)}>
          التفاصيل
        </Button>
      ),
    },
  ];

  const bonusColumns: Column<BonusRun>[] = [
    { key: "period", header: "الفترة", sortable: true, render: (r) => <span className="num">{r.period}</span> },
    {
      key: "status",
      header: "الحالة",
      render: (r) => {
        const m = bonusStatusMeta[r.status];
        return <Badge tone={m.tone}>{m.label}</Badge>;
      },
    },
    {
      key: "total",
      header: "إجمالي المكافأة",
      numeric: true,
      sortable: true,
      sortValue: (r) => r.totalAmount,
      render: (r) => <span className="num">{formatMoney(r.totalAmount)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedBonus(r)}>
          التفاصيل
        </Button>
      ),
    },
  ];

  const runStats = useMemo(() => {
    const all = runs.data ?? [];
    const approved = all.filter((r) => r.status === "approved" || r.status === "exported");
    const pending = all.filter((r) => r.status === "provisional" || r.status === "under_review" || r.status === "final");
    return {
      approvedTotal: approved.reduce((s, r) => s + r.totalAmount, 0),
      pendingTotal: pending.reduce((s, r) => s + r.totalAmount, 0),
      pendingCount: pending.length,
    };
  }, [runs.data]);

  const bonusStats = useMemo(() => {
    const all = bonus.data ?? [];
    const unpaid = all.filter((r) => r.status !== "paid");
    return {
      unpaidTotal: unpaid.reduce((s, r) => s + r.totalAmount, 0),
      unpaidCount: unpaid.length,
    };
  }, [bonus.data]);

  async function transitionRun(id: string, status: CommissionRunStatus) {
    try {
      const updated = await mockApi.commission.transition(id, status);
      setSelectedRun(updated);
      await runs.refetch();
      toast.success("تم تحديث حالة تشغيلة العمولة");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function recalcRun(id: string) {
    try {
      const updated = await mockApi.commission.recalc(id);
      setSelectedRun(updated);
      await runs.refetch();
      toast.success("تمت إعادة حساب العمولة");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function transitionBonus(id: string, status: BonusRunStatus) {
    try {
      const updated = await mockApi.bonus.transition(id, status);
      setSelectedBonus(updated);
      await bonus.refetch();
      toast.success("تم تحديث حالة تشغيلة المكافأة");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const selectedLines = useMemo(() => {
    if (!selectedRun || !user) return [];
    if (isRep) return selectedRun.lines.filter((l) => l.repId === user.id);
    return selectedRun.lines;
  }, [selectedRun, user, isRep]);

  const selectedBonusLines = useMemo(() => {
    if (!selectedBonus || !user) return [];
    if (isRep) return selectedBonus.lines.filter((l) => l.repId === user.id);
    return selectedBonus.lines;
  }, [selectedBonus, user, isRep]);

  const commissionContent = (
    <>
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, margin: "16px 0" }}>
        <StatCard label="عمولات معتمدة/مصدّرة" value={formatMoney(runStats.approvedTotal)} icon={<Coins size={18} />} />
        <StatCard label="قيد الإجراء" value={formatMoney(runStats.pendingTotal)} icon={<Calculator size={18} />} />
        <StatCard label="تشغيلات معلّقة" value={String(runStats.pendingCount)} icon={<Coins size={18} />} />
      </div>

      <Card title="تشغيلات العمولة">
        <DataTable
          columns={runColumns}
          rows={repRuns}
          loading={runs.loading}
          error={runs.error}
          onRetry={runs.refetch}
          rowKey={(r) => r.id}
        />
      </Card>
    </>
  );

  const bonusContent = (
    <>
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, margin: "16px 0" }}>
        <StatCard label="مكافآت غير مدفوعة" value={formatMoney(bonusStats.unpaidTotal)} icon={<Gift size={18} />} />
        <StatCard label="تشغيلات معلّقة" value={String(bonusStats.unpaidCount)} icon={<Gift size={18} />} />
      </div>

      <Card title="تشغيلات المكافأة">
        <DataTable
          columns={bonusColumns}
          rows={repBonus}
          loading={bonus.loading}
          error={bonus.error}
          onRetry={bonus.refetch}
          rowKey={(r) => r.id}
        />
      </Card>
    </>
  );

  return (
    <div className="page">
      <StickyPageHeader crumbs={[{ label: "الرئيسية", path: "/" }, { label: "العمولات والمكافآت" }]} title="العمولات والمكافآت" description="إدارة عمولات المندوبين والمكافآت (UC-12 / 3.12)" />

      <Tabs
        tabs={[
          { key: "commission", label: "العمولات", content: commissionContent },
          { key: "bonus", label: "المكافآت", content: bonusContent },
        ]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
      />

      <Modal
        open={!!selectedRun}
        onClose={() => setSelectedRun(null)}
        title={`تفاصيل العمولة — ${selectedRun?.period ?? ""}`}
        size="lg"
        footer={
          selectedRun && !isRep ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="ghost" onClick={() => recalcRun(selectedRun.id)}>
                <Calculator size={16} /> إعادة الحساب
              </Button>
              {selectedRun.status === "provisional" && (
                <Button onClick={() => transitionRun(selectedRun.id, "under_review")}>إرسال للمراجعة</Button>
              )}
              {selectedRun.status === "under_review" && (
                <Button onClick={() => transitionRun(selectedRun.id, "final")}>إنهاء (نهائي)</Button>
              )}
              {selectedRun.status === "final" && canApprove && (
                <Button onClick={() => transitionRun(selectedRun.id, "approved")}>
                  <Check size={16} /> اعتماد
                </Button>
              )}
              {selectedRun.status === "approved" && canExport && (
                <Button onClick={() => transitionRun(selectedRun.id, "exported")}>
                  <Download size={16} /> تصدير للصرف
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {selectedRun && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <Badge tone="neutral">{basisLabel[selectedRun.basis]}</Badge>
              <Badge tone={commissionStatusMeta[selectedRun.status].tone}>
                {commissionStatusMeta[selectedRun.status].label}
              </Badge>
              {selectedRun.approvedBy && <Badge tone="success">معتمد بواسطة {selectedRun.approvedBy}</Badge>}
            </div>
            <DataTable
              columns={[
                { key: "rep", header: "المندوب", render: (l: any) => l.repName },
                { key: "net", header: "صافي المبيعات", numeric: true, render: (l: any) => <span className="num">{formatMoney(l.netSales)}</span> },
                { key: "coll", header: "التحصيل", numeric: true, render: (l: any) => <span className="num">{formatMoney(l.collections)}</span> },
                { key: "gp", header: "الربح الإجمالي", numeric: true, render: (l: any) => <span className="num">{formatMoney(l.grossProfit)}</span> },
                { key: "ta", header: "تحقيق الهدف", numeric: true, render: (l: any) => formatPercent(l.targetAchievement) },
                { key: "base", header: "الأساس", numeric: true, render: (l: any) => <span className="num">{formatMoney(l.baseAmount)}</span> },
                { key: "rate", header: "النسبة", numeric: true, render: (l: any) => `${l.rate}%` },
                { key: "amt", header: "العمولة", numeric: true, render: (l: any) => <strong className="num">{formatMoney(l.amount)}</strong> },
              ]}
              rows={selectedLines as any}
              rowKey={(l: any) => l.repId}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!selectedBonus}
        onClose={() => setSelectedBonus(null)}
        title={`تفاصيل المكافأة — ${selectedBonus?.period ?? ""}`}
        size="lg"
        footer={
          selectedBonus && !isRep && selectedBonus.status !== "paid" ? (
            <div style={{ display: "flex", gap: 8 }}>
              {selectedBonus.status === "draft" && canBonusApprove && (
                <Button onClick={() => transitionBonus(selectedBonus.id, "approved")}>
                  <Check size={16} /> اعتماد
                </Button>
              )}
              {selectedBonus.status === "approved" && (
                <Button onClick={() => transitionBonus(selectedBonus.id, "paid")}>صرف</Button>
              )}
            </div>
          ) : undefined
        }
      >
        {selectedBonus && (
          <DataTable
            columns={[
              { key: "rep", header: "المندوب", render: (l: any) => l.repName },
              { key: "metric", header: "قيمة المؤشر", numeric: true, render: (l: any) => <span className="num">{l.metricValue}</span> },
              {
                key: "qual",
                header: "مؤهل",
                render: (l: any) => (
                  <Badge tone={l.qualifies ? "success" : "neutral"}>{l.qualifies ? "نعم" : "لا"}</Badge>
                ),
              },
              { key: "amt", header: "المكافأة", numeric: true, render: (l: any) => <strong className="num">{formatMoney(l.amount)}</strong> },
            ]}
            rows={selectedBonusLines as any}
            rowKey={(l: any) => l.repId}
          />
        )}
      </Modal>
    </div>
  );
}
