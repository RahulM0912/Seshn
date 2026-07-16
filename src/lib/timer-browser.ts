"use client";

// Browser-surface effects for the running timer (Step 15): tab-title countdown,
// favicon status dot, phase-end OS notification, and a screen wake lock while
// focusing. One composite hook so TimerCard stays presentation + dispatch.
//
// All four are progressive enhancements: every path feature-detects and fails
// silent — the timer itself never depends on any of them.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { TimerView } from "@/lib/timer-store";
import { resetFavicon, setFaviconDot } from "@/lib/favicon";

// Matches the break accent planned for Step 16's phase identity; paused = the
// UI's muted gray. Focus = the brand green.
const DOT_FOCUS = "#22C55E";
const DOT_BREAK = "#3B82F6";
const DOT_PAUSED = "#737373";

// Ask once, and only from a real user gesture (the Start/Resume click) — never
// on page load. "default" means the user hasn't been asked yet.
export function maybeRequestNotificationPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

// Tab title + favicon while a session is underway. Gotcha: Next.js re-sets
// document.title from route metadata on every navigation, so `pathname` is a
// dep — the effect re-asserts the countdown right after each nav. On idle we
// restore a plain "Seshn" (the next navigation's metadata sets the real title)
// and put the branded favicon back.
function useTimerTabState(t: TimerView): void {
  const pathname = usePathname();
  const overrode = useRef(false);

  useEffect(() => {
    if (t.phase === "idle") {
      if (overrode.current) {
        overrode.current = false;
        document.title = "Seshn";
        resetFavicon();
      }
      return;
    }
    const label =
      t.phase === "focus" ? "Focus" : t.isLongBreak ? "Long break" : "Break";
    document.title = t.running
      ? `${t.clock} · ${label} — Seshn`
      : `⏸ ${t.clock} · Paused — Seshn`;
    overrode.current = true;
    setFaviconDot(
      !t.running ? DOT_PAUSED : t.phase === "focus" ? DOT_FOCUS : DOT_BREAK,
    );
  }, [t.clock, t.phase, t.running, t.isLongBreak, pathname]);

  // Unmount with a session underway (e.g. navigating to a page without the
  // sidebar): don't leave a frozen countdown in the title.
  useEffect(
    () => () => {
      if (overrode.current) {
        document.title = "Seshn";
        resetFavicon();
      }
    },
    [],
  );
}

// OS notification at each phase boundary — the chime's reach ends with a muted
// or backgrounded tab. Same null-started phase ref as useTimerSounds, so
// hydration/refresh never fires. Only when the tab is hidden (visible tab
// already has the chime + UI) and only if permission was granted via the
// Start-gesture request above.
function usePhaseEndNotification(t: TimerView): void {
  const prevPhase = useRef<TimerView["phase"] | null>(null);

  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = t.phase;
    if (!prev || prev === "idle" || prev === t.phase || t.phase === "idle") return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted" || !document.hidden) return;

    const title =
      t.phase === "break"
        ? t.isLongBreak
          ? "Focus done — take a long break"
          : "Focus done — take 5"
        : "Break's over — back to focus";
    try {
      const n = new Notification(title, {
        body: "Click to jump back to Seshn.",
        icon: "/icon.svg",
        tag: "seshn-phase", // a newer boundary replaces the old one
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      // some browsers (Android Chrome) only allow SW notifications — skip
    }
  }, [t.phase, t.isLongBreak]);
}

// Keep the screen awake while a focus block is actively counting down. The
// lock auto-releases when the tab hides — re-acquire when it becomes visible
// again. Released on pause/break/idle via the effect cleanup.
function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator))
      return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (sentinel && !sentinel.released) return;
      try {
        const s = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void s.release();
          return;
        }
        sentinel = s;
      } catch {
        // denied (battery saver, permissions) — non-essential, carry on
      }
    };

    void acquire();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinel) void sentinel.release();
      sentinel = null;
    };
  }, [active]);
}

export function useTimerBrowserEffects(t: TimerView): void {
  useTimerTabState(t);
  usePhaseEndNotification(t);
  useWakeLock(t.phase === "focus" && t.running);
}
