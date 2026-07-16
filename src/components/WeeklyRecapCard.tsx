"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, TrendingDown, TrendingUp, X } from "lucide-react";
import { formatFocusLong } from "@/lib/format";
import type { WeeklyRecap } from "@/lib/queries";

const DISMISS_KEY = "seshn:recap-dismissed";

// Weekly recap (Step 18) — top of the feed, Mon–Tue only (the server query
// returns null outside that window and when last week was empty). Client
// component solely for the dismiss: hiding it for the week is a device-local
// choice (localStorage keyed by the week), not worth a schema column.
export default function WeeklyRecapCard({ recap }: { recap: WeeklyRecap }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === recap.weekKey) return;
    } catch {
      // storage unavailable — show it anyway
    }
    setVisible(true);
  }, [recap.weekKey]);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, recap.weekKey);
    } catch {
      // fine — it just reappears next visit
    }
    setVisible(false);
  }

  const { lastWeekMinutes, prevWeekMinutes, topSubject, activeDays } = recap;
  const deltaPct =
    prevWeekMinutes > 0
      ? Math.round(((lastWeekMinutes - prevWeekMinutes) / prevWeekMinutes) * 100)
      : null;

  return (
    <div className="flex items-start gap-3 rounded-[12px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] p-4">
      <CalendarCheck size={16} className="mt-0.5 shrink-0 text-[#22C55E]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-white">
          Last week:{" "}
          <span className="text-[#22C55E]">
            {formatFocusLong(lastWeekMinutes)}
          </span>{" "}
          across {activeDays} day{activeDays === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[#3E7D4E]">
          {deltaPct !== null && deltaPct !== 0 && (
            <span className="inline-flex items-center gap-1">
              {deltaPct > 0 ? (
                <TrendingUp size={12} aria-hidden />
              ) : (
                <TrendingDown size={12} aria-hidden />
              )}
              {deltaPct > 0 ? "+" : ""}
              {deltaPct}% vs the week before
            </span>
          )}
          {topSubject && <span>mostly {topSubject}</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss weekly recap"
        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#3E7D4E] transition-colors hover:text-[#22C55E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/50"
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  );
}
