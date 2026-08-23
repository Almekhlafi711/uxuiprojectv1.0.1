import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { reportsActions } from "@/config/dashboardActions";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/FormControls";
import { BarChart, DonutChart } from "@/components/charts/Charts";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { toast } from "@/store/ui";
import { invoices } from "@/mock/sales";
import { collections } from "@/mock/collections";
import { customers } from "@/mock/customers";
import { users } from "@/mock/users";
import { warehouseStock } from "@/mock/inventory";
import { monthlySeries, salesVsCollectionSeries } from "@/mock/profitability";
import { formatMoney, formatNumber, formatPercent } from "@/utils/format";
import type { Invoice } from "@/types";

export function ReportsPage() {
  const { data, loading, error, refetch } = useData(() => mockApi.sales.list());
  const [period, setPeriod] = useState("2026-08");
  const [report, setReport] = useState("daily");

  const repName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  const rows = (data ?? []).filter((i) => i.date.startsWith(period.slice(0, 7)));
  const totalNet = rows.reduce((s, i) => s + i.net, 0);
  const totalPaid = rows.reduce((s, i) => s + i.paid, 0);
  const cashCount = rows.filter((i) => i.type === "cash").length;

  const byRep = users
    .filter((u) => u.role === "REPRESENTATIVE")
    .map((u) => {
      const repInvoices = rows.filter((i) => i.repId === u.id);
      return {
        repId: u.id,
        count: repInvoices.length,
        total: repInvoices.reduce((s, i) => s + i.net, 0),
        paid: repInvoices.reduce((s, i) => s + i.paid, 0),
      };
    })
    .filter((r) => r.count > 0);

  const topCustomers = [...customers]
    .map((c) => {
      const cInvoices = rows.filter((i) => i.customerId === c.id);
      return { name: c.name, total: cInvoices.reduce((s, i) => s + i.net, 0) };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const topProducts = warehouseStock.sort((a, b) => b.available - a.available).slice(0, 5).map((s) => ({ label: s.productName, value: s.available }));

  const columns: Column<Invoice>[] = [
    { key: "invoiceNumber", header: "الفاتورة", sortable: true, sortValue: (r) => r.number, render: (r) => <b className="num">{r.invoiceNumber}</b> },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, render: (r) => <span className="num">{r.date}</span> },
    { key: "customer", header: "العميل", sortable: true, sortValue: (r) => customerName(r.customerId), render: (r) => customerName(r.customerId) },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => repName(r.repId), render: (r) => repName(r.repId) },
    { key: "net", header: "الإجمالي", numeric: true, sortable: true, sortValue: (r) => r.net, render: (r) => <span className="num">{formatMoney(r.net)}</span> },
    { key: "paid", header: "المسدد", numeric: true, sortable: true, sortValue: (r) => r.paid, render: (r) => <span className="num">{formatMoney(r.paid)}</span> },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "التقارير" }]}
        title="التقارير"
        description="تقارير المبيعات والتحصيل والأداء — قابلة للتصدير"
        actions={
          <>
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
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => toast.success("تم تصدير التقرير بصيغة PDF", "سيصلك الملف عبر البريد الداخلي")}>
              تصدير PDF
            </Button>
          </>
        }
      >

      <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
        <StatCard label="مبيعات الفترة" value={formatMoney(totalNet)} hint={`${formatNumber(rows.length)} فاتورة`} icon={<FileText size={14} />} />
        <StatCard label="المسدد" value={formatMoney(totalPaid)} hint={`نسبة ${formatPercent(totalNet ? totalPaid / totalNet : 0)}`} icon={<FileText size={14} />} />
        <StatCard label="مبيعات نقدية" value={`${formatNumber(cashCount)} فاتورة`} hint="من إجمالي الفواتير" icon={<FileText size={14} />} />
        <StatCard label="التحصيل الشهري" value={formatMoney(collections.filter((c) => c.date.startsWith(period.slice(0, 7)) && c.status === "approved").reduce((s, c) => s + c.amount, 0))} hint="سندات معتمدة" icon={<FileText size={14} />} />
      </div>
      </StickyPageHeader>

      <DashboardQuickActions actions={reportsActions} sticky />

      <div className="grid-2" style={{ marginBottom: "var(--space-4)" }}>
        <Card title="المبيعات مقابل التحصيل — آخر 6 أشهر">
          <BarChart
            data={salesVsCollectionSeries.map((m) => ({ label: m.month, value: m.sales, secondary: m.collection }))}
            secondaryLabel="التحصيل"
            valueLabel="المبيعات"
            valueFormatter={(v) => `${Math.round(v / 1000)} ألف`}
            height={240}
          />
        </Card>
        <Card title="أعلى المنتجات توفراً بالمستودع">
          <DonutChart
            data={topProducts.map((p, i) => ({
              label: p.label,
              value: p.value,
              color: ["var(--color-primary)", "var(--color-success)", "var(--color-info)", "var(--color-warning)", "var(--color-danger)"][i % 5],
            }))}
            centerValue={formatNumber(topProducts.reduce((s, p) => s + p.value, 0))}
            centerLabel="وحدة"
            size={200}
          />
        </Card>
      </div>

      <div className="grid-2" style={{ marginBottom: "var(--space-4)" }}>
        <Card title={`أداء المناديب — ${period}`} subtitle="المبيعات والتحصيل">
          <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المندوب</th>
                  <th className="numeric">فواتير</th>
                  <th className="numeric">المبيعات</th>
                  <th className="numeric">المسدد</th>
                </tr>
              </thead>
              <tbody>
                {byRep.map((r) => (
                  <tr key={r.repId}>
                    <td>{repName(r.repId)}</td>
                    <td className="numeric num">{formatNumber(r.count)}</td>
                    <td className="numeric num" style={{ fontWeight: 600 }}>{formatMoney(r.total)}</td>
                    <td className="numeric num" style={{ color: "var(--color-success)" }}>{formatMoney(r.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title={`أعلى العملاء قيمة — ${period}`}>
          <div className="stack-sm">
            {topCustomers.map((c, i) => (
              <div key={c.name} className="flex-between">
                <span><b className="num" style={{ color: "var(--color-text-faint)" }}>{i + 1}.</b> {c.name}</span>
                <b className="num">{formatMoney(c.total)}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="تفاصيل فواتير الفترة" subtitle={`${rows.length} فاتورة`}>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          onRetry={refetch}
          searchPlaceholder="بحث..."
          searchKeys={(r) => `${r.invoiceNumber} ${customerName(r.customerId)}`}
          exportFilename={`sales-report-${period}`}
          pageSize={10}
          emptyTitle="لا توجد فواتير في الفترة المحددة"
        />
      </Card>
    </div>
  );
}