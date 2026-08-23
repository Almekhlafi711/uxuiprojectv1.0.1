const arNumberFormatter = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 });
const arNumberFormatter2 = new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatNumber = (n: number): string => arNumberFormatter.format(n);

export const formatMoney = (n: number): string => `${arNumberFormatter.format(n)} ر.س`;

export const formatMoney2 = (n: number): string => `${arNumberFormatter2.format(n)} ر.س`;

export const formatQty = (n: number): string => arNumberFormatter.format(n);

export const formatDate = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "long", year: "numeric" }).format(d);
};

export const formatDateShort = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar-SA", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
};

export const formatDateTime = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

export const formatTime = (t?: string): string => t ?? "—";

export const formatPercent = (n: number, digits = 1): string =>
  `${new Intl.NumberFormat("ar-SA", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)}%`;

export const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${arNumberFormatter.format(mins)} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${arNumberFormatter.format(hours)} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `قبل ${arNumberFormatter.format(days)} يوم`;
  return formatDateShort(iso);
};

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[1][0];
};

export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);