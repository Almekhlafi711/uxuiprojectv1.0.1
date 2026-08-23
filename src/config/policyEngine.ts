import { organizationConfig } from "./organizationConfig";

export function shouldRequireDailyClosing(): boolean {
  return organizationConfig.dailyClosing === "required";
}

export function shouldRequireCashClosing(): boolean {
  return organizationConfig.cashClosing === "required";
}

export function shouldRequirePhysicalCount(): boolean {
  return organizationConfig.physicalCount === "every_day";
}

export function needsLoadingApproval(): boolean {
  return (organizationConfig.loadingApproval as string) !== "auto";
}

export function needsStockRequestApproval(): boolean {
  return (organizationConfig.stockRequestApproval as string) !== "auto";
}

export function needsReceiverApproval(): boolean {
  return organizationConfig.transferReceiving === "receiver_approval";
}

export function needsReturnInspection(): boolean {
  return organizationConfig.returnInspection === "required";
}

export function getMaxCashBoxBalance(): number {
  return organizationConfig.maxCashBoxBalance;
}

export function getMaxDiscountWithoutApproval(): number {
  return organizationConfig.maxDiscountWithoutApproval;
}

export function getMaxCreditLimit(): number {
  return organizationConfig.maxCreditLimit;
}

export function isStockCarryForward(): boolean {
  return organizationConfig.stockCarryForward === "allowed";
}

export function isVehicleFixed(): boolean {
  return organizationConfig.vehicleAssignment === "fixed";
}
