import type { GpsLocation } from "@/types";
import { reps, supervisors } from "./users";

export const gpsLocations: GpsLocation[] = [
  { userId: "u-rp-01", lat: 24.842, lng: 46.624, updatedAt: "2026-08-14T10:32:15", speed: 18 },
  { userId: "u-rp-02", lat: 24.855, lng: 46.602, updatedAt: "2026-08-14T10:30:00", speed: 0 },
  { userId: "u-rp-07", lat: 24.810, lng: 46.650, updatedAt: "2026-08-14T08:15:00", speed: 0 }, // Offline (>30m)
  { userId: "u-rp-03", lat: 24.694, lng: 46.707, updatedAt: "2026-08-14T10:28:00", speed: 12 },
  { userId: "u-rp-04", lat: 24.610, lng: 46.660, updatedAt: "2026-08-14T10:25:00", speed: 25 },
  { userId: "u-rp-05", lat: 21.602, lng: 39.121, updatedAt: "2026-08-14T10:20:00", speed: 0 },
  { userId: "u-rp-06", lat: 21.560, lng: 39.150, updatedAt: "2026-08-13T17:15:00", speed: 0 }, // Suspended
  { userId: "u-sp-01", lat: 24.850, lng: 46.630, updatedAt: "2026-08-14T10:15:00", speed: 0 },
  { userId: "u-sp-02", lat: 24.660, lng: 46.680, updatedAt: "2026-08-14T10:10:00", speed: 0 },
  { userId: "u-sp-03", lat: 21.580, lng: 39.160, updatedAt: "2026-08-14T09:45:00", speed: 0 },
];

export const gpsByUser = (userId: string) => gpsLocations.find((g) => g.userId === userId);

export const routeDeviation = [
  { userId: "u-rp-01", deviationKm: 0.1, status: "on_route", lastCheck: "10:32", locationName: "حي النخيل - شارع التخصصي" },
  { userId: "u-rp-02", deviationKm: 1.6, status: "deviation", lastCheck: "10:30", locationName: "طريق الملك فهد (انحراف 1.6 كم عن المسار المخطط)" },
  { userId: "u-rp-07", deviationKm: 0.0, status: "offline", lastCheck: "08:15", locationName: "حي المروج (آخر إشارة قبل ساعتين)" },
  { userId: "u-rp-03", deviationKm: 2.8, status: "deviation", lastCheck: "10:28", locationName: "حي الملز" },
  { userId: "u-rp-04", deviationKm: 0.0, status: "on_route", lastCheck: "10:25", locationName: "حي السويدي" },
  { userId: "u-rp-05", deviationKm: 0.1, status: "on_route", lastCheck: "10:20", locationName: "حي الصفا" },
  { userId: "u-rp-06", deviationKm: 5.4, status: "offline", lastCheck: "17:15", locationName: "غير نشط (مندوب موقوف)" },
];

export const userByIdForGps = (id: string) => [...reps, ...supervisors].find((u) => u.id === id);
