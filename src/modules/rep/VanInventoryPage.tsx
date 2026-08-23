import { useMemo, useState } from "react";
import { Search, Filter, Package, Truck, RotateCcw, ClipboardCheck, AlertTriangle, TrendingUp, Download } from "lucide-react";
import { stockByRep, stockMovements, vanStock } from "@/mock/inventory";
import { products } from "@/mock/products";
import { invoices } from "@/mock/sales";
import { returnsByRep } from "@/mock/returns";
import { loadingOrdersByRep } from "@/mock/repField";
import { useAuthStore } from "@/store/auth";
import { repPolicies } from "@/config/repPolicies";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input, Select } from "@/components/ui/FormControls";
import { Tabs } from "@/components/ui/Tabs";
import { formatMoney, formatNumber, formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import { mockApi } from "@/services/mockApi";
import type { StockMovement, VanStock, LoadingOrder } from "@/types";

const movementTypeLabels: Record<string, string> = {
  receiving: "استلام من المستودع",
  sale: "بيع",
  return_in: "مرتجع وارد",
  return_out: "مرتجع صادر",
  transfer_in: "تحويل وارد",
  transfer_out: "تحويل صادر",
  damage: "تلف",
  count_adjust: "تسوية جرد",
  adjustment: "تسوية يدوية",
};

const movementTypeTones: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  receiving: "success",
  sale: "info",
  return_in: "success",
  return_out: "warning",
  transfer_in: "success",
  transfer_out: "info",
  damage: "danger",
  count_adjust: "warning",
  adjustment: "neutral",
};

export function VanInventoryPage() {
  const { user } = useAuthStore();
  const me = user!;

  const myVan = vanStock.find((v) => v.repId === me.id);
  const vanItems = myVan?.items ?? [];
  const myMovements = stockMovements.filter((m) => m.repId === me.id).sort((a, b) => b.date.localeCompare(a.date));
  const myLoadingOrders = loadingOrdersByRep(me.id);
  const myReturns = returnsByRep(me.id);
  const myInvoices = invoices.filter((i) => i.repId === me.id && i.status === "completed");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<"ledger" | "movements" | "loading" | "counts">("ledger");
  const [countInputs, setCountInputs] = useState<Record<string, number>>({});
  const [countReasons, setCountReasons] = useState<Record<string, string>>({});
  const [countSaving, setCountSaving] = useState(false);

  const totalUnits = vanItems.reduce((s, i) => s + i.qty, 0);
  const totalValue = vanItems.reduce((s, i) => s + i.qty * (products.find((p) => p.id === i.productId)?.costPrice ?? 0), 0);
  const damagedUnits = vanItems.reduce((s, i) => s + i.damagedQty, 0);
  const lowStockCount = vanItems.filter((i) => i.qty <= (products.find((p) => p.id === i.productId)?.reorderLevel ?? 5)).length;

  const tabs = [
    {
      key: "ledger",
      label: "دفتر المخزون (Ledger)",
      content: (
        <div className="stack">
          <FilterBar>
            <Input label="البحث" placeholder="اسم المنتج، رمز..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
            <Select label="الحالة" value={""} onChange={() => {}} placeholder="الكل" options={[
              { value: "available", label: "متاح" },
              { value: "low", label: "منخفض" },
              { value: "out", label: "ناقص" },
            ]} />
          </FilterBar>

          <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي الوحدات</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatNumber(totalUnits)}</b></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>قيمة المخزون (التكلفة)</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{formatMoney(totalValue)}</b></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>وحدات تالفة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-danger)" }}>{formatNumber(damagedUnits)}</b></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>عند حد إعادة الطلب</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{lowStockCount}</b></div></Card>
          </div>

          <Card title="أرصدة المنتجات في السيارة" subtitle={`آخر تحديث: ${myVan?.updatedAt?.slice(0, 16) ?? "—"}`}>
            <div className="card-body">
              <div className="table-wrap" style={{ border: "none", boxShadow: "none" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th className="numeric">الرصيد الحالي</th>
                      <th className="numeric">التالف</th>
                      <th className="numeric">المتاح للبيع</th>
                      <th className="numeric">حد إعادة الطلب</th>
                      <th>الحالة</th>
                      <th>القيمة (التكلفة)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vanItems
                      .filter((i) => {
                        if (!search) return true;
                        const p = products.find((pr) => pr.id === i.productId);
                        return p?.name.includes(search) || p?.code.includes(search);
                      })
                      .map((item) => {
                        const product = products.find((p) => p.id === item.productId);
                        const reorderLevel = product?.reorderLevel ?? 5;
                        const available = item.qty - item.damagedQty;
                        let status: "available" | "low" | "out" = "available";
                        if (available <= 0) status = "out";
                        else if (available <= reorderLevel) status = "low";
                        const value = item.qty * (product?.costPrice ?? 0);
                        return (
                          <tr key={item.productId}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{product?.name}</div>
                              <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{product?.code} · {product?.unit}</div>
                            </td>
                            <td className="numeric num">{formatNumber(item.qty)}</td>
                            <td className="numeric">{item.damagedQty > 0 ? <span className="num" style={{ color: "var(--color-danger)" }}>{formatNumber(item.damagedQty)}</span> : <span className="faint">—</span>}</td>
                            <td className="numeric num" style={{ fontWeight: 600, color: status === "out" ? "var(--color-danger)" : status === "low" ? "var(--color-warning)" : "var(--color-success)" }}>{formatNumber(available)}</td>
                            <td className="numeric num">{formatNumber(reorderLevel)}</td>
                            <td><Badge tone={status === "out" ? "danger" : status === "low" ? "warning" : "success"} dot>{status === "out" ? "ناقص" : status === "low" ? "منخفض" : "متاح"}</Badge></td>
                            <td className="numeric num">{formatMoney(value)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <div className="alert alert-info" style={{ marginBottom: 0, marginTop: "var(--space-3)" }}>
                <Package size={16} />
                <div>
                  <div className="alert-title">قاعدة المخزون</div>
                  <div>الرصيد لا يُعدل يدوياً — ينتج من حركات: استلام + مرتجعات - مبيعات - تحويلات ± تسويات. راجع تبويب "الحركات" للتفاصيل.</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: "movements",
      label: "الحركات",
      content: (
        <div className="stack">
          <FilterBar>
            <Input label="البحث" placeholder="منتج، مرجع..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
            <Select label="نوع الحركة" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} placeholder="الكل" options={[
              { value: "receiving", label: "استلام" },
              { value: "sale", label: "بيع" },
              { value: "return_in", label: "مرتجع وارد" },
              { value: "return_out", label: "مرتجع صادر" },
              { value: "transfer_in", label: "تحويل وارد" },
              { value: "transfer_out", label: "تحويل صادر" },
              { value: "damage", label: "تلف" },
              { value: "count_adjust", label: "تسوية جرد" },
            ]} />
            <Input label="من تاريخ" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input label="إلى تاريخ" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </FilterBar>

          <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي الحركات</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{myMovements.length}</b></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>داخلة (استلام + مرتجعات)</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{myMovements.filter((m) => ["receiving", "return_in", "transfer_in"].includes(m.type)).reduce((s, m) => s + m.qty, 0)}</b></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>خارجة (مبيعات + تحويلات)</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-danger)" }}>{myMovements.filter((m) => ["sale", "transfer_out"].includes(m.type)).reduce((s, m) => s + m.qty, 0)}</b></div></Card>
            <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تسويات وتلف</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{myMovements.filter((m) => ["damage", "count_adjust", "adjustment"].includes(m.type)).reduce((s, m) => s + m.qty, 0)}</b></div></Card>
          </div>

          <Card title="سجل حركات مخزون السيارة">
            <div className="card-body">
              <DataTable
                columns={[
                  { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "primary", render: (r) => <span className="num">{r.date.slice(0, 16).replace("T", " ")}</span> },
                  { key: "type", header: "النوع", priority: "primary", render: (r) => <Badge tone={movementTypeTones[r.type] || "neutral"}>{movementTypeLabels[r.type] || r.type}</Badge> },
                  { key: "productName", header: "المنتج", sortable: true, sortValue: (r) => r.productName, priority: "primary", render: (r) => <b style={{ fontSize: "var(--font-size-sm)" }}>{r.productName}</b> },
                  { key: "qty", header: "الكمية", numeric: true, sortable: true, sortValue: (r) => r.qty, priority: "primary", render: (r) => <span className="num" style={{ color: ["receiving", "return_in", "transfer_in"].includes(r.type) ? "var(--color-success)" : "var(--color-danger)", fontWeight: 600 }}>{r.type.startsWith("sale") || r.type === "transfer_out" || r.type === "damage" ? "-" : "+"}{formatNumber(r.qty)}</span> },
                  { key: "refNumber", header: "المرجع", priority: "secondary", render: (r) => <span className="num" style={{ direction: "ltr" }}>{r.refNumber}</span> },
                  { key: "createdBy", header: "بواسطة", priority: "optional", render: (r) => <span style={{ fontSize: "var(--font-size-sm)" }}>{r.createdBy}</span> },
                  { key: "notes", header: "ملاحظات", priority: "optional", render: (r) => r.notes ? <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{r.notes}</span> : "—" },
                ]}
                rows={myMovements.filter((m) => {
                  if (search) {
                    const p = products.find((pr) => pr.id === m.productId);
                    if (!p?.name.includes(search) && !m.refNumber.includes(search) && !m.notes?.includes(search)) return false;
                  }
                  if (typeFilter && m.type !== typeFilter) return false;
                  if (dateFrom && m.date < dateFrom) return false;
                  if (dateTo && m.date > dateTo) return false;
                  return true;
                })}
                rowKey={(r) => r.id}
                searchPlaceholder="بحث سريع..."
                searchKeys={(r) => `${r.productName} ${r.refNumber} ${r.notes ?? ""}`}
                exportFilename="van-movements"
                pageSize={15}
                emptyTitle="لا توجد حركات مطابقة"
              />
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: "loading",
      label: "أوامر الاستلام",
      content: (
        <div className="stack">
          <Card title="أوامر الاستلام من المستودع" subtitle={`${myLoadingOrders.length} أمر`}>
            <div className="card-body">
              {myLoadingOrders.length === 0 ? (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد أوامر استلام</div>
              ) : (
                <DataTable
                  columns={[
                    { key: "number", header: "أمر الاستلام", priority: "primary", render: (r) => <b className="num">{r.number}</b> },
                    { key: "date", header: "التاريخ", priority: "primary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
                    { key: "status", header: "الحالة", priority: "primary", render: (r) => <StatusBadge status={r.status} /> },
                    { key: "items", header: "البنود", priority: "primary", render: (r) => <span className="num">{r.items.length} منتج · {formatNumber(r.items.reduce((s, i) => s + i.expectedQty, 0))} وحدة</span> },
                    { key: "actions", header: "إجراء", priority: "primary", render: (r) => r.status === "pending" ? (
                      <Button size="sm" variant="primary" icon={<ClipboardCheck size={13} />} onClick={async () => { try { await mockApi.rep.receiveLoadingOrder(r.id); toast.success("تم تسجيل الاستلام"); } catch { toast.error("فشل الاستلام", "حدث خطأ أثناء استلام أمر التحميل"); } }}>استلام</Button>
                    ) : <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.completedAt?.slice(11, 16)}</span> },
                  ]}
                  rows={myLoadingOrders}
                  rowKey={(r) => r.id}
                  pageSize={10}
                  emptyTitle="لا توجد أوامر استلام"
                />
              )}
            </div>
          </Card>

          <div className="alert alert-info" style={{ marginBottom: 0 }}>
            <Truck size={16} />
            <div>
              <div className="alert-title">سياسة الاستلام</div>
              <div>{repPolicies.transferReceiptRequired ? "استلام البضاعة إلزامي لتأكيد التحويل — لا تزيد الكميات على مخزون السيارة إلا بعد الاستلام." : "الاستلام اختياري — تزيد الكميات عند الاستلام."} {repPolicies.stockRequestIncreasesVanOnReceiptOnly && " يُنشأ طلب التموين دون تغيير في المخزون حتى يصل أمر الاستلام الفعلي."}</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "counts",
      label: "الجرد والتسويات",
      content: (
        <div className="stack">
          <Card title="الجرد اليومي للسيارة" subtitle="مقارنة الرصيد النظامي بالفعلي">
            <div className="card-body">
              <div className="alert alert-info" style={{ marginBottom: "var(--space-3)" }}>
                <ClipboardCheck size={16} />
                <div>
                  <div className="alert-title">إجراء جرد جديد</div>
                  <div>أدخل الكميات الفعلية لكل منتج. أي فرق سينشئ حركة تسوية تلقائية (حسب السياسة: {repPolicies.countGeneratesAdjustment ? "مفعل" : "معطل"}).</div>
                </div>
              </div>
              <DataTable
                columns={[
                  { key: "productName", header: "المنتج", priority: "primary", render: (r) => <b style={{ fontSize: "var(--font-size-sm)" }}>{r}</b> },
                  { key: "systemQty", header: "النظامي", numeric: true, priority: "primary", render: (r) => <span className="num">{formatNumber(vanItems.find((vi) => vi.productName === r)?.qty ?? 0)}</span> },
                  { key: "physicalQty", header: "الفعلي", numeric: true, priority: "primary", render: (r) => <Input type="number" min={0} style={{ width: 80 }} className="num" value={countInputs[r] ?? ""} onChange={(e) => setCountInputs((prev) => ({ ...prev, [r]: Number(e.target.value) }))} /> },
                  { key: "variance", header: "الفرق", numeric: true, priority: "primary", render: (r) => {
                    const sys = vanItems.find((vi) => vi.productName === r)?.qty ?? 0;
                    const phy = countInputs[r];
                    const diff = phy !== undefined ? phy - sys : undefined;
                    return <span className="num" style={{ color: diff !== undefined && diff !== 0 ? "var(--color-warning)" : undefined }}>{diff !== undefined ? diff : "—"}</span>;
                  } },
                  { key: "reason", header: "السبب", priority: "secondary", render: (r) => <Input placeholder="كسر، تلف، فقد..." style={{ width: 150 }} value={countReasons[r] ?? ""} onChange={(e) => setCountReasons((prev) => ({ ...prev, [r]: e.target.value }))} /> },
                ]}
                rows={vanItems.map((i) => i.productName)}
                rowKey={(r) => r}
                pageSize={15}
                emptyTitle="لا توجد منتجات"
              />
              <Button variant="primary" icon={<ClipboardCheck size={15} />} style={{ marginTop: "var(--space-3)" }} loading={countSaving} onClick={async () => {
                setCountSaving(true);
                try {
                  const items = vanItems.map((vi) => ({
                    productId: vi.productId,
                    productName: vi.productName,
                    systemQty: vi.qty,
                    physicalQty: countInputs[vi.productName] ?? vi.qty,
                    variance: (countInputs[vi.productName] ?? vi.qty) - vi.qty,
                    reason: countReasons[vi.productName],
                  }));
                  const ic = await mockApi.rep.createInventoryCount(items);
                  await mockApi.rep.submitInventoryCount(ic.id);
                  toast.success("تم حفظ الجرد وإنشاء التسويات");
                  setCountInputs({});
                  setCountReasons({});
                } catch { toast.error("فشل حفظ الجرد"); }
                setCountSaving(false);
              }}>حفظ الجرد وإنشاء التسويات</Button>
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "مخزون السيارة" }]}
        title="مخزون السيارة / المندوب"
        description="دفتر أستاذ (Ledger) حقيقي — الرصيد ينتج من الحركات فقط، لا تعديل يدوي"
      />

      <Tabs tabs={tabs} active={activeTab} onChange={(k) => setActiveTab(k as typeof activeTab)} />
    </div>
  );
}