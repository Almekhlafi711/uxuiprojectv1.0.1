import { useState, useEffect, useMemo } from "react";
import { Building2, Users, MapPin, UserCheck, AlertTriangle, TrendingUp, Clock, ChevronDown, ChevronRight, RefreshCw, Eye } from "lucide-react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/data-table/DataTable";
import type { Column } from "@/components/data-table/DataTable";
import { useAuthStore } from "@/store/auth";
import { can } from "@/config/permissions";
import { organizationService } from "@/services/organization.service";
import type { OrganizationTreeNode, RepresentativeAssignment, CustomerAssignment, OrganizationAuditLog } from "@/types";
import { formatDateTime } from "@/utils/format";

function TreeNode({ node, level = 0 }: { node: OrganizationTreeNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const typeColors: Record<string, string> = {
    branch: "var(--section-admin)",
    territory: "var(--section-sales)",
    team: "var(--section-field)",
    rep: "var(--section-inventory)",
  };
  const typeLabels: Record<string, string> = {
    branch: "فرع",
    territory: "منطقة",
    team: "فريق",
    rep: "مندوب",
  };
  return (
    <div style={{ marginRight: level * 20 }}>
      <div
        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--color-neutral-50)] cursor-pointer"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span style={{ width: 14 }} />
        )}
        <Badge tone="neutral">
          {typeLabels[node.type]}
        </Badge>
        <span className="font-medium text-sm">{node.name}</span>
        {node.supervisorName && (
          <span className="text-xs muted">— {node.supervisorName}</span>
        )}
        {node.repCount !== undefined && (
          <Badge tone="info">{node.repCount} مندوب</Badge>
        )}
        {node.customerCount !== undefined && (
          <Badge tone="success">{node.customerCount} عميل</Badge>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrganizationDashboard() {
  const { user } = useAuthStore();
  const canManage = can("organization.manage", user?.role ?? "GENERAL_MANAGER");
  const [tree, setTree] = useState<OrganizationTreeNode | null>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [recentAssignments, setRecentAssignments] = useState<(RepresentativeAssignment | CustomerAssignment)[]>([]);
  const [auditLogs, setAuditLogs] = useState<OrganizationAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [treeData, kpisData, assignmentsData, auditData] = await Promise.all([
        organizationService.getOrganizationTree(),
        organizationService.getKPIs(),
        organizationService.getRecentAssignments(5),
        organizationService.getOrganizationAuditLog({}),
      ]);
      setTree(treeData);
      setKpis(kpisData);
      setRecentAssignments(assignmentsData);
      setAuditLogs(auditData.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !tree || !kpis) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin mx-auto mb-4" style={{ color: "var(--color-primary)" }} />
          <p className="muted">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "المبيعات والتوزيع", path: "/customers" }, { label: "إدارة الهيكل والتوزيع" }, { label: "نظرة عامة" }]}
        title="نظرة عامة على الهيكل التنظيمي"
        description="شجرة التنظيم والـ KPIs الرئيسية"
        actions={
          canManage ? (
            <Button variant="primary" icon={<Building2 size={15} />} onClick={() => {}}>
              إضافة فرع/منطقة
            </Button>
          ) : null
        }
      />

      {/* ─── KPIs ─── */}
      <div className="grid-4 mb-6">
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-admin)" }}>{kpis.branchCount}</div>
          <div className="text-sm muted">الفروع</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-sales)" }}>{kpis.territoryCount}</div>
          <div className="text-sm muted">المناطق</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-field)" }}>{kpis.activeRepCount}</div>
          <div className="text-sm muted">المندوبون النشطون</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold" style={{ color: "var(--section-inventory)" }}>{kpis.activeCustomerCount}</div>
          <div className="text-sm muted">العملاء المعيّنون</div>
        </Card>
      </div>

      {/* ─── تنبيهات ─── */}
      {(kpis.unassignedCustomerCount > 0 || kpis.repsWithoutTerritoryCount > 0 || kpis.pendingTransfers > 0) && (
        <Card title="تنبيهات" className="mb-6">
          <div className="flex flex-wrap gap-2">
            {kpis.unassignedCustomerCount > 0 && (
              <Badge tone="danger">
                <AlertTriangle size={12} /> {kpis.unassignedCustomerCount} عميل بدون مندوب
              </Badge>
            )}
            {kpis.repsWithoutTerritoryCount > 0 && (
              <Badge tone="warning">
                <AlertTriangle size={12} /> {kpis.repsWithoutTerritoryCount} مندوب بدون منطقة
              </Badge>
            )}
            {kpis.pendingTransfers > 0 && (
              <Badge tone="info">
                <Clock size={12} /> {kpis.pendingTransfers} طلب نقل معلّق
              </Badge>
            )}
          </div>
        </Card>
      )}

      <div className="grid-2 mb-6">
        {/* ─── الشجرة التنظيمية ─── */}
        <Card title="الشجرة التنظيمية" subtitle="هيكل الفروع والمناطق والمندوبين">
          <div className="max-h-[500px] overflow-y-auto">
            <TreeNode node={tree} />
          </div>
        </Card>

        {/* ─── آخر التغييرات ─── */}
        <Card title="آخر التغييرات التنظيمية" subtitle="التعيينات والنقل الأخيرة">
          <div className="stack-sm">
            {recentAssignments.length === 0 ? (
              <p className="muted text-center py-4">لا توجد تعيينات حديثة</p>
            ) : (
              recentAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-[var(--color-neutral-100)] last:border-0">
                  <div className="flex items-center gap-2">
                    {"customerId" in a ? (
                      <Users size={14} style={{ color: "var(--section-sales)" }} />
                    ) : (
                      <UserCheck size={14} style={{ color: "var(--section-field)" }} />
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {"customerId" in a ? (a as any).customerName : a.repName}
                      </div>
                      <div className="text-xs muted">
                        {"customerId" in a
                          ? `تعيين لـ ${a.repName}`
                          : `تعيين في ${(a as any).territoryName}`
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <Badge tone={a.status === "active" ? "success" : "neutral"}>
                      {a.status === "active" ? "نشط" : " سابق"}
                    </Badge>
                    <div className="text-xs muted mt-1">{formatDateTime(a.assignedAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ─── آخر سجل التدقيق ─── */}
      <Card title="آخر سجل التدقيق" subtitle="جميع التغييرات التنظيمية">
        <DataTable
          columns={[
            { key: "entityType", header: "النوع", render: (r) => <Badge tone="neutral">{r.entityType === "rep" ? "مندوب" : r.entityType === "territory" ? "منطقة" : r.entityType === "customer" ? "عميل" : r.entityType === "team" ? "فريق" : r.entityType}</Badge> },
            { key: "entityName", header: "الاسم", render: (r) => <span className="font-medium text-sm">{r.entityName}</span> },
            { key: "action", header: "الإجراء", render: (r) => <Badge tone={r.action === "create" ? "success" : r.action === "suspend" ? "danger" : r.action === "transfer" ? "warning" : "info"}>{r.action === "create" ? "إنشاء" : r.action === "update" ? "تعديل" : r.action === "assign" ? "تعيين" : r.action === "reassign" ? "إعادة تعيين" : r.action === "transfer" ? "نقل" : r.action === "activate" ? "تفعيل" : r.action === "suspend" ? "تعليق" : r.action}</Badge> },
            { key: "performedByName", header: "بواسطة" },
            { key: "performedAt", header: "التاريخ", render: (r) => formatDateTime(r.performedAt) },
          ]}
          rows={auditLogs}
          rowKey={(r) => r.id}
          searchable={false}
          pageSize={5}
          emptyTitle="لا توجد سجلات"
          emptyDescription="لم يتم تسجيل أي تغييرات بعد"
        />
      </Card>
    </div>
  );
}
