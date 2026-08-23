import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { mockApi } from "@/services/mockApi";
import { hasPermission } from "@/config/permissions";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/store/ui";
import { commissionPolicies } from "@/mock/commission";
import type { PolicyConfig } from "@/mock/policy";
import type { PolicyDocument } from "@/mock/policy";

export function PolicyCenterPage() {
  const { user } = useAuthStore();
  const [config, setConfig] = useState<PolicyConfig | null>(null);
  const [draft, setDraft] = useState<PolicyDocument<PolicyConfig> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    mockApi.policy.get().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  const editable = user ? hasPermission(user.role, "policy.manage") : false;
  const display: PolicyConfig | null = draft ? draft.content : config;

  async function createDraft() {
    if (!config) return;
    setSaving("draft");
    try {
      const doc = await mockApi.policy.createVersion(config);
      setDraft(doc);
      toast.success("تم إنشاء نسخة مسودة — v" + doc.version);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  function patch(section: keyof PolicyConfig, value: Partial<PolicyConfig[keyof PolicyConfig]>) {
    if (!draft) return;
    const patched = { ...draft.content, [section]: { ...(draft.content[section] as object), ...(value as object) } } as PolicyConfig;
    setDraft({ ...draft, content: patched });
  }

  async function submitDraft() {
    if (!draft) return;
    setSaving("submit");
    try {
      await mockApi.policy.submit(draft.id);
      const updated = await mockApi.policy.getDocument();
      setDraft(updated);
      toast.success("تم إرسال السياسة للاعتماد");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  if (loading || !config) {
    return (
      <div className="page">
        <StickyPageHeader crumbs={[{ label: "الرئيسية", path: "/" }, { label: "مركز التهيئة والسياسات" }]} title="مركز التهيئة والسياسات" description="السياسات المحركة للواجهة (3.12 / 3.24 / 3.33)" />
        <p className="muted">جارٍ التحميل…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <StickyPageHeader
        crumbs={[{ label: "الرئيسية", path: "/" }, { label: "مركز التهيئة والسياسات" }]}
        title="مركز التهيئة والسياسات"
        description="السياسات المحركة للواجهة — تُطبَّق على كل الوحدات (3.12 / 3.24 / 3.33)"
        actions={
          editable && draft ? (
            <Button size="sm" onClick={submitDraft} disabled={saving === "submit"}>
              {saving === "submit" ? "جارٍ الإرسال…" : "إرسال للاعتماد"}
            </Button>
          ) : editable && !draft ? (
            <Button size="sm" onClick={createDraft} disabled={saving === "draft"}>
              {saving === "draft" ? "جارٍ الإنشاء…" : "إنشاء نسخة مسودة"}
            </Button>
          ) : (
            <Badge tone="warning">وضع العرض فقط</Badge>
          )
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
        <Card title="الائتمان (Credit)">
          <div className="form-row">
            <label>نسبة التحذير قبل الحد (%)</label>
            <input
              className="input"
              type="number"
              value={display?.credit.warnAtPercent ?? 0}
              disabled={!editable || !draft}
              onChange={(e) => patch("credit", { warnAtPercent: Number(e.target.value) })}
            />
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={display?.credit.blockWhenExceeded ?? false}
              disabled={!editable || !draft}
              onChange={(e) => patch("credit", { blockWhenExceeded: e.target.checked })}
            />
            منع البيع عند تجاوز الحد الائتماني
          </label>
          {editable && draft && (
            <Button size="sm" onClick={submitDraft} disabled={saving === "submit"}>
              {saving === "submit" ? "جارٍ الإرسال…" : "إرسال للاعتماد"}
            </Button>
          )}
        </Card>

        <Card title="الخصم (Discount)">
          <div className="form-row">
            <label>أقصى نسبة بلا اعتماد (%)</label>
            <input
              className="input"
              type="number"
              value={display?.discount.maxRateWithoutApproval ?? 0}
              disabled={!editable || !draft}
              onChange={(e) => patch("discount", { maxRateWithoutApproval: Number(e.target.value) })}
            />
          </div>
          <div className="form-row">
            <label>حد مبلغ الاعتماد</label>
            <input
              className="input"
              type="number"
              value={display?.discount.approvalThresholdAmount ?? 0}
              disabled={!editable || !draft}
              onChange={(e) => patch("discount", { approvalThresholdAmount: Number(e.target.value) })}
            />
          </div>
          {editable && draft && (
            <Button size="sm" onClick={submitDraft} disabled={saving === "submit"}>
              {saving === "submit" ? "جارٍ الإرسال…" : "إرسال للاعتماد"}
            </Button>
          )}
        </Card>

        <Card title="المخزون (Stock)">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={display?.stock.transferReceiptRequired ?? false}
              disabled={!editable || !draft}
              onChange={(e) => patch("stock", { transferReceiptRequired: e.target.checked })}
            />
            إتمام التحويل بين المندوبين عند استلام المستلم فقط
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={display?.stock.countGeneratesAdjustment ?? false}
              disabled={!editable || !draft}
              onChange={(e) => patch("stock", { countGeneratesAdjustment: e.target.checked })}
            />
            نتائج الجرد تولّد حركة تسوية
          </label>
          {editable && draft && (
            <Button size="sm" onClick={submitDraft} disabled={saving === "submit"}>
              {saving === "submit" ? "جارٍ الإرسال…" : "إرسال للاعتماد"}
            </Button>
          )}
        </Card>

        <Card title="الرحلات والجي بي إس (GPS)">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={display?.gps.gpsRequiredForTrip ?? false}
              disabled={!editable || !draft}
              onChange={(e) => patch("gps", { gpsRequiredForTrip: e.target.checked })}
            />
            تفعيل GPS شرط لبدء الرحلة
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={display?.closing.closingRequiresTripCompleted ?? false}
              disabled={!editable || !draft}
              onChange={(e) => patch("closing", { closingRequiresTripCompleted: e.target.checked })}
            />
            إغلاق اليوم يتطلب اكتمال الرحلة
          </label>
          {editable && draft && (
            <Button size="sm" onClick={submitDraft} disabled={saving === "submit"}>
              {saving === "submit" ? "جارٍ الإرسال…" : "إرسال للاعتماد"}
            </Button>
          )}
        </Card>

        <Card title="المصاريف (Expenses)">
          <div className="form-row">
            <label>أقصى مصروف بلا اعتماد</label>
            <input
              className="input"
              type="number"
              value={display?.expenses.maxWithoutApproval ?? 0}
              disabled={!editable || !draft}
              onChange={(e) => patch("expenses", { maxWithoutApproval: Number(e.target.value) })}
            />
          </div>
          {editable && draft && (
            <Button size="sm" onClick={submitDraft} disabled={saving === "submit"}>
              {saving === "submit" ? "جارٍ الإرسال…" : "إرسال للاعتماد"}
            </Button>
          )}
        </Card>

        <Card title="الموزعون والتكلفة (Distributor / Cost)">
          <div className="form-row">
            <label>نوع الموزع</label>
            <select
              className="input"
              value={display?.distributor.type ?? "managed"}
              disabled={!editable || !draft}
              onChange={(e) => patch("distributor", { type: e.target.value as PolicyConfig["distributor"]["type"] })}
            >
              <option value="internal">داخلي</option>
              <option value="external">خارجي</option>
              <option value="managed">مدار (Managed)</option>
            </select>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={display?.distributor.allowSellOut ?? true}
              disabled={!editable || !draft}
              onChange={(e) => patch("distributor", { allowSellOut: e.target.checked })}
            />
            السماح بتسجيل المبيعات الخارجية (Sell-Out)
          </label>
          <div className="form-row">
            <label>طريقة حساب التكلفة</label>
            <select
              className="input"
              value={display?.costMethod ?? "moving_average"}
              disabled={!editable || !draft}
              onChange={(e) => patch("costMethod", e.target.value as PolicyConfig["costMethod"])}
            >
              <option value="moving_average">متوسط متحرك</option>
              <option value="standard">تكلفة معيارية</option>
              <option value="fifo">FIFO</option>
            </select>
          </div>
          <div className="form-row">
            <label>مسؤولية الدين عند نقل العميل</label>
            <select
              className="input"
              value={display?.debtResponsibility ?? "policy"}
              disabled={!editable || !draft}
              onChange={(e) => patch("debtResponsibility", e.target.value as PolicyConfig["debtResponsibility"])}
            >
              <option value="previous_rep">المندوب السابق</option>
              <option value="new_rep">المندوب الجديد</option>
              <option value="policy">حسب السياسة</option>
            </select>
          </div>
          {editable && draft && (
            <Button size="sm" onClick={submitDraft} disabled={saving === "submit"}>
              {saving === "submit" ? "جارٍ الإرسال…" : "إرسال للاعتماد"}
            </Button>
          )}
        </Card>

        <Card title="سياسات العمولة المعتمدة (Commission)">
          <DataTableLite
            rows={commissionPolicies}
            renderRow={(p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  <Badge tone={p.active ? "success" : "neutral"}>{p.active ? "نشطة" : "غير نشطة"}</Badge>
                </td>
                <td>{p.basis}</td>
                <td className="num">{p.rate}%</td>
                <td className="num">v{p.version}</td>
              </tr>
            )}
          />
        </Card>
      </div>
    </div>
  );
}

function DataTableLite({ rows, renderRow }: { rows: unknown[]; renderRow: (r: any) => React.ReactNode }) {
  return (
    <table className="data-table">
      <tbody>{rows.map((r) => renderRow(r))}</tbody>
    </table>
  );
}
