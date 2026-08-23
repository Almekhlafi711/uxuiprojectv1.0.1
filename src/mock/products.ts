import type { Product, ProductCategory, PriceList } from "@/types";

export const productCategories: ProductCategory[] = [
  { id: "cat-01", name: "مشروبات غازية" },
  { id: "cat-02", name: "عصائر ومياه" },
  { id: "cat-03", name: "مواد غذائية" },
  { id: "cat-04", name: "حلويات ووجبات خفيفة" },
  { id: "cat-05", name: "منتجات ألبان" },
  { id: "cat-06", name: "مواد استهلاكية" },
];

export const products: Product[] = [
  { id: "p-001", code: "SKU-1001", name: "مشروب غازي كولا 330مل", categoryId: "cat-01", brand: "واحة", unit: "علبة", packSize: "24 علبة / كرتون", costPrice: 21.5, sellPrice: 28.0, discountRate: 5, status: "active", reorderLevel: 50, barcode: "6281001001003", barcodeCarton: "16281001001007", unitsPerCarton: 24 },
  { id: "p-002", code: "SKU-1002", name: "مشروب غازي برتقال 330مل", categoryId: "cat-01", brand: "واحة", unit: "علبة", packSize: "24 علبة / كرتون", costPrice: 19.0, sellPrice: 25.5, discountRate: 5, status: "active", reorderLevel: 40, barcode: "6281001001004", barcodeCarton: "16281001001014", unitsPerCarton: 24 },
  { id: "p-003", code: "SKU-1003", name: "مشروب غازي ليمون 330مل", categoryId: "cat-01", brand: "واحة", unit: "علبة", packSize: "24 علبة / كرتون", costPrice: 19.5, sellPrice: 26.0, discountRate: 5, status: "active", reorderLevel: 40, barcode: "6281001001005", barcodeCarton: "16281001001021", unitsPerCarton: 24 },
  { id: "p-004", code: "SKU-1004", name: "مشروب طاقة 250مل", categoryId: "cat-01", brand: "نشاط", unit: "علبة", packSize: "24 علبة / كرتون", costPrice: 48.0, sellPrice: 62.0, discountRate: 3, status: "active", reorderLevel: 30, barcode: "6281001001006", barcodeCarton: "16281001001038", unitsPerCarton: 24 },
  { id: "p-005", code: "SKU-2001", name: "عصير مانجو 1 لتر", categoryId: "cat-02", brand: "ريان", unit: "عبوة", packSize: "12 عبوة / كرتون", costPrice: 34.0, sellPrice: 44.0, discountRate: 4, status: "active", reorderLevel: 25, barcode: "6281002001001", barcodeCarton: "16281002001005", unitsPerCarton: 12 },
  { id: "p-006", code: "SKU-2002", name: "عصير تفاح 1 لتر", categoryId: "cat-02", brand: "ريان", unit: "عبوة", packSize: "12 عبوة / كرتون", costPrice: 32.5, sellPrice: 42.0, discountRate: 4, status: "active", reorderLevel: 25, barcode: "6281002001002", barcodeCarton: "16281002001012", unitsPerCarton: 12 },
  { id: "p-007", code: "SKU-2003", name: "مياه معدنية 330مل", categoryId: "cat-02", brand: "نقاء", unit: "علبة", packSize: "24 علبة / كرتون", costPrice: 9.5, sellPrice: 13.0, discountRate: 6, status: "active", reorderLevel: 100, barcode: "6281002001003", barcodeCarton: "16281002001029", unitsPerCarton: 24 },
  { id: "p-008", code: "SKU-2004", name: "مياه معدنية 1.5 لتر", categoryId: "cat-02", brand: "نقاء", unit: "عبوة", packSize: "12 عبوة / كرتون", costPrice: 15.0, sellPrice: 20.0, discountRate: 6, status: "active", reorderLevel: 80, barcode: "6281002001004", barcodeCarton: "16281002001036", unitsPerCarton: 12 },
  { id: "p-009", code: "SKU-3001", name: "أرز بسمتي 5 كجم", categoryId: "cat-03", brand: "الجود", unit: "كيس", packSize: "4 أكياس / كرتون", costPrice: 88.0, sellPrice: 105.0, discountRate: 4, status: "active", reorderLevel: 20, barcode: "6281003001001", barcodeCarton: "16281003001003", unitsPerCarton: 4 },
  { id: "p-010", code: "SKU-3002", name: "زيت عباد الشمس 1.5 لتر", categoryId: "cat-03", brand: "الصافي", unit: "عبوة", packSize: "6 عبوات / كرتون", costPrice: 44.0, sellPrice: 54.0, discountRate: 4, status: "active", reorderLevel: 35, barcode: "6281003001002", barcodeCarton: "16281003001010", unitsPerCarton: 6 },
  { id: "p-011", code: "SKU-3003", name: "سكر ناعم 1 كجم", categoryId: "cat-03", brand: "الذهب", unit: "كيس", packSize: "12 كيس / كرتون", costPrice: 13.5, sellPrice: 17.0, discountRate: 5, status: "active", reorderLevel: 60, barcode: "6281003001003", barcodeCarton: "16281003001027", unitsPerCarton: 12 },
  { id: "p-012", code: "SKU-3004", name: "شاي أسود 250 جرام", categoryId: "cat-03", brand: "الأصيل", unit: "علبة", packSize: "24 علبة / كرتون", costPrice: 27.0, sellPrice: 34.0, discountRate: 4, status: "active", reorderLevel: 30, barcode: "6281003001004", barcodeCarton: "16281003001034", unitsPerCarton: 24 },
  { id: "p-013", code: "SKU-3005", name: "صلصة طماطم 340 جرام", categoryId: "cat-03", brand: "التاج", unit: "عبوة", packSize: "24 عبوة / كرتون", costPrice: 16.0, sellPrice: 21.0, discountRate: 5, status: "active", reorderLevel: 45, barcode: "6281003001005", barcodeCarton: "16281003001041", unitsPerCarton: 24 },
  { id: "p-014", code: "SKU-4001", name: "بسكويت شاي 400 جرام", categoryId: "cat-04", brand: "لذة", unit: "عبوة", packSize: "12 عبوة / كرتون", costPrice: 24.0, sellPrice: 31.0, discountRate: 4, status: "active", reorderLevel: 30, barcode: "6281004001001", barcodeCarton: "16281004001001", unitsPerCarton: 12 },
  { id: "p-015", code: "SKU-4002", name: "شيبس مالح 60 جرام", categoryId: "cat-04", brand: "قرقوش", unit: "كيس", packSize: "30 كيس / كرتون", costPrice: 12.0, sellPrice: 16.5, discountRate: 5, status: "active", reorderLevel: 70, barcode: "6281004001002", barcodeCarton: "16281004001018", unitsPerCarton: 30 },
  { id: "p-016", code: "SKU-4003", name: "حلاوة طحينية 1 كجم", categoryId: "cat-04", brand: "الرافدين", unit: "عبوة", packSize: "8 عبوات / كرتون", costPrice: 38.0, sellPrice: 47.0, discountRate: 3, status: "active", reorderLevel: 20, barcode: "6281004001003", barcodeCarton: "16281004001025", unitsPerCarton: 8 },
  { id: "p-017", code: "SKU-5001", name: "حليب طازج 1 لتر", categoryId: "cat-05", brand: "المروج", unit: "عبوة", packSize: "12 عبوة / كرتون", costPrice: 22.0, sellPrice: 27.5, discountRate: 3, status: "active", reorderLevel: 40, barcode: "6281005001001", barcodeCarton: "16281005001009", unitsPerCarton: 12 },
  { id: "p-018", code: "SKU-5002", name: "زبادي طبيعي 1 كجم", categoryId: "cat-05", brand: "المروج", unit: "عبوة", packSize: "12 عبوة / كرتون", costPrice: 25.0, sellPrice: 31.0, discountRate: 3, status: "active", reorderLevel: 35, barcode: "6281005001002", barcodeCarton: "16281005001016", unitsPerCarton: 12 },
  { id: "p-019", code: "SKU-6001", name: "مسحوق غسيل 3 كجم", categoryId: "cat-06", brand: "النقاء", unit: "عبوة", packSize: "4 عبوات / كرتون", costPrice: 54.0, sellPrice: 66.0, discountRate: 4, status: "active", reorderLevel: 15, barcode: "6281006001001", barcodeCarton: "16281006001007", unitsPerCarton: 4 },
  { id: "p-020", code: "SKU-6002", name: "صابون استحمام 125 جرام", categoryId: "cat-06", brand: "النقاء", unit: "قطعة", packSize: "48 قطعة / كرتون", costPrice: 7.5, sellPrice: 10.5, discountRate: 5, status: "active", reorderLevel: 60, barcode: "6281006001002", barcodeCarton: "16281006001014", unitsPerCarton: 48 },
  { id: "p-021", code: "SKU-6003", name: "مناديل ورقية 500 ورقة", categoryId: "cat-06", brand: "اللين", unit: "علبة", packSize: "20 علبة / كرتون", costPrice: 19.0, sellPrice: 24.5, discountRate: 4, status: "inactive", reorderLevel: 25, barcode: "6281006001003", barcodeCarton: "16281006001021", unitsPerCarton: 20 },
  { id: "p-022", code: "SKU-1005", name: "مشروب غازي كولا 1.5 لتر", categoryId: "cat-01", brand: "واحة", unit: "عبوة", packSize: "12 عبوة / كرتون", costPrice: 34.5, sellPrice: 43.0, discountRate: 4, status: "active", reorderLevel: 35, barcode: "6281001001007", barcodeCarton: "16281001001045", unitsPerCarton: 12 },
];

export const priceLists: PriceList[] = [
  {
    id: "pl-01",
    name: "قائمة الأسعار الافتراضية — 2026",
    effectiveFrom: "2026-01-01",
    status: "approved",
    items: products.filter((p) => p.status === "active").map((p) => ({ productId: p.id, price: p.sellPrice })),
  },
  {
    id: "pl-02",
    name: "قائمة أسعار الموزعين — جملة",
    effectiveFrom: "2026-03-01",
    status: "approved",
    items: products.slice(0, 12).map((p) => ({ productId: p.id, price: Math.round(p.sellPrice * 0.88) })),
  },
  {
    id: "pl-03",
    name: "قائمة عروض الصيف 2026",
    effectiveFrom: "2026-07-01",
    status: "under_review",
    items: [products[0], products[3], products[6], products[14]].map((p) => ({ productId: p.id, price: Math.round(p.sellPrice * 0.92) })),
  },
];

export const productById = (id: string) => products.find((p) => p.id === id);
export const categoryById = (id: string) => productCategories.find((c) => c.id === id);