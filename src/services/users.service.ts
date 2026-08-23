/**
 * Users Transaction Service — user creation with audit.
 */
import { addAuditLog, genAuditId } from "@/store/transactions";

interface UserInput {
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface UserResult {
  success: boolean;
  userId?: string;
  reason?: string;
}

export function createUser(input: UserInput, actor: { id: string }): UserResult {
  const id = `usr-${Date.now()}`;
  const newUser = { id, ...input, status: "active" as const };
  addAuditLog({
    id: genAuditId(),
    actor: actor.id,
    action: "user.created",
    entity: "user",
    entityId: id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify(newUser),
  });
  return { success: true, userId: id };
}
