import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="brand-logo">
          <span className="brand-mark">
            <svg width="24" height="24" viewBox="0 0 32 32"><path d="M8 22V10h3v9h9v3H8zm6-9V9h10v10h-3v-6h-7z" fill="#fff" /></svg>
          </span>
          <div>
            <h1>نظام التوزيع الميداني</h1>
            <div className="brand-sub">ERP — إدارة المبيعات والتوزيع والتحصيل</div>
          </div>
        </div>
        <div className="brand-message">
          <h2>نظام مؤسسي متكامل لإدارة عمليات البيع والتوزيع الميداني</h2>
          <p>
            إدارة العملاء والمناطق وخطط السير، المبيعات والتحصيل، المخزون المتحرك والمركزي،
            الأهداف والأداء، الربحية، الموافقات، والأرشيف — كل ذلك ضمن منظومة واحدة محكومة
            بالأدوار والصلاحيات وسجلات التدقيق.
          </p>
        </div>
        <div className="brand-foot">
          نسخة تجريبية — البيانات المعروضة Mock Data لأغراض العرض والتجربة
        </div>
      </div>
      <div className="auth-form-side">{children}</div>
    </div>
  );
}