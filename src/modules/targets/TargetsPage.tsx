import { useMemo, useState } from "react";
import { Plus, Target as TargetIcon, CheckCircle2, XCircle, Eye, Trash2 } from "lucide-react";
import { users } from "@/mock/users";
import { products } from "@/mock/products";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatMoney, formatNumber, formatDateShort } from "@/utils/format";
import { can } from "@/config/permissions";
import { createTarget } from "@/services/targets.service";
import { invoices } from "@/mock/sales";
import { collections } from "@/mock/collections";
import { visits } from "@/mock/visits";
import type { Target, TargetLine } from "@/types";

function computeProgress(t: Target) {
  const sales = invoices.filter((i) => i.repId === t.ownerId && i.date >= t.startDate && i.date <= t.endDate).reduce((s, i) => s + i.net, 0);
  const collected = collections.filter((c) => c.repId === t.ownerId && c.status === "approved" && c.date >= t.startDate && c.date <= t.endDate).reduce((s, c) => s + c.amount, 0);
  const visitCount = visits.filter((v) => v.repId === t.ownerId && v.date >= t.startDate && v.date <= t.endDate).length;
  return {
    sales: t.salesAmount ? Math.round((sales / t.salesAmount) * 100) : 0,
    collection: t.collectionAmount ? Math.round((collected / t.collectionAmount) * 100) : 0,
    visits: t.visitsCount ? Math.round((visitCount / t.visitsCount) * 100) : 0,
  };
}

export function TargetsPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.targets.list());
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Target | null>(null);
  const [localTargets, setLocalTargets] = useState<Target[]>([]);

  const [formOwnerId, setFormOwnerId] = useState("");
  const [formOwnerType, setFormOwnerType] = useState<"rep" | "supervisor" | "territory">("rep");
  const [formPeriod, setFormPeriod] = useState<string>("monthly");
  const [formSales, setFormSales] = useState(0);
  const [formCollection, setFormCollection] = useState(0);
  const [formVisits, setFormVisits] = useState(0);
  const [formNewCustomers, setFormNewCustomers] = useState(0);
  const [formStartDate, setFormStartDate] = useState("2026-09-01");
  const [formEndDate, setFormEndDate] = useState("2026-09-30");
  const [formLines, setFormLines] = useState<TargetLine[]>([]);

  const resetForm = () => {
    setFormOwnerId("");
    setFormOwnerType("rep");
    setFormPeriod("monthly");
    setFormSales(0);
    setFormCollection(0);
    setFormVisits(0);
    setFormNewCustomers(0);
    setFormStartDate("2026-09-01");
    setFormEndDate("2026-09-30");
    setFormLines([]);
  };

  const handleCreateTarget = () => {
    const r = createTarget({
      ownerId: formOwnerId,
      ownerType: formOwnerType,
      period: formPeriod,
      salesAmount: formSales,
      collectionAmount: formCollection,
      visitsCount: formVisits,
      newCustomers: formNewCustomers,
      startDate: formStartDate,
    }, { id: user?.id ?? "" });
    if (r.success) {
      if (r.targetId && formLines.length > 0) {
        setLocalTargets((prev) => {
          const source = prev.length > 0 ? prev : (data ?? []);
          return source.map((t) => t.id === r.targetId ? { ...t, lines: formLines, endDate: formEndDate || t.endDate } : t);
        });
      }
      toast.success("تم إنشاء الهدف — يُعتمد قبل تفعيله");
      setOpen(false);
      resetForm();
    } else {
      toast.error("فشل", r.reason);
    }
  };

  const addProductLine = () => {
    if (formLines.length >= products.length) return;
    setFormLines([...formLines, { productId: products[0]?.id ?? "", productName: products[0]?.name ?? "", quantity: 1, unit: "unit" }]);
  };

  const updateProductLine = (index: number, field: keyof TargetLine, value: string | number) => {
    setFormLines(formLines.map((line, i) => {
      if (i !== index) return line;
      if (field === "productId") {
        const p = products.find((p) => p.id === value);
        return { ...line, productId: value as string, productName: p?.name ?? "" };
      }
      return { ...line, [field]: value };
    }));
  };

  const removeProductLine = (index: number) => {
    setFormLines(formLines.filter((_, i) => i !== index));
  };

  const ownerName = (t: Target) =>
    t.ownerType === "rep" || t.ownerType === "supervisor"
      ? users.find((u) => u.id === t.ownerId)?.name ?? "—"
      : t.ownerType === "territory"
        ? "منطقة (مجمع)"
        : "—";

  const isRep = user?.role === "REPRESENTATIVE";
  const isSM = user?.role === "SALES_MANAGER";
  const canCreate = can("targets.create", user?.role ?? "SUPERVISOR");

  const allTargets = localTargets.length > 0 ? localTargets : (data ?? []);

  const stats = useMemo(() => {
    const rows = isRep ? allTargets.filter((t) => t.ownerId === user.id) : allTargets;
    const approved = rows.filter((t) => t.status === "approved");
    const avgAchievement = rows.length > 0
      ? Math.round(rows.reduce((s, t) => s + computeProgress(t).sales, 0) / rows.length)
      : 0;
    return {
      total: rows.length,
      approved: approved.length,
      pending: rows.filter((t) => t.status === "under_review" || t.status === "draft").length,
      achievement: avgAchievement,
    };
  }, [allTargets, isRep, user?.id]);

  const filtered = useMemo(() => {
    let rows = isRep ? allTargets.filter((t) => t.ownerId === user.id) : allTargets;
    if (periodFilter) rows = rows.filter((t) => t.period === periodFilter);
    if (statusFilter) rows = rows.filter((t) => t.status === statusFilter);
    if (ownerFilter) rows = rows.filter((t) => t.ownerType === ownerFilter);
    return rows;
  }, [allTargets, isRep, user?.id, periodFilter, statusFilter, ownerFilter]);

  const handleApprove = (target: Target) => {
    setLocalTargets((prev) => {
      const source = prev.length > 0 ? prev : (data ?? []);
      return source.map((t) => t.id === target.id ? { ...t, status: "approved" as const, approvedBy: user?.name } : t);
    });
    toast.success(`تم اعتماد الهدف — ${ownerName(target)}`);
  };

  const handleReject = (target: Target) => {
    setLocalTargets((prev) => {
      const source = prev.length > 0 ? prev : (data ?? []);
      return source.map((t) => t.id === target.id ? { ...t, status: "draft" as const } : t);
    });
    toast.success(`تم رفض الهدف — ${ownerName(target)}`);
  };

const columns: Column<Target>[] = [
    { key: "owner", header: "المالك", sortable: true, sortValue: (t) => ownerName(t), priority: "primary", render: (t) => (
      <div>
        <div style={{ fontWeight: 500 }}>{ownerName(t)}</div>
        <Badge tone={t.ownerType === "rep" ? "info" : t.ownerType === "supervisor" ? "warning" : "neutral"}>{t.ownerType === "rep" ? "مندوب" : t.ownerType === "supervisor" ? "مشرف" : "منطقة"}</Badge>
      </div>
    ) },
    { key: "period", header: "الفترة", priority: "secondary", render: (t) => (t.period === "monthly" ? "شهري" : t.period === "weekly" ? "أسبوعي" : t.period === "yearly" ? "سنوي" : "يومي") },
    { key: "range", header: "النطاق", priority: "optional", render: (t) => <span className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatDateShort(t.startDate)} ← {formatDateShort(t.endDate)}</span> },
    {
      key: "sales",
      header: "المبيعات",
      sortable: true,
      sortValue: (t) => computeProgress(t).sales,
      priority: "primary",
      render: (t) => <Progress value={computeProgress(t).sales} tone={computeProgress(t).sales >= 100 ? "success" : "default"} label={`${computeProgress(t).sales}%`} />,
    },
    {
      key: "collection",
      header: "التحصيل",
      sortable: true,
      sortValue: (t) => computeProgress(t).collection,
      priority: "primary",
      render: (t) => <Progress value={computeProgress(t).collection} tone={computeProgress(t).collection >= 100 ? "success" : "warning"} label={`${computeProgress(t).collection}%`} />,
    },
    {
      key: "visits",
      header: "الزيارات",
      sortable: true,
      sortValue: (t) => computeProgress(t).visits,
      priority: "secondary",
      render: (t) => <Progress value={computeProgress(t).visits} tone={computeProgress(t).visits >= 100 ? "success" : "default"} label={`${computeProgress(t).visits}%`} />,
    },
    { key: "status", header: "الحالة", priority: "primary", render: (t) => <StatusBadge status={t.status} /> },
    ...(isSM ? [{
      key: "actions",
      header: "إجراء",
      priority: "primary" as const,
      render: (t: Target) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={(e) => { e.stopPropagation(); setDetailTarget(t); }}>عرض</Button>
          {t.status === "under_review" && <>
            <Button variant="ghost" size="sm" icon={<CheckCircle2 size={14} />} onClick={(e) => { e.stopPropagation(); handleApprove(t); }}>اعتماد</Button>
            <Button variant="ghost" size="sm" icon={<XCircle size={14} />} onClick={(e) => { e.stopPropagation(); handleReject(t); }}>رفض</Button>
          </>}
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الأهداف والمستهدفات" }]}
        title="الأهداف والمستهدفات"
        description="أهداف المبيعات والتحصيل والزيارات للمناديب والمشرفين والمناطق"
        actions={
          canCreate ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>هدف جديد</Button>
          ) : null
        }
      >

      <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إجمالي الأهداف</span><b className="num" style={{ fontSize: "var(--font-size-xl)" }}>{stats.total}</b></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>معتمدة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{stats.approved}</b></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>بانتظار الاعتماد</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{stats.pending}</b></div></Card>
        <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>متوسط الإنجاز</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{stats.achievement}%</b></div></Card>
      </div>

      <FilterBar>
        <Select
          label="الفترة"
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          placeholder="الكل"
          options={[
            { value: "daily", label: "يومي" },
            { value: "weekly", label: "أسبوعي" },
            { value: "monthly", label: "شهري" },
            { value: "yearly", label: "سنوي" },
          ]}
        />
        <Select
          label="الحالة"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="الكل"
          options={[
            { value: "approved", label: "معتمدة" },
            { value: "under_review", label: "قيد المراجعة" },
            { value: "draft", label: "مسودة" },
          ]}
        />
        <Select
          label="المالك"
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          placeholder="الكل"
          options={[
            { value: "rep", label: "مندوب" },
            { value: "supervisor", label: "مشرف" },
            { value: "territory", label: "منطقة" },
          ]}
        />
      </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(t) => t.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث باسم المالك..."
        searchKeys={(t) => ownerName(t)}
        exportFilename="targets"
        pageSize={10}
        emptyTitle="لا توجد أهداف مطابقة"
        onRowClick={(t) => setDetailTarget(t)}
      />

      <Modal
        open={open}
        onClose={() => { setOpen(false); resetForm(); }}
        title="هدف جديد"
        size="lg"
        footer={<>
          <Button variant="secondary" onClick={() => { setOpen(false); resetForm(); }}>إلغاء</Button>
          <Button variant="primary" icon={<TargetIcon size={14} />} onClick={handleCreateTarget}>إنشاء الهدف</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-6">
            <Select
              label="المالك"
              value={formOwnerId}
              onChange={(e) => {
                setFormOwnerId(e.target.value);
                const found = users.find((u) => u.id === e.target.value);
                if (found?.role === "SUPERVISOR") setFormOwnerType("supervisor");
                else if (found?.role === "REPRESENTATIVE") setFormOwnerType("rep");
                else setFormOwnerType("territory");
              }}
              placeholder="اختر المالك"
              options={users.map((u) => ({ value: u.id, label: u.name }))}
            />
          </div>
          <div className="field-span-6">
            <Select label="الفترة" value={formPeriod} onChange={(e) => setFormPeriod(e.target.value)} options={[
              { value: "monthly", label: "شهري" },
              { value: "weekly", label: "أسبوعي" },
              { value: "yearly", label: "سنوي" },
              { value: "daily", label: "يومي" },
            ]} />
          </div>
          <div className="field-span-4">
            <Input label="مبيعات (ر.س)" type="number" min={0} placeholder="0" value={formSales || ""} onChange={(e) => setFormSales(Number(e.target.value))} />
          </div>
          <div className="field-span-4">
            <Input label="تحصيل (ر.س)" type="number" min={0} placeholder="0" value={formCollection || ""} onChange={(e) => setFormCollection(Number(e.target.value))} />
          </div>
          <div className="field-span-4">
            <Input label="زيارات" type="number" min={0} placeholder="0" value={formVisits || ""} onChange={(e) => setFormVisits(Number(e.target.value))} />
          </div>
          <div className="field-span-4">
            <Input label="عملاء جدد" type="number" min={0} placeholder="0" value={formNewCustomers || ""} onChange={(e) => setFormNewCustomers(Number(e.target.value))} />
          </div>
          <div className="field-span-4">
            <Input label="تاريخ البداية" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
          </div>
          <div className="field-span-4">
            <Input label="تاريخ النهاية" type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
          </div>

          <div className="field-span-12">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <span style={{ fontWeight: 600 }}>أهداف المنتجات الكمية</span>
              <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={addProductLine}>إضافة منتج</Button>
            </div>
            {formLines.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "right" }}>
                    <th style={{ padding: "var(--space-2)", width: "40%" }}>المنتج</th>
                    <th style={{ padding: "var(--space-2)", width: "15%" }}>الكمية</th>
                    <th style={{ padding: "var(--space-2)", width: "15%" }}>الوحدة</th>
                    <th style={{ padding: "var(--space-2)", width: "10%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formLines.map((line, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                      <td style={{ padding: "var(--space-2)" }}>
                        <select
                          value={line.productId}
                          onChange={(e) => updateProductLine(idx, "productId", e.target.value)}
                          style={{ width: "100%", padding: 4, fontFamily: "inherit", fontSize: "var(--font-size-sm)" }}
                        >
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "var(--space-2)" }}>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateProductLine(idx, "quantity", Number(e.target.value))}
                          style={{ width: "100%", padding: 4, fontFamily: "inherit", fontSize: "var(--font-size-sm)" }}
                        />
                      </td>
                      <td style={{ padding: "var(--space-2)" }}>
                        <select
                          value={line.unit}
                          onChange={(e) => updateProductLine(idx, "unit", e.target.value)}
                          style={{ width: "100%", padding: 4, fontFamily: "inherit", fontSize: "var(--font-size-sm)" }}
                        >
                          <option value="unit">وحدة</option>
                          <option value="carton">كرتون</option>
                        </select>
                      </td>
                      <td style={{ padding: "var(--space-2)" }}>
                        <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => removeProductLine(idx)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {formLines.length === 0 && (
              <div className="muted" style={{ fontSize: "var(--font-size-sm)", padding: "var(--space-2)", textAlign: "center", border: "1px dashed var(--color-border)", borderRadius: "var(--radius)" }}>
                لا توجد أهداف منتجات — اضغط "إضافة منتج" لتحديد كميات مستهدفة لكل منتج.
              </div>
            )}
          </div>

          <div className="field-span-12">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              سيُقارن النظام الإنجاز الفعلي بالأهداف لحظياً عبر لوحات المتابعة.
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title={detailTarget ? `${ownerName(detailTarget)} — الهدف` : ""}
        footer={<>
          {isSM && detailTarget?.status === "under_review" && <>
            <Button variant="secondary" icon={<XCircle size={14} />} onClick={() => { handleReject(detailTarget!); setDetailTarget(null); }}>رفض</Button>
            <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={() => { handleApprove(detailTarget!); setDetailTarget(null); }}>اعتماد</Button>
          </>}
          {(!isSM || detailTarget?.status !== "under_review") && <Button variant="secondary" onClick={() => setDetailTarget(null)}>إغلاق</Button>}
        </>}
      >
        {detailTarget && (
          <div>
            <div className="form-grid" style={{ marginBottom: "var(--space-4)" }}>
              <div className="field-span-6">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المالك</span>
                <div style={{ fontWeight: 500 }}>{ownerName(detailTarget)}</div>
              </div>
              <div className="field-span-6">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الفترة</span>
                <div>{detailTarget.period === "monthly" ? "شهري" : detailTarget.period === "weekly" ? "أسبوعي" : detailTarget.period === "yearly" ? "سنوي" : "يومي"}</div>
              </div>
              <div className="field-span-6">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الحالة</span>
                <div><StatusBadge status={detailTarget.status} /></div>
              </div>
              <div className="field-span-6">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>النطاق</span>
                <div className="num">{formatDateShort(detailTarget.startDate)} — {formatDateShort(detailTarget.endDate)}</div>
              </div>
            </div>

            <div style={{ fontWeight: 600, marginBottom: "var(--space-2)" }}>الإنجاز الفعلي</div>
            <div className="form-grid" style={{ marginBottom: "var(--space-4)" }}>
              <div className="field-span-4">
                <div style={{ marginBottom: "var(--space-1)" }}>
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المبيعات المستهدفة</span>
                  <div className="num" style={{ fontWeight: 600 }}>{formatMoney(detailTarget.salesAmount)}</div>
                </div>
                <Progress value={computeProgress(detailTarget).sales} tone={computeProgress(detailTarget).sales >= 100 ? "success" : "default"} label={`${computeProgress(detailTarget).sales}%`} />
              </div>
              <div className="field-span-4">
                <div style={{ marginBottom: "var(--space-1)" }}>
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>التحصيل المستهدف</span>
                  <div className="num" style={{ fontWeight: 600 }}>{formatMoney(detailTarget.collectionAmount)}</div>
                </div>
                <Progress value={computeProgress(detailTarget).collection} tone={computeProgress(detailTarget).collection >= 100 ? "success" : "warning"} label={`${computeProgress(detailTarget).collection}%`} />
              </div>
              <div className="field-span-4">
                <div style={{ marginBottom: "var(--space-1)" }}>
                  <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الزيارات المستهدفة</span>
                  <div className="num" style={{ fontWeight: 600 }}>{detailTarget.visitsCount}</div>
                </div>
                <Progress value={computeProgress(detailTarget).visits} tone={computeProgress(detailTarget).visits >= 100 ? "success" : "default"} label={`${computeProgress(detailTarget).visits}%`} />
              </div>
            </div>

            {detailTarget.lines && detailTarget.lines.length > 0 && (
              <>
                <div style={{ fontWeight: 600, marginBottom: "var(--space-2)" }}>أهداف المنتجات</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "right" }}>
                      <th style={{ padding: "var(--space-2)" }}>المنتج</th>
                      <th style={{ padding: "var(--space-2)" }}>الكمية</th>
                      <th style={{ padding: "var(--space-2)" }}>الوحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailTarget.lines.map((line) => (
                      <tr key={line.productId} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td style={{ padding: "var(--space-2)" }}>{line.productName}</td>
                        <td style={{ padding: "var(--space-2)" }} className="num">{formatNumber(line.quantity)}</td>
                        <td style={{ padding: "var(--space-2)" }}>{line.unit === "carton" ? "كرتون" : "وحدة"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {detailTarget.approvedBy && (
              <div style={{ marginTop: "var(--space-3)", fontSize: "var(--font-size-sm)" }} className="muted">
                اعتمد بواسطة: {detailTarget.approvedBy}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}