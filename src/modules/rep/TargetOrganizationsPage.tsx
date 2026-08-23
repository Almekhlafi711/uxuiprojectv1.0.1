import { useMemo, useState } from "react";
import { Plus, Eye, UserCheck, AlertTriangle, Target as TargetIcon, CheckCircle2, XCircle } from "lucide-react";
import { targetOrganizations } from "@/mock/repField";
import { customers } from "@/mock/customers";
import { useAuthStore } from "@/store/auth";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input, Select, Textarea, Checkbox } from "@/components/ui/FormControls";
import { toast } from "@/store/ui";
import { mockApi } from "@/services/mockApi";
import { formatDateShort } from "@/utils/format";
import type { TargetOrganization } from "@/types";

const orgStatusLabels: Record<TargetOrganization["status"], string> = {
  draft: "مسودة",
  under_review: "قيد المراجعة",
  approved: "معتمدة",
  rejected: "مرفوضة",
  converted: "تم التحويل",
};

const emptyForm = {
  orgType: "مؤسسة",
  name: "",
  legalName: "",
  commercialReg: "",
  taxNumber: "",
  mainActivity: "",
  city: "",
  district: "",
  address: "",
  phone: "",
  email: "",
  contactName: "",
  contactTitle: "",
  contactPhone: "",
  expectedProducts: "",
  expectedVolume: "",
  expectedFrequency: "",
  currentSupplier: "",
  paymentTerms: "credit_15" as "cash" | "credit_7" | "credit_15" | "credit_30",
  creditRequirement: "",
  notes: "",
};

export function TargetOrganizationsPage() {
  const { user } = useAuthStore();
  const me = user!;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<TargetOrganization | null>(null);
  const [convert, setConvert] = useState<TargetOrganization | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [created, setCreated] = useState<TargetOrganization[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [converting, setConverting] = useState(false);

  const list = useMemo(() => {
    const mine = targetOrganizations.filter((t) => t.requestedById === me.id);
    return [...created, ...mine];
  }, [created, me.id]);

  const counts = useMemo(() => ({
    underReview: list.filter((t) => t.status === "under_review").length,
    approved: list.filter((t) => t.status === "approved").length,
    converted: list.filter((t) => t.status === "converted").length,
    rejected: list.filter((t) => t.status === "rejected").length,
  }), [list]);

  const findDuplicate = (): string | null => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const cr = form.commercialReg.trim();
    const hitCustomer = customers.find(
      (c) => (cr && c.commercialReg === cr) || c.phone === phone || (name && c.name.replace(/^عميل مستهدف — /, "").includes(name) || (c.name.includes(name) && name.length > 3))
    );
    if (hitCustomer) return `المنشأة مشابهة لعميل مسجل: ${hitCustomer.name}`;
    const hitTarget = targetOrganizations.find(
      (t) => t.requestedById === me.id && t.status !== "rejected" && (t.name === name || t.phones.includes(phone) || (cr && t.commercialReg === cr))
    );
    if (hitTarget) return `تم اقتراح نفس المنشأة مسبقاً: ${hitTarget.name}`;
    return null;
  };

  const submit = async () => {
    if (!form.name || !form.orgType || !form.city || !form.phone) {
      toast.warning("أكمل الحقول الأساسية: الاسم، النوع، المدينة، الهاتف");
      return;
    }
    const dup = findDuplicate();
    if (dup) {
      setDuplicate(dup);
      return;
    }
    setSubmitting(true);
    try {
      const rec: TargetOrganization = {
        id: `to-new-${Date.now()}`,
        code: `TGT-ORG-${String(1000 + list.length + created.length + 1)}`,
        orgType: form.orgType,
        name: form.name,
        legalName: form.legalName || undefined,
        commercialReg: form.commercialReg || undefined,
        taxNumber: form.taxNumber || undefined,
        mainActivity: form.mainActivity || undefined,
        city: form.city,
        district: form.district || undefined,
        address: form.address || undefined,
        phones: [form.phone],
        email: form.email || undefined,
        contactPerson: form.contactName
          ? { name: form.contactName, jobTitle: form.contactTitle || "جهة اتصال", phone: form.contactPhone || form.phone, isPrimary: true }
          : undefined,
        expectedProducts: form.expectedProducts || undefined,
        expectedVolume: form.expectedVolume || undefined,
        expectedFrequency: form.expectedFrequency || undefined,
        currentSupplier: form.currentSupplier || undefined,
        paymentTerms: form.paymentTerms,
        creditRequirement: form.creditRequirement || undefined,
        notes: form.notes || undefined,
        territoryId: me.territoryId ?? "",
        requestedById: me.id,
        supervisorId: me.supervisorId ?? "",
        date: "2026-08-14",
        status: "under_review",
      };
      await mockApi.rep.createTargetOrg(rec);
      setCreated((c) => [rec, ...c]);
      setOpen(false);
      setForm(emptyForm);
      setDuplicate(null);
      toast.success("أُرسلت المنشأة المستهدفة للمراجعة", "سيقوم المشرف بالاعتماد أو الرفض خلال يوم عمل");
    } catch {
      toast.error("فشل إرسال المنشأة", "حدث خطأ أثناء إرسال المنشأة المستهدفة");
    } finally {
      setSubmitting(false);
    }
  };

  const doConvert = async () => {
    if (!convert) return;
    setConverting(true);
    try {
      await mockApi.rep.convertTargetOrg(convert.id);
      setCreated((c) => c.map((t) => (t.id === convert.id ? { ...t, status: "converted", convertedToCustomerId: t.id } : t)));
      toast.success("تم تحويل المنشأة إلى عميل فعلي", "أُنشئ ملف العميل وربط بمنطقتك");
      setConvert(null);
    } catch {
      toast.error("فشل التحويل", "حدث خطأ أثناء تحويل المنشأة إلى عميل");
    } finally {
      setConverting(false);
    }
  };

  const columns: Column<TargetOrganization>[] = [
    { key: "code", header: "الرقم", sortable: true, sortValue: (r) => r.code, priority: "primary", render: (r) => <b className="num">{r.code}</b> },
    { key: "name", header: "المنشأة", sortable: true, sortValue: (r) => r.name, priority: "primary", render: (r) => (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <TargetIcon size={14} />
        <span>
          {r.name}
          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.orgType} · {r.mainActivity ?? "—"}</div>
        </span>
      </span>
    ) },
    { key: "city", header: "المدينة", priority: "secondary", render: (r) => r.city },
    { key: "contact", header: "جهة الاتصال", priority: "optional", render: (r) => r.contactPerson ? `${r.contactPerson.name} · ${r.contactPerson.phone}` : "—" },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (r) => r.date, priority: "secondary", render: (r) => <span className="num">{formatDateShort(r.date)}</span> },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => <Badge tone={r.status === "approved" || r.status === "converted" ? "success" : r.status === "rejected" ? "danger" : r.status === "under_review" ? "warning" : "neutral"} dot>{orgStatusLabels[r.status]}</Badge> },
    { key: "actions", header: "إجراء", priority: "primary", render: (r) => (
      <span style={{ display: "inline-flex", gap: 6 }}>
        <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => setView(r)}>عرض</Button>
        {r.status === "approved" && <Button size="sm" variant="primary" icon={<UserCheck size={13} />} onClick={() => setConvert(r)}>تحويل</Button>}
      </span>
    ) },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المؤسسات المستهدفة" }]}
        title="المؤسسات المستهدفة (B2B)"
        description="اقتراح منشآت تجارية جديدة ضمن منطقتك — كشف مكرر + تحقق من النطاق"
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>إضافة منشأة مستهدفة</Button>}
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>قيد المراجعة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{counts.underReview}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>معتمدة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-success)" }}>{counts.approved}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تم التحويل</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-primary)" }}>{counts.converted}</b></div></Card>
          <Card><div className="stat-card-body"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مرفوضة</span><b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-danger)" }}>{counts.rejected}</b></div></Card>
        </div>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={list}
        rowKey={(r) => r.id}
        searchPlaceholder="بحث باسم المنشأة أو الهاتف..."
        searchKeys={(r) => `${r.name} ${r.phones.join(" ")} ${r.commercialReg ?? ""}`}
        exportFilename="target-organizations"
        pageSize={10}
        emptyTitle="لا توجد مؤسسات مستهدفة"
        emptyDescription="ابدأ بإضافة منشأة مستهدفة ضمن نطاق منطقتك."
      />

      <Modal open={open} onClose={() => { setOpen(false); setDuplicate(null); }} title="إضافة منشأة مستهدفة" size="xl" footer={<>
        <Button variant="secondary" onClick={() => { setOpen(false); setDuplicate(null); }}>إلغاء</Button>
        <Button variant="primary" icon={<Plus size={15} />} onClick={submit} loading={submitting} disabled={submitting}>إرسال للمراجعة</Button>
      </>}>
        <div className="stack-sm">
          {duplicate && (
            <div className="alert alert-danger">
              <AlertTriangle size={17} />
              <div>
                <div className="alert-title">كشف المكررات</div>
                <div>{duplicate} — ارفض الإرسال ما لم تكن المنشأة مختلفة فعلياً.</div>
              </div>
            </div>
          )}
          <div className="form-grid">
            <div className="field-span-4">
              <Select label="نوع المنشأة" required value={form.orgType} onChange={(e) => setForm((f) => ({ ...f, orgType: e.target.value }))} options={[
                { value: "مؤسسة", label: "مؤسسة" },
                { value: "شركة", label: "شركة" },
                { value: "سوبر ماركت", label: "سوبر ماركت" },
                { value: "مستودع/موزع", label: "مستودع / موزع" },
                { value: "مطعم/كافيه", label: "مطعم / كافيه" },
              ]} />
            </div>
            <div className="field-span-8">
              <Input label="الاسم التجاري" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: مؤسسة النخبة التجارية" />
            </div>
            <div className="field-span-6">
              <Input label="الاسم القانوني" value={form.legalName} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />
            </div>
            <div className="field-span-3">
              <Input label="السجل التجاري" value={form.commercialReg} onChange={(e) => setForm((f) => ({ ...f, commercialReg: e.target.value }))} className="num" />
            </div>
            <div className="field-span-3">
              <Input label="الرقم الضريبي" value={form.taxNumber} onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))} className="num" />
            </div>
            <div className="field-span-6">
              <Input label="النشاط الرئيسي" value={form.mainActivity} onChange={(e) => setForm((f) => ({ ...f, mainActivity: e.target.value }))} placeholder="مثال: توزيع مواد غذائية" />
            </div>
            <div className="field-span-3">
              <Input label="المدينة" required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="field-span-3">
              <Input label="الحي" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} />
            </div>
            <div className="field-span-8">
              <Input label="العنوان" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="field-span-4">
              <Input label="رقم الجوال/الهاتف" required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="num" />
            </div>
            <div className="field-span-6">
              <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="field-span-6">
              <Input label="المورد الحالي" value={form.currentSupplier} onChange={(e) => setForm((f) => ({ ...f, currentSupplier: e.target.value }))} placeholder="إن وُجد" />
            </div>
            <div className="field-span-12">
              <div className="alert alert-info" style={{ marginBottom: 0, fontSize: "var(--font-size-sm)" }}>
                <b>جهة الاتصال</b>
              </div>
            </div>
            <div className="field-span-4">
              <Input label="الاسم" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div className="field-span-4">
              <Input label="المسمى الوظيفي" value={form.contactTitle} onChange={(e) => setForm((f) => ({ ...f, contactTitle: e.target.value }))} />
            </div>
            <div className="field-span-4">
              <Input label="جوال جهة الاتصال" value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} className="num" />
            </div>
            <div className="field-span-6">
              <Input label="المنتجات المتوقعة" value={form.expectedProducts} onChange={(e) => setForm((f) => ({ ...f, expectedProducts: e.target.value }))} placeholder="مثال: مياه، مشروبات غازية" />
            </div>
            <div className="field-span-3">
              <Input label="الحجم المتوقع" value={form.expectedVolume} onChange={(e) => setForm((f) => ({ ...f, expectedVolume: e.target.value }))} placeholder="مثال: 20,000 ر.س/شهر" />
            </div>
            <div className="field-span-3">
              <Select label="شروط الدفع" value={form.paymentTerms} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value as typeof form.paymentTerms }))} options={[
                { value: "cash", label: "نقدي" },
                { value: "credit_7", label: "آجل 7 أيام" },
                { value: "credit_15", label: "آجل 15 يوم" },
                { value: "credit_30", label: "آجل 30 يوم" },
              ]} />
            </div>
            <div className="field-span-6">
              <Input label="الاحتياج الائتماني" value={form.creditRequirement} onChange={(e) => setForm((f) => ({ ...f, creditRequirement: e.target.value }))} placeholder="مثال: حتى 30,000 ر.س" />
            </div>
            <div className="field-span-6">
              <Select label="النطاق (منطقتك)" value={me.territoryId ?? ""} options={[{ value: me.territoryId ?? "", label: me.territoryId === "t-01" ? "الرياض — شمال (أ)" : me.territoryId ?? "منطقتي" }]} helper="يُسمح بالاقتراح ضمن نطاق المنطقة المخصصة فقط" />
            </div>
            <div className="field-span-12">
              <Textarea label="ملاحظات إضافية" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="field-span-12">
              <Checkbox label="أؤكد أن هذه المنشأة غير مسجلة مسبقاً ولا يوجد بها تكرار" checked={!duplicate} onChange={() => setDuplicate(null)} />
            </div>
          </div>
        </div>
      </Modal>

      {view && (
        <Modal open onClose={() => setView(null)} title={view.name} size="md">
          <div className="stack-sm">
            <div className="flex-between">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الحالة</span>
              <Badge tone={view.status === "approved" || view.status === "converted" ? "success" : view.status === "rejected" ? "danger" : view.status === "under_review" ? "warning" : "neutral"} dot>{orgStatusLabels[view.status]}</Badge>
            </div>
            <div className="flex-between">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>النوع / النشاط</span>
              <span style={{ fontSize: "var(--font-size-sm)" }}>{view.orgType} · {view.mainActivity ?? "—"}</span>
            </div>
            {view.commercialReg && <div className="flex-between"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>السجل التجاري</span><span className="num" style={{ fontSize: "var(--font-size-sm)" }}>{view.commercialReg}</span></div>}
            {view.taxNumber && <div className="flex-between"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الرقم الضريبي</span><span className="num" style={{ fontSize: "var(--font-size-sm)" }}>{view.taxNumber}</span></div>}
            <div className="flex-between"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الهاتف</span><span className="num" style={{ fontSize: "var(--font-size-sm)" }}>{view.phones.join("، ")}</span></div>
            {view.contactPerson && <div className="flex-between"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>جهة الاتصال</span><span style={{ fontSize: "var(--font-size-sm)" }}>{view.contactPerson.name} · {view.contactPerson.jobTitle}</span></div>}
            <div className="flex-between"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>المنتجات المتوقعة</span><span style={{ fontSize: "var(--font-size-sm)" }}>{view.expectedProducts ?? "—"}</span></div>
            <div className="flex-between"><span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الحجم المتوقع</span><span style={{ fontSize: "var(--font-size-sm)" }}>{view.expectedVolume ?? "—"}</span></div>
            {view.rejectionReason && (
              <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                <XCircle size={16} />
                <div><div className="alert-title">سبب الرفض</div><div>{view.rejectionReason}</div></div>
              </div>
            )}
            {view.status === "converted" && view.convertedToCustomerId && (
              <div className="alert alert-success" style={{ marginBottom: 0 }}>
                <CheckCircle2 size={16} />
                <div><div className="alert-title">تم التحويل إلى عميل فعلي</div><div>ملف العميل: {view.convertedToCustomerId}</div></div>
              </div>
            )}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!convert}
        onClose={() => setConvert(null)}
        onConfirm={doConvert}
        title="تحويل المنشأة إلى عميل"
        message={`سيتم إنشاء ملف عميل فعلي لـ «${convert?.name}» وربطه بمنطقتك ضمن قائمة العملاء.`}
        confirmLabel={converting ? "جاري التحويل..." : "تحويل إلى عميل"}
      />
    </div>
  );
}
