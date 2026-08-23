import { useMemo, useState } from "react";
import { ShieldAlert, FileCheck2, Info } from "lucide-react";
import { customers } from "@/mock/customers";
import { users } from "@/mock/users";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Textarea } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { toast } from "@/store/ui";
import { formatMoney, formatNumber, formatDateShort } from "@/utils/format";
import { can } from "@/config/permissions";
import { useAuthStore } from "@/store/auth";
import { getAllCustomerBalances } from "@/services/ledger";
import type { Customer } from "@/types";

export function CreditPage() {
  const { user } = useAuthStore();
  const [riskFilter, setRiskFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject" | null>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [pendingRequest, setPendingRequest] = useState<{ id: string; customer: string; current: number; requested: number; rep: string; date: string; reason: string } | null>(null);
  const [newLimit, setNewLimit] = useState("");

  const rows = customers.filter((c) => (balanceMap.get(c.id) ?? 0) > 0 || c.status === "overdue");
  const canApprove = can("credit.approve", user?.role ?? "REPRESENTATIVE");
  const balanceMap = new Map(getAllCustomerBalances().map((b) => [b.customerId, b.balance]));

  const riskOf = (c: Customer): "high" | "medium" | "low" => {
    const ratio = c.creditLimit > 0 ? (balanceMap.get(c.id) ?? 0) / c.creditLimit : 1;
    if (c.status === "overdue" || ratio >= 0.95) return "high";
    if (ratio >= 0.75) return "medium";
    return "low";
  };

  const filtered = useMemo(() => {
    if (!riskFilter) return rows;
    return rows.filter((c) => riskOf(c) === riskFilter);
  }, [riskFilter, rows]);

  const totalDebts = rows.reduce((s, c) => s + (balanceMap.get(c.id) ?? 0), 0);
  const highCount = rows.filter((c) => riskOf(c) === "high").length;

  const repName = (id?: string) => users.find((u) => u.id === id)?.name ?? "—";

  const pendingRequests = [
    { id: "cr-1", customer: "شركة الأمل للتجارة", current: 80000, requested: 120000, rep: "أحمد محمد", date: "2026-08-18", reason: "زيادة نطاق العمل_due to seasonal demand" },
    { id: "cr-2", customer: "مؤسسة النور", current: 50000, requested: 75000, rep: "خالد العلي", date: "2026-08-17", reason: "توسع في الأسواق الجديدة" },
    { id: "cr-3", customer: "مصنع الوفاء", current: 100000, requested: 150000, rep: "سالم الحربي", date: "2026-08-16", reason: "طلب كبير من عميل جديد" },
  ];

  const auditTrail = [
    { id: "a-1", customer: "شركة الفجر", oldLimit: 60000, newLimit: 80000, changedBy: "مدير المبيعات", date: "2026-08-19", action: "increase" as const },
    { id: "a-2", customer: "مؤسسة الريادة", oldLimit: 100000, newLimit: 70000, changedBy: "المدير العام", date: "2026-08-18", action: "decrease" as const },
    { id: "a-3", customer: "شركة السلام", oldLimit: 40000, newLimit: 40000, changedBy: "نظامي", date: "2026-08-17", action: "no_change" as const },
    { id: "a-4", customer: "مؤسسة الجودة", oldLimit: 90000, newLimit: 120000, changedBy: "مدير المبيعات", date: "2026-08-16", action: "increase" as const },
    { id: "a-5", customer: "مصنع الأعمال", oldLimit: 50000, newLimit: 30000, changedBy: "المدير العام", date: "2026-08-15", action: "decrease" as const },
  ];

  const columns: Column<Customer>[] = [
    { key: "name", header: "العميل", sortable: true, sortValue: (r) => r.name, priority: "primary", render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.name}</div>
        <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.code}</div>
      </div>
    ) },
    { key: "rep", header: "المندوب", sortable: true, sortValue: (r) => repName(r.repId), priority: "secondary", render: (r) => repName(r.repId) },
    { key: "balance", header: "الرصيد المستحق", numeric: true, sortable: true, sortValue: (r) => (balanceMap.get(r.id) ?? 0), priority: "primary", render: (r) => <span className="num" style={{ fontWeight: 600 }}>{formatMoney(balanceMap.get(r.id) ?? 0)}</span> },
    { key: "limit", header: "الحد الائتماني", numeric: true, sortable: true, sortValue: (r) => r.creditLimit, priority: "primary", render: (r) => <span className="num">{formatMoney(r.creditLimit)}</span> },
    {
      key: "usage",
      header: "الاستخدام",
      priority: "primary",
      render: (r) => {
        const ratio = r.creditLimit > 0 ? Math.round(((balanceMap.get(r.id) ?? 0) / r.creditLimit) * 100) : 100;
        return <Progress value={Math.min(100, ratio)} tone={ratio >= 95 ? "danger" : ratio >= 75 ? "warning" : "success"} label={`${Math.min(100, ratio)}%`} />;
      },
    },
    {
      key: "risk",
      header: "المخاطر",
      priority: "primary",
      render: (r) => {
        const risk = riskOf(r);
        return risk === "high" ? <Badge tone="danger" dot>عالية</Badge> : risk === "medium" ? <Badge tone="warning" dot>متوسطة</Badge> : <Badge tone="success" dot>منخفضة</Badge>;
      },
    },
    {
      key: "status",
      header: "الحالة",
      priority: "primary",
      render: (r) => (r.status === "overdue" ? <Badge tone="danger" dot>متأخر السداد</Badge> : r.status === "active" ? <Badge tone="success" dot>نشط</Badge> : <Badge tone="neutral">متوقف</Badge>),
    },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الائتمان والحدود" }]}
        title="الائتمان والحدود الائتمانية"
        description="مراقبة أرصدة العملاء والحدود الائتمانية ومخاطر التعثر"
        actions={
          canApprove ? (
            <Button variant="primary" icon={<ShieldAlert size={15} />} onClick={() => setOpen(true)}>تعديل حد ائتماني</Button>
          ) : null
        }
      >

      <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
        <StatCard label="إجمالي الائتمان الممتد" value={formatMoney(totalDebts)} hint={`${formatNumber(rows.length)} عميل مدين`} icon={<ShieldAlert size={14} />} />
        <StatCard label="نسبة الاستخدام" value={`${Math.round(rows.reduce((s, c) => s + (c.creditLimit > 0 ? Math.min(100, ((balanceMap.get(c.id) ?? 0) / c.creditLimit) * 100) : 100), 0) / Math.max(1, rows.length))}%`} hint="عبر العملاء المدينين" icon={<ShieldAlert size={14} />} />
        <StatCard label="عملاء عاليو المخاطر" value={formatNumber(highCount)} hint="≥ 95% من الحد أو متأخر" icon={<ShieldAlert size={14} />} />
        <StatCard label="طلبات اعتماد معلقة" value={formatNumber(pendingRequests.length)} hint="بانتظار مراجعة مدير المبيعات" icon={<FileCheck2 size={14} />} />
      </div>

      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            key: "overview",
            label: "نظرة عامة",
            content: (
              <>
                <FilterBar>
                  <Select
                    label="مستوى المخاطر"
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    placeholder="الكل"
                    options={[
                      { value: "high", label: "عالية" },
                      { value: "medium", label: "متوسطة" },
                      { value: "low", label: "منخفضة" },
                    ]}
                  />
                </FilterBar>
                <DataTable
                  columns={columns}
                  rows={filtered}
                  rowKey={(r) => r.id}
                  searchPlaceholder="بحث بالعميل أو المندوب..."
                  searchKeys={(r) => `${r.name} ${repName(r.repId)}`}
                  exportFilename="credit-limit"
                  pageSize={12}
                  emptyTitle="لا توجد أرصدة مستحقة مطابقة"
                  onRowClick={(r) => { setSelected(r); setOpen(true); }}
                />
              </>
            ),
          },
          {
            key: "approvals",
            label: "طلبات الاعتماد",
            count: pendingRequests.length,
            content: (
              <div>
                <Card title="طلبات تعديل الحد الائتماني المعلقة" subtitle={`${pendingRequests.length} طلب بانتظار الاعتماد`}>
                  {pendingRequests.length === 0 ? (
                    <div className="muted" style={{ fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>لا توجد طلبات معلقة</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      {pendingRequests.map((req) => (
                        <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-3)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", flexWrap: "wrap", gap: "var(--space-2)" }}>
                          <div style={{ flex: "1 1 200px" }}>
                            <div style={{ fontWeight: 600 }}>{req.customer}</div>
                            <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{req.rep} — {formatDateShort(req.date)}</div>
                          </div>
                          <div className="num" style={{ fontSize: "var(--font-size-sm)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                            <span>{formatMoney(req.current)}</span>
                            <span className="faint">→</span>
                            <span style={{ fontWeight: 600 }}>{formatMoney(req.requested)}</span>
                          </div>
                          <div style={{ display: "flex", gap: "var(--space-2)" }}>
                            <Button variant="primary" size="sm" onClick={() => { setPendingRequest(req); setApprovalAction("approve"); setApprovalModalOpen(true); }}>اعتماد</Button>
                            <Button variant="danger" size="sm" onClick={() => { setPendingRequest(req); setApprovalAction("reject"); setApprovalModalOpen(true); }}>رفض</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            ),
          },
          {
            key: "audit",
            label: "سجل التغييرات",
            content: (
              <Card title="آخر تغييرات الحد الائتماني" subtitle={`${auditTrail.length} عملية مسجلة`}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                      <th style={{ padding: "var(--space-2)", textAlign: "right" }}>العميل</th>
                      <th style={{ padding: "var(--space-2)", textAlign: "right" }}>الحد السابق</th>
                      <th style={{ padding: "var(--space-2)", textAlign: "right" }}>الحد الجديد</th>
                      <th style={{ padding: "var(--space-2)", textAlign: "right" }}>بواسطة</th>
                      <th style={{ padding: "var(--space-2)", textAlign: "right" }}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditTrail.map((entry) => (
                      <tr key={entry.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={{ padding: "var(--space-2)" }}>{entry.customer}</td>
                        <td className="num" style={{ padding: "var(--space-2)" }}>{formatMoney(entry.oldLimit)}</td>
                        <td className="num" style={{ padding: "var(--space-2)", fontWeight: 600, color: entry.action === "increase" ? "var(--color-success)" : entry.action === "decrease" ? "var(--color-danger)" : undefined }}>{formatMoney(entry.newLimit)}</td>
                        <td style={{ padding: "var(--space-2)" }}>{entry.changedBy}</td>
                        <td className="num" style={{ padding: "var(--space-2)" }}>{formatDateShort(entry.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ),
          },
          {
            key: "policy",
            label: "سياسة الائتمان",
            content: (
              <Card title="سياسة الحد الائتماني الحالية" subtitle="القواعد والإعدادات المعتمدة" actions={<Badge tone="info">معتمدة</Badge>}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)" }}>
                    <span>الحد الأقصى للعميل</span>
                    <b className="num">{formatMoney(150000)}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)" }}>
                    <span>نسبة التنبيه</span>
                    <b className="num">75%</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)" }}>
                    <span>الحد لتجاوز 20% يحتاج اعتماد</span>
                    <Badge tone="warning">مدير المبيعات + المدير العام</Badge>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)" }}>
                    <span>منع البيع الآجل عند تجاوز الحد</span>
                    <Badge tone="success">مفعّل</Badge>
                  </div>
                  <div style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-info-subtle)", display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
                    <Info size={16} style={{ color: "var(--color-info)", marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: "var(--font-size-sm)" }}>أي رفع للحد الائتماني يتجاوز 20% من الحد الحالي يتطلب سير اعتماد رسمي عبر مدير المبيعات والمدير العام مع توثيق السبب في سجل التدقيق.</div>
                  </div>
                </div>
              </Card>
            ),
          },
        ]}
      />
      </StickyPageHeader>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="تعديل الحد الائتماني"
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={async () => {
            if (!selected) { toast.error("يرجى اختيار عميل"); return; }
            if (!newLimit || Number(newLimit) <= 0) { toast.error("يرجى اختيار حد صحيح"); return; }
            try {
              await mockApi.customers.update(selected.id, { creditLimit: Number(newLimit) });
              toast.success("تم تحديث الحد الائتماني", selected.name);
              setOpen(false);
              setNewLimit("");
            } catch { toast.error("فشل التحديث"); }
          }}>حفظ التعديل</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-12">
            <Select
              label="العميل"
              value={selected?.id ?? ""}
              onChange={(e) => setSelected(customers.find((c) => c.id === e.target.value) ?? null)}
              options={customers.map((c) => ({ value: c.id, label: `${c.name} — رصيد ${formatMoney(balanceMap.get(c.id) ?? 0)}` }))}
            />
          </div>
          <div className="field-span-12">
            <Select
              label="الحد الائتماني الجديد"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="اختر قيمة..."
              options={[
                { value: "", label: "اختر قيمة..." },
                { value: "50000", label: "50,000 ر.س" },
                { value: "80000", label: "80,000 ر.س" },
                { value: "100000", label: "100,000 ر.س" },
                { value: "150000", label: "150,000 ر.س" },
              ]}
            />
          </div>
          <div className="field-span-12">
            <div className="alert alert-warning" style={{ marginBottom: 0 }}>
              أي رفع للحد يتجاوز 20% يتطلب سير اعتماد مدير المبيعات والمدير العام.
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={approvalModalOpen}
        onClose={() => { setApprovalModalOpen(false); setApprovalReason(""); setPendingRequest(null); }}
        title={approvalAction === "approve" ? "اعتماد تعديل الحد" : "رفض تعديل الحد"}
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => { setApprovalModalOpen(false); setApprovalReason(""); setPendingRequest(null); }}>إلغاء</Button>
          <Button
            variant={approvalAction === "approve" ? "primary" : "danger"}
            onClick={async () => {
              if (!approvalReason.trim()) { toast.error("يجب كتابة سبب القرار"); return; }
              try {
                await mockApi.credit.approveRequest(pendingRequest?.id ?? "", approvalAction === "approve", approvalReason);
                toast.success(approvalAction === "approve" ? "تم اعتماد تعديل الحد الائتماني" : "تم رفض طلب تعديل الحد");
                setApprovalModalOpen(false);
                setApprovalReason("");
                setPendingRequest(null);
              } catch { toast.error("فشل"); }
            }}
          >
            {approvalAction === "approve" ? "تأكيد الاعتماد" : "تأكيد الرفض"}
          </Button>
        </>}
      >
        {pendingRequest && (
          <div className="form-grid">
            <div className="field-span-12">
              <div style={{ fontWeight: 600, marginBottom: "var(--space-2)" }}>{pendingRequest.customer}</div>
              <div className="num" style={{ fontSize: "var(--font-size-sm)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                <span>الحد الحالي: {formatMoney(pendingRequest.current)}</span>
                <span className="faint">→</span>
                <span style={{ fontWeight: 600 }}>الحد المطلوب: {formatMoney(pendingRequest.requested)}</span>
              </div>
              <div className="faint" style={{ fontSize: "var(--font-size-xs)", marginTop: "var(--space-1)" }}>مقدم من: {pendingRequest.rep}</div>
            </div>
            <div className="field-span-12">
              <Textarea
                label={approvalAction === "approve" ? "ملاحظات الاعتماد" : "سبب الرفض"}
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                placeholder={approvalAction === "approve" ? "ملاحظة اختيارية تظهر في سجل التدقيق..." : "اذكر سبب الرفض (إلزامي)..."}
                rows={3}
              />
            </div>
            {approvalAction === "reject" && (
              <div className="field-span-12">
                <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                  سيتم إشعار المندوب برفض الطلب مع السبب المذكور. يمكن إعادة تقديم طلب جديد.
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}