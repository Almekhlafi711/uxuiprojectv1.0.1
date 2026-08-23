import { useState } from "react";
import { Package, Plus, Trash2, Send } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { toast } from "@/store/ui";

interface PreparedItem {
  productId: string;
  productName: string;
  qty: number;
}

export function PrepareGoodsPage() {
  const { reps } = useTeamData();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState("");
  const [items, setItems] = useState<PreparedItem[]>([]);
  const [notes, setNotes] = useState("");

  const addItem = () => {
    setItems([...items, { productId: "", productName: "", qty: 1 }]);
  };

  const updateItem = (idx: number, patch: Partial<PreparedItem>) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], ...patch };
    setItems(updated);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!selectedRep) { toast.warning("يرجى اختيار المندوب"); return; }
    if (items.length === 0) { toast.warning("يرجى إضافة منتج واحد على الأقل"); return; }
    const validItems = items.filter((i) => i.productId && i.qty > 0);
    if (validItems.length === 0) { toast.warning("يرجى تعبئة جميع المنتجات والكميات"); return; }
    try {
      await mockApi.team.issueStock({ repId: selectedRep, items: validItems, notes: notes || undefined });
      toast.success(`تم تجهيز ${validItems.length} منتج للمندوب ${reps.find((r) => r.id === selectedRep)?.name ?? selectedRep}`);
      setWizardOpen(false);
      setItems([]);
      setNotes("");
      setSelectedRep("");
    } catch {
      toast.error("فشل تجهيز البضاعة");
    }
  };

  const columns: Column<PreparedItem>[] = [
    { key: "product", header: "المنتج", priority: "primary", render: (item) => {
      const idx = items.indexOf(item);
      return (
        <Select
          value={item.productId}
          onChange={(e) => {
            const pName = e.target.options[e.target.selectedIndex]?.text ?? "";
            updateItem(idx, { productId: e.target.value, productName: pName });
          }}
          options={[{ value: "", label: "اختر منتج..." }, ...Array.from({ length: 20 }, (_, i) => ({ value: `p-${String(i + 1).padStart(3, "0")}`, label: `منتج ${i + 1}` }))]}
        />
      );
    } },
    { key: "qty", header: "الكمية", numeric: true, priority: "primary", render: (item) => {
      const idx = items.indexOf(item);
      return <Input type="number" value={String(item.qty)} onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })} min={1} />;
    } },
    { key: "actions", header: "", priority: "primary", render: (item) => {
      const idx = items.indexOf(item);
      return <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => removeItem(idx)}>حذف</Button>;
    } },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "المخزون" }, { label: "تجهيز البضاعة" }]}
        title="تجهيز البضاعة للمناديب"
        description="تحديد المنتجات والكميات للمندوب — إصدار من مخزون المشرف"
        actions={<Button variant="primary" size="sm" icon={<Package size={14} />} onClick={() => setWizardOpen(true)}>تجهيز جديد</Button>}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="آخر عمليات التجهيز" subtitle="حركات صادر من مخزون المشرف">
          <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>ستظهر هنا آخر عمليات تجهيز البضاعة للمناديب.</div>
        </Card>
      </div>

      <Modal open={wizardOpen} title="تجهيز بضاعة جديدة" size="lg" onClose={() => setWizardOpen(false)}>
        <div className="stack" style={{ gap: 12 }}>
          <Select label="المندوب" value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)} placeholder="اختر المندوب" options={reps.map((r) => ({ value: r.id, label: r.name }))} />

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>المنتجات</span>
              <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addItem}>إضافة منتج</Button>
            </div>
            {items.length > 0 ? (
              <DataTable columns={columns} rows={items} rowKey={(item) => `${item.productId}-${items.indexOf(item)}`} emptyTitle="لا توجد منتجات" pageSize={20} />
            ) : (
              <div className="muted" style={{ fontSize: "var(--font-size-sm)", padding: 16, textAlign: "center" }}>اضغط "إضافة منتج" لبدء التجهيز</div>
            )}
          </div>

          <Textarea label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات على التجهيز..." />

          <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>سيتم إنشاء حركة صادر من مخزون المشرف وربطها بالمندوب.</div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" size="sm" onClick={() => setWizardOpen(false)}>إلغاء</Button>
            <Button variant="primary" size="sm" icon={<Send size={14} />} onClick={handleSubmit}>تأكيد التجهيز</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
