/**
 * Settings Transaction Service — save system settings with audit.
 */
import { addAuditLog, genAuditId } from "@/store/transactions";

interface SettingsResult {
  success: boolean;
  reason?: string;
}

export function updateSettings(_settings: Record<string, unknown>, actor: { id: string }): SettingsResult {
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "settings.updated",
    entity: "settings",
    entityId: "system",
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify(_settings),
  });
  return { success: true };
}
