"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Globe,
  Link2,
  Loader2,
  Lock,
  Share2,
  Users,
  X,
} from "lucide-react";
import { postSession } from "@/lib/mutations";
import { formatFocusLong } from "@/lib/format";
import {
  copySessionLink,
  shareCard,
  shareOutcomeMessage,
} from "@/lib/share-card";
import { useTimerStore, type PendingSession } from "@/lib/timer-store";
import { useSessionPostStore } from "@/lib/session-post-store";
import type { SessionWithProfile } from "@/lib/database.types";

type Visibility = "public" | "followers" | "private";

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

// Post-session modal (Slice 3 / Step 4). Mounted once in the app shell; opens
// from the TimerCard's "End session" button with a snapshot of the session.
// The form lives in an inner component that only mounts while open, so each open
// starts fresh — no reset-on-open effect needed.
export default function PostSessionModal({ userId }: { userId: string }) {
  const open = useSessionPostStore((s) => s.open);
  const pending = useSessionPostStore((s) => s.pending);
  if (!open || !pending) return null;
  return <PostSessionForm userId={userId} pending={pending} />;
}

function PostSessionForm({
  userId,
  pending,
}: {
  userId: string;
  pending: PendingSession;
}) {
  const router = useRouter();
  const close = useSessionPostStore((s) => s.close);
  const notifyPosted = useSessionPostStore((s) => s.notifyPosted);
  const resetTimer = useTimerStore((s) => s.reset);

  const [subject, setSubject] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Once set, the form is replaced by a "share what you just posted" success step.
  const [posted, setPosted] = useState<SessionWithProfile | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [shareError, setShareError] = useState("");

  // Refresh the server-rendered stats (streak / Today / heatmap) on the way out —
  // deferred to here so they update whether the user shares or just dismisses.
  function finish() {
    close();
    router.refresh();
  }

  // Escape closes (while not submitting); lock body scroll while open. On the
  // success step the session is already saved, so leaving refreshes stats too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || submitting) return;
      close();
      if (posted) router.refresh();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [submitting, posted, close, router]);

  async function handlePost() {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    const { data: saved, error: insertError } = await postSession({
      userId,
      startedAt: pending.startedAt,
      endedAt: pending.endedAt,
      focusMinutes: pending.focusMinutes,
      pomodorosCompleted: pending.pomodorosCompleted,
      pomodorosPlanned: pending.pomodorosPlanned,
      subject: subject.trim() || null,
      caption: caption.trim() || null,
      visibility,
    });

    if (insertError || !saved) {
      setError("Couldn't post your session. Please try again.");
      setSubmitting(false);
      return;
    }

    resetTimer(); // clear the timer back to idle now that it's posted
    notifyPosted(saved); // a mounted feed/profile list prepends the new card now
    setSubmitting(false);
    setPosted(saved); // advance to the share step (stats refresh on finish())
  }

  async function handleShareStory() {
    if (sharing || !posted) return;
    setSharing(true);
    setShareError("");
    setShareNote("");
    try {
      const note = shareOutcomeMessage(await shareCard({ session: posted.id }));
      if (note) {
        setShareNote(note);
        setTimeout(() => setShareNote(""), 2000);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setShareError("Couldn't create card.");
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleCopyLink() {
    if (!posted) return;
    const ok = await copySessionLink(posted.id);
    if (!ok) {
      setShareError("Couldn't copy link.");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Throw the whole session away without posting. Destructive (the focus time is
  // gone), so it's a two-tap confirm. The X / Escape / backdrop are the non-
  // destructive way out — they keep the session (paused) so you can resume.
  function handleDiscard() {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    resetTimer();
    close();
  }

  // Success step — the session is saved; offer to share it before leaving. The
  // backdrop / X / Done all `finish()` (close + refresh the server stats).
  if (posted) {
    return (
      <div
        role="presentation"
        onClick={finish}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-success-title"
          onClick={(e) => e.stopPropagation()}
          className="flex w-full max-w-[440px] flex-col gap-4 rounded-t-[16px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5 sm:rounded-[16px]"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2
                id="post-success-title"
                className="text-[15px] font-semibold text-white"
              >
                Session posted
              </h2>
              <p className="mt-0.5 text-[12px] text-[#888888]">
                <span className="text-[#22C55E]">
                  {formatFocusLong(posted.focus_minutes)}
                </span>{" "}
                focused · share your win
              </p>
            </div>
            <button
              type="button"
              onClick={finish}
              aria-label="Close"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white"
            >
              <X size={15} aria-hidden />
            </button>
          </div>

          <button
            type="button"
            onClick={handleShareStory}
            disabled={sharing}
            className="flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#22C55E] text-[13px] font-medium text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sharing ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <Share2 size={15} aria-hidden />
            )}
            {sharing ? "Preparing…" : "Share"}
          </button>

          {posted.visibility === "public" && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[13px] font-medium text-white transition-colors hover:border-[#22C55E] hover:text-[#22C55E]"
            >
              {copied ? (
                <Check size={15} className="text-[#22C55E]" aria-hidden />
              ) : (
                <Link2 size={15} aria-hidden />
              )}
              {copied ? "Link copied" : "Copy link"}
            </button>
          )}

          {shareNote && (
            <p className="text-center text-[12px] text-[#22C55E]">{shareNote}</p>
          )}
          {shareError && (
            <p role="alert" className="text-[12px] text-red-400">
              {shareError}
            </p>
          )}

          <button
            type="button"
            onClick={finish}
            className="min-h-[42px] cursor-pointer rounded-[8px] text-[13px] font-medium text-[#888888] transition-colors hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="presentation"
      onClick={() => !submitting && close()}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-session-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col gap-4 rounded-t-[16px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5 sm:rounded-[16px]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="post-session-title"
              className="text-[15px] font-semibold text-white"
            >
              Post your session
            </h2>
            <p className="mt-0.5 text-[12px] text-[#888888]">
              <span className="text-[#22C55E]">
                {formatFocusLong(pending.focusMinutes)}
              </span>{" "}
              focused · {pending.pomodorosCompleted}/{pending.pomodorosPlanned} pomodoros
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={15} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="session-subject"
            className="flex items-center justify-between text-[12px] font-medium text-[#888888]"
          >
            <span>Subject</span>
            <span className="text-[11px] text-[#555555] tabular-nums">
              {subject.length}/{SUBJECT_MAX}
            </span>
          </label>
          <input
            id="session-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={SUBJECT_MAX}
            disabled={submitting}
            placeholder="e.g. Physics — Electrostatics"
            className="rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2.5 text-[13px] text-white placeholder:text-[#555555] outline-none transition-colors focus:border-[#22C55E] disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="session-caption"
            className="flex items-center justify-between text-[12px] font-medium text-[#888888]"
          >
            <span>Caption</span>
            <span className="text-[11px] text-[#555555] tabular-nums">
              {caption.length}/{CAPTION_MAX}
            </span>
          </label>
          <textarea
            id="session-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={CAPTION_MAX}
            disabled={submitting}
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
                  disabled={submitting}
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
            onClick={handleDiscard}
            disabled={submitting}
            aria-label={
              confirmDiscard ? "Confirm discard session" : "Discard session"
            }
            className={`min-h-[42px] flex-1 cursor-pointer rounded-[8px] border-[0.5px] text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              confirmDiscard
                ? "border-[#7F1D1D] bg-[#2A1010] text-[#F87171] hover:bg-[#3A1414]"
                : "border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] hover:text-white"
            }`}
          >
            {confirmDiscard ? "Tap to discard" : "Discard session"}
          </button>
          <button
            type="button"
            onClick={handlePost}
            disabled={submitting}
            className="min-h-[42px] flex-1 cursor-pointer rounded-[8px] bg-[#22C55E] text-[13px] font-medium text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Posting…" : "Post session"}
          </button>
        </div>

        {confirmDiscard && (
          <p className="-mt-2 text-center text-[11px] text-[#888888]">
            This session won&apos;t be saved.{" "}
            <button
              type="button"
              onClick={() => setConfirmDiscard(false)}
              className="cursor-pointer text-[#22C55E] hover:underline"
            >
              Keep it
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
