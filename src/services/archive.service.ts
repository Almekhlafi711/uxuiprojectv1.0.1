/**
 * Archive Transaction Service — lock/unlock/approve archive documents.
 */
import { addAuditLog, genAuditId } from "@/store/transactions";

interface ArchiveResult {
  success: boolean;
  reason?: string;
}

export function lockArchive(docId: string, actor: { id: string }): ArchiveResult {
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "archive.locked",
    entity: "archive",
    entityId: docId,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify({ status: "locked" }),
  });
  return { success: true };
}

export function unlockArchive(docId: string, actor: { id: string }): ArchiveResult {
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "archive.unlocked",
    entity: "archive",
    entityId: docId,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify({ status: "unlocked" }),
  });
  return { success: true };
}

export function approveArchive(docId: string, actor: { id: string }): ArchiveResult {
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "archive.approved",
    entity: "archive",
    entityId: docId,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify({ status: "approved" }),
  });
  return { success: true };
}
