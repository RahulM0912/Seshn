"use client";

import { useState } from "react";
import { Pause, Play, RefreshCw, Settings, Square } from "lucide-react";
import {
  BREAK_PRESETS,
  FOCUS_PRESETS,
  getPendingSession,
  SESSION_GOAL,
  useTimer,
  type TimerPhase,
} from "@/lib/timer-store";
import { useSessionPostStore } from "@/lib/session-post-store";

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
  const openModal = useSessionPostStore((s) => s.openModal);
  const [showSettings, setShowSettings] = useState(false);

  const onPrimary = () => {
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
  const filledDots = Math.min(t.pomodorosCompleted, SESSION_GOAL);
  const percent = Math.round(t.progress * 100);
  const idle = t.phase === "idle";

  return (
    <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-white">Your session</span>
        <div className="flex items-center gap-1.5">
          {/* Durations can only change while idle. */}
          {idle && (
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Timer settings"
              aria-expanded={showSettings}
              className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors hover:text-white ${
                showSettings ? "text-white" : "text-[#888888]"
              }`}
            >
              <Settings size={14} aria-hidden />
            </button>
          )}
          <span className="rounded-[20px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-2 py-[3px] text-[10px] text-[#22C55E]">
            {PHASE_LABEL[t.phase]}
          </span>
        </div>
      </div>

      {idle && showSettings && (
        <div className="mb-3.5 flex flex-col gap-2.5 rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#0A0A0A] p-3">
          <PresetRow
            label="Focus"
            values={FOCUS_PRESETS}
            selected={t.focusMin}
            onSelect={(min) => t.setDurations(min, t.breakMin)}
          />
          <PresetRow
            label="Break"
            values={BREAK_PRESETS}
            selected={t.breakMin}
            onSelect={(min) => t.setDurations(t.focusMin, min)}
          />
        </div>
      )}

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
          disabled={idle}
          aria-label="Reset timer"
          className="flex min-h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw size={15} aria-hidden />
        </button>
      </div>

      {/* End the session and post it — only meaningful once one's underway. */}
      {!idle && (
        <button
          type="button"
          onClick={onEndSession}
          className="mt-2 flex min-h-[38px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] text-[12px] font-medium text-[#22C55E] transition-colors hover:bg-[#143d1d]"
        >
          <Square size={13} aria-hidden />
          End session &amp; post
        </button>
      )}

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

function PresetRow({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: readonly number[];
  selected: number;
  onSelect: (min: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-[#888888]">{label}</span>
      <div className="flex gap-1.5">
        {values.map((min) => {
          const active = min === selected;
          return (
            <button
              key={min}
              type="button"
              onClick={() => onSelect(min)}
              aria-pressed={active}
              className={`min-w-[40px] cursor-pointer rounded-[6px] border-[0.5px] px-2 py-1 text-[11px] tabular-nums transition-colors ${
                active
                  ? "border-[#1A4D22] bg-[#0F2A15] text-[#22C55E]"
                  : "border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] hover:text-white"
              }`}
            >
              {min}m
            </button>
          );
        })}
      </div>
    </div>
  );
}
