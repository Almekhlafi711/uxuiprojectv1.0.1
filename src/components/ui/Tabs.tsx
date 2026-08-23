import { useRef, useEffect, useState, type ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
}

export function Tabs({ tabs, active, onChange }: { tabs: TabItem[]; active: string; onChange: (key: string) => void }) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showScrollStart, setShowScrollStart] = useState(false);
  const [showScrollEnd, setShowScrollEnd] = useState(false);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const check = () => {
      setShowScrollStart(el.scrollLeft > 4);
      setShowScrollEnd(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    check();
    el.addEventListener("scroll", check);
    return () => el.removeEventListener("scroll", check);
  }, []);

  const scrollTabs = (dir: "start" | "end") => {
    const el = tabsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "start" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div style={{ position: "relative" }}>
      <div className="tabs" role="tablist" ref={tabsRef}>
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={`tab ${active === t.key ? "active" : ""}`}
            onClick={() => onChange(t.key)}
          >
            {t.label}
            {t.count !== undefined && <span className="tab-count num">{t.count}</span>}
          </button>
        ))}
      </div>
      {(showScrollStart || showScrollEnd) && (
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, pointerEvents: "none", display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
          {showScrollStart && <button onClick={() => scrollTabs("start")} className="tab-scroll-btn" aria-label="التمرير للبداية" style={{ background: "linear-gradient(to right, var(--color-surface), transparent)", border: "none", padding: "0 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>‹</button>}
          {showScrollEnd && <button onClick={() => scrollTabs("end")} className="tab-scroll-btn" aria-label="التمرير للنهاية" style={{ background: "linear-gradient(to left, var(--color-surface), transparent)", border: "none", padding: "0 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>›</button>}
        </div>
      )}
      <div className="mt-4">{tabs.find((t) => t.key === active)?.content}</div>
    </div>
  );
}