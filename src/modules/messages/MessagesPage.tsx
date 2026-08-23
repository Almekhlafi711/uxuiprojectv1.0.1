import { useMemo, useState, useRef, useEffect } from "react";
import {
  Send, Paperclip, Search, Info, Plus,
  Megaphone, MessageSquare, X, CheckCheck, Phone
} from "lucide-react";
import { users } from "@/mock/users";
import { useAuthStore } from "@/store/auth";
import { useData } from "@/hooks/useData";
import { mockApi } from "@/services/mockApi";
import { getAccessibleRecipients, canCreateBroadcast } from "@/services/messages.service";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/FormControls";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/ui";
import { formatDateTime } from "@/utils/format";
import type { Conversation, Message } from "@/types";

type RoleFilter = "all" | "reps" | "supervisors" | "management";

const priorityLabels: Record<string, string> = { normal: "عادي", high: "مهم", urgent: "عاجل" };
const audienceTypeLabels: Record<string, string> = {
  team: "الفريق", territory: "المنطقة", branch: "الفرع",
  all_reps: "جميع المناديب", selected: "تحديد يدوي", department: "القسم",
};
const managementRoles = new Set([
  "GENERAL_MANAGER", "SALES_MANAGER", "FINANCE", "HR",
  "WAREHOUSE", "DISTRIBUTION_OFFICER", "AUDITOR", "SYSTEM_ADMIN", "DISTRIBUTOR",
]);

const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id;
const roleOf = (id: string) => {
  const u = users.find((u) => u.id === id);
  if (!u) return "";
  const m: Record<string, string> = {
    GENERAL_MANAGER: "مدير عام", SALES_MANAGER: "مدير مبيعات", SUPERVISOR: "مشرف",
    REPRESENTATIVE: "مندوب", DISTRIBUTION_OFFICER: "مسؤول توزيع", WAREHOUSE: "مستودع",
    FINANCE: "مالية", HR: "موارد بشرية", SYSTEM_ADMIN: "مدير نظام", AUDITOR: "مدقق", DISTRIBUTOR: "موزع",
  };
  return m[u.role] ?? u.role;
};

const getUnreadCount = (conv: Conversation, userId: string): number => {
  if (!conv.messages.length) return 0;
  const last = conv.messages[conv.messages.length - 1];
  if (last.senderId === userId || conv.readBy?.includes(userId)) return 0;
  return 1;
};

const findConversationWith = (convs: Conversation[], userId: string, targetId: string) =>
  convs.find((c) => c.type !== "broadcast" && c.participants.includes(userId) && c.participants.includes(targetId));

const getLastMsg = (convs: Conversation[], userId: string, targetId: string): Message | undefined => {
  const c = findConversationWith(convs, userId, targetId);
  return c?.messages[c.messages.length - 1];
};

const formatDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today.getTime() - msgDay.getTime();
  if (diff < 86400000 && diff >= 0) return "اليوم";
  if (diff < 172800000) return "أمس";
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" });
};

export function MessagesPage() {
  const { user } = useAuthStore();
  const { data, loading, error, refetch } = useData(() => mockApi.messages.listAll());
  const [sel, setSel] = useState("");
  const [q, setQ] = useState("");
  const [roleTab, setRoleTab] = useState<RoleFilter>("all");
  const [showDet, setShowDet] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftPri, setDraftPri] = useState<Message["priority"]>("normal");
  const [bcSubj, setBcSubj] = useState("");
  const [bcBody, setBcBody] = useState("");
  const [bcAud, setBcAud] = useState<Conversation["audienceType"]>("team");
  const [bcRecips, setBcRecips] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const uid = user?.id ?? "";
  const urole = user?.role ?? "";

  const myConvs = useMemo(() => (data ?? []).filter((c) => c.participants.includes(uid)), [data, uid]);
  const recipients = useMemo(() => {
    return getAccessibleRecipients({ userId: uid, role: urole, scopeType: "global" as const });
  }, [uid, urole]);

  const filtered = useMemo(() => {
    let list = recipients;
    if (roleTab === "reps") list = recipients.filter((r) => r.role === "REPRESENTATIVE");
    else if (roleTab === "supervisors") list = recipients.filter((r) => r.role === "SUPERVISOR");
    else if (roleTab === "management") list = recipients.filter((r) => managementRoles.has(r.role));
    if (q.trim()) {
      const ql = q.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(ql) || roleOf(r.id).includes(ql));
    }
    return list;
  }, [recipients, roleTab, q]);

  const tabCounts = useMemo(() => ({
    all: recipients.length,
    reps: recipients.filter((r) => r.role === "REPRESENTATIVE").length,
    supervisors: recipients.filter((r) => r.role === "SUPERVISOR").length,
    management: recipients.filter((r) => managementRoles.has(r.role)).length,
  }), [recipients]);

  const activeConv = useMemo(() => sel ? findConversationWith(myConvs, uid, sel) ?? null : null, [myConvs, uid, sel]);
  const selUser = useMemo(() => users.find((u) => u.id === sel) ?? null, [sel]);
  const canBc = useMemo(() => {
    return canCreateBroadcast({ userId: uid, role: urole, scopeType: "global" as const }, bcAud ?? "team");
  }, [uid, urole, bcAud]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeConv?.messages.length]);

  const send = async () => {
    if (!draft.trim() || !sel) return;
    try {
      if (activeConv) {
        await mockApi.messages.send(activeConv.id, draft, [], draftPri);
      } else {
        await mockApi.messages.create({ subject: "محادثة", body: draft, recipientIds: [sel], priority: draftPri });
      }
      toast.success("تم إرسال الرسالة");
      setDraft(""); setDraftPri("normal"); refetch();
    } catch { toast.error("فشل إرسال الرسالة"); }
  };

  const markRead = async (cid: string) => { await mockApi.messages.markRead(cid); refetch(); };

  const selectContact = (id: string) => {
    setSel(id);
    const c = findConversationWith(myConvs, uid, id);
    if (c) markRead(c.id);
  };

  const createBc = async () => {
    if (!bcSubj.trim() || !bcBody.trim() || bcRecips.length === 0 || !canBc) return;
    try {
      await mockApi.messages.createBroadcast({
        subject: bcSubj, body: bcBody,
        audienceLabel: audienceTypeLabels[bcAud ?? "team"],
        audienceType: bcAud, recipientIds: bcRecips,
      });
      toast.success("تم إنشاء الإعلان"); setShowBroadcast(false);
      setBcSubj(""); setBcBody(""); setBcRecips([]); refetch();
    } catch { toast.error("فشل إنشاء الإعلان"); }
  };

  if (loading) return <div className="state-block"><div className="state-title">جارٍ تحميل المراسلات...</div></div>;
  if (error) return <div className="state-block error"><div className="state-title">{error}</div></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", minHeight: 0 }}>
      {/* Page Header */}
      <div style={{ flexShrink: 0, padding: "0 0 10px 0", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", marginBottom: "var(--space-3)" }}>
        <div>
          <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 700 }}>المراسلات</div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{myConvs.length} محادثة</div>
        </div>
        <Button variant="secondary" icon={<Megaphone size={15} />} onClick={() => setShowBroadcast(true)}>إعلان</Button>
      </div>
      {/* 3-Column Grid — fills remaining space */}
      <div style={{ display: "grid", gridTemplateColumns: showDet ? "340px 1fr 300px" : "340px 1fr", gap: 0, flex: 1, minHeight: 0, border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden" }}>
        {/* ===== LEFT: Contacts List ===== */}
        <div style={{ display: "flex", flexDirection: "column", background: "var(--color-surface)", borderInlineEnd: "1px solid var(--color-border)", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface-alt)", borderRadius: 8, padding: "6px 10px" }}>
              <Search size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عن شخص..."
                style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "var(--font-size-sm)", fontFamily: "inherit", textAlign: "right", color: "var(--color-text)" }} />
            </div>
          </div>
          {/* Role Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
            {([
              { key: "all" as RoleFilter, label: "الكل" },
              { key: "reps" as RoleFilter, label: "المناديب" },
              { key: "supervisors" as RoleFilter, label: "المشرفين" },
              { key: "management" as RoleFilter, label: "الإدارة" },
            ]).map((t) => (
              <button key={t.key} onClick={() => setRoleTab(t.key)} style={{
                flex: 1, padding: "7px 4px", fontSize: "var(--font-size-xxs)", fontWeight: roleTab === t.key ? 700 : 500,
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: roleTab === t.key ? "2px solid var(--color-primary)" : "2px solid transparent",
                color: roleTab === t.key ? "var(--color-primary)" : "var(--color-text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
              }}>
                {t.label}
                <span style={{
                  fontSize: "var(--font-size-xxs)", lineHeight: 1,
                  background: roleTab === t.key ? "var(--color-primary)" : "var(--color-surface-alt)",
                  color: roleTab === t.key ? "#fff" : "var(--color-text-muted)",
                  borderRadius: 8, padding: "1px 5px", minWidth: 16, textAlign: "center",
                }}>{tabCounts[t.key]}</span>
              </button>
            ))}
          </div>
          {/* Contacts — scrollable */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {filtered.map((r) => {
              const lastMsg = getLastMsg(myConvs, uid, r.id);
              const conv = findConversationWith(myConvs, uid, r.id);
              const unread = conv ? getUnreadCount(conv, uid) : 0;
              const isActive = sel === r.id;
              const initials = r.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
              const time = lastMsg ? formatDateTime(lastMsg.sentAt).slice(11, 16) : "";
              const preview = lastMsg
                ? (lastMsg.senderId === uid ? `أنت: ${lastMsg.body}` : lastMsg.body).slice(0, 45)
                : roleOf(r.id);
              return (
                <button key={r.id} onClick={() => selectContact(r.id)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", border: "none", cursor: "pointer", textAlign: "right",
                  background: isActive ? "var(--color-primary-soft)" : "transparent",
                  borderBottom: "1px solid var(--color-border-light, var(--color-border))",
                  transition: "background 0.1s",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: isActive ? "var(--color-primary)" : "var(--color-primary-soft)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "var(--font-size-sm)", fontWeight: 700,
                    color: isActive ? "#fff" : "var(--color-primary)",
                  }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "var(--font-size-sm)", fontWeight: unread ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      {time && <span style={{ fontSize: "var(--font-size-xxs)", color: unread ? "var(--color-primary)" : "var(--color-text-muted)", flexShrink: 0, marginLeft: 4 }}>{time}</span>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{preview}</span>
                      {unread > 0 && <span style={{ fontSize: "var(--font-size-xxs)", color: "#fff", background: "var(--color-primary)", borderRadius: 10, padding: "1px 6px", minWidth: 18, textAlign: "center", flexShrink: 0, marginLeft: 4 }}>{unread}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>لا يوجد أشخاص</div>
            )}
          </div>
        </div>
        {/* ===== CENTER: Chat Area ===== */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--color-surface)" }}>
          {sel && selUser ? (
            <>
              {/* Chat Header — fixed */}
              <div style={{ flexShrink: 0, padding: "10px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--font-size-xs)", fontWeight: 700, color: "#fff" }}>
                    {selUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>{selUser.name}</div>
                    <div style={{ fontSize: "var(--font-size-xxs)", color: "var(--color-text-muted)" }}>{roleOf(selUser.id)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <Button variant="ghost" size="sm" icon={<Phone size={15} />} onClick={() => toast.info("مكالمة صوتية", "قريباً")} />
                  <Button variant="ghost" size="sm" icon={<Info size={15} />} onClick={() => setShowDet(!showDet)} />
                </div>
              </div>
              {/* Messages — scrollable */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4, background: "#e5ddd5" }}>
                {activeConv && activeConv.messages.length > 0 ? (() => {
                  let lastDateLabel = "";
                  return activeConv.messages.map((m) => {
                    const mine = m.senderId === uid;
                    const dateLabel = formatDateLabel(m.sentAt);
                    const showDate = dateLabel !== lastDateLabel;
                    lastDateLabel = dateLabel;
                    const timeStr = formatDateTime(m.sentAt).slice(0, 16);
                    return (
                      <div key={m.id}>
                        {showDate && (
                          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                            <span style={{ background: "#e1f2fb", color: "var(--color-text-muted)", fontSize: "var(--font-size-xxs)", padding: "4px 12px", borderRadius: 8, fontWeight: 500, boxShadow: "0 1px 1px rgba(0,0,0,0.06)" }}>{dateLabel}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: mine ? "flex-start" : "flex-end", paddingInline: 40 }}>
                          <div style={{ maxWidth: "70%", position: "relative" }}>
                            <div style={{ background: mine ? "#dcf8c6" : "#ffffff", padding: "6px 10px 4px", borderRadius: mine ? "0 10px 10px 10px" : "10px 0 10px 10px", fontSize: "var(--font-size-sm)", boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)", wordBreak: "break-word" }}>
                              {m.priority && m.priority !== "normal" && (
                                <span style={{ fontSize: "var(--font-size-xxs)", fontWeight: 700, color: m.priority === "urgent" ? "var(--color-danger)" : "var(--color-warning)" }}>[{priorityLabels[m.priority ?? "normal"]}]{" "}</span>
                              )}
                              {m.body}
                              {m.attachments.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                  {m.attachments.map((a) => (
                                    <span key={a} style={{ fontSize: "var(--font-size-xxs)", background: "var(--color-surface)", padding: "2px 6px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid var(--color-border)" }}><Paperclip size={10} /> {a}</span>
                                  ))}
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3, marginTop: 2, paddingInlineStart: 8 }}>
                                <span style={{ fontSize: "10px", color: "rgba(0,0,0,0.4)" }}>{timeStr}</span>
                                {mine && m.read && <CheckCheck size={13} style={{ color: "#53bdeb" }} />}
                                {mine && !m.read && <CheckCheck size={13} style={{ color: "rgba(0,0,0,0.3)" }} />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })() : (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <MessageSquare size={28} style={{ color: "var(--color-text-muted)" }} />
                    </div>
                    <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 500, color: "var(--color-text-muted)" }}>ابدأ محادثة مع {selUser.name}</div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              {/* Input Area — fixed */}
              <div style={{ flexShrink: 0, padding: "10px 14px", borderTop: "1px solid var(--color-border)", display: "flex", gap: 8, alignItems: "center", background: "var(--color-surface)" }}>
                <Button variant="ghost" size="sm" icon={<Paperclip size={16} />} onClick={() => toast.info("المرفقات", "قريباً")} />
                <div style={{ flex: 1, display: "flex", alignItems: "center", background: "var(--color-surface-alt)", borderRadius: 8, padding: "6px 12px" }}>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder="اكتب رسالة..."
                    style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "var(--font-size-sm)", fontFamily: "inherit", color: "var(--color-text)" }} />
                </div>
                <Select value={draftPri ?? "normal"}
                  onChange={(e) => setDraftPri(e.target.value as Message["priority"])}
                  options={Object.entries(priorityLabels).map(([k, v]) => ({ value: k, label: v }))}
                  style={{ width: 72, fontSize: "var(--font-size-xs)" }} />
                <button onClick={send} disabled={!draft.trim()} style={{
                  width: 36, height: 36, borderRadius: "50%", border: "none",
                  cursor: draft.trim() ? "pointer" : "default",
                  background: draft.trim() ? "var(--color-primary)" : "var(--color-surface-alt)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Send size={16} style={{ color: draft.trim() ? "#fff" : "var(--color-text-muted)", transform: "rotate(180deg)" }} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--color-text-muted)" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={36} style={{ color: "var(--color-primary)" }} />
              </div>
              <div style={{ fontSize: "var(--font-size-md)", fontWeight: 500 }}>اختر جهة اتصال للبدء بالمراسلة</div>
              <div style={{ fontSize: "var(--font-size-xs)" }}>اختر شخصاً من القائمة على اليسار</div>
            </div>
          )}
        </div>
        {/* ===== RIGHT: Details Panel ===== */}
        {showDet && selUser && (
          <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", borderInlineStart: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
            <div style={{ padding: "20px 16px", textAlign: "center", borderBottom: "1px solid var(--color-border)", position: "relative", flexShrink: 0 }}>
              <button onClick={() => setShowDet(false)} style={{ position: "absolute", top: 8, left: 8, background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={14} style={{ color: "var(--color-text-muted)" }} /></button>
              <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 10px", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--font-size-lg)", fontWeight: 700, color: "#fff" }}>
                {selUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div style={{ fontWeight: 700, fontSize: "var(--font-size-md)" }}>{selUser.name}</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>{roleOf(selUser.id)}</div>
            </div>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ fontSize: "var(--font-size-xxs)", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 8 }}>المعلومات</div>
              {[["البريد", selUser.email ?? "—"], ["الدور", roleOf(selUser.id)], ["المعرف", selUser.id]].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "var(--font-size-xs)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>
            {activeConv && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "var(--font-size-xxs)", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 8 }}>المحادثة</div>
                {[["الرسائل", `${activeConv.messages.length}`], ["آخر رسالة", formatDateTime(activeConv.lastMessageAt)], ["الموضوع", activeConv.subject]].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "var(--font-size-xs)" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
                    <span style={{ fontWeight: 500 }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: "var(--font-size-xxs)", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 8 }}>المرفقات</div>
              {activeConv && activeConv.messages.some((m) => m.attachments.length > 0) ? (
                activeConv.messages.filter((m) => m.attachments.length > 0).flatMap((m) => m.attachments).map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: "var(--font-size-xs)", borderBottom: "1px solid var(--color-border)" }}>
                    <Paperclip size={12} style={{ color: "var(--color-primary)" }} /><span>{a}</span>
                  </div>
                ))
              ) : <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textAlign: "center", padding: 12 }}>لا توجد مرفقات</div>}
            </div>
          </div>
        )}
      </div>
      {/* Broadcast Modal */}
      <Modal open={showBroadcast} onClose={() => setShowBroadcast(false)} title="إنشاء إعلان"
        footer={<>
          <Button variant="secondary" onClick={() => setShowBroadcast(false)}>إلغاء</Button>
          <Button variant="primary" onClick={createBc} icon={<Megaphone size={15} />}
            disabled={!bcSubj.trim() || !bcBody.trim() || bcRecips.length === 0 || !canBc}>إرسال الإعلان</Button>
        </>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Input label="العنوان" value={bcSubj} onChange={(e) => setBcSubj(e.target.value)} placeholder="عنوان الإعلان" />
          <Select label="نوع الجمهور" value={bcAud ?? "team"}
            onChange={(e) => setBcAud(e.target.value as Conversation["audienceType"])}
            options={Object.entries(audienceTypeLabels).map(([k, v]) => ({ value: k, label: v }))} />
          {!canBc && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-danger)", padding: "4px 8px", background: "#fef2f2", borderRadius: 6 }}>غير مصرح بإنشاء إعلان لهذا الجمهور</div>}
          <Input label="الرسالة" value={bcBody} onChange={(e) => setBcBody(e.target.value)} placeholder="نص الإعلان" />
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 500, marginBottom: 6 }}>المستلمون ({bcRecips.length})</div>
            <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 6, padding: 4 }}>
              {recipients.map((u) => (
                <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", cursor: "pointer", fontSize: "var(--font-size-xs)", borderRadius: 4 }}>
                  <input type="checkbox" checked={bcRecips.includes(u.id)} onChange={() => setBcRecips((p) => p.includes(u.id) ? p.filter((x) => x !== u.id) : [...p, u.id])} />
                  <span>{u.name}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>({roleOf(u.id)})</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
