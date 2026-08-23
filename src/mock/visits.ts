import type { Visit } from "@/types";

export const visits: Visit[] = [
  { id: "v-001", customerId: "c-001", repId: "u-rp-01", date: "2026-08-14", planned: true, checkInAt: "08:15", checkOutAt: "08:50", result: "completed", outcome: "بيع + تحصيل", notes: "طلب إضافي الشهر القادم", salesOrderId: "so-001", collectionId: "col-001", lat: 24.835, lng: 46.62, distanceFromRoute: 0.2 },
  { id: "v-002", customerId: "c-003", repId: "u-rp-02", date: "2026-08-14", planned: true, checkInAt: "08:30", checkOutAt: "09:05", result: "completed", outcome: "بيع نقدي", salesOrderId: "so-002", collectionId: "col-002", lat: 24.705, lng: 46.675, distanceFromRoute: 0.1 },
  { id: "v-003", customerId: "c-013", repId: "u-rp-02", date: "2026-08-14", planned: true, checkInAt: "09:40", checkOutAt: "10:10", result: "completed", outcome: "بيع نقدي", salesOrderId: "so-004", lat: 24.845, lng: 46.64, distanceFromRoute: 0.4 },
  { id: "v-004", customerId: "c-024", repId: "u-rp-02", date: "2026-08-14", planned: true, checkInAt: "10:45", checkOutAt: "11:30", result: "completed", outcome: "بيع آجل + تحصيل جزئي", salesOrderId: "so-003", collectionId: "col-003", lat: 24.855, lng: 46.6, distanceFromRoute: 0.3 },
  { id: "v-005", customerId: "c-015", repId: "u-rp-04", date: "2026-08-14", planned: true, checkInAt: "08:20", checkOutAt: "08:55", result: "completed", outcome: "بيع آجل + تحصيل", salesOrderId: "so-005", collectionId: "col-004", lat: 24.56, lng: 46.63, distanceFromRoute: 0.15 },
  { id: "v-006", customerId: "c-029", repId: "u-rp-04", date: "2026-08-14", planned: true, checkInAt: "09:15", checkOutAt: "09:30", result: "completed", outcome: "بيع نقدي", salesOrderId: "so-006", collectionId: "col-005", lat: 24.61, lng: 46.66, distanceFromRoute: 0.05 },
  { id: "v-007", customerId: "c-026", repId: "u-rp-01", date: "2026-08-14", planned: true, checkInAt: undefined, checkOutAt: undefined, result: "not_found", outcome: "المحل مغلق", notes: "إعادة الزيارة غداً", lat: 24.92, lng: 46.5, distanceFromRoute: 0.0 },
  { id: "v-008", customerId: "c-007", repId: "u-rp-04", date: "2026-08-13", planned: true, checkInAt: "08:10", checkOutAt: "09:00", result: "completed", outcome: "بيع آجل", salesOrderId: "so-023", lat: 24.582, lng: 46.71, distanceFromRoute: 0.0 },
  { id: "v-009", customerId: "c-005", repId: "u-rp-03", date: "2026-08-13", planned: true, checkInAt: "08:00", checkOutAt: "09:15", result: "completed", outcome: "بيع آجل + تحصيل جزئي", salesOrderId: "so-007", collectionId: "col-006", lat: 24.694, lng: 46.707, distanceFromRoute: 0.1 },
  { id: "v-010", customerId: "c-006", repId: "u-rp-03", date: "2026-08-13", planned: true, checkInAt: "09:45", checkOutAt: "10:20", result: "completed", outcome: "بيع نقدي", salesOrderId: "so-008", lat: 24.676, lng: 46.68, distanceFromRoute: 0.2 },
  { id: "v-011", customerId: "c-012", repId: "u-rp-01", date: "2026-08-13", planned: true, checkInAt: "08:30", checkOutAt: "09:40", result: "completed", outcome: "بيع آجل", salesOrderId: "so-010", collectionId: "col-008", lat: 24.88, lng: 46.58, distanceFromRoute: 0.3 },
  { id: "v-012", customerId: "c-023", repId: "u-rp-04", date: "2026-08-13", planned: true, checkInAt: "10:05", checkOutAt: "10:40", result: "completed", outcome: "بيع آجل + تحصيل بشيك", salesOrderId: "so-009", collectionId: "col-007", lat: 24.73, lng: 46.6, distanceFromRoute: 0.1 },
  { id: "v-013", customerId: "c-017", repId: "u-rp-05", date: "2026-08-12", planned: true, checkInAt: "08:00", checkOutAt: "09:10", result: "completed", outcome: "بيع آجل + تحصيل جزئي", salesOrderId: "so-013", collectionId: "col-011", lat: 21.607, lng: 39.119, distanceFromRoute: 0.0 },
  { id: "v-014", customerId: "c-019", repId: "u-rp-05", date: "2026-08-12", planned: true, checkInAt: "09:40", checkOutAt: "10:30", result: "completed", outcome: "بيع آجل + تحصيل", salesOrderId: "so-012", collectionId: "col-009", lat: 21.66, lng: 39.13, distanceFromRoute: 0.4 },
  { id: "v-015", customerId: "c-016", repId: "u-rp-05", date: "2026-08-12", planned: true, checkInAt: "11:00", checkOutAt: "11:20", result: "completed", outcome: "تحصيل فقط", collectionId: "col-010", lat: 21.543, lng: 39.172, distanceFromRoute: 0.2 },
  { id: "v-016", customerId: "c-031", repId: "u-rp-01", date: "2026-08-14", planned: false, checkInAt: "12:10", checkOutAt: "12:40", result: "visited", outcome: "زيارة عميل مستهدف — عرض أسعار", notes: "تم تقديم العرض، متابعة الأسبوع القادم", lat: 24.84, lng: 46.58, distanceFromRoute: 1.2 },
  { id: "v-017", customerId: "c-018", repId: "u-rp-05", date: "2026-08-13", planned: true, checkInAt: "08:15", checkOutAt: "08:40", result: "completed", outcome: "بيع نقدي", lat: 21.51, lng: 39.18, distanceFromRoute: 0.0 },
  { id: "v-018", customerId: "c-009", repId: "u-rp-03", date: "2026-08-12", planned: true, checkInAt: "08:20", checkOutAt: "09:00", result: "no_sale", outcome: "لا يوجد طلب", lat: 24.85, lng: 46.62, distanceFromRoute: 0.2 },
];

export const visitsByRep = (repId: string) =>
  visits.filter((v) => v.repId === repId).sort((a, b) => b.date.localeCompare(a.date));
export const visitsByCustomer = (customerId: string) =>
  visits.filter((v) => v.customerId === customerId).sort((a, b) => b.date.localeCompare(a.date));
export const todayVisits = () => visits.filter((v) => v.date === "2026-08-14");

export const visitResultLabels: Record<Visit["result"], string> = {
  visited: "تمت الزيارة",
  not_found: "غير موجود",
  closed: "المحل مغلق",
  no_sale: "بدون بيع",
  completed: "مكتملة",
};