"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Minus, Plus, Volume2, VolumeX, X } from "lucide-react";
import { LIMITS, type TimerView } from "@/lib/timer-store";
import { playAlarm as ringAlarm } from "@/lib/timer-sounds";
import { getDailyGoal } from "@/lib/client-queries";
import { updateDailyGoal } from "@/lib/mutations";
import { formatFocusLong } from "@/lib/format";

// Pomodoro settings modal — opened from the timer card's gear. Holds the things
// too numerous for the old inline popover: custom focus / short break / long break
// lengths, the session goal (dot count) and the long-break interval (long break
// after every N), the daily focus target, and sound preferences.
//
// Durations + session fields are committed on Save via setConfig (resetting to a
// fresh idle session) and are locked while a session runs. Sound prefs apply live
// — toggling or sliding gives immediate feedback, and can change anytime.
//
// The daily target is the one ACCOUNT-level field here (a profiles column that
// drives the navbar ring — Step 20); everything else is this device's store. It
// lives in this modal anyway because users look for focus config at the timer,
// not on the profile settings page. Loaded on open, written on Save.

function clampField(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

// Daily-target stepper bounds: 15-min steps, stepping below the minimum turns
// it off (null), and turning it on starts at 60 — one click covers the common
// case instead of four.
const GOAL_STEP = 15;
const GOAL_MIN = 15;
const GOAL_MAX = 720;
const GOAL_START = 60;

export default function TimerSettingsModal({
  t,
  userId,
  onClose,
}: {
  t: TimerView;
  userId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [focus, setFocus] = useState(t.focusMin);
  const [shortBreak, setShortBreak] = useState(t.shortBreakMin);
  const [longBreak, setLongBreak] = useState(t.longBreakMin);
  const [sessionGoal, setSessionGoal] = useState(t.sessionGoal);
  const [longBreakInterval, setLongBreakInterval] = useState(t.longBreakInterval);

  // Daily focus target (account-level). Loaded when the modal opens; `saved`
  // remembers what the DB holds so Save only writes when it actually changed.
  const [goalMinutes, setGoalMinutes] = useState<number | null>(null);
  const [goalLoaded, setGoalLoaded] = useState(false);
  const [goalError, setGoalError] = useState(false);
  const savedGoal = useRef<number | null>(null);
  useEffect(() => {
    let on = true;
    void getDailyGoal(userId).then((g) => {
      if (!on) return;
      savedGoal.current = g;
      setGoalMinutes(g);
      setGoalLoaded(true);
    });
    return () => {
      on = false;
    };
  }, [userId]);

  // Remembers the volume to restore when the speaker is un-muted. Seeded with the
  // current level (or a sensible default if we open already at zero) and kept in
  // sync whenever the slider moves to a non-zero value.
  const [lastVolume, setLastVolume] = useState(t.volume > 0 ? t.volume : 0.5);
  const muted = t.volume === 0;

  function toggleMute() {
    if (muted) {
      t.setSound({ volume: lastVolume > 0 ? lastVolume : 0.5 });
    } else {
      setLastVolume(t.volume);
      t.setSound({ volume: 0 });
    }
  }

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

  // Save (idle) and Done (locked) both land here: the daily target commits in
  // either mode (it's account-level, not a phase length — no reason to lock it),
  // while the timer config only commits when idle. A failed goal write keeps the
  // modal open so the user's choice isn't silently dropped.
  async function save() {
    if (goalLoaded && goalMinutes !== savedGoal.current) {
      setGoalError(false);
      const { error } = await updateDailyGoal(userId, goalMinutes);
      if (error) {
        console.error("updateDailyGoal:", error.message);
        setGoalError(true);
        return;
      }
      savedGoal.current = goalMinutes;
      router.refresh(); // the navbar ring reads the goal from the server
    }
    if (locked) {
      onClose();
      return;
    }
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
    <motion.div
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="timer-settings-title"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-[420px] flex-col overflow-hidden rounded-t-[16px] border-[0.5px] border-[#2A2A2A] bg-[#141414] sm:max-h-[85vh] sm:rounded-[16px]"
      >
        <div className="flex items-start justify-between p-5 pb-0">
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

        {/* Scrollable body — keeps the header and the action bar pinned so the
            Save/Done buttons never get clipped when the modal is taller than the
            viewport (short screens, browser zoom). */}
        <div className="scrollbar-slim flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-5">
          {locked && (
            <p className="rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-[11px] leading-relaxed text-[#888888]">
              A session is running — durations are locked. Sound, auto-start,
              and the daily target can still be changed. Finish or restart the
              timer to edit lengths.
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
            <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
              You&apos;re aiming for {sessionGoal} pomodoro{sessionGoal === 1 ? "" : "s"}{" "}
              (the dots on the card), with a long break after every{" "}
              {longBreakInterval}.
            </p>
          </section>

          {/* Daily target (Step 20) — account-level, synced on Save/Done. Not
              idle-locked: it's a day-level goal, not a phase length, so it stays
              editable mid-session (the locked Done button commits it). */}
          <section className="flex flex-col gap-2.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#22C55E]">
              Daily target
            </p>
            <div
              className={`flex items-center justify-between gap-2 ${
                !goalLoaded ? "opacity-50" : ""
              }`}
            >
              <span className="text-[13px] text-[#CCCCCC]">Daily focus target</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setGoalMinutes((g) =>
                      g === null || g - GOAL_STEP < GOAL_MIN
                        ? null
                        : g - GOAL_STEP,
                    )
                  }
                  disabled={!goalLoaded || goalMinutes === null}
                  aria-label="Decrease daily focus target"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus size={13} aria-hidden />
                </button>
                <span className="flex h-8 min-w-[88px] items-center justify-center rounded-[6px] border-[0.5px] border-[#2A2A2A] bg-[#0A0A0A] px-2 text-[13px] tabular-nums">
                  {goalMinutes !== null ? (
                    <span className="text-white">{formatFocusLong(goalMinutes)}</span>
                  ) : (
                    <span className="text-[#8A8A8A]">Off</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setGoalMinutes((g) =>
                      g === null ? GOAL_START : Math.min(GOAL_MAX, g + GOAL_STEP),
                    )
                  }
                  disabled={!goalLoaded || goalMinutes === GOAL_MAX}
                  aria-label="Increase daily focus target"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={13} aria-hidden />
                </button>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
              Fills the ring around your avatar as you focus each day. Synced to
              your account.
            </p>
            {goalError && (
              <p role="alert" className="text-[11px] text-red-400">
                Couldn&apos;t save your daily target. Please try again.
              </p>
            )}
          </section>

          {/* Flow — applies live (like sound): no phase length changes, so not
              idle-locked. Takes effect at the next boundary. */}
          <section className="flex flex-col gap-2.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#22C55E]">
              Flow
            </p>
            <Toggle
              label="Auto-start breaks"
              checked={t.autoStartBreaks}
              onChange={(v) => t.setFlow({ autoStartBreaks: v })}
            />
            <Toggle
              label="Auto-start next focus"
              checked={t.autoStartFocus}
              onChange={(v) => t.setFlow({ autoStartFocus: v })}
            />
            <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
              Shortcuts: <kbd className="text-[#888888]">Space</kbd> start/pause ·{" "}
              <kbd className="text-[#888888]">S</kbd> skip break ·{" "}
              <kbd className="text-[#888888]">E</kbd> end session.
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
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
                aria-pressed={muted}
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-[#888888] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
              >
                {muted ? (
                  <VolumeX size={15} aria-hidden />
                ) : (
                  <Volume2 size={15} aria-hidden />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(t.volume * 100)}
                aria-label="Volume"
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  t.setSound({ volume: v });
                  if (v > 0) setLastVolume(v);
                }}
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
        </div>

        {/* Pinned action bar — divider separates it from the scrolling body.
            While locked there are no durations to commit (sound applies live),
            so we offer Done — which still commits a changed daily target. */}
        <div className="flex justify-end gap-2 border-t-[0.5px] border-[#2A2A2A] p-5 pt-4">
          {locked ? (
            <button
              type="button"
              onClick={save}
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
      </motion.div>
    </motion.div>
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
          <span className="w-7 text-[11px] text-[#8A8A8A]">{unit}</span>
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
        <motion.span
          aria-hidden
          animate={{ left: checked ? 16 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white"
        />
      </span>
    </button>
  );
}
