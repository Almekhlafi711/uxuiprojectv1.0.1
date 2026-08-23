import type { Branch, Territory, CostCenter, Team, Distributor, DistributorOfficer } from "@/types";

export const branches: Branch[] = [
  { id: "b-01", name: "الفرع الرئيسي — الرياض", city: "الرياض", managerId: "u-sm-01" },
  { id: "b-02", name: "فرع جدة", city: "جدة", managerId: "u-sm-01" },
  { id: "b-03", name: "فرع الدمام", city: "الدمام", managerId: "u-sm-01" },
];

export const territories: Territory[] = [
  { id: "t-01", name: "شمال الرياض", branchId: "b-01", supervisorId: "u-sp-01", repIds: ["u-rp-01", "u-rp-02", "u-rp-07"], customerCount: 148 },
  { id: "t-02", name: "جنوب الرياض", branchId: "b-01", supervisorId: "u-sp-02", repIds: ["u-rp-03", "u-rp-04"], customerCount: 132 },
  { id: "t-03", name: "شرق الرياض", branchId: "b-01", supervisorId: "u-sp-01", repIds: ["u-rp-07"], customerCount: 96 },
  { id: "t-04", name: "وسط جدة", branchId: "b-02", supervisorId: "u-sp-03", repIds: ["u-rp-05", "u-rp-06"], customerCount: 121 },
  { id: "t-05", name: "شمال جدة", branchId: "b-02", supervisorId: "u-sp-03", repIds: ["u-rp-05"], customerCount: 88 },
];

export const costCenters: CostCenter[] = [
  { id: "cc-01", name: "مركز تكلفة الرياض الشمالي", branchId: "b-01", code: "CC-RYD-N" },
  { id: "cc-02", name: "مركز تكلفة الرياض الجنوبي", branchId: "b-01", code: "CC-RYD-S" },
  { id: "cc-03", name: "مركز تكلفة جدة", branchId: "b-02", code: "CC-JED" },
  { id: "cc-04", name: "مركز تكلفة الدمام", branchId: "b-03", code: "CC-DMM" },
];

export const teams: Team[] = [
  { id: "team-01", name: "فريق الرياض الشمالي", supervisorId: "u-sp-01", territoryIds: ["t-01", "t-03"], repIds: ["u-rp-01", "u-rp-02", "u-rp-07"] },
  { id: "team-02", name: "فريق الرياض الجنوبي", supervisorId: "u-sp-02", territoryIds: ["t-02"], repIds: ["u-rp-03", "u-rp-04"] },
  { id: "team-03", name: "فريق جدة", supervisorId: "u-sp-03", territoryIds: ["t-04", "t-05"], repIds: ["u-rp-05", "u-rp-06"] },
];

export const distributors: Distributor[] = [
  { id: "d-01", name: "مؤسسة الصافي للتوزيع", territoryIds: ["t-01", "t-02"] },
  { id: "d-02", name: "شركة الوفاق للمواد الغذائية", territoryIds: ["t-03"] },
  { id: "d-03", name: "مؤسسة بركة التوزيع", territoryIds: ["t-04", "t-05"] },
];

export const distributorOfficers: DistributorOfficer[] = [
  { id: "do-01", name: "عبدالله إبراهيم الخالدي", distributorIds: ["d-01"] },
  { id: "do-02", name: "طارق يوسف الحربي", distributorIds: ["d-02"] },
  { id: "do-03", name: "سلمان ناصر العوفي", distributorIds: ["d-03"] },
  { id: "do-04", name: "راكان ماجد العنزي", distributorIds: ["d-01", "d-02"] },
];