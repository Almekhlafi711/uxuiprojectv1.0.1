import { useRef, useState, type ChangeEvent } from "react";
import { UploadCloud, FileText, X } from "lucide-react";

export interface UploadedFile {
  name: string;
  size: number;
}

export function FileUpload({
  label = "اسحب الملف هنا أو اضغط للاختيار",
  hint = "PDF, JPG, PNG — بحد أقصى 5MB",
  accept = ".pdf,.jpg,.jpeg,.png",
  files,
  onChange,
}: {
  label?: string;
  hint?: string;
  accept?: string;
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size }));
    onChange([...files, ...picked]);
    e.target.value = "";
  };

  return (
    <div>
      <div
        className="file-upload"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={label}
      >
        <UploadCloud size={28} strokeWidth={1.5} style={{ color: "var(--color-text-faint)" }} />
        <div>
          <div className="fu-title">{label}</div>
          <div className="fu-hint">{hint}</div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          hidden
          onChange={handle}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="file-item">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <FileText size={15} style={{ color: "var(--color-text-faint)", flexShrink: 0 }} />
                <span className="truncate">{f.name}</span>
                <span className="faint">{(f.size / 1024).toFixed(0)} KB</span>
              </span>
              <button
                type="button"
                className="btn-icon"
                style={{ width: 24, height: 24 }}
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                aria-label={`حذف ${f.name}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}