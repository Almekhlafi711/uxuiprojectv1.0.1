import { useMemo, useState, type ReactNode } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Search, Columns3, Download, FileSpreadsheet } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/Dropdown";
import { EmptyState, TableSkeleton } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  numeric?: boolean;
  hideable?: boolean;
  priority?: "primary" | "secondary" | "optional";
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (row: T) => string;
  toolbarActions?: ReactNode;
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  onRowClick?: (row: T) => void;
  exportable?: boolean;
  exportFilename?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  footer?: ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
  defaultVisibleColumns?: string[];
  className?: string;
}

function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };
  const header = columns.map((c) => esc(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(c.render ? String(c.render(r) ?? "") : String((r as Record<string, unknown>)[c.key] ?? ""))).join(","));
  return [header, ...body].join("\n");
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  searchable = true,
  searchPlaceholder = "بحث...",
  searchKeys,
  toolbarActions,
  bulkActions,
  onRowClick,
  exportable = true,
  exportFilename = "export",
  pageSize = 10,
  emptyTitle = "لا توجد بيانات",
  emptyDescription = "لم يتم العثور على سجلات مطابقة لمعايير البحث الحالية.",
  footer,
  initialSort,
  defaultVisibleColumns,
  className = "",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);
  const [page, setPage] = useState(1);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => new Set(defaultVisibleColumns ? columns.map((c) => c.key).filter((k) => !defaultVisibleColumns.includes(k)) : []));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visibleColumns = columns.filter((c) => !hiddenCols.has(c.key));

  const filtered = useMemo(() => {
    let result = rows;
    if (search && searchKeys) {
      const q = search.trim();
      result = result.filter((r) => searchKeys(r).includes(q));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const dir = sort.dir === "asc" ? 1 : -1;
        result = [...result].sort((a, b) => {
          const va = col.sortValue!(a);
          const vb = col.sortValue!(b);
          if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
          return String(va).localeCompare(String(vb), "ar") * dir;
        });
      }
    }
    return result;
  }, [rows, search, sort, columns, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(rowKey(r)));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      const next = new Set(selected);
      pageRows.forEach((r) => next.add(rowKey(r)));
      setSelected(next);
    }
  };
  const toggleRow = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));
  const clearSelection = () => setSelected(new Set());

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  const handleExport = () => {
    const csv = toCsv(filtered, visibleColumns);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="table-wrap">
      {(searchable || toolbarActions || exportable || bulkActions) && (
        <div className="table-toolbar">
          <div className="toolbar-group">
            {searchable && (
              <div className="toolbar-search">
                <span className="search-icon"><Search size={14} /></span>
                <input
                  className="input"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  aria-label={searchPlaceholder}
                />
              </div>
            )}
            {toolbarActions}
          </div>
          <div className="toolbar-group">
            {exportable && filtered.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExport} icon={<Download size={14} />}>
                تصدير CSV
              </Button>
            )}
            <Dropdown
              align="end"
              trigger={
                <Button variant="ghost" size="sm" icon={<Columns3 size={14} />}>
                  الأعمدة
                </Button>
              }
            >
              <DropdownLabel>إظهار / إخفاء الأعمدة</DropdownLabel>
              {columns.filter((c) => c.hideable !== false).map((c) => (
                <label key={c.key} className="cols-option" style={{ display: "flex" }}>
                  <input
                    type="checkbox"
                    checked={!hiddenCols.has(c.key)}
                    onChange={() =>
                      setHiddenCols((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.key)) next.delete(c.key);
                        else next.add(c.key);
                        return next;
                      })
                    }
                  />
                  {c.header}
                </label>
              ))}
            </Dropdown>
          </div>
        </div>
      )}

      {selectedRows.length > 0 && bulkActions && (
        <div className="table-toolbar" style={{ background: "var(--color-primary-soft)", borderBottom: "1px solid var(--color-primary-soft-border)" }}>
          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-primary)" }}>
            تم تحديد {selectedRows.length} عنصر
          </span>
          <div className="toolbar-group">{bulkActions(selectedRows, clearSelection)}</div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={pageSize} cols={visibleColumns.length} />
      ) : error ? (
        <div className="state-block error">
          <AlertTriangle size={36} strokeWidth={1.6} />
          <div className="state-title">تعذر تحميل البيانات</div>
          <div className="state-desc">{error}</div>
          {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>إعادة المحاولة</Button>}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={`data-table ${className}`}>
            <thead>
              <tr>
                {bulkActions && (
                  <th style={{ width: 36 }}>
                    <input type="checkbox" className="row-check" checked={allSelected} onChange={toggleAll} aria-label="تحديد الكل" />
                  </th>
                )}
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`${col.numeric ? "numeric" : ""} ${col.sortable ? "sortable" : ""} ${col.className ?? ""} ${col.priority ? `col-priority-${col.priority}` : ""}`}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                    aria-sort={sort?.key === col.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="sort-indicator" aria-hidden="true">
                        {sort?.key === col.key ? (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.45 }} />}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const key = rowKey(row);
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={key}
                    className={`${isSelected ? "selected" : ""} ${onRowClick ? "row-clickable" : ""}`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {bulkActions && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="row-check" checked={isSelected} onChange={() => toggleRow(key)} aria-label="تحديد صف" />
                      </td>
                    )}
                    {visibleColumns.map((col) => (
                      <td key={col.key} className={`${col.numeric ? "numeric" : ""} ${col.className ?? ""} ${col.priority ? `col-priority-${col.priority}` : ""}`}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-footer">
        <span>
          عرض {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} من {filtered.length} سجل
        </span>
        <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onChange={setPage} />
      </div>
      {footer}
    </div>
  );
}