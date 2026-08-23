/**
 * Barcode Service — سياسة الشركة: لكل منتج باركود وحدة + باركود كرتون
 * Expert decision: EAN-13 للوحدة (628 سعودي) + EAN-14 للكرتون (يبدأ بـ 1)
 * يدعم مسح الجوال (BarcodeDetector) + قارئ البلوتوث HID (يعمل كلوحة مفاتيح)
 * + Offline عبر فهرس محلي في الذاكرة (يُبنى عند التحميل، يعمل بدون إنترنت)
 */
import { products } from "@/mock/products";
import type { Product } from "@/types";

export type BarcodeType = "unit" | "carton";
export interface BarcodeResult {
  product: Product;
  type: BarcodeType;
  units: number; // للكرتون: unitsPerCarton، للوحدة: 1
}

/** فهرس ثنائي: barcode → Product + نوع + كمية */
const unitIndex = new Map<string, Product>();
const cartonIndex = new Map<string, Product>();

function buildIndices() {
  unitIndex.clear();
  cartonIndex.clear();
  for (const p of products) {
    if (p.barcode) unitIndex.set(normalize(p.barcode), p);
    if (p.barcodeCarton) cartonIndex.set(normalize(p.barcodeCarton), p);
    // السماح أيضاً بالبحث بـ code كـ fallback (SKU)
    unitIndex.set(normalize(p.code), p);
  }
}
buildIndices();

function normalize(code: string): string {
  return code.trim().replace(/[\s-]/g, "").toUpperCase();
}

/** البحث الذكي: يطابق كود أصلي أو مع شرطات أو مع مسافات + يدعم SKU */
export function findByBarcode(raw: string): BarcodeResult | null {
  const key = normalize(raw);
  if (!key) return null;

  // أولاً: مطابقة دقيقة وحدة
  const unit = unitIndex.get(key);
  if (unit) return { product: unit, type: "unit", units: 1 };

  // ثانياً: مطابقة كرتون
  const carton = cartonIndex.get(key);
  if (carton) return { product: carton, type: "carton", units: carton.unitsPerCarton ?? 1 };

  // ثالثاً: بحث مرن — تجاهل آخر رقم (Check digit) أو أول رقم للـ EAN-14
  // مثال: كرتون 16281001001007 قد يُمسح كـ 6281001001003 مع خطأ قراءة
  for (const p of products) {
    const b = p.barcode ? normalize(p.barcode) : "";
    const bc = p.barcodeCarton ? normalize(p.barcodeCarton) : "";
    if (b && (b.startsWith(key) || key.startsWith(b))) return { product: p, type: "unit", units: 1 };
    if (bc && (bc.startsWith(key) || key.startsWith(bc))) return { product: p, type: "carton", units: p.unitsPerCarton ?? 1 };
  }
  return null;
}

/** كل الباركودات لعرضها في التوثيق/الاختبار */
export function getAllBarcodes(): { code: string; productId: string; type: BarcodeType }[] {
  const out: { code: string; productId: string; type: BarcodeType }[] = [];
  for (const p of products) {
    if (p.barcode) out.push({ code: p.barcode, productId: p.id, type: "unit" });
    if (p.barcodeCarton) out.push({ code: p.barcodeCarton, productId: p.id, type: "carton" });
  }
  return out;
}

/** تحقق EAN13 بسيط (13 رقم + check digit) */
export function isValidEAN13(code: string): boolean {
  const digits = normalize(code).replace(/\D/g, "");
  if (digits.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(digits[12], 10);
}

/** صوت نجاح/خطأ للجوال (Web Audio) + اهتزاز */
export function feedback(success: boolean) {
  try {
    if (navigator.vibrate) navigator.vibrate(success ? 80 : [80, 40, 80]);
  } catch {}
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = success ? 880 : 330;
    g.gain.value = 0.12;
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, success ? 120 : 220);
  } catch {}
}

/** Offline: حفظ الفهرس في localStorage للعمل بدون إنترنت */
export function persistIndex() {
  try {
    localStorage.setItem("barcode-index", JSON.stringify(getAllBarcodes()));
  } catch {}
}
