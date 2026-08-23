import type { Distributor, DistributorSellInOrder, DistributorSellOut } from "@/types";

export const distributors: Distributor[] = [
  {
    id: "dist-01",
    name: "مؤسسة الرواد للتوزيع",
    territoryIds: ["t-01", "t-02", "t-03"],
    type: "managed",
    status: "active",
    contactName: "وليد عبد الله الزهراني",
    phone: "0555000042",
    email: "alruwad@example.com",
    creditLimit: 250000,
    balance: 42000,
    branchId: "b-01",
  },
  {
    id: "dist-02",
    name: "شركة النخبة للإمداد",
    territoryIds: ["t-04", "t-05"],
    type: "external",
    status: "active",
    contactName: "سامي ناصر الغامدي",
    phone: "0555000043",
    email: "elite@example.com",
    creditLimit: 180000,
    balance: 31000,
    branchId: "b-02",
  },
];

export const distributorSellInOrders: DistributorSellInOrder[] = [
  {
    id: "sin-001",
    distributorId: "dist-01",
    distributorName: "مؤسسة الرواد للتوزيع",
    date: "2026-08-02",
    status: "received",
    createdBy: "u-do-01",
    items: [
      { productId: "p-001", productName: "سكر أبيض 1كغ", qty: 40, unitPrice: 5.5 },
      { productId: "p-002", productName: "معجون طماطم 800ج", qty: 60, unitPrice: 7.2 },
      { productId: "p-005", productName: "زيت نباتي 1لتر", qty: 20, unitPrice: 14.0 },
    ],
    total: 1084,
  },
  {
    id: "sin-002",
    distributorId: "dist-01",
    distributorName: "مؤسسة الرواد للتوزيع",
    date: "2026-08-15",
    status: "shipped",
    createdBy: "u-do-01",
    items: [
      { productId: "p-001", productName: "سكر أبيض 1كغ", qty: 30, unitPrice: 5.5 },
      { productId: "p-003", productName: "مكرونة 500ج", qty: 50, unitPrice: 4.8 },
    ],
    total: 405,
  },
  {
    id: "sin-003",
    distributorId: "dist-01",
    distributorName: "مؤسسة الرواد للتوزيع",
    date: "2026-08-18",
    status: "confirmed",
    createdBy: "u-do-01",
    items: [
      { productId: "p-002", productName: "معجون طماطم 800ج", qty: 40, unitPrice: 7.2 },
      { productId: "p-004", productName: "شاي أسود 250ج", qty: 25, unitPrice: 9.0 },
      { productId: "p-006", productName: "قهوة فوري 10ج", qty: 30, unitPrice: 11.0 },
    ],
    total: 762,
  },
  {
    id: "sin-004",
    distributorId: "dist-02",
    distributorName: "شركة النخبة للإمداد",
    date: "2026-08-05",
    status: "received",
    createdBy: "u-do-01",
    items: [
      { productId: "p-001", productName: "سكر أبيض 1كغ", qty: 50, unitPrice: 5.5 },
      { productId: "p-003", productName: "مكرونة 500ج", qty: 30, unitPrice: 4.8 },
    ],
    total: 421,
  },
  {
    id: "sin-005",
    distributorId: "dist-02",
    distributorName: "شركة النخبة للإمداد",
    date: "2026-08-17",
    status: "shipped",
    createdBy: "u-do-01",
    items: [
      { productId: "p-005", productName: "زيت نباتي 1لتر", qty: 25, unitPrice: 14.0 },
      { productId: "p-006", productName: "قهوة فوري 10ج", qty: 20, unitPrice: 11.0 },
    ],
    total: 570,
  },
];

export const distributorSellOut: DistributorSellOut[] = [
  {
    id: "sout-001",
    distributorId: "dist-01",
    date: "2026-08-10",
    customerName: "سوبر ماركت النخلة",
    items: [
      { productId: "p-001", productName: "سكر أبيض 1كغ", qty: 12, amount: 79.2 },
      { productId: "p-002", productName: "معجون طماطم 800ج", qty: 8, amount: 64.8 },
    ],
    total: 144,
  },
  {
    id: "sout-002",
    distributorId: "dist-01",
    date: "2026-08-12",
    customerName: "محل بقالة الحمدي",
    items: [
      { productId: "p-003", productName: "مكرونة 500ج", qty: 15, amount: 86.4 },
      { productId: "p-005", productName: "زيت نباتي 1لتر", qty: 4, amount: 65.6 },
    ],
    total: 152,
  },
  {
    id: "sout-003",
    distributorId: "dist-02",
    date: "2026-08-09",
    customerName: "سوبر ماركت العهد",
    items: [
      { productId: "p-001", productName: "سكر أبيض 1كغ", qty: 18, amount: 118.8 },
      { productId: "p-006", productName: "قهوة فوري 10ج", qty: 6, amount: 85.8 },
    ],
    total: 204.6,
  },
];
