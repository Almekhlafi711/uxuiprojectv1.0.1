export interface OrganizationConfig {
  stockResponsibility: "representative" | "vehicle" | "both";
  vehicleAssignment: "fixed" | "temporary" | "optional";
  stockCarryForward: "allowed" | "not_allowed";
  dailyClosing: "required" | "optional" | "periodic";
  cashClosing: "required" | "optional";
  physicalCount: "every_day" | "periodic" | "on_exception";
  loadingApproval: "supervisor" | "warehouse" | "sales_manager" | "multi_level";
  stockRequestApproval: "supervisor" | "warehouse" | "sales_manager";
  transferReceiving: "receiver_approval" | "auto_receive";
  returnInspection: "required" | "optional";
  maxCashBoxBalance: number;
  maxDiscountWithoutApproval: number;
  maxCreditLimit: number;
}

const STORAGE_KEY = "erp-org-config";

const defaults: OrganizationConfig = {
  stockResponsibility: "representative",
  vehicleAssignment: "fixed",
  stockCarryForward: "allowed",
  dailyClosing: "required",
  cashClosing: "required",
  physicalCount: "every_day",
  loadingApproval: "supervisor",
  stockRequestApproval: "supervisor",
  transferReceiving: "receiver_approval",
  returnInspection: "required",
  maxCashBoxBalance: 50000,
  maxDiscountWithoutApproval: 1000,
  maxCreditLimit: 100000,
};

function loadConfig(): OrganizationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaults;
}

function saveConfig(config: OrganizationConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function resetConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export const organizationConfig = loadConfig();
export { saveConfig, resetConfig };
