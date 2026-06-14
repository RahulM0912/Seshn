"use client";

import { Pause, Play, RefreshCw } from "lucide-react";
import { SESSION_GOAL, useTimer, type TimerPhase } from "@/lib/timer-store";

const PHASE_LABEL: Record<TimerPhase, string> = {
  idle: "Ready",
  focus: "Focus",
  break: "Break",
};

// The Pomodoro timer card. Lives in the app-shell sidebar (and is the first
// thing shown on mobile). All state/persistence is in `@/lib/timer-store`; this
// component is pure presentation + dispatching actions. Visual values track the
// mockup's `.timer-card` (docs/design.md → App design language).
export default function TimerCard() {
  const t = useTimer();

  const onPrimary = () => {
    if (t.running) t.pause();
    else if (t.phase === "idle") t.start();
    else t.resume();
  };

  const primaryLabel = t.running ? "Pause" : t.phase === "idle" ? "Start" : "Resume";
  const PrimaryIcon = t.running ? Pause : Play;
  const filledDots = Math.min(t.pomodorosCompleted, SESSION_GOAL);
  const percent = Math.round(t.progress * 100);

  return (
    <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-white">Your session</span>
        <span className="rounded-[20px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-2 py-[3px] text-[10px] text-[#22C55E]">
          {PHASE_LABEL[t.phase]}
        </span>
      </div>

      <div
        role="timer"
        aria-live="off"
        aria-label={`${PHASE_LABEL[t.phase]} — ${t.clock} remaining`}
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

      <div className="mb-3.5 flex justify-center gap-1.5">
        {Array.from({ length: SESSION_GOAL }).map((_, i) => (
          <span
            key={i}
            aria-hidden
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
          onClick={t.reset}
          disabled={t.phase === "idle"}
          aria-label="Reset timer"
          className="flex min-h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw size={15} aria-hidden />
        </button>
      </div>

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
              {t.focusMinutes}m
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
