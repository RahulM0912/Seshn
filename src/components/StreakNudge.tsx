"use client";

import { useEffect, useState } from "react";
import { Flame, X } from "lucide-react";

const DISMISS_KEY = "seshn:streak-nudge-dismissed";

/** The device's local calendar date — the nudge's show/dismiss granularity. */
function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Streak-at-risk banner (Step 18) — client child of StreakCard. The server part
// computes the streak + postedToday; this decides *whether tonight is at risk*
// on the device clock (the user's real evening — no server-tz drift): streak
// alive, nothing posted today, and it's 6pm or later. Dismissing hides it for
// the rest of the local day only — tomorrow evening it earns its way back.
export default function StreakNudge({
  current,
  postedToday,
}: {
  current: number;
  postedToday: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (current <= 0 || postedToday) return;
    if (new Date().getHours() < 18) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === localDate()) return;
    } catch {
      // storage unavailable — show it anyway
    }
    setVisible(true);
  }, [current, postedToday]);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, localDate());
    } catch {
      // fine — it just reappears next render
    }
    setVisible(false);
  }

  return (
    <div className="mt-2.5 flex items-center gap-2 rounded-[8px] border-[0.5px] border-[#5C4A1A] bg-[#2A200F] px-3 py-2.5">
      <Flame size={14} className="shrink-0 text-[#F59E0B]" aria-hidden />
      <p className="min-w-0 flex-1 text-[11px] leading-snug text-[#F59E0B]">
        Your {current}-day streak ends tonight — one pomodoro saves it.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss streak reminder"
        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#8a6a2a] transition-colors hover:text-[#F59E0B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]/50"
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  );
}
