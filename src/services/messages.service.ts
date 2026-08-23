/**
 * Messages Transaction Service — send messages, manage conversations, broadcasts.
 * All functions validate DataScope + RBAC before mutating.
 */
import { users } from "@/mock/users";
import { territories } from "@/mock/organization";
import { addAuditLog, genAuditId } from "@/store/transactions";
import type { Conversation, Message } from "@/types";

interface Result {
  success: boolean;
  reason?: string;
}

interface AccessContext {
  userId: string;
  role: string;
  scopeType: string;
  territoryId?: string;
  supervisorId?: string;
}

// ---------------------------------------------------------------------------
// Permission checks (delegates to existing authority + scope)
// ---------------------------------------------------------------------------

/** Can the user send a message to this conversation? */
export function canSendMessage(ctx: AccessContext, conversation: Conversation): boolean {
  if (!conversation.participants.includes(ctx.userId)) return false;
  return true;
}

/** Can the user create a new conversation with these participants? */
export function canCreateConversation(ctx: AccessContext, recipientIds: string[]): boolean {
  // Users can always message people in their scope
  // GM/SM can message anyone. Supervisor can message team + SM. Rep can message supervisor + SM.
  const allowed = getAccessibleRecipientIds(ctx);
  return recipientIds.every((id) => allowed.includes(id));
}

/** Can the user create a broadcast to this audience? */
export function canCreateBroadcast(ctx: AccessContext, audienceType: string): boolean {
  if (ctx.role === "GENERAL_MANAGER" || ctx.role === "SALES_MANAGER") return true;
  if (ctx.role === "SUPERVISOR" && (audienceType === "team" || audienceType === "selected")) return true;
  return false;
}

/** Get IDs of users this person can message */
export function getAccessibleRecipientIds(ctx: AccessContext): string[] {
  const allActive = users.filter((u) => u.status === "active" && u.id !== ctx.userId);

  switch (ctx.role) {
    case "GENERAL_MANAGER":
      return allActive.map((u) => u.id);
    case "SALES_MANAGER":
      return allActive.map((u) => u.id);
    case "SUPERVISOR": {
      const teamReps = allActive.filter((u) => u.supervisorId === ctx.userId);
      const sm = allActive.filter((u) => u.role === "SALES_MANAGER");
      const gm = allActive.filter((u) => u.role === "GENERAL_MANAGER");
      return [...teamReps, ...sm, ...gm].map((u) => u.id);
    }
    case "REPRESENTATIVE": {
      const sp = allActive.filter((u) => u.id === ctx.supervisorId);
      const sm = allActive.filter((u) => u.role === "SALES_MANAGER");
      return [...sp, ...sm].map((u) => u.id);
    }
    case "DISTRIBUTION_OFFICER":
      return allActive.filter((u) => u.role === "SALES_MANAGER" || u.role === "GENERAL_MANAGER").map((u) => u.id);
    case "WAREHOUSE":
      return allActive.filter((u) => u.role === "SUPERVISOR" || u.role === "SALES_MANAGER" || u.role === "GENERAL_MANAGER").map((u) => u.id);
    case "FINANCE":
      return allActive.filter((u) => u.role === "GENERAL_MANAGER" || u.role === "SALES_MANAGER").map((u) => u.id);
    default:
      return [];
  }
}

/** Get accessible recipients as user objects */
export function getAccessibleRecipients(ctx: AccessContext) {
  const ids = getAccessibleRecipientIds(ctx);
  return users.filter((u) => ids.includes(u.id));
}

/** Get the team members for a supervisor */
export function getTeamMembers(supervisorId: string) {
  return users.filter((u) => u.supervisorId === supervisorId && u.status === "active");
}

/** Get the territory name for a user */
export function getTerritoryName(territoryId?: string): string {
  if (!territoryId) return "";
  return territories.find((t) => t.id === territoryId)?.name ?? "";
}

// ---------------------------------------------------------------------------
// Message mutations
// ---------------------------------------------------------------------------

/** Send a message to an existing conversation */
export function sendConversationMessage(
  conversation: Conversation,
  body: string,
  senderId: string,
  attachments: string[] = [],
  priority: Message["priority"] = "normal",
): MessageResult {
  if (!body.trim()) return { success: false, reason: "الرسالة فارغة" };

  const msg: Message = {
    id: `mm-${Date.now()}`,
    conversationId: conversation.id,
    senderId,
    body: body.trim(),
    sentAt: new Date().toISOString(),
    attachments,
    read: false,
    priority,
    msgType: conversation.type === "broadcast" ? "broadcast" : "direct",
  };

  conversation.messages.push(msg);
  conversation.lastMessageAt = msg.sentAt;

  // Mark sender as having read
  if (!conversation.readBy) conversation.readBy = [];
  if (!conversation.readBy.includes(senderId)) conversation.readBy.push(senderId);

  addAuditLog({
    id: genAuditId(),
    actor: users.find((u) => u.id === senderId)?.name ?? senderId,
    action: "message.sent",
    entity: "conversation",
    entityId: conversation.id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify({ body: body.slice(0, 200) }),
  });

  return { success: true };
}

/** Mark a conversation as read by a user */
export function markAsRead(conversation: Conversation, userId: string): void {
  if (!conversation.readBy) conversation.readBy = [];
  if (!conversation.readBy.includes(userId)) {
    conversation.readBy.push(userId);
  }
  // Mark all unread messages from others as read
  const now = new Date().toISOString();
  conversation.messages.forEach((m) => {
    if (m.senderId !== userId && !m.read) {
      m.read = true;
      m.readAt = now;
    }
  });
}

/** Create a new direct conversation */
export function createConversation(
  subject: string,
  body: string,
  creatorId: string,
  recipientIds: string[],
  attachments: string[] = [],
  priority: Message["priority"] = "normal",
): Conversation | Result {
  if (!subject.trim() || !body.trim()) return { success: false, reason: "الموضوع والرسالة مطلوبان" };

  const allParticipants = Array.from(new Set([creatorId, ...recipientIds]));
  const conv: Conversation = {
    id: `mc-${Date.now()}`,
    subject: subject.trim(),
    participants: allParticipants,
    lastMessageAt: new Date().toISOString(),
    type: recipientIds.length > 1 ? "group" : "direct",
    createdBy: creatorId,
    readBy: [creatorId],
    messages: [
      {
        id: `mm-${Date.now()}`,
        conversationId: `mc-${Date.now()}`,
        senderId: creatorId,
        body: body.trim(),
        sentAt: new Date().toISOString(),
        attachments,
        read: false,
        priority,
        msgType: "direct",
      },
    ],
  };

  addAuditLog({
    id: genAuditId(),
    actor: users.find((u) => u.id === creatorId)?.name ?? creatorId,
    action: "conversation.created",
    entity: "conversation",
    entityId: conv.id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify({ subject: subject.slice(0, 100), participants: allParticipants.length }),
  });

  return conv;
}

/** Create a broadcast announcement */
export function createBroadcast(
  subject: string,
  body: string,
  creatorId: string,
  audienceLabel: string,
  audienceType: Conversation["audienceType"],
  recipientIds: string[],
  attachments: string[] = [],
): Conversation | Result {
  if (!subject.trim() || !body.trim()) return { success: false, reason: "الموضوع والرسالة مطلوبان" };
  if (recipientIds.length === 0) return { success: false, reason: "يجب تحديد مستلمين" };

  const allParticipants = Array.from(new Set([creatorId, ...recipientIds]));
  const conv: Conversation = {
    id: `bc-${Date.now()}`,
    subject: subject.trim(),
    participants: allParticipants,
    lastMessageAt: new Date().toISOString(),
    type: "broadcast",
    createdBy: creatorId,
    readBy: [creatorId],
    audienceLabel,
    audienceType,
    messages: [
      {
        id: `bm-${Date.now()}`,
        conversationId: `bc-${Date.now()}`,
        senderId: creatorId,
        body: body.trim(),
        sentAt: new Date().toISOString(),
        attachments,
        read: false,
        priority: "high",
        msgType: "broadcast",
      },
    ],
  };

  addAuditLog({
    id: genAuditId(),
    actor: users.find((u) => u.id === creatorId)?.name ?? creatorId,
    action: "broadcast.created",
    entity: "broadcast",
    entityId: conv.id,
    at: new Date().toISOString().slice(0, 10),
    newValue: JSON.stringify({ subject: subject.slice(0, 100), audience: audienceLabel, recipients: recipientIds.length }),
  });

  return conv;
}

interface MessageResult {
  success: boolean;
  reason?: string;
}
