import { useMemo, useState } from "react";
import { Plus, CalendarCheck } from "lucide-react";
import { leaveRequests } from "@/mock/admin";
import { users } from "@/mock/users";
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
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatDateShort } from "@/utils/format";
import { can } from "@/config/permissions";
import { submitLeave } from "@/services/leaves.service";
import type { LeaveRequest } from "@/types";

const typeLabels: Record<string, string> = {
  annual: "سنوية",
  sick: "مرضية",
  emergency: "طارئة",
  unpaid: "بدون راتب",
};

export function LeavesPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.leaves.list());
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);

  const empName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const isRep = user?.role === "REPRESENTATIVE";
  const canCreate = can("leaves.create", user?.role ?? "REPRESENTATIVE");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (isRep) rows = rows.filter((r) => r.employeeId === user.id);
    if (typeFilter) rows = rows.filter((r) => r.type === typeFilter);
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [data, isRep, user?.id, typeFilter, statusFilter]);

  const balance = isRep ? 21 - filtered.filter((r) => r.type === "annual" && r.status === "approved").reduce((s, r) => s + r.days, 0) : 21;

  const columns: Column<LeaveRequest>[] = [
    { key: "emp", header: "الموظف", sortable: true, sortValue: (r) => empName(r.employeeId), render: (r) => empName(r.employeeId) },
    { key: "type", header: "النوع", render: (r) => <Badge tone={r.type === "sick" ? "danger" : r.type === "emergency" ? "warning" : "info"}>{typeLabels[r.type]}</Badge> },
    { key: "range", header: "الفترة", sortable: true, sortValue: (r) => r.fromDate, render: (r) => (
      <span className="num" style={{ fontSize: "var(--font-size-sm)", whiteSpace: "nowrap" }}>
        {formatDateShort(r.fromDate)} ← {formatDateShort(r.toDate)}
      </span>
    ) },
    { key: "days", header: "الأيام", numeric: true, sortable: true, sortValue: (r) => r.days, render: (r) => <span className="num">{r.days}</span> },
    { key: "reason", header: "السبب", sortable: true, sortValue: (r) => r.reason, render: (r) => <span style={{ fontSize: "var(--font-size-sm)" }}>{r.reason}</span> },
    { key: "status", header: "الحالة", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "الإجازات" }]}
        title="الإجازات"
        description={isRep ? "طلباتك الإجازة والرصيد المتبقي" : "طلبات إجازات الفريق وسير الاعتماد"}
        actions={
          canCreate ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>طلب إجازة</Button>
          ) : null
        }
      >

      {isRep && (
        <Card className="mb-4">
          <div className="flex-between">
            <div>
              <div className="muted" style={{ fontSize: "var(--font-size-sm)" }}>الرصيد السنوي المتبقي</div>
              <b className="num" style={{ fontSize: "var(--font-size-xl)", color: balance < 5 ? "var(--color-warning)" : "var(--color-success)" }}>{balance} يوم</b>
            </div>
            <CalendarCheck size={20} style={{ color: "var(--color-text-faint)" }} />
          </div>
        </Card>
      )}

      <FilterBar>
        <Select
          label="النوع"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          placeholder="الكل"
          options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))}
        />
        <Select
          label="الحالة"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="الكل"
          options={[
            { value: "pending", label: "جديد" },
            { value: "under_review", label: "قيد المراجعة" },
            { value: "approved", label: "معتمدة" },
            { value: "rejected", label: "مرفوضة" },
          ]}
        />
      </FilterBar>
      </StickyPageHeader>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        searchPlaceholder="بحث باسم الموظف..."
        searchKeys={(r) => `${empName(r.employeeId)} ${r.reason}`}
        exportFilename="leave-requests"
        pageSize={10}
        emptyTitle="لا توجد طلبات إجازة مطابقة"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="طلب إجازة جديد"
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="primary" onClick={() => { const r = submitLeave({ type: "annual", days: 0, fromDate: "", toDate: "", reason: "" }, { id: user?.id ?? "" }); if (r.success) { toast.success("أُرسل الطلب — بانتظار اعتماد المشرف"); setOpen(false); } else toast.error("فشل", r.reason); }}>إرسال الطلب</Button>
        </>}
      >
        <div className="form-grid">
          <div className="field-span-6">
            <Select label="نوع الإجازة" defaultValue="annual" options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))} />
          </div>
          <div className="field-span-6"><Input label="عدد الأيام" type="number" min={1} max={21} placeholder="0" /></div>
          <div className="field-span-6"><Input label="من تاريخ" type="date" /></div>
          <div className="field-span-6"><Input label="إلى تاريخ" type="date" /></div>
          <div className="field-span-12"><Input label="السبب" placeholder="مثال: إجازة سنوية / ظرف عائلي..." /></div>
          <div className="field-span-12">
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              تُراجع الإجازات من المشرف، والإجازات الطويلة تتجاوز مستوى إضافي (مدير المبيعات / المدير العام).
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}