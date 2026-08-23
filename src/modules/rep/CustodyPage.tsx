import { useState } from "react";
import { Search, Shield, Truck, Smartphone, CreditCard, PackageCheck, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { custodyRecords } from "@/mock/custody";
import { useAuthStore } from "@/store/auth";
import { mockApi } from "@/services/mockApi";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import { Modal } from "@/components/ui/Modal";
import { formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import type { CustodyRecord } from "@/types";

const assetTypeLabels: Record<string, string> = {
  car: "مركبة",
  phone: "هاتف",
  tablet: "جهاز لوحي",
  pos: "جهاز POS",
  printer: "طابعة",
  cashbox: "صندوق نقدي",
};

const assetTypeIcons: Record<string, any> = {
  car: Truck,
  phone: Smartphone,
  tablet: Smartphone,
  pos: CreditCard,
  printer: PackageCheck,
  cashbox: PackageCheck,
};

const conditionLabels: Record<string, string> = {
  good: "ممتاز",
  needs_maintenance: "يحتاج صيانة",
  damaged: "تالف",
  lost: "ضائع",
};

const conditionTones: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  good: "success",
  needs_maintenance: "warning",
  damaged: "danger",
  lost: "danger",
};

const statusLabels: Record<string, string> = {
  issued: "صادر",
  returned: "مرتجع",
  transferred: "محول",
};

const statusTones: Record<string, "success" | "info" | "neutral"> = {
  issued: "info",
  returned: "neutral",
  transferred: "info",
};

export function CustodyPage() {
  const { user } = useAuthStore();
  const me = user!;

  const myCustody = custodyRecords
    .filter((c) => c.assignedToId === me.id)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [view, setView] = useState<CustodyRecord | null>(null);
  const [selectedCondition, setSelectedCondition] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const issuedCount = myCustody.filter((c) => c.status === "issued").length;
  const returnedCount = myCustody.filter((c) => c.status === "returned").length;
  const transferredCount = myCustody.filter((c) => c.status === "transferred").length;
  const damagedCount = myCustody.filter((c) => c.condition === "damaged").length;

  const columns: Column<CustodyRecord>[] = [
    {
      key: "assetName",
      header: "الأصل",
      priority: "primary",
      render: (c) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <b>{c.assetName}</b>
          <span className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{assetTypeLabels[c.assetType]} — {c.serialNumber}</span>
        </div>
      ),
    },
    {
      key: "assetType",
      header: "النوع",
      priority: "secondary",
      render: (c) => {
        const Icon = assetTypeIcons[c.assetType] || PackageCheck;
        return (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon size={14} />
            <span>{assetTypeLabels[c.assetType]}</span>
          </span>
        );
      },
    },
    { key: "serialNumber", header: "الرقم التسلسلي", priority: "secondary", render: (c) => <span className="num" style={{ direction: "ltr" }}>{c.serialNumber}</span> },
    {
      key: "issuedAt", header: "تاريخ التسليم", sortable: true, sortValue: (c) => c.issuedAt, priority: "secondary",
      render: (c) => <span className="num">{formatDateShort(c.issuedAt)}</span>,
    },
    {
      key: "condition", header: "الحالة الفنية", priority: "secondary",
      render: (c) => (
        <Badge tone={conditionTones[c.condition] || "neutral"} dot>
          {conditionLabels[c.condition] || c.condition}
        </Badge>
      ),
    },
    {
      key: "status", header: "الحالة العامة", priority: "primary",
      render: (c) => (
        <Badge tone={statusTones[c.status] || "neutral"}>
          {statusLabels[c.status] || c.status}
        </Badge>
      ),
    },
    {
      key: "actions", header: "إجراء", priority: "primary",
      render: (c) => (
        <span style={{ display: "inline-flex", gap: 6 }}>
          <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => setView(c)}>عرض</Button>
        </span>
      ),
    },
  ];

  const filteredCustody = myCustody.filter((c) => {
    if (search && !c.assetName.includes(search) && !c.serialNumber.includes(search)) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (typeFilter && c.assetType !== typeFilter) return false;
    return true;
  });

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "عهدي والأصول" }]}
        title="عهدي والأصول المسندة لي"
        description="مراجعة بيانات العهدة عند الاستلام والتسليم — لا تعديل يدوي للسجلات"
      >
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مصدرة</span>
              <b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-info)" }}>{issuedCount}</b>
            </div>
          </Card>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>مرتجعة</span>
              <b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-warning)" }}>{returnedCount}</b>
            </div>
          </Card>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>محولة</span>
              <b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-neutral)" }}>{transferredCount}</b>
            </div>
          </Card>
          <Card>
            <div className="stat-card-body">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تالفة</span>
              <b className="num" style={{ fontSize: "var(--font-size-xl)", color: "var(--color-danger)" }}>{damagedCount}</b>
            </div>
          </Card>
        </div>

        <FilterBar>
          <Input label="البحث" placeholder="اسم الأصل، رقم تسلسلي..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={16} />} />
          <Select label="الحالة العامة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="الكل" options={[
            { value: "issued", label: "صادر" },
            { value: "returned", label: "مرتجع" },
            { value: "transferred", label: "محول" },
          ]} />
          <Select label="النوع" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} placeholder="الكل" options={[
            { value: "car", label: "مركبة" },
            { value: "phone", label: "هاتف" },
            { value: "tablet", label: "جهاز لوحي" },
            { value: "pos", label: "POS" },
            { value: "printer", label: "طابعة" },
            { value: "cashbox", label: "صندوق نقدي" },
          ]} />
        </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filteredCustody}
        rowKey={(r) => r.id}
        searchPlaceholder="بحث سريع..."
        searchKeys={(r) => `${r.assetName} ${r.serialNumber}`}
        exportFilename="my-custody"
        pageSize={12}
        emptyTitle="لا توجد أصول مسندة"
        emptyDescription="عند إسناد أصل لك من المشرف، سيظهر هنا."
      />

      <div className="alert alert-info" style={{ marginBottom: 0, marginTop: "var(--space-4)" }}>
        <Shield size={16} />
        <div>
          <div className="alert-title">مسؤولية العهدة</div>
          <div>عند الاستلام: راجع البيانات، التقط صوراً للحالة، ووقّع إلكترونياً. عند التحويل: سجّل الحالة (ممتاز/يحتاج صيانة/تالف/ضائع) مع ملاحظات. أي فرق يُسجل في محضر التسليم.</div>
        </div>
      </div>

      {view && (
        <Modal open onClose={() => setView(null)} title={view.assetName} size="md">
          <div className="stack-sm">
            <div className="flex-between">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الرقم التسلسلي</span>
              <span className="num" style={{ fontSize: "var(--font-size-sm)", direction: "ltr" }}>{view.serialNumber}</span>
            </div>
            <div className="flex-between">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>النوع</span>
              <span style={{ fontSize: "var(--font-size-sm)" }}>{assetTypeLabels[view.assetType]}</span>
            </div>
            <div className="flex-between">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تاريخ التسليم</span>
              <span className="num">{formatDateShort(view.issuedAt)}</span>
            </div>
            <div className="flex-between">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الحالة الفنية</span>
              <Badge tone={conditionTones[view.condition] || "neutral"} dot>{conditionLabels[view.condition] || view.condition}</Badge>
            </div>
            <div className="flex-between">
              <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الحالة العامة</span>
              <Badge tone={statusTones[view.status] || "neutral"} dot>{statusLabels[view.status] || view.status}</Badge>
            </div>
            {view.returnedAt && (
              <div className="flex-between">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>تاريخ الاسترجاع</span>
                <span className="num">{formatDateShort(view.returnedAt)}</span>
              </div>
            )}
            {view.notes && (
              <div className="flex-between">
                <span className="muted" style={{ fontSize: "var(--font-size-sm)" }}>ملاحظات</span>
                <span style={{ fontSize: "var(--font-size-sm)" }}>{view.notes}</span>
              </div>
            )}
          </div>
        </Modal>
      )}

      <Modal
        open={view !== null && view?.status === "issued"}
        onClose={() => setView(null)}
        title={`تسليم/تحويل: ${view?.assetName}`}
        size="md"
        footer={<>
          <Button variant="secondary" onClick={() => setView(null)}>إلغاء</Button>
          <Button variant="primary" icon={<CheckCircle2 size={15} />} onClick={async () => {
            if (!view) return;
            try {
              await mockApi.custody.returnRecord(view.id, (selectedCondition || "good") as CustodyRecord["condition"], deliveryNotes);
              toast.success("تم تسجيل تسليم العهدة", `تم إرسال المحضر للموقع المختص`);
              setView(null);
              setSelectedCondition("");
              setDeliveryNotes("");
            } catch { toast.error("فشل التسليم"); }
          }}>تأكيد التسليم</Button>
        </>}
      >
        {view && (
          <div className="stack-sm">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              <Shield size={16} />
              <div>
                <div className="alert-title">مراجعة بيانات التسليم</div>
                <div>أصل: {view.assetName} ({view.assetType}) · سريال: {view.serialNumber}</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="field-span-12">
                <Select label="الحالة عند التسليم" value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)} placeholder="اختر الحالة" options={[
                  { value: "good", label: "ممتاز - سليم" },
                  { value: "needs_maintenance", label: "يحتاج صيانة" },
                  { value: "damaged", label: "تالف" },
                  { value: "lost", label: "ضائع" },
                ]} />
              </div>
              <div className="field-span-12">
                <Textarea label="ملاحظات التسليم" value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="خدوش، كسر، أجزاء مفقودة، صور..." rows={3} />
              </div>
            </div>
            {selectedCondition === "damaged" && (
              <div className="alert alert-danger" style={{ marginBottom: 0 }}>
                <AlertTriangle size={16} />
                <div>
                  <div className="alert-title">تنبيه: أصل تالف</div>
                  <div>سيُنشأ محضر تلف وقد يترتب عليه خصم من المستحقات حسب السياسة.</div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
