# MESSAGING_MODULE_AUDIT.md

## Date: 2026-08-21
## Status: ✅ COMPLETE

---

## 1. Architecture Summary

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/types/index.ts` | Extended | +15 fields |
| `src/mock/messaging.ts` | Created | 296 lines |
| `src/services/messages.service.ts` | Rewritten | 242 lines |
| `src/services/mockApi.ts` | Extended | +140 lines |
| `src/modules/messages/MessagesPage.tsx` | Rewritten | ~535 lines |

### Architecture Decisions

1. **No new permissions** — Uses existing `messages.view` permission (all roles except SYSTEM_ADMIN)
2. **No layout changes** — Works inside existing AppLayout; three-column is within the page content area
3. **No social-media styling** — Enterprise ERP design with standard cards, badges, inputs
4. **All data from mock/services** — Zero hardcoded data in components
5. **RBAC+DataScope enforced** — `getAccessibleRecipients()` respects role hierarchy
6. **Broadcast recipients from scope only** — Supervisors see team, SM sees all, GM sees all

---

## 2. Type Extensions

### Conversation (existing, extended)
- `type?: "direct" | "group" | "broadcast"` — Conversation classification
- `createdBy?: string` — Creator user ID
- `readBy?: string[]` — Users who read the last message
- `audienceLabel?: string` — Broadcast audience description
- `audienceType?: "team" | "territory" | "branch" | "all_reps" | "selected" | "department"`

### Message (existing, extended)
- `read?: boolean` — Read status
- `readAt?: string` — Read timestamp
- `priority?: "normal" | "high" | "urgent"` — Message priority
- `msgType?: "direct" | "broadcast" | "system"` — Message classification
- `systemEvent?: string` — System message event

---

## 3. Mock Data

### Conversations (12 total)
- 6 direct 1:1 conversations (rp↔sp, rp↔sm, do↔sm)
- 3 group conversations (sp↔rp↔rp, sm↔sp↔rp, acc↔gm↔sm)
- 1 stock request group (rp↔wh↔sp)
- 1 leave request group (rp↔sp↔gm)

### Broadcasts (4 total)
- SM→All: New discount policy
- GM→All: Working hours update
- Supervisor→Team: Weekly meeting
- Supervisor→Team: Target reminder

### Messages (33 total across conversations + broadcasts)

---

## 4. Service Layer (`messages.service.ts`)

### Functions
| Function | Purpose | Scope |
|----------|---------|-------|
| `canSendMessage()` | Check if user can send to conversation | Participant check |
| `canCreateConversation()` | Check if user can create with recipients | Recipient scope |
| `canCreateBroadcast()` | Check if user can create broadcast to audience | Role-based |
| `getAccessibleRecipientIds()` | Get IDs of users this person can message | Role hierarchy |
| `getAccessibleRecipients()` | Get user objects of accessible recipients | Role hierarchy |
| `getTeamMembers()` | Get supervisor's team members | Supervisor scope |
| `sendConversationMessage()` | Send message with audit logging | Mutation |
| `markAsRead()` | Mark conversation as read by user | Mutation |
| `createConversation()` | Create new 1:1 or group conversation | Mutation |
| `createBroadcast()` | Create broadcast announcement | Mutation |

### Scope Enforcement
```
GM → can message anyone
SM → can message anyone
Supervisor → team + SM + GM
Rep → supervisor + SM
DO → SM + GM
Warehouse → supervisors + SM + GM
Finance → GM + SM
```

---

## 5. MockApi Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `messages.list()` | GET | Scope-filtered conversations (existing) |
| `messages.listAll()` | GET | All conversations user participates in (NEW) |
| `messages.send()` | POST | Send message to conversation (NEW) |
| `messages.markRead()` | POST | Mark conversation as read (NEW) |
| `messages.create()` | POST | Create new direct/group conversation (NEW) |
| `messages.createBroadcast()` | POST | Create broadcast announcement (NEW) |

---

## 6. UI Features

### Three-Column Layout
1. **Left Column (340px)**: Conversation list with search, tabs (Direct/Group/Broadcasts), unread badges
2. **Center Column (flex)**: Chat area with messages, input, priority selector, attachment button
3. **Right Column (300px, collapsible)**: Details panel with conversation info, participants list

### Tabs
- **رسائل مباشرة** (Direct Messages): 1:1 conversations
- **محادثات جماعية** (Group Conversations): Multi-participant conversations
- **إعلانات** (Broadcasts): Announcements from management

### Header Stats
- Total conversations count
- Unread conversations count
- Total messages count

### Actions
- **رسالة جديدة** (New Message): Modal with subject, recipient search, priority, body
- **إعلان** (Broadcast): Modal with subject, audience type, recipient checkboxes, body (role-gated)

### Chat Features
- RTL chat bubbles with border accent
- Priority labels (important/urgent)
- Attachment display
- Read receipts (check marks)
- Auto-scroll to latest message
- Enter to send

---

## 7. RBAC Enforcement

| Role | Can Direct Message | Can Create Group | Can Broadcast | Recipients |
|------|-------------------|------------------|---------------|------------|
| GENERAL_MANAGER | Yes | Yes | Yes (all) | Anyone |
| SALES_MANAGER | Yes | Yes | Yes (all) | Anyone |
| SUPERVISOR | Yes | Yes | Yes (team) | Team + SM + GM |
| REPRESENTATIVE | Yes | No | No | Supervisor + SM |
| DISTRIBUTION_OFFICER | Yes | No | No | SM + GM |
| WAREHOUSE | Yes | No | No | Supervisors + SM + GM |
| FINANCE | Yes | No | No | GM + SM |
| HR | Yes | No | No | Role-specific |
| AUDITOR | Yes | No | No | Role-specific |

---

## 8. Build Status

- **TypeScript**: ✅ Zero errors
- **Vite Build**: ✅ Success (18.05s)
- **Warnings**: Chunk size > 900KB (pre-existing, not new)

---

## 9. Integration Points

### Routes (existing, unchanged)
- `/messages` — Admin/Sales Manager
- `/rep/messages` — Representatives
- `/supervisor/messages` — Supervisors

### Navigation (existing, unchanged)
- "المراسلات" in admin sidebar
- "المراسلات" in rep sidebar
- "الرسائل" in supervisor sidebar

### Permissions (existing, unchanged)
- `messages.view` — All roles except SYSTEM_ADMIN

---

## 10. Files Changed Summary

```
src/types/index.ts          — Extended Conversation + Message types
src/mock/messaging.ts       — NEW: 296 lines, 12 conversations + 4 broadcasts
src/services/messages.service.ts  — Rewritten: 242 lines, 10 functions
src/services/mockApi.ts     — Extended: +140 lines, 5 new endpoints
src/modules/messages/MessagesPage.tsx — Rewritten: ~535 lines, 3-column layout
```
