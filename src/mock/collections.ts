import type { Collection } from "@/types";
import { invoices } from "./sales";

export const collections: Collection[] = [
  { id: "col-001", number: "RC-2026-0412", customerId: "c-001", repId: "u-rp-01", amount: 5000, method: "cash", date: "2026-08-14", invoiceIds: ["so-001"], cashBoxId: "bx-rp-01", status: "approved" },
  { id: "col-002", number: "RC-2026-0411", customerId: "c-003", repId: "u-rp-02", amount: 1850, method: "cash", date: "2026-08-14", invoiceIds: ["so-002"], cashBoxId: "bx-rp-02", status: "approved" },
  { id: "col-003", number: "RC-2026-0410", customerId: "c-024", repId: "u-rp-02", amount: 5000, method: "transfer", date: "2026-08-14", invoiceIds: ["so-003"], cashBoxId: "bx-rp-02", status: "approved", notes: "تحويل بنكي — الأهلي" },
  { id: "col-004", number: "RC-2026-0409", customerId: "c-015", repId: "u-rp-04", amount: 2600, method: "cash", date: "2026-08-14", invoiceIds: ["so-005"], cashBoxId: "bx-rp-04", status: "approved" },
  { id: "col-005", number: "RC-2026-0408", customerId: "c-029", repId: "u-rp-04", amount: 1280, method: "pos", date: "2026-08-14", invoiceIds: ["so-006"], cashBoxId: "bx-rp-04", status: "approved" },
  { id: "col-006", number: "RC-2026-0407", customerId: "c-005", repId: "u-rp-03", amount: 8000, method: "cash", date: "2026-08-13", invoiceIds: ["so-007"], cashBoxId: "bx-rp-03", status: "approved" },
  { id: "col-007", number: "RC-2026-0406", customerId: "c-023", repId: "u-rp-04", amount: 4000, method: "check", date: "2026-08-13", invoiceIds: ["so-009"], cashBoxId: "bx-rp-04", status: "pending", notes: "شيك آجل 30 يوم" },
  { id: "col-008", number: "RC-2026-0405", customerId: "c-012", repId: "u-rp-01", amount: 9000, method: "transfer", date: "2026-08-13", invoiceIds: ["so-010"], cashBoxId: "bx-rp-01", status: "approved" },
  { id: "col-009", number: "RC-2026-0404", customerId: "c-019", repId: "u-rp-05", amount: 3500, method: "cash", date: "2026-08-12", invoiceIds: ["so-012"], cashBoxId: "bx-rp-05", status: "approved" },
  { id: "col-010", number: "RC-2026-0403", customerId: "c-016", repId: "u-rp-05", amount: 3000, method: "transfer", date: "2026-08-11", invoiceIds: ["so-011"], cashBoxId: "bx-rp-05", status: "approved" },
  { id: "col-011", number: "RC-2026-0402", customerId: "c-017", repId: "u-rp-05", amount: 6000, method: "cash", date: "2026-08-10", invoiceIds: ["so-013"], cashBoxId: "bx-rp-05", status: "approved", notes: "تسوية جزئية" },
  { id: "col-012", number: "RC-2026-0401", customerId: "c-010", repId: "u-rp-01", amount: 750, method: "cash", date: "2026-08-09", invoiceIds: ["so-015"], cashBoxId: "bx-rp-01", status: "approved" },
  { id: "col-013", number: "RC-2026-0400", customerId: "c-024", repId: "u-rp-02", amount: 15000, method: "transfer", date: "2026-08-09", invoiceIds: ["so-016"], cashBoxId: "bx-rp-02", status: "approved" },
  { id: "col-014", number: "RC-2026-0399", customerId: "c-014", repId: "u-rp-01", amount: 3000, method: "cash", date: "2026-08-09", invoiceIds: ["so-017"], cashBoxId: "bx-rp-01", status: "approved" },
  { id: "col-015", number: "RC-2026-0398", customerId: "c-002", repId: "u-rp-01", amount: 12000, method: "transfer", date: "2026-08-08", invoiceIds: ["so-021"], cashBoxId: "bx-rp-01", status: "approved" },
  { id: "col-016", number: "RC-2026-0397", customerId: "c-004", repId: "u-rp-02", amount: 2000, method: "cash", date: "2026-08-07", invoiceIds: ["so-022"], cashBoxId: "bx-rp-02", status: "approved" },
  { id: "col-017", number: "RC-2026-0396", customerId: "c-007", repId: "u-rp-04", amount: 5000, method: "transfer", date: "2026-08-06", invoiceIds: ["so-023"], cashBoxId: "bx-rp-04", status: "approved" },
  { id: "col-018", number: "RC-2026-0395", customerId: "c-025", repId: "u-rp-03", amount: 900, method: "pos", date: "2026-08-06", invoiceIds: ["so-024"], cashBoxId: "bx-rp-03", status: "approved" },
  { id: "col-019", number: "RC-2026-0394", customerId: "c-001", repId: "u-rp-01", amount: 6000, method: "transfer", date: "2026-08-06", invoiceIds: ["so-025"], cashBoxId: "bx-rp-01", status: "approved" },
  { id: "col-020", number: "RC-2026-0393", customerId: "c-008", repId: "u-rp-04", amount: 320, method: "cash", date: "2026-08-05", invoiceIds: ["so-026"], cashBoxId: "bx-rp-04", status: "approved" },
  { id: "col-021", number: "RC-2026-0392", customerId: "c-020", repId: "u-rp-06", amount: 1350, method: "cash", date: "2026-08-03", invoiceIds: ["so-030"], cashBoxId: "bx-rp-06", status: "rejected", notes: "المبلغ أكبر من الرصيد المستحق" },
  { id: "col-022", number: "RC-2026-0391", customerId: "c-030", repId: "u-rp-06", amount: 4000, method: "cash", date: "2026-08-08", invoiceIds: ["so-018"], cashBoxId: "bx-rp-06", status: "approved" },
];

export const collectionsByRep = (repId: string) =>
  collections.filter((c) => c.repId === repId).sort((a, b) => b.date.localeCompare(a.date));

export const todayCollections = () => collections.filter((c) => c.date === "2026-08-14");
export const todayCollectionTotal = () => todayCollections().reduce((s, c) => s + c.amount, 0);