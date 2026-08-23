import { Store, User as UserIcon, Shield } from "lucide-react";

export interface MapMarker {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: "customer" | "rep" | "supervisor";
  sublabel?: string;
}

export interface MapRouteLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function MockMap({
  markers,
  routes = [],
  legend,
  height = 420,
}: {
  markers: MapMarker[];
  routes?: MapRouteLine[];
  legend?: { label: string; color: string }[];
  height?: number;
}) {
  return (
    <div className="mock-map" style={{ height }} role="img" aria-label="خريطة المواقع">
      {/* roads */}
      <div className="map-road h1" style={{ top: "30%", left: "0%", right: "0%", height: 10 }} />
      <div className="map-road" style={{ top: "62%", left: "0%", right: "0%", height: 8 }} />
      <div className="map-road" style={{ left: "28%", top: "0%", bottom: "0%", width: 9 }} />
      <div className="map-road" style={{ left: "66%", top: "0%", bottom: "0%", width: 8 }} />
      <div className="map-road" style={{ left: "10%", top: "45%", width: "34%", height: 6, transform: "rotate(24deg)" }} />
      <div className="map-road" style={{ right: "8%", top: "50%", width: "30%", height: 6, transform: "rotate(-18deg)" }} />

      {routes.map((r) => (
        <span
          key={r.id}
          className="map-route-line"
          style={{
            left: `${r.x1}%`,
            top: `${r.y1}%`,
            width: `${Math.sqrt((r.x2 - r.x1) ** 2 + (r.y2 - r.y1) ** 2)}%`,
            transform: `rotate(${(Math.atan2(r.y2 - r.y1, r.x2 - r.x1) * 180) / Math.PI}deg)`,
          }}
        />
      ))}

      {markers.map((m) => (
        <div key={m.id} className="map-marker" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
          <span className={`pin ${m.kind}`}>
            {m.kind === "customer" ? <Store size={13} /> : m.kind === "rep" ? <UserIcon size={13} /> : <Shield size={13} />}
          </span>
          <span className="map-marker-label">
            {m.label}
            {m.sublabel && <span className="faint"> · {m.sublabel}</span>}
          </span>
        </div>
      ))}

      {legend && (
        <div className="map-legend">
          {legend.map((l) => (
            <span key={l.label} className="legend-row">
              <span className="legend-swatch" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}