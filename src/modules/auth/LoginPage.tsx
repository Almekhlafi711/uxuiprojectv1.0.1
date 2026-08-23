import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, LogIn, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { AuthLayout } from "@/layouts/AuthLayout";
import { Input, Checkbox } from "@/components/ui/FormControls";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { roleLabel } from "@/config/permissions";

const demoAccounts = [
  { email: "admin@example.com", role: "GENERAL_MANAGER" },
  { email: "sales@example.com", role: "SALES_MANAGER" },
  { email: "supervisor@example.com", role: "SUPERVISOR" },
  { email: "rep@example.com", role: "REPRESENTATIVE" },
];

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور، أو استخدم أحد حسابات العرض التجريبي.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <h2>تسجيل الدخول</h2>
        <p className="auth-sub">أدخل بياناتك للوصول إلى نظام إدارة التوزيع الميداني</p>

        {error && <Alert variant="danger" title="فشل تسجيل الدخول">{error}</Alert>}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="email"
            icon={<Mail size={15} />}
          />
          <div style={{ position: "relative" }}>
            <Input
              label="كلمة المرور"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              icon={<Lock size={15} />}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: "absolute",
                insetInlineEnd: 8,
                bottom: 34,
                background: "none",
                border: "none",
                color: "var(--color-text-faint)",
                cursor: "pointer",
                padding: 4,
              }}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="auth-remember">
            <Checkbox label="تذكرني على هذا الجهاز" />
            <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: "var(--font-size-sm)" }}>
              نسيت كلمة المرور؟
            </a>
          </div>
          <Button type="submit" variant="primary" size="lg" disabled={loading} icon={<LogIn size={16} />}>
            {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>

        <div className="demo-accounts">
          <div className="demo-title">حسابات العرض التجريبي</div>
          {demoAccounts.map((acc) => (
            <button
              key={acc.email}
              type="button"
              className="demo-account"
              style={{ width: "100%" }}
              onClick={() => {
                setEmail(acc.email);
                setPassword("123456");
                setError(null);
              }}
            >
              <span className="truncate" style={{ direction: "ltr" }}>{acc.email}</span>
              <span className="da-role">{roleLabel[acc.role as keyof typeof roleLabel]}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}