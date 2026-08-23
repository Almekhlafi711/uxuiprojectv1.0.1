import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Search, X, ChevronDown, Calendar } from "lucide-react";

interface FieldBase {
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  hint?: ReactNode;
}

export function FieldShell({ label, required, helper, error, hint, id, children }: FieldBase & { id: string; children: ReactNode }) {
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="field-error" role="alert">{error}</span>
      ) : helper ? (
        <span className="field-helper">{helper}</span>
      ) : (
        hint
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({ label, helper, error, icon, required, className = "", id, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} required={required} helper={helper} error={error} id={inputId}>
      {icon ? (
        <div className="input-group">
          <span className="input-prefix">{icon}</span>
          <input id={inputId} className={`input ${error ? "has-error" : ""} ${className}`} required={required} {...rest} />
        </div>
      ) : (
        <input id={inputId} className={`input ${error ? "has-error" : ""} ${className}`} required={required} {...rest} />
      )}
    </FieldShell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helper?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, helper, error, required, options, placeholder, className = "", id, value, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <FieldShell label={label} required={required} helper={helper} error={error} id={selectId}>
      <div className="select-wrap">
        <select id={selectId} className={`select ${error ? "has-error" : ""} ${className}`} required={required} value={value} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </FieldShell>
  );
}

export interface SearchableSelectProps {
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  options: { value: string; label: string; sublabel?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({ label, required, helper, error, options, value, onChange, placeholder = "اختر...", disabled }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const autoId = useId();
  const selected = options.find((o) => o.value === value);

  const filtered = query
    ? options.filter((o) => o.label.includes(query) || o.value.includes(query))
    : options;

  return (
    <FieldShell label={label} required={required} helper={helper} error={error} id={autoId}>
      <div className="searchable-select">
        <button
          type="button"
          className="ss-input"
          onClick={() => !disabled && setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
        >
          {selected ? <span>{selected.label}</span> : <span className="placeholder">{placeholder}</span>}
          <ChevronDown size={15} />
        </button>
        {open && (
          <div className="ss-menu" role="listbox">
            <div style={{ position: "relative" }}>
              <input
                autoFocus
                className="ss-search"
                placeholder="ابحث..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  style={{ position: "absolute", insetInlineEnd: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
                  onClick={() => setQuery("")}
                  aria-label="مسح البحث"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            {filtered.length === 0 && <div className="ss-empty">لا توجد نتائج</div>}
            {filtered.map((o) => (
              <div
                key={o.value}
                className={`ss-option ${o.value === value ? "selected" : ""}`}
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span>{o.label}</span>
                {o.sublabel && <span className="faint">{o.sublabel}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </FieldShell>
  );
}

export function DateInput({ label, helper, error, required, className = "", id, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} required={required} helper={helper} error={error} id={inputId}>
      <div className="date-input-wrap">
        <input type="date" id={inputId} className={`input ${error ? "has-error" : ""} ${className}`} required={required} {...rest} />
        <span className="date-icon"><Calendar size={14} /></span>
      </div>
    </FieldShell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  error?: string;
}

export function Textarea({ label, helper, error, required, className = "", id, ...rest }: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} required={required} helper={helper} error={error} id={inputId}>
      <textarea id={inputId} className={`textarea ${error ? "has-error" : ""} ${className}`} required={required} {...rest} />
    </FieldShell>
  );
}

export function Checkbox({ label, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label className="checkbox" htmlFor={inputId}>
      <input type="checkbox" id={inputId} {...rest} />
      {label}
    </label>
  );
}
