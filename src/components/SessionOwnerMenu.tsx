"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { softDeleteSession, updateSession } from "@/lib/mutations";
import type { SessionWithProfile, Visibility } from "@/lib/database.types";

// Owner-only controls on a SessionCard (Step 14). Rendered in the card header
// only when the signed-in viewer authored the session, so it shows up wherever
// the card does — feed, profile, and the permalink — from one place. Holds the
// ⋯ menu plus its two actions: an edit modal (subject/caption/visibility — the
// focus stats are immutable) and a two-tap delete confirm (soft delete via RLS).
//
// After a successful edit or delete we `router.refresh()` so the server-rendered
// card re-reads: an edited card shows new text, a deleted one drops out of the
// list (RLS now hides it). No optimistic local state — the row lives on the
// server-rendered page, not in this client tree.

const SUBJECT_MAX = 60;
const CAPTION_MAX = 280;

const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  Icon: typeof Globe;
}[] = [
  { value: "public", label: "Public", Icon: Globe },
  { value: "followers", label: "Followers", Icon: Users },
  { value: "private", label: "Private", Icon: Lock },
];

export default function SessionOwnerMenu({
  session,
}: {
  session: SessionWithProfile;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click / Escape (the modals manage their own).
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div ref={menuRef} className="relative ml-auto flex-shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#555555] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-20 flex w-36 flex-col rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] py-1 shadow-lg shadow-black/40"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setEditing(true);
            }}
            className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[12px] text-[#CCCCCC] transition-colors hover:bg-[#252525] hover:text-white focus-visible:outline-none focus-visible:bg-[#252525]"
          >
            <Pencil size={13} aria-hidden />
            Edit
          </button>
          <DeleteMenuItem session={session} onDone={() => setMenuOpen(false)} />
        </div>
      )}

      {editing && (
        <EditSessionModal session={session} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

// The Delete row doubles as its own confirm: first click arms it (turns red,
// "Tap to confirm"), second click commits the soft delete. Kept inside the
// dropdown so deleting never needs a second modal.
function DeleteMenuItem({
  session,
  onDone,
}: {
  session: SessionWithProfile;
  onDone: () => void;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    if (deleting) return;
    setDeleting(true);
    const { error } = await softDeleteSession(session.id);
    if (error) {
      console.error("softDeleteSession:", error.message);
      setDeleting(false);
      setArmed(false);
      return;
    }
    onDone();
    router.refresh();
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={deleting}
      className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[12px] transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
        armed
          ? "bg-[#2A1010] text-[#F87171] hover:bg-[#3A1414]"
          : "text-[#CCCCCC] hover:bg-[#252525] hover:text-[#F87171]"
      }`}
    >
      <Trash2 size={13} aria-hidden />
      {deleting ? "Deleting…" : armed ? "Tap to confirm" : "Delete"}
    </button>
  );
}

// Edit modal — subject / caption / visibility only. Stats are a factual record
// and stay locked, so they aren't shown here.
function EditSessionModal({
  session,
  onClose,
}: {
  session: SessionWithProfile;
  onClose: () => void;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(session.subject ?? "");
  const [caption, setCaption] = useState(session.caption ?? "");
  const [visibility, setVisibility] = useState<Visibility>(session.visibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [saving, onClose]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    const { error: updateError } = await updateSession(session.id, {
      subject: subject.trim() || null,
      caption: caption.trim() || null,
      visibility,
    });
    if (updateError) {
      setError("Couldn't save your changes. Please try again.");
      setSaving(false);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div
      role="presentation"
      onClick={() => !saving && onClose()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-session-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col gap-4 rounded-t-[16px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5 sm:rounded-[16px]"
      >
        <div className="flex items-start justify-between">
          <h2
            id="edit-session-title"
            className="text-[15px] font-semibold text-white"
          >
            Edit session
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={15} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-subject"
            className="flex items-center justify-between text-[12px] font-medium text-[#888888]"
          >
            <span>Subject</span>
            <span className="text-[11px] text-[#555555] tabular-nums">
              {subject.length}/{SUBJECT_MAX}
            </span>
          </label>
          <input
            id="edit-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={SUBJECT_MAX}
            disabled={saving}
            placeholder="e.g. Physics — Electrostatics"
            className="rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2.5 text-[13px] text-white placeholder:text-[#555555] outline-none transition-colors focus:border-[#22C55E] disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-caption"
            className="flex items-center justify-between text-[12px] font-medium text-[#888888]"
          >
            <span>Caption</span>
            <span className="text-[11px] text-[#555555] tabular-nums">
              {caption.length}/{CAPTION_MAX}
            </span>
          </label>
          <textarea
            id="edit-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={CAPTION_MAX}
            disabled={saving}
            rows={3}
            placeholder="How did it go?"
            className="resize-none rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2.5 text-[13px] leading-relaxed text-white placeholder:text-[#555555] outline-none transition-colors focus:border-[#22C55E] disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[#888888]">
            Who can see this
          </span>
          <div
            role="radiogroup"
            aria-label="Visibility"
            className="grid grid-cols-3 gap-1.5"
          >
            {VISIBILITY_OPTIONS.map(({ value, label, Icon }) => {
              const selected = visibility === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setVisibility(value)}
                  disabled={saving}
                  className={`flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[8px] border-[0.5px] text-[11px] transition-colors disabled:cursor-not-allowed ${
                    selected
                      ? "border-[#1A4D22] bg-[#0F2A15] text-[#22C55E]"
                      : "border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] hover:text-white"
                  }`}
                >
                  <Icon size={15} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-[12px] text-red-400">
            {error}
          </p>
        )}

        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-[42px] flex-1 cursor-pointer rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[13px] font-medium text-[#888888] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="min-h-[42px] flex-1 cursor-pointer rounded-[8px] bg-[#22C55E] text-[13px] font-medium text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
