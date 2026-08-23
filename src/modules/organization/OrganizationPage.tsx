import { useState } from "react";
import { Building2, MapPin, Users2, Handshake, Shield } from "lucide-react";
import { branches, territories, costCenters, teams, distributors, distributorOfficers } from "@/mock/organization";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select, Input } from "@/components/ui/FormControls";
import { toast } from "@/store/ui";
import { can } from "@/config/permissions";

export function OrganizationPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("branches");
  const [open, setOpen] = useState(false);
  const [newType, setNewType] = useState("branch");
  const [newName, setNewName] = useState("");
  const canManage = can("organization.manage", user?.role ?? "GENERAL_MANAGER");

  const userName = (id?: string) => (id ? users.find((u) => u.id === id)?.name ?? "—" : "—");
  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الهيكل التنظيمي" }]}
        title="الهيكل التنظيمي"
        description="الفروع والمناطق ومراكز التكلفة والفرق والموزعون"
        actions={
          canManage ? (
            <Button variant="primary" icon={<Building2 size={15} />} onClick={() => setOpen(true)}>إضافة عنصر</Button>
          ) : null
        }
      />

      <Tabs
        tabs={[
          { key: "branches", label: `الفروع (${branches.length})`, content: (
            <div className="grid-2">
              {branches.map((b) => (
                <Card key={b.id} title={b.name} subtitle={`${b.city} · المدير: ${userName(b.managerId)}`} className="hover-card">
                  <Badge tone="info"><Building2 size={11} /> {b.id}</Badge>
                </Card>
              ))}
            </div>
          ) },
          { key: "territories", label: `المناطق (${territories.length})`, content: (
            <div className="grid-2">
              {territories.map((t) => (
                <Card key={t.id} title={t.name} subtitle={`مشرف: ${userName(t.supervisorId)} · ${t.customerCount} عميل`} className="hover-card">
                  <div className="stack-sm">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {t.repIds.map((r) => (
                        <Badge key={r} tone="success">{userName(r).split(" ")[0]}</Badge>
                      ))}
                    </div>
                    <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>الفرع: {branches.find((b) => b.id === t.branchId)?.name}</div>
                  </div>
                </Card>
              ))}
            </div>
          ) },
          { key: "teams", label: `الفرق (${teams.length})`, content: (
            <div className="grid-2">
              {teams.map((t) => (
                <Card key={t.id} title={t.name} subtitle={`مشرف: ${userName(t.supervisorId)}`} className="hover-card">
                  <div className="stack-sm">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {t.repIds.map((r) => (
                        <Badge key={r} tone="success">{userName(r).split(" ")[0]}</Badge>
                      ))}
                    </div>
                    <div className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{t.territoryIds.length} منطقة مرتبطة</div>
                  </div>
                </Card>
              ))}
            </div>
          ) },
          { key: "costCenters", label: `مراكز التكلفة (${costCenters.length})`, content: (
            <div className="grid-2">
              {costCenters.map((c) => (
                <Card key={c.id} title={c.name} subtitle={`${c.code} · ${branches.find((b) => b.id === c.branchId)?.name}`} className="hover-card">
                  <Badge tone="warning"><MapPin size={11} /> مركز تكلفة</Badge>
                </Card>
              ))}
            </div>
          ) },
          { key: "distributors", label: `الموزعون (${distributors.length})`, content: (
            <div className="stack">
              {distributors.map((d) => (
                <Card key={d.id} title={d.name} subtitle={`${d.territoryIds.length} منطقة`} className="hover-card">
                  <div className="stack-sm">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {distributorOfficers.filter((o) => o.distributorIds.includes(d.id)).map((o) => (
                        <Badge key={o.id} tone="info"><Handshake size={11} /> {o.name}</Badge>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {d.territoryIds.map((tid) => (
                        <Badge key={tid} tone="neutral">{territories.find((t) => t.id === tid)?.name ?? tid}</Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة عنصر تنظيمي"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={async () => {
            if (!newName.trim()) { toast.error("يرجى إدخال اسم العنصر"); return; }
            try {
              await mockApi.organization.create(newType, { name: newName });
              toast.success("تمت الإضافة للهيكل التنظيمي");
              setOpen(false);
              setNewName("");
              setNewType("branch");
            } catch { toast.error("فشل الإضافة"); }
          }}>حفظ</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-6">
            <Select label="النوع" value={newType} onChange={(e) => setNewType(e.target.value)} options={[
              { value: "branch", label: "فرع" },
              { value: "territory", label: "منطقة" },
              { value: "team", label: "فريق" },
              { value: "costCenter", label: "مركز تكلفة" },
            ]} />
          </div>
          <div className="field-span-6"><Input label="الاسم" placeholder="اسم العنصر..." value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
          <div className="field-span-12">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              تُنعكس التعديلات على المستخدمين والأهداف والتقارير المرتبطة فوراً.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}