import { useMemo } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { getRepProfitabilityEnhanced, getProfitabilityWaterfall } from "@/services/profitability.service";
import { BarChart } from "@/components/charts/Charts";
import { formatMoney, formatPercent } from "@/utils/format";

interface Props {
  repId: string;
  period: string;
  onClose: () => void;
}

const CLASSIFICATION_LABELS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  excellent: { label: "ممتاز", tone: "success" },
  profitable: { label: "مربح", tone: "success" },
  low_margin: { label: "هامش منخفض", tone: "warning" },
  review: { label: "يحتاج مراجعة", tone: "warning" },
  unprofitable: { label: "غير مربح", tone: "danger" },
};

const SEVERITY_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  success: { bg: "var(--color-success-bg, #e6f9e6)", border: "var(--color-success, #22c55e)", color: "var(--color-success, #22c55e)" },
  warning: { bg: "var(--color-warning-bg, #fff8e1)", border: "var(--color-warning, #f59e0b)", color: "var(--color-warning, #f59e0b)" },
  danger: { bg: "var(--color-danger-bg, #fee2e2)", border: "var(--color-danger, #ef4444)", color: "var(--color-danger, #ef4444)" },
};

export function RepDetailDrawer({ repId, period, onClose }: Props) {
  const detail = useMemo(() => getRepProfitabilityEnhanced(repId, period), [repId, period]);
  const waterfall = useMemo(() => getProfitabilityWaterfall(repId, period), [repId, period]);
  const cls = CLASSIFICATION_LABELS[detail.classification] ?? CLASSIFICATION_LABELS.profitable;

  const waterfallData = waterfall.map((w) => ({
    label: w.label,
    value: w.value,
    secondary: 0,
  }));

  return (
    <Drawer open onClose={onClose} title={`تحليل ربحية — ${detail.repName}`} width="520px">
      <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {/* Header info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
              {detail.territoryName} • {detail.supervisorName}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 4 }}>
              الفترة: {detail.period}
            </div>
          </div>
          <Badge tone={cls.tone}>{cls.label}</Badge>
        </div>

        {/* Revenue */}
        <Section title="الإيرادات">
          <DataRow label="إجمالي المبيعات" value={formatMoney(detail.revenue)} />
          <DataRow label="الخصومات" value={formatMoney(detail.discounts)} color="var(--color-warning)" />
          <DataRow label="المرتجعات" value={formatMoney(detail.returns)} color="var(--color-danger)" />
          <DataRow label="صافي المبيعات" value={formatMoney(detail.netSales)} bold />
        </Section>

        {/* Cost Breakdown */}
        <Section title="تكاليف التشغيل — تفصيل">
          {detail.costBreakdown.map((entry) => (
            <DataRow
              key={entry.id}
              label={entry.label}
              value={formatMoney(entry.amount)}
              source={entry.source.formula}
            />
          ))}
          <div style={{ borderTop: "1px solid var(--color-border)", marginTop: 8, paddingTop: 8 }}>
            <DataRow
              label="إجمالي التشغيل"
              value={formatMoney(detail.operatingCosts.total + detail.commission)}
              bold
              color="var(--color-danger)"
            />
          </div>
        </Section>

        {/* Financial Result */}
        <Section title="النتيجة المالية">
          <DataRow label="Gross Profit" value={formatMoney(detail.grossProfit)} bold color="var(--color-success)" />
          <DataRow label="Contribution (بعد العمولة + التشغيل)" value={formatMoney(detail.netContribution)} bold
            color={detail.netContribution >= 0 ? "var(--color-success)" : "var(--color-danger)"} />
          <DataRow label="هامش الإسهام" value={formatPercent(detail.netContributionMargin / 100)} />
        </Section>

        {/* Diagnosis */}
        {detail.diagnosis.length > 0 && (
          <Section title="التشخيص">
            {detail.diagnosis.map((d) => {
              const style = SEVERITY_STYLES[d.severity] ?? SEVERITY_STYLES.warning;
              return (
                <div
                  key={d.id}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: `1px solid ${style.border}`,
                    backgroundColor: style.bg,
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 500, color: style.color }}>
                    {d.message}
                  </div>
                  {d.recommendation && (
                    <div style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-muted)", marginTop: 4 }}>
                      {d.recommendation}
                    </div>
                  )}
                </div>
              );
            })}
          </Section>
        )}

        {/* Performance */}
        <Section title="مؤشرات الأداء">
          <DataRow label="عدد الفواتير" value={`${detail.averageInvoice > 0 ? Math.round(detail.revenue / detail.averageInvoice) : 0}`} />
          <DataRow label="متوسط الفاتورة" value={formatMoney(detail.averageInvoice)} />
          <DataRow label="الزيارات" value={`${Math.round(detail.revenuePerVisit > 0 ? detail.revenue / detail.revenuePerVisit : 0)}`} />
          <DataRow label="إيراد/زيارة" value={formatMoney(detail.revenuePerVisit)} />
          <DataRow label="نسبة التحصيل" value={`${detail.collectionRate.toFixed(1)}%`} />
          <DataRow label="العملاء" value={`${detail.revenuePerCustomer > 0 ? Math.round(detail.revenue / detail.revenuePerCustomer) : 0}`} />
          <DataRow label="تحقيق الهدف" value={`${detail.targetAchievement.toFixed(0)}%`} />
        </Section>

        {/* Waterfall */}
        {waterfallData.length > 0 && (
          <Section title="شريحة الربحية">
            <BarChart
              data={waterfallData}
              valueLabel="المبلغ"
              valueFormatter={(v) => formatMoney(v)}
              height={160}
            />
          </Section>
        )}
      </div>
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--color-text)", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid var(--color-border)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function DataRow({ label, value, bold, color, source }: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
  source?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {source && (
          <span
            title={source}
            style={{
              fontSize: "var(--font-size-xxs)",
              color: "var(--color-primary)",
              cursor: "help",
              textDecoration: "underline dotted",
            }}
          >
            [المصدر]
          </span>
        )}
        <span
          className="num"
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: bold ? 600 : 400,
            color: color ?? "var(--color-text)",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
