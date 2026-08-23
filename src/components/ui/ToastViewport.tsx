import { useUiStore } from "@/store/ui";

export function ToastViewport() {
  const { toasts, dismissToast } = useUiStore();
  return (
    <div className="toast-container" role="region" aria-label="الإشعارات">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role="alert">
          <div>
            <div className="toast-title">{t.title}</div>
            {t.description && <div className="toast-desc">{t.description}</div>}
          </div>
          <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="إغلاق">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}