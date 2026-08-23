import { ChevronRight, ChevronLeft, MoreHorizontal } from "lucide-react";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const windowPages: (number | "...")[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  if (start > 1) {
    windowPages.push(1);
    if (start > 2) windowPages.push("...");
  }
  for (let i = start; i <= end; i++) windowPages.push(i);
  if (end < pages) {
    if (end < pages - 1) windowPages.push("...");
    windowPages.push(pages);
  }

  return (
    <nav className="pagination" aria-label="ترقيم الصفحات">
      <button className="page-btn" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="السابق">
        <ChevronRight size={15} />
      </button>
      {windowPages.map((p, i) =>
        p === "..." ? (
          <span key={`e-${i}`} className="page-btn" aria-hidden="true"><MoreHorizontal size={14} /></span>
        ) : (
          <button
            key={p}
            className={`page-btn ${p === page ? "active" : ""}`}
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}
      <button className="page-btn" onClick={() => onChange(page + 1)} disabled={page === pages} aria-label="التالي">
        <ChevronLeft size={15} />
      </button>
    </nav>
  );
}