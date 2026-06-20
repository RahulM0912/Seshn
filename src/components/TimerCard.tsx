"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RefreshCw, Settings, SkipForward, Square } from "lucide-react";
import {
  getPendingSession,
  useTimer,
  type TimerView,
} from "@/lib/timer-store";
import { playAlarm, playTick, unlockAudio } from "@/lib/timer-sounds";
import { useSessionPostStore } from "@/lib/session-post-store";
import TimerSettingsModal from "@/components/TimerSettingsModal";

function phaseLabel(t: TimerView): string {
  if (t.phase === "idle") return "Ready";
  if (t.phase === "focus") return "Focus";
  return t.isLongBreak ? "Long break" : "Break";
}

// Side-effect hook: play the boundary chime when the phase flips (focus↔break,
// including when a break ends) and a soft tick each second while the timer runs
// — focus AND break. Both gated on the user's prefs. The phase ref starts null
// so hydration / first paint never fires a chime.
function useTimerSounds(t: TimerView): void {
  const prevPhase = useRef<TimerView["phase"] | null>(null);

  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = t.phase;
    // Any genuine phase change between two non-idle phases rings (focus→break
    // and break→focus). Not idle→focus (start) and not the hydrate/refresh paint.
    if (prev && prev !== "idle" && prev !== t.phase && t.phase !== "idle") {
      if (t.soundEnabled) playAlarm(t.volume);
    }
  }, [t.phase, t.soundEnabled, t.volume]);

  useEffect(() => {
    // Tick while the clock is actively running — during focus or break.
    if (!(t.tickingEnabled && t.running && t.phase !== "idle")) return;
    const id = setInterval(() => playTick(t.volume), 1000);
    return () => clearInterval(id);
  }, [t.tickingEnabled, t.running, t.phase, t.volume]);
}

// The Pomodoro timer card. Lives in the app-shell sidebar (and is the first
// thing shown on mobile). All state/persistence is in `@/lib/timer-store`; this
// component is pure presentation + dispatching actions. Visual values track the
// mockup's `.timer-card` (docs/design.md → App design language).
export default function TimerCard() {
  const t = useTimer();
  const openModal = useSessionPostStore((s) => s.openModal);
  const [showSettings, setShowSettings] = useState(false);
  useTimerSounds(t);

  const onPrimary = () => {
    unlockAudio(); // unlock the AudioContext on this user gesture
    if (t.running) t.pause();
    else if (t.phase === "idle") t.start();
    else t.resume();
  };

  const onEndSession = () => {
    const pending = getPendingSession();
    if (!pending) return;
    if (t.running) t.pause(); // freeze the clock behind the modal
    openModal(pending);
  };

  const primaryLabel = t.running ? "Pause" : t.phase === "idle" ? "Start" : "Resume";
  const PrimaryIcon = t.running ? Pause : Play;
  // Dots = progress toward the session goal (the long-break cadence is separate).
  const goal = t.sessionGoal;
  const filledDots = Math.min(t.pomodorosCompleted, goal);
  const percent = Math.round(t.progress * 100);
  const idle = t.phase === "idle";
  const onBreak = t.phase === "break";
  const label = phaseLabel(t);

  return (
    <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-white">Your session</span>
        <div className="flex items-center gap-1.5">
          {/* Always available so sound can be tweaked mid-session; the modal
              locks the duration fields while a session is running. */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label="Timer settings"
            aria-haspopup="dialog"
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full text-[#888888] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
          >
            <Settings size={14} aria-hidden />
          </button>
          <span className="rounded-[20px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-2 py-[3px] text-[10px] text-[#22C55E]">
            {label}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <TimerSettingsModal t={t} onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      <div
        role="timer"
        aria-live="off"
        aria-label={`${label} — ${t.clock} remaining`}
        className="mt-1 mb-3 text-center text-[42px] font-bold leading-none tracking-[-2px] text-white tabular-nums"
      >
        {t.clock}
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mb-3.5 h-[3px] overflow-hidden rounded-[2px] bg-[#2A2A2A]"
      >
        <div
          className="h-full rounded-[2px] bg-[#22C55E] transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mb-3.5 flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: goal }).map((_, i) => (
          <motion.span
            key={`${i}-${i < filledDots}`}
            aria-hidden
            initial={i < filledDots ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className={`h-[9px] w-[9px] rounded-full ${
              i < filledDots ? "bg-[#22C55E]" : "bg-[#2A2A2A]"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrimary}
          className="flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] bg-[#22C55E] text-[13px] font-medium text-[#0A0A0A] transition-opacity hover:opacity-90"
        >
          <PrimaryIcon size={15} aria-hidden />
          {primaryLabel}
        </button>
        <button
          type="button"
          onClick={t.restart}
          disabled={idle}
          aria-label="Restart current timer"
          title="Restart the current timer (keeps your session)"
          className="flex min-h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw size={15} aria-hidden />
        </button>
      </div>

      {/* Skip the break straight into the next focus block. */}
      <AnimatePresence>
        {onBreak && (
          <motion.button
            type="button"
            onClick={t.skipBreak}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="mt-2 flex min-h-[38px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[12px] font-medium text-[#888888] transition-colors hover:text-white"
          >
            <SkipForward size={13} aria-hidden />
            Skip break
          </motion.button>
        )}
      </AnimatePresence>

      {/* End the session — opens the wrap-up where you post or discard it. Only
          meaningful once one's underway. */}
      <AnimatePresence>
        {!idle && (
          <motion.button
            type="button"
            onClick={onEndSession}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="mt-2 flex min-h-[38px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] text-[12px] font-medium text-[#22C55E] transition-colors hover:bg-[#143d1d]"
          >
            <Square size={13} aria-hidden />
            End session
          </motion.button>
        )}
      </AnimatePresence>

      <div className="mt-2.5 rounded-[8px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-3 py-2.5">
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.06em] text-[#22C55E]">
          This session
        </p>
        <div className="flex gap-4">
          <div>
            <div className="text-[18px] font-semibold text-[#22C55E] tabular-nums">
              {t.pomodorosCompleted}
            </div>
            <div className="text-[10px] uppercase tracking-[0.05em] text-[#3E7D4E]">
              Pomodoros
            </div>
          </div>
          <div>
            <div className="text-[18px] font-semibold text-[#22C55E] tabular-nums">
              {t.focusMinutes} min
            </div>
            <div className="text-[10px] uppercase tracking-[0.05em] text-[#3E7D4E]">
              Focus time
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
