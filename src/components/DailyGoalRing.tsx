"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getDailyFocusMinutes } from "@/lib/client-queries";
import { useSessionPostStore } from "@/lib/session-post-store";

// Ambient daily-goal progress ring around the navbar avatar (Step 20). Renders
// nothing when no goal is set. Reads today's minutes via the same RPC the
// sidebar stats use — re-fetched on navigation (like NotificationsBell) and the
// moment a session is posted (the post-store's `posted` signal), so the ring
// moves right after a post without waiting for a page change. At 100% the ring
// closes and gets a soft glow — a full-day marker you notice in the corner of
// your eye, not a popup.
export default function DailyGoalRing({
  userId,
  goalMinutes,
}: {
  userId: string;
  goalMinutes: number | null;
}) {
  const pathname = usePathname();
  const posted = useSessionPostStore((s) => s.posted);
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (goalMinutes === null) return;
    let on = true;
    void getDailyFocusMinutes(userId).then((n) => {
      if (on) setMinutes(n);
    });
    return () => {
      on = false;
    };
  }, [userId, goalMinutes, pathname, posted]);

  // No goal, or first fetch still in flight — no ring (it fades in via the
  // stroke transition once minutes land).
  if (goalMinutes === null || minutes === null) return null;

  const progress = Math.min(1, minutes / goalMinutes);
  const done = progress >= 1;

  // 40×40 box around the 32px avatar: r=18 leaves a 2px gap to the avatar and
  // keeps the 2px stroke inside the box.
  const r = 18;
  const c = 2 * Math.PI * r;

  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label={
        done
          ? "Daily focus goal reached"
          : `Daily focus goal ${Math.round(progress * 100)}% complete`
      }
      className="pointer-events-none absolute -inset-1 h-10 w-10 -rotate-90"
      style={done ? { filter: "drop-shadow(0 0 4px rgba(34,197,94,0.6))" } : undefined}
    >
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="#2A2A2A"
        strokeWidth="2"
      />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="#22C55E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}
