import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, Keyboard, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormControls";

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

/**
 * BarcodeScannerModal — Expert hybrid:
 * - كاميرا الجوال عبر BarcodeDetector (native, Odoo POS style) — سريع وخفيف بلا مكتبة
 * - fallback إلى html5-qrcode غير مطلوب (يجنّب وزن 50KB)
 * - حقل إدخال للبلوتوث HID (القارئ يكتب كلوحة مفاتيح + Enter) — يعمل حتى مع الكاميرا معطلة
 * - يدعم EAN-13 / UPC-A / Code128 / QR
 */
export function BarcodeScanner({ open, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleCode = useCallback((code: string) => {
    const c = code.trim();
    if (!c) return;
    onScan(c);
    // لا نغلق تلقائياً للسماح بمسح متكرر سريع (1 ثانية لكل صنف)
    // يبقى الاسكنر مفتوحاً ليضيف qty+1 عند المسح التالي
  }, [onScan]);

  // Bluetooth HID: أي إدخال ينتهي بـ Enter يعتبر مسح
  const onManualKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (manual.trim()) {
        handleCode(manual);
        setManual("");
      }
    }
  };

  useEffect(() => {
    if (!open) { stop(); return; }
    let cancelled = false;

    async function start() {
      // تحقق دعم BarcodeDetector
      const BD = (window as unknown as { BarcodeDetector?: { new(opts?: { formats: string[] }): { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> } } }).BarcodeDetector;
      if (!BD) {
        setError("المتصفح لا يدعم كشف الباركود تلقائياً — استخدم حقل الإدخال (القارئ البلوتوث يكتب هنا ثم Enter) أو أدخل الكود يدوياً.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setError(null);
        setScanning(true);
        const detector = new BD({ formats: ["ean_13", "ean_8", "upc_a", "code_128", "qr_code"] });
        let lastCode = "";
        let lastAt = 0;
        const loop = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length) {
              const raw = codes[0].rawValue?.trim();
              const now = Date.now();
              // منع تكرار نفس الكود خلال 1.2 ثانية (debounce للمسح المتكرر غير المقصود)
              if (raw && (raw !== lastCode || now - lastAt > 1200)) {
                lastCode = raw;
                lastAt = now;
                handleCode(raw);
                // اهتزاز خفيف + وميض إطار
                if (videoRef.current) {
                  videoRef.current.style.outline = "3px solid #00a09d";
                  setTimeout(() => { if (videoRef.current) videoRef.current.style.outline = "none"; }, 180);
                }
              }
            }
          } catch {}
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل فتح الكاميرا — تأكد من السماح بالإذن أو استخدم القارئ البلوتوث.");
      }
    }
    start();
    return () => { cancelled = true; stop(); };
  }, [open, handleCode, stop]);

  // إغلاق بـ Esc
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: "center", padding: "var(--space-4)" }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><ScanLine size={18} /> مسح الباركود — وحدة أو كرتون</h3>
          <button className="btn-icon" onClick={onClose} aria-label="إغلاق"><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* كاميرا */}
          <div style={{ position: "relative", background: "#000", borderRadius: 8, overflow: "hidden", aspectRatio: "16/10", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: scanning ? "block" : "none" }} />
            {!scanning && (
              <div style={{ color: "rgba(255,255,255,0.9)", textAlign: "center", padding: 16 }}>
                <Camera size={32} style={{ margin: "0 auto 8px", opacity: 0.9 }} />
                <div style={{ fontSize: "var(--font-size-sm)" }}>{error ? "الكاميرا غير متاحة" : "جاري تهيئة الكاميرا..."}</div>
              </div>
            )}
            {/* إطار تصويب */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "78%", height: "38%", border: "2px solid rgba(255,255,255,0.85)", borderRadius: 10, boxShadow: "0 0 0 9999px rgba(0,0,0,0.18) inset" }} />
            </div>
            {scanning && <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "var(--font-size-xs)", padding: "4px 10px", borderRadius: 20 }}>وجّه الكاميرا للباركود — المسح يضيف للسلة تلقائياً</div>}
          </div>

          {error && <div className="alert alert-warning" style={{ margin: 0, fontSize: "var(--font-size-xs)" }}>{error}</div>}

          {/* إدخال بلوتوث / يدوي — سياسة الشركة: الكرتون له باركود */}
          <div style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 12 }}>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Keyboard size={14} /> قارئ البلوتوث أو إدخال يدوي (SKU / EAN-13 / كرتون)</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Input value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={onManualKey} placeholder="امسح أو اكتب الباركود ثم Enter — مثال: 6281001001003 أو SKU-1001" />
              </div>
              <Button variant="primary" onClick={() => { if (manual.trim()) { handleCode(manual); setManual(""); } }} disabled={!manual.trim()}>إضافة</Button>
            </div>
            <div style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-faint)", marginTop: 6 }}>سياسة الشركة: كل كرتون له باركود منفصل (يبدأ بـ 1) — مسح كرتون يضيف تلقائياً {`{unitsPerCarton}`} وحدة. مسح متكرر لنفس الوحدة = زيادة الكمية +1.</div>
          </div>
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>إغلاق</Button>
        </div>
      </div>
    </div>
  );
}
