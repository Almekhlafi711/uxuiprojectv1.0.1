import type { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  trend?: { direction: "up" | "down" | "flat"; text: string; positive?: boolean };
  icon?: ReactNode;
}

export function StatCard({ label, value, hint, trend, icon }: StatCardProps) {
  const trendClass =
    trend?.direction === "up"
      ? trend.positive === false
        ? "trend-down"
        : "trend-up"
      : trend?.direction === "down"
        ? trend.positive === false
          ? "trend-up"
          : "trend-down"
        : "trend-flat";
  return (
    <div className="stat-card">
      <div className="stat-card-label">
        {icon}
        {label}
      </div>
      <div className="stat-card-value num">{value}</div>
      {(hint || trend) && (
        <div className="stat-card-hint">
          {trend && <span className={trendClass}>{trend.text}</span>}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
}