import { useState } from "react";
import { Save, ShieldCheck, Bell, Globe, Coins } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Checkbox, Textarea } from "@/components/ui/FormControls";
import { Tabs } from "@/components/ui/Tabs";
import { Alert } from "@/components/ui/Alert";
import { FileUpload, type UploadedFile } from "@/components/ui/FileUpload";
import { toast } from "@/store/ui";
import { can } from "@/config/permissions";
import { formatMoney } from "@/utils/format";
import { updateSettings } from "@/services/settings.service";

export function SettingsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("general");
  const [logoFiles, setLogoFiles] = useState<UploadedFile[]>([]);
  const canManage = can("settings.manage", user?.role ?? "GENERAL_MANAGER");

  const save = () => { const r = updateSettings({}, { id: user?.id ?? "" }); if (r.success) toast.success("تم حفظ الإعدادات", "تطبق التغييرات فوراً"); else toast.error("فشل", r.reason); };

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الإعدادات" }]}
        title="الإعدادات"
        description="إعدادات النظام والشركة والحدود والسياسات"
        actions={
          canManage ? (
            <Button variant="primary" icon={<Save size={15} />} onClick={save}>حفظ التغييرات</Button>
          ) : null
        }
      />

      <Tabs
        tabs={[
          { key: "general", label: "عام", content: (
            <div className="grid-2-1">
              <Card title="بيانات الشركة" subtitle="تظهر في الفواتير والتقارير">
                <div className="form-grid">
                  <div className="field-span-12"><Input label="اسم الشركة" defaultValue="نظام التوزيع الميداني" disabled={!canManage} /></div>
                  <div className="field-span-6"><Input label="الفرع الرئيسي" defaultValue="الفرع الرئيسي — الرياض" disabled={!canManage} /></div>
                  <div className="field-span-6"><Input label="المدينة" defaultValue="الرياض" disabled={!canManage} /></div>
                  <div className="field-span-6"><Input label="الهاتف" defaultValue="+966 11 000 0000" disabled={!canManage} /></div>
                  <div className="field-span-6"><Input label="الرقم الضريبي" defaultValue="310000000000003" disabled={!canManage} /></div>
                  <div className="field-span-12"><Textarea label="العنوان الكامل" defaultValue="الرياض، حي العليا، طريق الملك فهد" disabled={!canManage} /></div>
                </div>
              </Card>
              <Card title="العملة والتنسيق">
                <div className="form-grid">
                  <div className="field-span-12">
                    <Select label="العملة" defaultValue="SAR" disabled={!canManage} options={[{ value: "SAR", label: "ريال سعودي (ر.س)" }, { value: "AED", label: "درهم إماراتي" }]} />
                  </div>
                  <div className="field-span-12">
                    <Select label="المنطقة الزمنية" defaultValue="Riyadh" disabled={!canManage} options={[{ value: "Riyadh", label: "الرياض (GMT+3)" }, { value: "Jeddah", label: "جدة (GMT+3)" }]} />
                  </div>
                  <div className="field-span-12">
                    <Select label="لغة الواجهة" defaultValue="ar" disabled={!canManage} options={[{ value: "ar", label: "العربية (RTL)" }, { value: "en", label: "الإنجليزية" }]} />
                  </div>
                </div>
              </Card>
            </div>
          ) },
          { key: "policies", label: "السياسات والحدود", content: (
            <div className="grid-2-1">
              <Card title="الحدود والسياسات المالية" subtitle="تُطبق تلقائياً على العمليات">
                <div className="form-grid">
                  <div className="field-span-6"><Input label="سقف الخصم التلقائي للمندوب (٪)" type="number" defaultValue="5" disabled={!canManage} /></div>
                  <div className="field-span-6"><Input label="سقف الخصم التلقائي للمشرف (٪)" type="number" defaultValue="8" disabled={!canManage} /></div>
                  <div className="field-span-6"><Input label="سقف سند التحصيل النقدي للمندوب (ر.س)" type="number" defaultValue="5000" disabled={!canManage} /></div>
                  <div className="field-span-6"><Input label="سقف المرتجع التلقائي (ر.س)" type="number" defaultValue="500" disabled={!canManage} /></div>
                  <div className="field-span-6"><Input label="نسبة الاستخدام الائتماني للتنبيه (٪)" type="number" defaultValue="75" disabled={!canManage} /></div>
                  <div className="field-span-6"><Input label="مستوى إعادة الطلب الافتراضي (وحدات)" type="number" defaultValue="50" disabled={!canManage} /></div>
                  <div className="field-span-12">
                    <label className="checkbox">
                      <input type="checkbox" defaultChecked disabled={!canManage} />
                      منع البيع الآجل عند تجاوز الحد الائتماني تلقائياً
                    </label>
                  </div>
                  <div className="field-span-12">
                    <label className="checkbox">
                      <input type="checkbox" defaultChecked disabled={!canManage} />
                      طلب توثيق GPS إلزامي عند تسجيل الزيارات
                    </label>
                  </div>
                </div>
              </Card>
              <Card title="الحدود الحالية">
                <div className="stack-sm">
                  <div className="flex-between"><span className="muted">حد ائتماني أقصى للعميل</span><b className="num">{formatMoney(150000)}</b></div>
                  <div className="flex-between"><span className="muted">أجل أقصى للفواتير</span><b className="num">45 يوم</b></div>
                  <div className="flex-between"><span className="muted">خصم أقصى لكل بند</span><b className="num">15%</b></div>
                  <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                    أي تعديل على الحدود يسجل في سجل التدقيق ويحتاج اعتماداً عند تجاوز سقف التغيير.
                  </div>
                </div>
              </Card>
            </div>
          ) },
          { key: "notifications", label: "الإشعارات", content: (
            <Card title="التنبيهات والإشعارات">
              <div className="form-grid">
                <div className="field-span-12"><Checkbox label="تنبيه عند انخفاض مخزون السيارة عن 20 وحدة" defaultChecked /></div>
                <div className="field-span-12"><Checkbox label="تنبيه عند اقتراب العميل من الحد الائتماني (75٪)" defaultChecked /></div>
                <div className="field-span-12"><Checkbox label="تنبيه عند تأخر عميل عن السداد أكثر من 30 يوم" defaultChecked /></div>
                <div className="field-span-12"><Checkbox label="إشعار فوري عند إنشاء طلب اعتماد بمستواي" defaultChecked /></div>
                <div className="field-span-12"><Checkbox label="تنبيه GPS عند الانحراف عن المسار أكثر من 2 كم" /></div>
              </div>
            </Card>
          ) },
          { key: "branding", label: "الهوية والشعار", content: (
            <div className="grid-2-1">
              <Card title="شعار الشركة">
                <FileUpload accept="image/*" label="ارفع شعاراً جديداً (PNG/SVG)" files={logoFiles} onChange={setLogoFiles} />
                <div className="alert alert-info mt-4" style={{ marginBottom: 0 }}>
                  يظهر الشعار في الفواتير المطبوعة وتقارير PDF وقائمة الدخول.
                </div>
              </Card>
              <Card title="ألوان النظام">
                <div className="stack-sm">
                  <div className="flex-between"><span className="muted">اللون الأساسي</span><span className="badge" style={{ background: "var(--color-primary)" }}>البنفسجي</span></div>
                  <div className="flex-between"><span className="muted">اللون الثانوي</span><span className="badge" style={{ background: "var(--color-info)" }}>الأزرق</span></div>
                  <div className="flex-between"><span className="muted">لون النجاح</span><span className="badge" style={{ background: "var(--color-success)" }}>الأخضر</span></div>
                </div>
              </Card>
            </div>
          ) },
        ]}
        active={tab}
        onChange={setTab}
      />
    </div>
  );
}