import { useMemo, useState } from "react";
import { Plus, UserPlus, ShieldCheck } from "lucide-react";
import { users, roles, permissionCatalog } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select, Input } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Progress";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatDateShort } from "@/utils/format";
import { can, roleLabel } from "@/config/permissions";
import { createUser } from "@/services/users.service";
import type { User } from "@/types";

export function UsersPage() {
  const { user: me } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.users.list());
  const [tab, setTab] = useState("users");
  const [roleFilter, setRoleFilter] = useState("");
  const [open, setOpen] = useState(false);

  const canManage = can("users.manage", me?.role ?? "GENERAL_MANAGER");
  const canManageRoles = can("roles.manage", me?.role ?? "GENERAL_MANAGER");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (roleFilter) rows = rows.filter((u) => u.role === roleFilter);
    return rows;
  }, [data, roleFilter]);

  const columns: Column<User>[] = [
    { key: "name", header: "الموظف", sortable: true, sortValue: (r) => r.name, priority: "primary", render: (r) => (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={r.name} size="sm" />
        <div>
          <div style={{ fontWeight: 500 }}>{r.name}</div>
          <div className="faint" style={{ fontSize: "var(--font-size-xs)" }}>{r.email}</div>
        </div>
      </div>
    ) },
    { key: "role", header: "الدور", sortable: true, sortValue: (r) => roleLabel[r.role], priority: "primary", render: (r) => <Badge tone={r.role === "GENERAL_MANAGER" ? "danger" : r.role === "SALES_MANAGER" ? "warning" : r.role === "SUPERVISOR" ? "info" : "success"}>{roleLabel[r.role]}</Badge> },
    { key: "phone", header: "الجوال", priority: "optional", render: (r) => <span className="num" style={{ direction: "ltr", display: "inline-block" }}>{r.phone}</span> },
    { key: "joinedAt", header: "تاريخ الانضمام", sortable: true, sortValue: (r) => r.joinedAt, priority: "optional", render: (r) => <span className="num">{formatDateShort(r.joinedAt)}</span> },
    { key: "lastActiveAt", header: "آخر نشاط", sortable: true, sortValue: (r) => r.lastActiveAt ?? "", priority: "optional", render: (r) => (
      <span className="num" style={{ fontSize: "var(--font-size-sm)" }}>{r.lastActiveAt ? formatDateShort(r.lastActiveAt) : "—"}</span>
    ) },
    { key: "status", header: "الحالة", priority: "primary", render: (r) => (r.status === "active" ? <Badge tone="success" dot>نشط</Badge> : <Badge tone="neutral" dot>موقوف</Badge>) },
  ];

  const permissionsByModule = useMemo(() => {
    const map = new Map<string, typeof permissionCatalog>();
    permissionCatalog.forEach((p) => {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module)!.push(p);
    });
    return map;
  }, []);

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المستخدمون والأدوار" }]}
        title="المستخدمون والأدوار"
        description="إدارة المستخدمين وصلاحيات الأدوار الأربعة"
        actions={
          canManage ? (
            <Button variant="primary" icon={<UserPlus size={15} />} onClick={() => setOpen(true)}>مستخدم جديد</Button>
          ) : null
        }
      />

      <Tabs
        tabs={[
          {
            key: "users",
            label: `المستخدمون (${(data ?? []).length})`,
            content: (
              <>
                <FilterBar>
                  <Select
                    label="الدور"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    placeholder="كل الأدوار"
                    options={roles.map((r) => ({ value: r.id, label: r.nameAr }))}
                  />
                </FilterBar>
                <DataTable
                  columns={columns}
                  rows={filtered}
                  rowKey={(r) => r.id}
                  loading={loading}
                  error={error}
                  onRetry={refetch}
                  searchPlaceholder="بحث بالاسم أو البريد..."
                  searchKeys={(r) => `${r.name} ${r.email}`}
                  exportFilename="users"
                  pageSize={10}
                  emptyTitle="لا يوجد مستخدمون مطابقون"
                />
              </>
            ),
          },
          {
            key: "roles",
            label: "الأدوار والصلاحيات",
            content: (
              <div className="stack">
                {roles.map((r) => {
                  const rolePerms = permissionCatalog.filter((p) => (me ? can(p.code, r.id) : false));
                  return (
                    <Card key={r.id} title={`${r.nameAr} — مستوى ${r.level}`} subtitle={r.description} className={canManageRoles ? "hover-card" : ""}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <Badge tone="neutral">{rolePerms.length} صلاحية</Badge>
                        {canManageRoles && (
                          <Button variant="ghost" size="sm" icon={<ShieldCheck size={13} />} onClick={async () => {
                            try {
                              const currentPerms = permissionCatalog.filter((p) => me && can(p.code, r.id)).map((p) => p.code);
                              await mockApi.users.updateRolePermissions(r.id, currentPerms);
                              refetch();
                              toast.success(`تم تحديث صلاحيات ${r.nameAr}`);
                            } catch { toast.error("فشل التحديث"); }
                          }}>
                            تعديل
                          </Button>
                        )}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {rolePerms.slice(0, 24).map((p) => (
                          <span key={p.code} className="badge badge-soft" style={{ fontSize: "var(--font-size-xs)" }}>{p.nameAr}</span>
                        ))}
                        {rolePerms.length > 24 && <span className="faint" style={{ fontSize: "var(--font-size-xs)" }}>+{rolePerms.length - 24} صلاحيات</span>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ),
          },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="مستخدم جديد"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => { const r = createUser({ name: "", email: "", phone: "", role: "REPRESENTATIVE" }, { id: me?.id ?? "" }); if (r.success) { toast.success("تم إنشاء المستخدم", "ستصله دعوة لتفعيل الحساب"); setOpen(false); } else toast.error("فشل", r.reason); }}>إنشاء الحساب</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-6"><Input label="الاسم الكامل" placeholder="الاسم..." /></div>
          <div className="field-span-6"><Input label="البريد الإلكتروني" type="email" placeholder="name@example.com" /></div>
          <div className="field-span-6"><Input label="الجوال" placeholder="05XXXXXXXX" /></div>
          <div className="field-span-6">
            <Select label="الدور" defaultValue="REPRESENTATIVE" options={roles.map((r) => ({ value: r.id, label: r.nameAr }))} />
          </div>
          <div className="field-span-12">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              ستنشئ كلمة مرور أولية تُرسل عبر رسالة SMS للتفعيل.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}