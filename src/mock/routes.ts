import type { RoutePlan } from "@/types";
import { customers } from "./customers";

const territoryCustomers = (territoryId: string) =>
  customers
    .filter((c) => c.territoryId === territoryId && c.status === "active")
    .map((c, i) => ({ customerId: c.id, order: i + 1, visitDays: [1, 3, 5] }));

export const routePlans: RoutePlan[] = [
  {
    id: "rp-001",
    name: "خطة سير أحمد — شمال الرياض (أ)",
    territoryId: "t-01",
    repId: "u-rp-01",
    visitDays: [1, 3, 5],
    status: "approved",
    approvedBy: "سالم الهاجري",
    createdAt: "2026-07-28",
    customers: [
      { customerId: "c-001", order: 1, visitDays: [1, 3, 5] },
      { customerId: "c-002", order: 2, visitDays: [1, 3, 5] },
      { customerId: "c-010", order: 3, visitDays: [2, 4] },
      { customerId: "c-012", order: 4, visitDays: [1, 3] },
      { customerId: "c-014", order: 5, visitDays: [2, 5] },
      { customerId: "c-024", order: 6, visitDays: [1, 4] },
      { customerId: "c-026", order: 7, visitDays: [3, 6] },
      { customerId: "c-028", order: 8, visitDays: [2, 4, 6] },
    ],
  },
  {
    id: "rp-002",
    name: "خطة سير محمد — شمال الرياض (ب)",
    territoryId: "t-01",
    repId: "u-rp-02",
    visitDays: [1, 2, 4, 6],
    status: "approved",
    approvedBy: "سالم الهاجري",
    createdAt: "2026-07-28",
    customers: [
      { customerId: "c-003", order: 1, visitDays: [1, 2, 4, 6] },
      { customerId: "c-004", order: 2, visitDays: [2, 5] },
      { customerId: "c-013", order: 3, visitDays: [1, 3] },
      { customerId: "c-024", order: 4, visitDays: [1, 4] },
    ],
  },
  {
    id: "rp-003",
    name: "خطة سير عبدالرحمن — جنوب الرياض (أ)",
    territoryId: "t-02",
    repId: "u-rp-03",
    visitDays: [1, 2, 3, 4, 5, 6],
    status: "under_review",
    createdAt: "2026-07-30",
    customers: [
      { customerId: "c-005", order: 1, visitDays: [1, 3, 5] },
      { customerId: "c-006", order: 2, visitDays: [2, 4, 6] },
      { customerId: "c-009", order: 3, visitDays: [1, 4] },
      { customerId: "c-025", order: 4, visitDays: [3, 6] },
      { customerId: "c-032", order: 5, visitDays: [2] },
    ],
  },
  {
    id: "rp-004",
    name: "خطة سير يوسف — جنوب الرياض (ب)",
    territoryId: "t-02",
    repId: "u-rp-04",
    visitDays: [1, 2, 3, 4, 5, 6],
    status: "approved",
    approvedBy: "ناصر القحطاني",
    createdAt: "2026-07-25",
    customers: [
      { customerId: "c-007", order: 1, visitDays: [1, 3, 5] },
      { customerId: "c-008", order: 2, visitDays: [2, 4, 6] },
      { customerId: "c-015", order: 3, visitDays: [1, 4] },
      { customerId: "c-023", order: 4, visitDays: [2, 5] },
      { customerId: "c-029", order: 5, visitDays: [3, 6] },
    ],
  },
  {
    id: "rp-005",
    name: "خطة سير سعد — جدة (أ)",
    territoryId: "t-04",
    repId: "u-rp-05",
    visitDays: [1, 2, 3, 4, 5, 6],
    status: "approved",
    approvedBy: "ماجد خالد الشمري",
    createdAt: "2026-07-27",
    customers: [
      { customerId: "c-016", order: 1, visitDays: [1, 3, 5] },
      { customerId: "c-017", order: 2, visitDays: [1, 4] },
      { customerId: "c-018", order: 3, visitDays: [2, 5] },
      { customerId: "c-020", order: 4, visitDays: [3, 6] },
      { customerId: "c-022", order: 5, visitDays: [1, 4] },
      { customerId: "c-030", order: 6, visitDays: [2, 5] },
    ],
  },
  {
    id: "rp-006",
    name: "خطة سير بندر — جدة (ب)",
    territoryId: "t-04",
    repId: "u-rp-06",
    visitDays: [1, 3, 5],
    status: "draft",
    createdAt: "2026-08-02",
    customers: territoryCustomers("t-04").slice(0, 3),
  },
];

export const routeById = (id: string) => routePlans.find((r) => r.id === id);
export const routeByRep = (repId: string) => routePlans.filter((r) => r.repId === repId);