import { useState } from "react";
import { FileText, CalendarDays } from "lucide-react";
import { useTeamData } from "@/modules/supervisor/hooks/useTeamData";
import { mockApi } from "@/services/mockApi";
import { useData } from "@/hooks/useData";
import { SupervisorPageHeader } from "@/modules/supervisor/components/SupervisorPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import { FileUpload, type UploadedFile } from "@/components/ui/FileUpload";
import { DataTable, type Column } from "@/components/data-table/DataTable";
import { formatDateShort } from "@/utils/format";
import { toast } from "@/store/ui";
import type { SupervisorNote, User } from "@/types";

const typeLabels: Record<SupervisorNote["type"], string> = {
  performance: "أداء",
  administrative: "إداري",
  operational: "تشغيلي",
};

const typeColors: Record<SupervisorNote["type"], "success" | "warning" | "neutral"> = {
  performance: "success",
  administrative: "warning",
  operational: "neutral",
};

export function TeamNotesPage() {
  const { reps, customers, notes, statByRep } = useTeamData();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SupervisorNote | null>(null);

  const viewNote = (note: SupervisorNote) => setSelectedNote(note);

  const columns: Column<SupervisorNote>[] = [
    { key: "rep", header: "المندوب", sortable: true, sortValue: (n) => n.repId, priority: "primary", render: (n) => {
      const rep = reps.find((r) => r.id === n.repId);
      return <b>{rep?.name ?? n.repId}</b>;
    } },
    { key: "date", header: "التاريخ", sortable: true, sortValue: (n) => n.date, priority: "primary", render: (n) => <span className="num">{formatDateShort(n.date)}</span> },
    { key: "type", header: "النوع", priority: "primary", render: (n) => (
      <Badge tone={typeColors[n.type]} dot>{typeLabels[n.type]}</Badge>
    ) },
    { key: "body", header: "المحتوى", priority: "secondary", render: (n) => <span style={{ fontSize: "var(--font-size-xs)" }}>{n.body}</span> },
    { key: "visibility", header: "الرؤية", priority: "optional", render: (n) => (
      <Badge tone={n.visibility === "private" ? "neutral" : n.visibility === "team" ? "info" : "success"}>{n.visibility === "private" ? "خاص" : n.visibility === "team" ? "للفريق" : "للمدير"}</Badge>
    ) },
  ];

  return (
    <div>
      <SupervisorPageHeader
        crumbs={[{ label: "فريقي", path: "/supervisor/team" }, { label: "ملاحظات" }]}
        title="ملاحظات المندوب"
        description="سجل ملاحظات الأداء والإدارية والتشغيلية للمناديب"
        actions={<Button variant="primary" size="sm" icon={<FileText size={14} />} onClick={() => setModalOpen(true)}>ملحوظة جديدة</Button>}
      />
      <div className="stack" style={{ gap: "var(--space-4)" }}>
        <Card title="كل الملاحظات" subtitle={`إجمالي: ${notes.length}`}>
          <DataTable
            columns={columns}
            rows={notes}
            rowKey={(n) => n.id}
            searchPlaceholder="بحث باسم المندوب أو المحتوى..."
            searchKeys={(n) => `${reps.find((r) => r.id === n.repId)?.name ?? n.repId} ${n.body}`}
            initialSort={{ key: "date", dir: "desc" }}
            emptyTitle="لا توجد ملاحظات"
            pageSize={15}
            onRowClick={(n) => viewNote(n)}
          />
        </Card>
      </div>

      <Modal open={selectedNote !== null || modalOpen} title={selectedNote ? "تفاصيل الملاحظة" : "ملاحظة جديدة"} size="md" onClose={() => { setSelectedNote(null); setModalOpen(false); }}>
        {selectedNote ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge tone={typeColors[selectedNote.type]}>{typeLabels[selectedNote.type]}</Badge>
              <span className="muted" style={{ fontSize: "var(--font-size-xs)" }}>{formatDateShort(selectedNote.date)}</span>
            </div>
            <div><b>المندوب:</b> {reps.find((r) => r.id === selectedNote.repId)?.name ?? selectedNote.repId}</div>
            <div><b>الكاتب:</b> {selectedNote.authorId}</div>
            <div><b>الرؤية:</b> {selectedNote.visibility}</div>
            <div style={{ marginTop: 8 }}>{selectedNote.body}</div>
            {selectedNote.attachments && selectedNote.attachments.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedNote.attachments.map((a) => <Badge key={a} tone="neutral">{a}</Badge>)}
              </div>
            )}
          </div>
        ) : (
          <AddNoteForm reps={reps} onClose={() => setModalOpen(false)} />
        )}
        {selectedNote && (
          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" size="sm" onClick={() => setSelectedNote(null)}>إغلاق</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AddNoteForm({ reps, onClose }: { reps: User[]; onClose: () => void }) {
  const [repId, setRepId] = useState(reps[0]?.id ?? "");
  const [type, setType] = useState<SupervisorNote["type"]>("performance");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<SupervisorNote["visibility"]>("team");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const submit = async () => {
    if (!repId || !body) { toast.warning("يرجى تعبئة جميع الحقول"); return; }
    try {
      await mockApi.team.createNote({ repId, authorId: "supervisor-current", type, date: new Date().toISOString(), body, visibility, attachments: attachments.map((a) => a.name) });
      toast.success(`تم حفظ الملاحظة لـ ${reps.find((r) => r.id === repId)?.name ?? repId}`);
      onClose();
    } catch {
      toast.error("فشل حفظ الملاحظة");
    }
  };

  return (
    <div className="stack" style={{ gap: 12 }}>
      <Select label="المندوب" value={repId} onChange={(e) => setRepId(e.target.value)} options={reps.map((r) => ({ value: r.id, label: r.name }))} />
      <Select label="النوع" value={type} onChange={(e) => setType(e.target.value as SupervisorNote["type"])} options={[
        { value: "performance", label: "أداء" }, { value: "administrative", label: "إداري" }, { value: "operational", label: "تشغيلي" },
      ]} />
      <Input label="الملاحظة" value={body} onChange={(e) => setBody(e.target.value)} required placeholder="اكتب الملاحظة هنا..." />
      <Select label="الرؤية" value={visibility} onChange={(e) => setVisibility(e.target.value as SupervisorNote["visibility"])} options={[
        { value: "team", label: "للفريق" }, { value: "private", label: "خاص" }, { value: "manager", label: "للمدير" },
      ]} />
      <FileUpload label="إرفاق ملفات" hint="صور، مستندات، فيديو — بحد أقصى 5MB" files={attachments} onChange={setAttachments} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="ghost" size="sm" onClick={onClose}>إلغاء</Button>
        <Button variant="primary" size="sm" onClick={submit}>حفظ</Button>
      </div>
    </div>
  );
}
