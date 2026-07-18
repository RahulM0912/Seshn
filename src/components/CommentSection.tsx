"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { getSessionComments } from "@/lib/client-queries";
import { addComment, softDeleteComment, updateComment } from "@/lib/mutations";
import { avatarColor, initials, relativeTime } from "@/lib/format";
import type { CommentWithProfile } from "@/lib/database.types";

// The comment thread that expands under a SessionCard from the 💬 button (Step 9).
// Mounts only when opened, so its fetch is lazy (one query per opened card, not
// per page). Posting/deleting nudge the parent's count via `onCountChange` — the
// same optimistic philosophy as LikeButton (no router.refresh; the count we show
// is the rendered count ± our own action). The body cap (1–280) matches the DB
// CHECK; deletes are soft and limited to your own comments by RLS.
const MAX = 280;

export default function CommentSection({
  sessionId,
  viewerId,
  onCountChange,
}: {
  sessionId: string;
  viewerId: string;
  onCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Inline edit: which comment (if any) is open in its editor, plus the draft.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Lazy load: the section only mounts when opened, so this fires once. `loading`
  // already starts true (the card opened) — no need to set it here.
  useEffect(() => {
    let active = true;
    getSessionComments(sessionId).then((rows) => {
      if (active) {
        setComments(rows);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [sessionId]);

  async function post() {
    const text = body.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    const { error } = await addComment(viewerId, sessionId, text);
    if (error) {
      console.error("addComment:", error.message);
      setSubmitting(false);
      return;
    }
    setBody("");
    onCountChange(1);
    // Refetch to pick up the server-assigned id + author profile (the commenter's
    // profile isn't passed down, so an optimistic append can't render correctly).
    setComments(await getSessionComments(sessionId));
    setSubmitting(false);
  }

  async function remove(id: string) {
    const prev = comments;
    setComments((cs) => cs.filter((c) => c.id !== id)); // optimistic
    onCountChange(-1);
    const { error } = await softDeleteComment(id);
    if (error) {
      console.error("softDeleteComment:", error.message);
      setComments(prev); // revert
      onCountChange(1);
    }
  }

  function startEdit(c: CommentWithProfile) {
    setEditingId(c.id);
    setDraft(c.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
  }

  // Save an edit (Enter or the Save button). Optimistic, same as like/delete:
  // patch body + edited_at locally, fire the write, revert on a real error.
  // A blank or unchanged draft just closes the editor without a write.
  async function saveEdit(id: string) {
    const text = draft.trim();
    const original = comments.find((c) => c.id === id);
    if (!original) return;
    if (!text || text === original.body) {
      cancelEdit();
      return;
    }
    if (savingEdit) return;
    setSavingEdit(true);
    const editedAt = new Date().toISOString();
    setComments((cs) =>
      cs.map((c) => (c.id === id ? { ...c, body: text, edited_at: editedAt } : c)),
    );
    const { error } = await updateComment(id, text);
    if (error) {
      console.error("updateComment:", error.message);
      setComments((cs) =>
        cs.map((c) =>
          c.id === id
            ? { ...c, body: original.body, edited_at: original.edited_at }
            : c,
        ),
      );
    }
    setSavingEdit(false);
    cancelEdit();
  }

  return (
    <div className="mt-3 border-t-[0.5px] border-[#1C1C1C] pt-3">
      {loading ? (
        <p className="text-[12px] text-[#8A8A8A]">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-[12px] text-[#8A8A8A]">No comments yet — be the first.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => {
            const av = avatarColor(c.profiles.id);
            const mine = c.user_id === viewerId;
            return (
              <li key={c.id} className="flex gap-2.5">
                <span
                  aria-hidden
                  style={{ backgroundColor: av.bg, color: av.text }}
                  className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
                >
                  {initials(c.profiles.display_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-[12px] font-medium text-white">
                      {c.profiles.display_name}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-[#8A8A8A]">
                      {relativeTime(c.created_at)}
                      {c.edited_at && " · edited"}
                    </span>
                    {mine && editingId !== c.id && (
                      <div className="ml-auto flex flex-shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          aria-label="Edit comment"
                          className="cursor-pointer rounded p-0.5 text-[#8A8A8A] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#22C55E]"
                        >
                          <Pencil size={12} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(c.id)}
                          aria-label="Delete comment"
                          className="cursor-pointer rounded p-0.5 text-[#8A8A8A] transition-colors hover:text-[#F87171] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#F87171]"
                        >
                          <Trash2 size={12} aria-hidden />
                        </button>
                      </div>
                    )}
                  </div>
                  {editingId === c.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveEdit(c.id);
                      }}
                      className="mt-1"
                    >
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        maxLength={MAX}
                        rows={2}
                        autoFocus
                        aria-label="Edit comment"
                        onKeyDown={(e) => {
                          // Enter saves; Shift+Enter newlines; Escape cancels.
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit(c.id);
                          } else if (e.key === "Escape") {
                            cancelEdit();
                          }
                        }}
                        className="w-full resize-none rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-2.5 py-1.5 text-[12px] leading-[1.4] text-white placeholder:text-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
                      />
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={savingEdit || !draft.trim()}
                          className="cursor-pointer rounded-[6px] bg-[#22C55E] px-2.5 py-1 text-[11px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055] disabled:cursor-default disabled:opacity-40"
                        >
                          {savingEdit ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="cursor-pointer rounded-[6px] px-2.5 py-1 text-[11px] text-[#888888] transition-colors hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-[12px] leading-[1.5] text-[#888888]">
                      {c.body}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          post();
        }}
        className="mt-3 flex items-start gap-2"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX}
          rows={1}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          onKeyDown={(e) => {
            // Enter posts; Shift+Enter inserts a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              post();
            }
          }}
          className="min-h-[36px] flex-1 resize-none rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-3 py-2 text-[12px] leading-[1.4] text-white placeholder:text-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!body.trim() || submitting}
          className="flex-shrink-0 cursor-pointer rounded-[10px] bg-[#22C55E] px-3.5 py-2 text-[12px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055] disabled:cursor-default disabled:opacity-40"
        >
          {submitting ? "…" : "Post"}
        </button>
      </form>
      {body.length > 0 && (
        <div className="mt-1 text-right text-[10px] tabular-nums text-[#8A8A8A]">
          {body.length}/{MAX}
        </div>
      )}
    </div>
  );
}
