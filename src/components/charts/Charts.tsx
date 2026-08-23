import { useMemo, useRef, useEffect, useState } from "react";

export interface BarDatum {
  label: string;
  value: number;
  secondary?: number;
}

export function BarChart({
  data,
  height = 220,
  valueFormatter = (v: number) => v.toLocaleString("ar-SA"),
  color = "var(--color-primary)",
  secondaryColor = "var(--color-success)",
  secondaryLabel,
  valueLabel = "القيمة",
  showValues = true,
}: {
  data: BarDatum[];
  height?: number;
  valueFormatter?: (v: number) => string;
  color?: string;
  secondaryColor?: string;
  secondaryLabel?: string;
  valueLabel?: string;
  showValues?: boolean;
}) {
  const max = useMemo(() => Math.max(...data.map((d) => Math.max(d.value, d.secondary ?? 0)), 1), [data]);
  const chartH = height - 34;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const resize = () => setContainerWidth(containerRef.current?.offsetWidth ?? 0);
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Responsive font size based on container width and data length
  const labelFontSize = useMemo(() => {
    if (containerWidth === 0) return 2.8;
    const availableWidthPerBar = containerWidth / data.length;
    return Math.max(2.2, Math.min(3.2, availableWidthPerBar / 12));
  }, [containerWidth, data.length]);

  const valueFontSize = useMemo(() => {
    if (containerWidth === 0) return 2.6;
    const availableWidthPerBar = containerWidth / data.length;
    return Math.max(2.0, Math.min(2.8, availableWidthPerBar / 14));
  }, [containerWidth, data.length]);

  return (
    <div ref={containerRef} style={{ width: "100%", maxWidth: "100%" }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="رسم بياني أعمدة"
        style={{ maxWidth: "100%", height: "auto" }}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2="100" y1={chartH * (1 - f)} y2={chartH * (1 - f)} stroke="var(--color-divider)" strokeWidth="0.3" />
        ))}
        {data.map((d, i) => {
          const slot = 100 / data.length;
          const barW = slot * 0.55;
          const x = slot * i + slot * 0.225;
          const h = Math.max((d.value / max) * chartH, 0.8);
          const h2 = d.secondary !== undefined ? Math.max((d.secondary / max) * chartH, 0.8) : 0;
          return (
            <g key={i}>
              <rect x={x} y={chartH - h} width={barW} height={h} fill={color} rx="0.5" />
              {d.secondary !== undefined && (
                <rect x={x + barW + 0.8} y={chartH - h2} width={barW * 0.5} height={h2} fill={secondaryColor} rx="0.5" />
              )}
              <text x={x + barW / 2} y={chartH + 9} fontSize={labelFontSize} fill="var(--color-text-faint)" textAnchor="middle" dominantBaseline="hanging">
                {d.label}
              </text>
              {showValues && (
                <text x={x + barW / 2} y={Math.max(chartH - h - 2, 2)} fontSize={valueFontSize} fill="var(--color-text-muted)" textAnchor="middle">
                  {valueFormatter(d.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {secondaryLabel && (
        <div className="chart-legend">
          <span className="legend-item"><span className="legend-dot" style={{ background: color }} />{valueLabel}</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: secondaryColor }} />{secondaryLabel}</span>
        </div>
      )}
    </div>
  );
}

export function LineChart({
  data,
  height = 220,
  valueFormatter = (v: number) => v.toLocaleString("ar-SA"),
  color = "var(--color-primary)",
  series = ["value"],
}: {
  data: Record<string, number | string>[];
  height?: number;
  valueFormatter?: (v: number) => string;
  color?: string;
  series?: string[];
}) {
  const values = data.flatMap((d) => series.map((s) => Number(d[s] ?? 0)));
  const max = Math.max(...values, 1);
  const chartH = height - 30;
  const W = 100;
  const stepX = data.length > 1 ? W / (data.length - 1) : W;
  const point = (d: Record<string, number | string>, key: string, i: number) => ({
    x: i * stepX,
    y: chartH - (Number(d[key] ?? 0) / max) * chartH,
  });
  const colors = [color, "var(--color-info)", "var(--color-warning)"];

  // Responsive font sizes based on container width
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const resize = () => setContainerWidth(containerRef.current?.offsetWidth ?? 0);
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const labelFontSize = useMemo(() => {
    if (containerWidth === 0) return 2.8;
    return Math.max(2.2, Math.min(3.2, containerWidth / (data.length * 10)));
  }, [containerWidth, data.length]);

  const valueFontSize = useMemo(() => {
    if (containerWidth === 0) return 2.4;
    return Math.max(2.0, Math.min(2.8, containerWidth / (data.length * 12)));
  }, [containerWidth, data.length]);

  return (
    <div ref={containerRef} style={{ width: "100%", maxWidth: "100%" }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="رسم بياني خطي"
        style={{ maxWidth: "100%", height: "auto" }}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2="100" y1={chartH * (1 - f)} y2={chartH * (1 - f)} stroke="var(--color-divider)" strokeWidth="0.3" />
        ))}
        {series.map((s, si) => (
          <g key={s}>
            <polyline
              points={data.map((d, i) => `${point(d, s, i).x},${point(d, s, i).y}`).join(" ")}
              fill="none"
              stroke={colors[si % colors.length]}
              strokeWidth="1"
              strokeLinejoin="round"
            />
            {data.map((d, i) => (
              <circle key={i} cx={point(d, s, i).x} cy={point(d, s, i).y} r="1.2" fill={colors[si % colors.length]} />
            ))}
          </g>
        ))}
        {data.map((d, i) => (
          <text key={i} x={i * stepX} y={chartH + 9} fontSize={labelFontSize} fill="var(--color-text-faint)" textAnchor="middle" dominantBaseline="hanging">
            {String(d.label ?? "")}
          </text>
        ))}
        {data.map((d, i) => (
          <text key={`v-${i}`} x={point(d, series[0], i).x} y={Math.max(point(d, series[0], i).y - 2, 1)} fontSize={valueFontSize} fill="var(--color-text-muted)" textAnchor="middle">
            {valueFormatter(Number(d[series[0]] ?? 0))}
          </text>
        ))}
      </svg>
    </div>
  );
}

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ data, size = 180, centerLabel, centerValue }: { data: DonutDatum[]; size?: number; centerLabel?: string; centerValue?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 40;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", width: "100%", maxWidth: "100%" }}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="رسم دائري" style={{ maxWidth: "100%", height: "auto" }}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-surface-alt)" strokeWidth="12" />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={d.color}
              strokeWidth="12"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += dash;
          return el;
        })}
        {centerValue && (
          <>
            <text x="50" y="48" fontSize="11" fontWeight="700" textAnchor="middle" fill="var(--color-text)">
              {centerValue}
            </text>
            {centerLabel && (
              <text x="50" y="60" fontSize="5.5" textAnchor="middle" fill="var(--color-text-faint)">
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>
      <div className="chart-legend" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 0, minWidth: 0, width: "100%" }}>
        {data.map((d, i) => (
          <span key={i} className="legend-item" style={{ justifyContent: "space-between", width: "100%", minWidth: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span className="legend-dot" style={{ background: d.color }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{d.label}</span>
            </span>
            <span className="num" style={{ fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap" }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}