"use client";

import { useEffect, useState } from "react";
import { Loader2, Share2, X } from "lucide-react";
import { loadDaySummary } from "@/lib/actions";
import { shareCard, shareOutcomeMessage } from "@/lib/share-card";
import { formatFocusLong } from "@/lib/format";
import type { DaySummary } from "@/lib/queries";

// Day-detail modal for the focus heatmap — opens when the owner clicks one of
// their own day cells. Loads that day's rollup (own data only, via the
// `loadDaySummary` action) and offers a Share button that renders the same story
// card the profile's "Share today" does, scoped to this day. Rendered only on
// the owner's own profile, so Share is always available here.

// YYYY-MM-DD → "Monday, Jun 3". Rendered at UTC noon so the date never shifts.
function prettyDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Mounted with a `key={date}` per opened day, so each open starts fresh (loading)
// — no synchronous state resets in an effect.
export default function DaySummaryModal({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [error, setError] = useState("");

  // Fetch the clicked day's summary. setState only runs in the async callbacks
  // (never synchronously in the effect body).
  useEffect(() => {
    let active = true;
    loadDaySummary(date)
      .then((data) => {
        if (!active) return;
        if (data) setSummary(data);
        else setError("Couldn't load this day.");
      })
      .catch(() => active && setError("Couldn't load this day."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [date]);

  // Escape closes; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    setError("");
    setShareNote("");
    try {
      const note = shareOutcomeMessage(await shareCard({ date }));
      if (note) {
        setShareNote(note);
        setTimeout(() => setShareNote(""), 2000);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Couldn't create card.");
      }
    } finally {
      setSharing(false);
    }
  }

  const topSubjects = summary?.subjects.slice(0, 4) ?? [];

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-summary-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col gap-4 rounded-t-[16px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5 sm:rounded-[16px]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="day-summary-title"
              className="text-[15px] font-semibold text-white"
            >
              {prettyDay(date)}
            </h2>
            {loading ? (
              <span className="mt-2 block h-3 w-20 animate-pulse rounded bg-[#1F1F1F]" />
            ) : (
              <p className="mt-0.5 text-[12px] text-[#888888]">
                {summary
                  ? `${summary.sessionCount} session${
                      summary.sessionCount === 1 ? "" : "s"
                    }`
                  : "—"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white"
          >
            <X size={15} aria-hidden />
          </button>
        </div>

        {loading ? (
          <DaySummarySkeleton />
        ) : summary ? (
          <>
            {/* Headline total */}
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#22C55E]">
                Focus
              </span>
              <span className="mt-1 text-[34px] font-semibold leading-none text-white tabular-nums">
                {formatFocusLong(summary.focusMinutes)}
              </span>
            </div>

            {/* Stats */}
            <div className="flex gap-6">
              <div className="flex flex-col">
                <span className="text-[18px] font-semibold leading-none text-white tabular-nums">
                  {summary.sessionCount}
                </span>
                <span className="mt-1.5 text-[10px] uppercase tracking-[0.06em] text-[#8A8A8A]">
                  Sessions
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[18px] font-semibold leading-none text-white tabular-nums">
                  {summary.pomodoros}
                </span>
                <span className="mt-1.5 text-[10px] uppercase tracking-[0.06em] text-[#8A8A8A]">
                  Pomodoros
                </span>
              </div>
            </div>

            {/* Subject chips */}
            {topSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {topSubjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-2.5 py-1 text-[11px] text-[#22C55E]"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleShare}
              disabled={sharing || summary.focusMinutes === 0}
              className="mt-1 flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#22C55E] text-[13px] font-medium text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharing ? (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              ) : (
                <Share2 size={15} aria-hidden />
              )}
              {sharing ? "Creating…" : "Share this day"}
            </button>
            {shareNote && (
              <p className="text-center text-[12px] text-[#22C55E]">
                {shareNote}
              </p>
            )}
          </>
        ) : (
          <p className="py-6 text-center text-[13px] text-[#888888]">
            {error || "Nothing logged this day."}
          </p>
        )}

        {error && summary && (
          <p role="alert" className="-mt-2 text-center text-[12px] text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// Placeholder that mirrors the loaded layout (headline → stats → chips → button)
// so the modal doesn't jump when the real summary lands. One pulse on the wrapper
// keeps every bar in sync.
function DaySummarySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-hidden>
      {/* Headline total */}
      <div className="flex flex-col gap-2">
        <div className="h-2.5 w-12 rounded bg-[#1F1F1F]" />
        <div className="h-8 w-44 rounded bg-[#1F1F1F]" />
      </div>
      {/* Stats */}
      <div className="flex gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-7 rounded bg-[#1F1F1F]" />
          <div className="h-2 w-14 rounded bg-[#1F1F1F]" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-7 rounded bg-[#1F1F1F]" />
          <div className="h-2 w-16 rounded bg-[#1F1F1F]" />
        </div>
      </div>
      {/* Subject chips */}
      <div className="flex gap-1.5">
        <div className="h-6 w-20 rounded-full bg-[#1F1F1F]" />
        <div className="h-6 w-28 rounded-full bg-[#1F1F1F]" />
      </div>
      {/* Share button */}
      <div className="mt-1 h-[42px] w-full rounded-[8px] bg-[#1F1F1F]" />
    </div>
  );
}
