import { useState } from "react";
import { Input, Select, SearchableSelect, Textarea } from "@/components/ui/FormControls";
import { customers } from "@/mock/customers";
import { users } from "@/mock/users";
import { territories } from "@/mock/organization";
import { toast } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { getDataScope, canAccessTerritory, visibleUsers } from "@/services/scope";
import { createCustomer, updateCustomer } from "@/services/customers.service";

export function CustomerForm({ onSaved, initial }: { onSaved?: () => void; initial?: (typeof customers)[number] }) {
  const { user } = useAuthStore();
  const scope = getDataScope(user);
  const visibleReps = scope ? visibleUsers(scope).filter((u) => u.role === "REPRESENTATIVE") : [];
  const visibleTerritories = scope ? territories.filter((t) => canAccessTerritory(scope, t)) : territories;
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    type: initial?.type ?? "retailer",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    territoryId: initial?.territoryId ?? "",
    repId: initial?.repId ?? "",
    creditLimit: initial?.creditLimit ?? 10000,
    paymentTerms: initial?.paymentTerms ?? "cash",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "اسم العميل مطلوب";
    if (!form.phone.trim()) errs.phone = "رقم الهاتف مطلوب";
    if (!form.territoryId) errs.territoryId = "اختر المنطقة";
    if (!form.repId) errs.repId = "اختر المندوب";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const actor = { id: user?.id ?? "", role: String(user?.role ?? "REPRESENTATIVE"), scope: String(scope ?? "all") };
    if (initial) {
      const result = updateCustomer(initial.id, form, actor);
      if (result.success) { toast.success("تم تحديث بيانات العميل", form.name); onSaved?.(); }
      else { toast.error("فشل التحديث", result.reason); }
    } else {
      const result = createCustomer(form, actor);
      if (result.success) { toast.success("تم إنشاء العميل", form.name); onSaved?.(); }
      else { toast.error("فشل الإنشاء", result.reason); }
    }
  };

  return (
    <div className="stack">
      <div className="form-grid">
        <div className="field-span-8">
          <Input label="اسم العميل / المنشأة" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: مؤسسة النور التجارية" error={errors.name} />
        </div>
        <div className="field-span-4">
          <Select
            label="نوع العميل"
            required
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            options={[
              { value: "retailer", label: "بقالة / تموينات" },
              { value: "wholesaler", label: "موزع جملة" },
              { value: "supermarket", label: "سوبر ماركت" },
              { value: "restaurant", label: "مطعم / كافيه" },
              { value: "kiosk", label: "كشك" },
            ]}
          />
        </div>
        <div className="field-span-6">
          <Input label="رقم الهاتف" required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="05xxxxxxxx" error={errors.phone} />
        </div>
        <div className="field-span-6">
          <SearchableSelect
            label="المنطقة"
            required
            value={form.territoryId}
            onChange={(v) => set("territoryId", v)}
            options={visibleTerritories.map((t) => ({ value: t.id, label: t.name }))}
            error={errors.territoryId}
          />
        </div>
        <div className="field-span-12">
          <Textarea label="العنوان" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="الحي، الشارع، المدينة" />
        </div>
        <div className="field-span-6">
          <SearchableSelect
            label="المندوب المسؤول"
            required
            value={form.repId}
            onChange={(v) => set("repId", v)}
            options={visibleReps.map((u) => ({ value: u.id, label: u.name }))}
            error={errors.repId}
          />
        </div>
        <div className="field-span-6">
          <Input label="الحد الائتماني (ر.س)" type="number" min={0} value={form.creditLimit} onChange={(e) => set("creditLimit", Number(e.target.value))} />
        </div>
        <div className="field-span-6">
          <Select
            label="شروط الدفع"
            value={form.paymentTerms}
            onChange={(e) => set("paymentTerms", e.target.value)}
            options={[
              { value: "cash", label: "نقدي" },
              { value: "credit_7", label: "آجل 7 أيام" },
              { value: "credit_15", label: "آجل 15 يوم" },
              { value: "credit_30", label: "آجل 30 يوم" },
            ]}
          />
        </div>
        <div className="field-span-12">
          <Textarea label="ملاحظات" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="ملاحظات إضافية عن العميل..." />
        </div>
      </div>
      <div className="flex-between" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: "var(--space-4)" }}>
        <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>الموقع الجغرافي والتصنيف الائتماني يُضبطان من صفحة العميل</span>
        <button className="btn btn-primary" onClick={submit}>حفظ</button>
      </div>
    </div>
  );
}