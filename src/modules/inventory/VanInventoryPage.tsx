import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import { vanStock } from "@/mock/inventory";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { SearchableSelect, Select, Input } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatMoney, formatNumber, formatDateTime, formatQty } from "@/utils/format";
import type { VanStock } from "@/types";

export function VanInventoryPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.inventory.vanStock());
  const [repFilter, setRepFilter] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [countOpen, setCountOpen] = useState(false);
  const [requestProductId, setRequestProductId] = useState("");
  const [requestQty, setRequestQty] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [countSaving, setCountSaving] = useState(false);

  const isSupervisor = user?.role === "SUPERVISOR";
  const teamReps = isSupervisor ? users.filter((u) => u.role === "REPRESENTATIVE" && u.supervisorId === user?.id) : [];
  const myVan = data?.find((v) => v.repId === user?.id);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (repFilter) return data.filter((v) => v.repId === repFilter);
    if (isSupervisor) return data.filter((v) => teamReps.some((r) => r.id === v.repId));
    return data.filter((v) => v.repId === user?.id);
  }, [data, repFilter, isSupervisor, teamReps, user?.id]);

  const repName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المخزون", path: "/inventory" }, { label: "مخزون المندوب / السيارة" }]}
        title="مخزون المندوب / السيارة"
        description="المخزون المتحرك لدى المناديب — التحميل، الطلبات، والجرد"
        actions={
          <>
            <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => { refetch(); toast.success("تم تحديث بيانات المخزون المتحرك"); }}>مزامنة</Button>
            <Button variant="secondary" icon={<Plus size={15} />} onClick={() => setCountOpen(true)}>جرد السيارة</Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setRequestOpen(true)}>طلب بضاعة</Button>
          </>
        }
      >
        {isSupervisor && (
          <FilterBar>
            <SearchableSelect
              label="المندوب"
              value={repFilter}
              onChange={setRepFilter}
              placeholder="كل المناديب"
              options={teamReps.map((r) => ({ value: r.id, label: r.name }))}
            />
          </FilterBar>
        )}
      </StickyPageHeader>

      {!isSupervisor && user?.role === "REPRESENTATIVE" && myVan && (
        <div className="grid-2-1" style={{ marginBottom: "var(--space-4)" }}>
          <Card title="سيارتي — ملخص">
            <div className="stack-sm">
              <div className="flex-between">
                <span className="muted">إجمالي الوحدات</span>
                <b className="num">{formatNumber(myVan.items.reduce((s, i) => s + i.qty, 0))}</b>
              </div>
              <div className="flex-between">
                <span className="muted">الوحدات التالفة</span>
                <b className="num" style={{ color: "var(--color-danger)" }}>{formatNumber(myVan.items.reduce((s, i) => s + i.damagedQty, 0))}</b>
              </div>
              <div className="flex-between">
                <span className="muted">آخر تحديث</span>
                <span className="num" style={{ fontSize: "var(--font-size-sm)" }}>{formatDateTime(myVan.updatedAt)}</span>
              </div>
              <Link to="/inventory/requests" style={{ fontSize: "var(--font-size-sm)" }}>طلباتي السابقة ←</Link>
            </div>
          </Card>
          <Card title="تنبيهات">
            <div className="stack-sm">
              {myVan.items.filter((i) => i.qty < 20).length > 0 ? (
                myVan.items.filter((i) => i.qty < 20).map((i) => (
                  <div key={i.productId} className="alert alert-warning" style={{ marginBottom: 0 }}>
                    <b style={{ fontSize: "var(--font-size-sm)" }}>{i.productName}</b>
                    <span className="num" style={{ fontSize: "var(--font-size-sm)" }}> — متبقي {formatQty(i.qty)}</span>
                  </div>
                ))
              ) : (
                <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مخزونك ضمن الحدود الطبيعية</div>
              )}
            </div>
          </Card>
        </div>
      )}

      <Card title={repFilter ? `مخزون ${repName(repFilter)}` : isSupervisor ? "مخزون الفريق" : "مخزون سيارتي"}>
        <div className="stack">
          {filtered.map((van: VanStock) => (
            <div key={van.repId} className="section-block">
              <div className="section-block-title">
                <span>{repName(van.repId)}</span>
                <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>آخر تحديث: {formatDateTime(van.updatedAt)}</span>
              </div>
              <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
<table className="data-table">
                    <thead>
                      <tr>
                        <th className="col-priority-primary">المنتج</th>
                        <th className="numeric col-priority-primary">المتوفر</th>
                        <th className="numeric col-priority-secondary">تالف</th>
                        <th className="numeric col-priority-secondary">قيمة تقريبية</th>
                        <th className="col-priority-primary">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {van.items.map((it) => (
                        <tr key={it.productId}>
                          <td className="col-priority-primary">{it.productName}</td>
                          <td className="numeric num col-priority-primary" style={{ fontWeight: 600 }}>{formatQty(it.qty)}</td>
                          <td className="numeric num col-priority-secondary" style={{ color: it.damagedQty > 0 ? "var(--color-danger)" : undefined }}>{formatQty(it.damagedQty)}</td>
                          <td className="numeric num col-priority-secondary">{formatMoney(it.qty * 30)}</td>
                          <td className="col-priority-primary">
                            {it.qty < 20 ? <Badge tone="warning" dot>منخفض</Badge> : <Badge tone="success" dot>جيد</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="state-block">
              <div className="state-desc">لا يوجد مخزون مسجل لهذا المندوب</div>
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="طلب بضاعة جديد"
        footer={<>
          <Button variant="secondary" onClick={() => setRequestOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={async () => {
            if (!requestProductId || !requestQty || Number(requestQty) <= 0) { toast.error("يرجى اختيار منتج وكمية صحيحة"); return; }
            try {
              await mockApi.rep.createStockRequest([{ productId: requestProductId, productName: "", qty: Number(requestQty) }], "wh-01", requestNotes);
              toast.success("تم إرسال طلب البضاعة — بانتظار اعتماد المشرف");
              setRequestOpen(false);
              setRequestProductId("");
              setRequestQty("");
              setRequestNotes("");
            } catch { toast.error("فشل إرسال الطلب"); }
          }}>إرسال الطلب</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-12">
            <Select label="المنتج" value={requestProductId} onChange={(e) => setRequestProductId(e.target.value)} placeholder="اختر منتجاً" options={[]} />
          </div>
          <div className="field-span-6"><Input label="الكمية المطلوبة" type="number" min={1} placeholder="0" value={requestQty} onChange={(e) => setRequestQty(e.target.value)} /></div>
          <div className="field-span-6"><Input label="المستودع" value="المستودع الرئيسي — الرياض" disabled /></div>
          <div className="field-span-12"><Input label="ملاحظات" placeholder="ملاحظات اختيارية..." value={requestNotes} onChange={(e) => setRequestNotes(e.target.value)} /></div>
          <div className="field-span-12">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              سيتم إنشاء طلب تحويل وسيراجع المخزون المتاح في المستودع.
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={countOpen}
        onClose={() => setCountOpen(false)}
        title="جرد السيارة"
        footer={<>
          <Button variant="secondary" onClick={() => setCountOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => { toast.success("تم حفظ الجرد — الفروقات بانتظار مراجعة المشرف"); setCountOpen(false); }}>حفظ الجرد</Button>
        </>}
      >
        <p className="muted" style={{ fontSize: "var(--font-size-sm)" }}>
          سجّل الكميات الفعلية لكل منتج في السيارة. سيُقارن النظام الكمية المسجلة بالمتوقع ويُنشئ تسوية للفروقات.
        </p>
      </Modal>
    </div>
  );
}

function SearchableProductInput2() {
  return (
    <div className="field">
      <label className="field-label">المنتج</label>
      <div className="searchable-select">
        <button type="button" className="ss-input">
          <span className="placeholder">ابحث عن منتج...</span>
        </button>
      </div>
    </div>
  );
}