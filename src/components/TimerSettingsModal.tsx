"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Volume2, X } from "lucide-react";
import { LIMITS, type TimerView } from "@/lib/timer-store";
import { playAlarm as ringAlarm } from "@/lib/timer-sounds";

// Pomodoro settings modal — opened from the timer card's gear. Holds the things
// too numerous for the old inline popover: custom focus / short break / long break
// lengths, the session goal (dot count) and the long-break interval (long break
// after every N), and sound preferences.
//
// Durations + session fields are committed on Save via setConfig (resetting to a
// fresh idle session) and are locked while a session runs. Sound prefs apply live
// — toggling or sliding gives immediate feedback, and can change anytime.

function clampField(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export default function TimerSettingsModal({
  t,
  onClose,
}: {
  t: TimerView;
  onClose: () => void;
}) {
  const [focus, setFocus] = useState(t.focusMin);
  const [shortBreak, setShortBreak] = useState(t.shortBreakMin);
  const [longBreak, setLongBreak] = useState(t.longBreakMin);
  const [sessionGoal, setSessionGoal] = useState(t.sessionGoal);
  const [longBreakInterval, setLongBreakInterval] = useState(t.longBreakInterval);

  // Durations are locked once a session is underway (so every pomodoro stays the
  // same length). Sound still adjusts live — that's why the gear stays available.
  const locked = t.phase !== "idle";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    t.setConfig({
      focusMin: clampField(focus, LIMITS.focusMin.min, LIMITS.focusMin.max),
      shortBreakMin: clampField(
        shortBreak,
        LIMITS.shortBreakMin.min,
        LIMITS.shortBreakMin.max,
      ),
      longBreakMin: clampField(
        longBreak,
        LIMITS.longBreakMin.min,
        LIMITS.longBreakMin.max,
      ),
      sessionGoal: clampField(
        sessionGoal,
        LIMITS.sessionGoal.min,
        LIMITS.sessionGoal.max,
      ),
      longBreakInterval: clampField(
        longBreakInterval,
        LIMITS.longBreakInterval.min,
        LIMITS.longBreakInterval.max,
      ),
    });
    onClose();
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="timer-settings-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[420px] flex-col gap-5 rounded-t-[16px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5 sm:rounded-[16px]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="timer-settings-title"
              className="text-[15px] font-semibold text-white"
            >
              Timer settings
            </h2>
            <p className="mt-0.5 text-[12px] text-[#888888]">
              Customize your focus rhythm and sounds.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
          >
            <X size={15} aria-hidden />
          </button>
        </div>

        {locked && (
          <p className="-mt-1 rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-[11px] leading-relaxed text-[#888888]">
            A session is running — durations are locked. Sound can still be
            changed. Finish or restart the timer to edit lengths.
          </p>
        )}

        {/* Durations */}
        <section className="flex flex-col gap-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#22C55E]">
            Durations
          </p>
          <Stepper
            label="Focus"
            value={focus}
            onChange={setFocus}
            min={LIMITS.focusMin.min}
            max={LIMITS.focusMin.max}
            unit="min"
            disabled={locked}
          />
          <Stepper
            label="Short break"
            value={shortBreak}
            onChange={setShortBreak}
            min={LIMITS.shortBreakMin.min}
            max={LIMITS.shortBreakMin.max}
            unit="min"
            disabled={locked}
          />
          <Stepper
            label="Long break"
            value={longBreak}
            onChange={setLongBreak}
            min={LIMITS.longBreakMin.min}
            max={LIMITS.longBreakMin.max}
            unit="min"
            disabled={locked}
          />
        </section>

        {/* Sessions */}
        <section className="flex flex-col gap-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#22C55E]">
            Sessions
          </p>
          <Stepper
            label="Session goal"
            value={sessionGoal}
            onChange={setSessionGoal}
            min={LIMITS.sessionGoal.min}
            max={LIMITS.sessionGoal.max}
            disabled={locked}
          />
          <Stepper
            label="Long break after every"
            value={longBreakInterval}
            onChange={setLongBreakInterval}
            min={LIMITS.longBreakInterval.min}
            max={LIMITS.longBreakInterval.max}
            disabled={locked}
          />
          <p className="text-[11px] leading-relaxed text-[#555555]">
            You&apos;re aiming for {sessionGoal} pomodoro{sessionGoal === 1 ? "" : "s"}{" "}
            (the dots on the card), with a long break after every{" "}
            {longBreakInterval}.
          </p>
        </section>

        {/* Sound */}
        <section className="flex flex-col gap-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#22C55E]">
            Sound
          </p>
          <Toggle
            label="Alarm when a phase ends"
            checked={t.soundEnabled}
            onChange={(v) => {
              t.setSound({ soundEnabled: v });
              if (v) ringAlarm(t.volume);
            }}
          />
          <Toggle
            label="Ticking while the timer runs"
            checked={t.tickingEnabled}
            onChange={(v) => t.setSound({ tickingEnabled: v })}
          />
          <div className="flex items-center gap-3 pt-0.5">
            <Volume2 size={15} aria-hidden className="shrink-0 text-[#888888]" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(t.volume * 100)}
              aria-label="Volume"
              onChange={(e) => t.setSound({ volume: Number(e.target.value) / 100 })}
              className="h-1 w-full cursor-pointer accent-[#22C55E]"
            />
            <button
              type="button"
              onClick={() => ringAlarm(t.volume)}
              className="shrink-0 cursor-pointer rounded-[6px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-2.5 py-1.5 text-[11px] text-[#888888] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
            >
              Test
            </button>
          </div>
        </section>

        {/* While locked there are no durations to commit (sound applies live),
            so we just offer Done. */}
        <div className="flex justify-end gap-2 pt-1">
          {locked ? (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[20px] bg-[#22C55E] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-[20px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="cursor-pointer rounded-[20px] bg-[#22C55E] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit?: string;
  disabled?: boolean;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className={`flex items-center justify-between gap-2 ${disabled ? "opacity-50" : ""}`}>
      <span className="text-[13px] text-[#CCCCCC]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => set(value - 1)}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label}`}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus size={13} aria-hidden />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) ? n : min);
          }}
          onBlur={() => set(value)}
          className="h-8 w-12 rounded-[6px] border-[0.5px] border-[#2A2A2A] bg-[#0A0A0A] text-center text-[13px] text-white tabular-nums outline-none focus:border-[#22C55E] disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => set(value + 1)}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label}`}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={13} aria-hidden />
        </button>
        {unit && (
          <span className="w-7 text-[11px] text-[#555555]">{unit}</span>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center justify-between gap-2 rounded-[6px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
    >
      <span className="text-[13px] text-[#CCCCCC]">{label}</span>
      <span
        aria-hidden
        className={`relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#22C55E]" : "bg-[#2A2A2A]"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white transition-[left] ${
            checked ? "left-[16px]" : "left-[2px]"
          }`}
        />
      </span>
    </button>
  );
}
