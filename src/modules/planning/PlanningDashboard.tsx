import { Link } from "react-router-dom";
import { Map as MapIcon, CalendarCheck, Target, ClipboardList, ArrowLeft } from "lucide-react";
import { StickyPageHeader } from "@/components/ui/StickyPageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { planningActions } from "@/config/dashboardActions";
import { Button } from "@/components/ui/Button";

export function PlanningDashboard() {
  return (
    <div>
      <StickyPageHeader
        crumbs={[{ label: "التخطيط" }]}
        title="التخطيط"
        description="لوحة التخطيط — ملخص خطط السير وجداول اليوم والأهداف وتوزيع العملاء"
      />

      <DashboardQuickActions actions={planningActions} sticky />

      <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
        <StatCard label="خطط السير" value="—" hint="إجمالي المسارات النشطة" icon={<MapIcon size={14} />} />
        <StatCard label="جداول اليوم" value="—" hint="خطط اليوم المُعتمدة" icon={<CalendarCheck size={14} />} />
        <StatCard label="الأهداف" value="—" hint="أهداف الفترة الحالية" icon={<Target size={14} />} />
        <StatCard label="توزيع العملاء" value="—" hint="عملاء مُعاد توزيعهم" icon={<ClipboardList size={14} />} />
      </div>

      <div className="grid-2">
        <Link to="/routes" style={{ textDecoration: "none" }}>
          <Card className="hover-card">
            <div style={{ display: "flex", gap: 12 }}>
              <span className="badge badge-info" style={{ padding: 8 }}><MapIcon size={16} /></span>
              <div><h3>خطط السير</h3><p className="muted" style={{ fontSize: "var(--font-size-sm)" }}>إدارة المناطق وخطوط السير</p></div>
            </div>
          </Card>
        </Link>
        <Link to="/supervisor/planning/daily" style={{ textDecoration: "none" }}>
          <Card className="hover-card">
            <div style={{ display: "flex", gap: 12 }}>
              <span className="badge badge-success" style={{ padding: 8 }}><CalendarCheck size={16} /></span>
              <div><h3>جداول اليوم</h3><p className="muted" style={{ fontSize: "var(--font-size-sm)" }}>متابعة جداول المناديب اليومية</p></div>
            </div>
          </Card>
        </Link>
        <Link to="/targets" style={{ textDecoration: "none" }}>
          <Card className="hover-card">
            <div style={{ display: "flex", gap: 12 }}>
              <span className="badge badge-warning" style={{ padding: 8 }}><Target size={16} /></span>
              <div><h3>الأهداف</h3><p className="muted" style={{ fontSize: "var(--font-size-sm)" }}>أهداف المبيعات والزيارات</p></div>
            </div>
          </Card>
        </Link>
        <Link to="/organization/transfers" style={{ textDecoration: "none" }}>
          <Card className="hover-card">
            <div style={{ display: "flex", gap: 12 }}>
              <span className="badge badge-primary" style={{ padding: 8 }}><ClipboardList size={16} /></span>
              <div><h3>توزيع العملاء</h3><p className="muted" style={{ fontSize: "var(--font-size-sm)" }}>نقل وإعادة توزيع العملاء بين المناديب</p></div>
            </div>
          </Card>
        </Link>
      </div>

      <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "flex-end" }}>
        <Link to="/supervisor/planning/routes"><Button variant="ghost" icon={<ArrowLeft size={14} />}>عرض تفاصيل التخطيط</Button></Link>
      </div>
    </div>
  );
}
