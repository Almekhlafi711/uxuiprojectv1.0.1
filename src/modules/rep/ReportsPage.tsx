import { useMemo, useState } from "react";
import { Download, BarChart3, Share2, RefreshCw, MapPin, Package, PackageCheck, FileBarChart, Eye, FileText } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { invoices } from "@/mock/sales";
import { collections } from "@/mock/collections";
import { returns } from "@/mock/returns";
import { customers } from "@/mock/customers";
import { products } from "@/mock/products";
import { stockMovements } from "@/mock/inventory";
import { formatMoney, formatDateShort, todayISO } from "@/utils/format";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input, Select } from "@/components/ui/FormControls";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";

const reportTypes = [
  { value: "sales", label: "تقرير المبيعات", icon: Share2 },
  { value: "collections", label: "تقرير التحصيل", icon: Share2 },
  { value: "returns", label: "تقرير المرتجعات", icon: RefreshCw },
  { value: "visits", label: "تقرير الزيارات", icon: MapPin },
  { value: "stock", label: "تحركات المخزون", icon: Package },
  { value: "custody", label: "حالة العهدة", icon: PackageCheck },
  { value: "performance", label: "تقرير الأداء", icon: BarChart3 },
];

const periodOptions = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
  { value: "custom", label: "نطاق مخصص" },
];

type SalesReportRow = {
  orderId: string;
  customerName: string;
  date: string;
  total: number;
  collected: number;
  balance: number;
  discount: number;
  status: string;
};

type VisitReportRow = {
  customerId: string;
  customerName: string;
  plannedDate: string;
  status: "visited" | "missed" | "pending";
  notes?: string;
};

type StockReportRow = {
  productId: string;
  productName: string;
  movementType: "inbound" | "outbound";
  qty: number;
  balance: number;
  date: string;
};

type PerformanceReportRow = {
  metric: string;
  value: number | string;
  target?: number;
  variance?: number;
};

const inboundTypes = new Set(["receiving", "transfer_in", "return_in"]);

export function ReportsPage() {
  const { user } = useAuthStore();
  const me = user!;

  const myOrders = invoices.filter((o) => o.repId === me.id);
  const myCollections = collections.filter((c) => c.repId === me.id);
  const myReturns = returns.filter((r) => r.repId === me.id);

  const [activeReport, setActiveReport] = useState("sales");
  const [period, setPeriod] = useState("today");
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({ start: undefined, end: undefined });
  const [previewOpen, setPreviewOpen] = useState(false);

  const salesReport = useMemo<SalesReportRow[]>(() => {
    return myOrders
      .map((o) => {
        const collected = myCollections.filter((c) => c.invoiceIds.includes(o.id)).reduce((a, p) => a + p.amount, 0);
        return {
          orderId: o.id,
          customerName: customers.find((c) => c.id === o.customerId)?.name || o.customerId,
          date: o.date,
          total: o.total,
          collected,
          balance: o.total - collected,
          discount: o.discount || 0,
          status: o.status,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [myOrders, myCollections, customers]);

  const collectionsReport = useMemo<SalesReportRow[]>(() => {
    return myCollections
      .map((p) => ({
        orderId: p.id,
        customerName: customers.find((c) => c.id === p.customerId)?.name || p.customerId,
        date: p.date,
        total: 0,
        collected: p.amount,
        balance: 0,
        discount: 0,
        status: p.method,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [myCollections, customers]);

  const returnsReport = useMemo<{
    returnId: string;
    invoiceId: string;
    customerName: string;
    date: string;
    total: number;
    status: string;
  }[]>(() => {
    return myReturns
      .map((r) => ({
        returnId: r.id,
        invoiceId: r.invoiceId,
        customerName: customers.find((c) => c.id === r.customerId)?.name || r.customerId,
        date: r.date,
        total: r.totalAmount,
        status: r.status,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [myReturns, customers]);

  const visitsReport = useMemo<VisitReportRow[]>(() => {
    return customers
      .filter((c) => c.repId === me.id)
      .map((c) => ({
        customerId: c.id,
        customerName: c.name,
        plannedDate: c.lastVisitAt || todayISO(),
        status: "pending" as const,
        notes: c.notes,
      }))
      .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  }, [me.id]);

  const stockReport = useMemo<StockReportRow[]>(() => {
    return stockMovements
      .filter((m) => m.repId === me.id)
      .map((m) => {
        const product = products.find((p) => p.id === m.productId);
        return {
          productId: m.productId,
          productName: product?.name || m.productId,
          movementType: (inboundTypes.has(m.type) ? "inbound" : "outbound") as "inbound" | "outbound",
          qty: m.qty,
          balance: stockMovements
            .filter((m2) => m2.productId === m.productId && m2.date <= m.date)
            .reduce((s, m2) => s + (inboundTypes.has(m2.type) ? m2.qty : -m2.qty), 0),
          date: m.date,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [me.id]);

  const performanceReport = useMemo<PerformanceReportRow[]>(() => {
    const salesTarget = 5000;
    const collectionTarget = 4500;
    const visitsCompleted = salesReport.filter((s) => s.collected > 0).length;
    const totalSales = salesReport.reduce((a, s) => a + s.total, 0);
    const totalCollected = salesReport.reduce((a, s) => a + s.collected, 0);
    const avgOrder = salesReport.length > 0 ? totalSales / salesReport.length : 0;
    const collectionRate = totalSales > 0 ? (totalCollected / totalSales) * 100 : 0;

    return [
      { metric: "إجمالي المبيعات", value: formatMoney(totalSales), target: salesTarget, variance: ((totalSales - salesTarget) / salesTarget) * 100 },
      { metric: "إجمالي التحصيل", value: formatMoney(totalCollected), target: collectionTarget, variance: ((totalCollected - collectionTarget) / collectionTarget) * 100 },
      { metric: "معدل التحصيل", value: `${collectionRate.toFixed(1)}%`, variance: collectionRate - 100 },
      { metric: "عدد الفواتير", value: salesReport.length.toString() },
      { metric: "متوسط فاتورة", value: formatMoney(avgOrder) },
      { metric: "الزيارات المخططة", value: visitsReport.length.toString() },
      { metric: "الزيارات المكتملة", value: visitsCompleted.toString() },
      { metric: "معدل الزيارة", value: `${visitsReport.length > 0 ? ((visitsCompleted / visitsReport.length) * 100).toFixed(1) : 0}%` },
    ];
  }, [salesReport, visitsReport]);

  const filteredSales = useMemo(() => {
    if (period === "custom") {
      const start = dateRange.start;
      const end = dateRange.end;
      return salesReport.filter((s) => {
        if (start && s.date < start) return false;
        if (end && s.date > end) return false;
        return true;
      });
    }
    if (period === "today") return salesReport.filter((s) => s.date === todayISO());
    if (period === "week") {
      const weekAgo = new Date(todayISO());
      weekAgo.setDate(weekAgo.getDate() - 7);
      return salesReport.filter((s) => s.date >= weekAgo.toISOString().slice(0, 10) && s.date <= todayISO());
    }
    if (period === "month") {
      const monthAgo = new Date(todayISO());
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return salesReport.filter((s) => s.date >= monthAgo.toISOString().slice(0, 10) && s.date <= todayISO());
    }
    return salesReport;
  }, [salesReport, period, dateRange]);

  const exportReport = () => {
    toast.success("تم تصدير التقرير", "تم تنزيله كملف CSV");
  };

  const reportColumns = {
    sales: [
      { key: "orderId", header: "رقم الفاتورة", priority: "primary" },
      { key: "customerName", header: "اسم العميل", priority: "primary" },
      { key: "date", header: "التاريخ", sortable: true, priority: "secondary", render: (r: SalesReportRow) => <span className="num">{formatDateShort(r.date)}</span> },
      { key: "total", header: "المبلغ", sortable: true, priority: "secondary", render: (r: SalesReportRow) => <span className="num num-primary">{formatMoney(r.total)}</span> },
      { key: "collected", header: "محصل", priority: "secondary", render: (r: SalesReportRow) => <span className="num num-success">{formatMoney(r.collected)}</span> },
      { key: "balance", header: "المتبقي", priority: "secondary", render: (r: SalesReportRow) => <span className={`num ${r.balance > 0 ? "num-danger" : "num-success"}`}>{formatMoney(r.balance)}</span> },
      { key: "discount", header: "الخصم", priority: "secondary", render: (r: SalesReportRow) => <span className="num">{formatMoney(r.discount)}</span> },
      { key: "status", header: "الحالة", priority: "primary", render: (r: SalesReportRow) => <Badge tone="info">{r.status}</Badge> },
    ],
    collections: [
      { key: "orderId", header: "رقم الفاتورة", priority: "primary" },
      { key: "customerName", header: "اسم العميل", priority: "primary" },
      { key: "date", header: "تاريخ التحصيل", sortable: true, priority: "secondary", render: (r: SalesReportRow) => <span className="num">{formatDateShort(r.date)}</span> },
      { key: "collected", header: "المبلغ", sortable: true, priority: "secondary", render: (r: SalesReportRow) => <span className="num num-success">{formatMoney(r.collected)}</span> },
      { key: "balance", header: "المتبقي", priority: "secondary", render: (r: SalesReportRow) => <span className="num num-danger">{formatMoney(r.balance)}</span> },
      { key: "status", header: "طريقة الدفع", priority: "primary", render: (r: SalesReportRow) => <Badge tone="neutral">{r.status}</Badge> },
    ],
    returns: [
      { key: "returnId", header: "رقم المرتجع", priority: "primary" },
      { key: "invoiceId", header: "رقم الفاتورة", priority: "secondary" },
      { key: "customerName", header: "اسم العميل", priority: "primary" },
      { key: "date", header: "التاريخ", sortable: true, priority: "secondary", render: (r: any) => <span className="num">{formatDateShort(r.date)}</span> },
      { key: "total", header: "قيمة المرتجع", sortable: true, priority: "secondary", render: (r: any) => <span className="num num-danger">{formatMoney(r.total)}</span> },
      { key: "status", header: "الحالة", priority: "primary", render: (r: any) => <Badge tone={r.status === "approved" ? "success" : r.status === "pending" ? "warning" : "danger"}>{r.status}</Badge> },
    ],
    visits: [
      { key: "customerName", header: "اسم العميل", priority: "primary" },
      { key: "plannedDate", header: "تاريخ الزيارة المخطط", sortable: true, priority: "secondary", render: (r: VisitReportRow) => <span className="num">{formatDateShort(r.plannedDate)}</span> },
      { key: "status", header: "الحالة", priority: "primary", render: (r: VisitReportRow) => <Badge tone={r.status === "visited" ? "success" : r.status === "missed" ? "danger" : "neutral"}>{r.status === "visited" ? "مزور" : r.status === "missed" ? "مفقود" : "معلق"}</Badge> },
      { key: "notes", header: "ملاحظات", priority: "secondary" },
    ],
    stock: [
      { key: "productName", header: "اسم المنتج", priority: "primary" },
      { key: "movementType", header: "نوع الحركة", priority: "secondary", render: (r: StockReportRow) => <span style={{ display: "flex", alignItems: "center", gap: 6 }}><PackageCheck size={14} style={{ color: r.movementType === "inbound" ? "var(--color-success)" : "var(--color-danger)" }} />{r.movementType === "inbound" ? "استقبال" : "صرف"}</span> },
      { key: "qty", header: "الكمية", priority: "secondary", render: (r: StockReportRow) => <span className="num">{r.qty}</span> },
      { key: "balance", header: "الرصيد الحالي", priority: "secondary", render: (r: StockReportRow) => <span className="num num-primary">{r.balance}</span> },
      { key: "date", header: "التاريخ", sortable: true, priority: "secondary", render: (r: StockReportRow) => <span className="num">{formatDateShort(r.date)}</span> },
    ],
    custody: [],
    performance: [
      { key: "metric", header: "المؤشر", priority: "primary" },
      { key: "value", header: "القيمة", priority: "secondary" },
      { key: "target", header: "الهدف", priority: "secondary" },
      { key: "variance", header: "الانحراف", priority: "secondary", render: (r: PerformanceReportRow) => r.variance !== undefined && <span className={`num ${r.variance >= 0 ? "num-success" : "num-danger"}`}>{r.variance.toFixed(1)}%</span> },
    ],
  };

  const currentColumns = reportColumns[activeReport as keyof typeof reportColumns];
  const currentRowsData = activeReport === "sales" ? filteredSales : activeReport === "collections" ? collectionsReport : activeReport === "returns" ? returnsReport : activeReport === "visits" ? visitsReport : activeReport === "stock" ? stockReport : activeReport === "performance" ? performanceReport : [];

  return (
    <div>
      <StickyPageHeader crumbs={[{ label: "تقاريري" }]} title="تقاريري" description="تصدير ومعاينة التقارير الخاصة بأدائي — للعرض والتنزيل فقط، لا تعديل">
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Card>
            <div className="filter-grid">
              <div className="field-span-4">
                <Select label="نوع التقرير" value={activeReport} onChange={(e) => setActiveReport(e.target.value)} options={reportTypes.map((r) => ({ value: r.value, label: r.label }))} />
              </div>
              <div className="field-span-4">
                <Select label="الفترة" value={period} onChange={(e) => setPeriod(e.target.value)} options={periodOptions} />
              </div>
              {period === "custom" && (
                <>
                  <div className="field-span-4">
                    <Input type="date" label="من تاريخ" value={dateRange.start || ""} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
                  </div>
                  <div className="field-span-4">
                    <Input type="date" label="إلى تاريخ" value={dateRange.end || ""} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </StickyPageHeader>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <Card title="ملخص الأداء" className="stat-card">
          <div className="stat-grid">
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي المبيعات</span><b className="num" style={{ fontSize: "var(--font-size-lg)", color: "var(--color-primary)" }}>{performanceReport[0]?.value}</b></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي التحصيل</span><b className="num" style={{ fontSize: "var(--font-size-lg)", color: "var(--color-success)" }}>{performanceReport[1]?.value}</b></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>معدل التحصيل</span><b className="num" style={{ fontSize: "var(--font-size-lg)", color: "var(--color-info)" }}>{performanceReport[2]?.value as string}</b></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الزيارات المكتملة</span><b className="num" style={{ fontSize: "var(--font-size-lg)", color: "var(--color-warning)" }}>{performanceReport[6]?.value as string}</b></div></Card>
          </div>
        </Card>
      </div>

      <Card title={reportTypes.find((r) => r.value === activeReport)?.label || "التقرير"}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
          <div className="flex-gap">
            <Badge tone="info">{reportTypes.find((r) => r.value === activeReport)?.label}</Badge>
            <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>{periodOptions.find((p) => p.value === period)?.label}</span>
          </div>
          <div className="flex-gap">
            <Button variant="secondary" icon={<Eye size={16} />} onClick={() => setPreviewOpen(true)}>معاينة</Button>
            <Button variant="primary" icon={<Download size={16} />} onClick={exportReport}>تنزيل CSV</Button>
          </div>
        </div>

        {currentColumns.length > 0 ? (
          <DataTable
            columns={currentColumns as any}
            rows={currentRowsData as any}
            rowKey={(r: any) => r.id || r.orderId || r.returnId || Math.random().toString()}
            searchPlaceholder="بحث في التقرير..."
            pageSize={15}
            emptyTitle="لا توجد بيانات"
            exportFilename={`report-${activeReport}-${period}`}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
            <FileBarChart size={48} style={{ color: "var(--color-text-muted)", marginBottom: 16 }} />
            <p className="muted">لا توجد بيانات متاحة لهذا التقرير</p>
          </div>
        )}
      </Card>

      <div className="alert alert-info" style={{ marginTop: "var(--space-4)", marginBottom: 0 }}>
        <FileText size={16} />
        <div>
          <div className="alert-title">ملاحظة تصدير التقارير</div>
          <div>جميع التقارير الخاصة بك متاحة للعرض والتنزيل بصيغة CSV. التغييرات تُسجل على مستوى النظام فقط.</div>
        </div>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={`معاينة تقرير: ${reportTypes.find((r) => r.value === activeReport)?.label}`} size="xl">
        <div style={{ padding: "var(--space-3)", maxHeight: 500, overflow: "auto", background: "var(--color-surface)", borderRadius: "var(--radius-md)" }}>
          <pre style={{ fontSize: "var(--font-size-xs)", direction: "ltr", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{JSON.stringify(currentRowsData.slice(0, 10), null, 2)}</pre>
        </div>
      </Modal>
    </div>
  );
}
