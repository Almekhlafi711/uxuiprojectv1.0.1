/**
 * Audit Service — query-only layer over audit logs.
 *
 * Audit LOGGING is done by each transaction service (sales, collections,
 * returns, transfers) via addAuditLog in the transactions store.
 *
 * This service provides QUERY functions for reporting/display.
 * It reads from both seed mock audit logs and new transaction audit logs.
 */
import { newAuditLogs } from "@/store/transactions";
import type { AuditLog } from "@/types";

/**
 * Get all audit logs (seed + new transactions), newest first.
 */
export const getAllAuditLogs = (): AuditLog[] => {
  return [...newAuditLogs()].sort((a, b) => b.at.localeCompare(a.at));
};

/**
 * Get audit logs for a specific entity type (e.g. "invoice", "return").
 */
export const getAuditLogsByEntity = (entity: string): AuditLog[] => {
  return getAllAuditLogs().filter((l) => l.entity === entity);
};

/**
 * Get audit logs for a specific entity instance.
 */
export const getAuditLogsByEntityId = (entity: string, entityId: string): AuditLog[] => {
  return getAllAuditLogs().filter((l) => l.entity === entity && l.entityId === entityId);
};

/**
 * Get audit logs by actor (user).
 */
export const getAuditLogsByActor = (actorId: string): AuditLog[] => {
  return getAllAuditLogs().filter((l) => l.actor === actorId);
};

/**
 * Get audit logs within a date range.
 */
export const getAuditLogsByDateRange = (from: string, to: string): AuditLog[] => {
  return getAllAuditLogs().filter((l) => l.at >= from && l.at <= to);
};
