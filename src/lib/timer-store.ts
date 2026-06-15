"use client";

// Shared Pomodoro timer store (Slice 2 / Step 3) — backed by zustand.
//
// Why a single shared store instead of component state: the timer renders in the
// app-shell sidebar but must keep running while navigating, AND a later step
// (Step 10) hides the notification bell while a focus block is running — so the
// navbar needs to read the timer's state too. One zustand store is the single
// source of truth every consumer subscribes to.
//
// Persistence (the critical part — PRD §9.3, client-trusted): we store
// *timestamps*, never a remaining-seconds counter. On mount we recompute elapsed
// from `Date.now()`, so a refresh or a laptop sleeping through the countdown
// can't reset it. The 1s interval only *renders* the derived value — it never
// decrements anything. We hydrate from localStorage in an effect (not at store
// creation) so the server and the first client paint both render the idle
// default, avoiding a hydration mismatch.
//
// Full pomodoro model: focus → short break, repeating, with a *long* break after
// every `longBreakInterval` pomodoros. `sessionGoal` is the separate target you
// aim for (the dot count). Durations + goal + interval are user-configured and
// locked while a session runs; sound preferences can change anytime. All of it
// persists in the same blob.

import { useEffect } from "react";
import { create } from "zustand";

export type TimerPhase = "idle" | "focus" | "break";

export const DEFAULT_FOCUS_MS = 25 * 60 * 1000;
export const DEFAULT_SHORT_BREAK_MS = 5 * 60 * 1000;
export const DEFAULT_LONG_BREAK_MS = 15 * 60 * 1000;
export const DEFAULT_SESSION_GOAL = 8; // pomodoros you aim for (= dot count)
export const DEFAULT_LONG_BREAK_INTERVAL = 4; // long break after every N pomodoros
export const DEFAULT_VOLUME = 0.5;

// Bounds for the settings modal — keep custom values sane (and within the
// sessions.focus_minutes 1..1440 CHECK once posted).
export const LIMITS = {
  focusMin: { min: 1, max: 120 },
  shortBreakMin: { min: 1, max: 60 },
  longBreakMin: { min: 1, max: 60 },
  sessionGoal: { min: 1, max: 16 },
  longBreakInterval: { min: 1, max: 12 },
} as const;

const STORAGE_KEY = "seshn:timer:v1";

export interface TimerConfig {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  sessionGoal: number; // pomodoros aimed for (dot count)
  longBreakInterval: number; // long break after every N pomodoros
}

export interface SoundConfig {
  soundEnabled: boolean; // chime at each phase boundary
  tickingEnabled: boolean; // soft tick each second during focus
  volume: number; // 0..1
}

interface PersistedState {
  phase: TimerPhase;
  phaseStartedAt: number | null; // epoch ms the running phase's clock began
  pausedAt: number | null; // epoch ms when paused; null while running
  accumulatedPauseMs: number; // total paused time within the current phase
  pomodorosCompleted: number; // filled dots this session
  sessionStartedAt: number | null; // first focus start of the session
  focusMs: number; // chosen focus length
  shortBreakMs: number; // chosen short break length
  longBreakMs: number; // chosen long break length
  sessionGoal: number; // pomodoros aimed for this session (dot count)
  longBreakInterval: number; // long break after every N pomodoros
  soundEnabled: boolean;
  tickingEnabled: boolean;
  volume: number;
}

const INITIAL: PersistedState = {
  phase: "idle",
  phaseStartedAt: null,
  pausedAt: null,
  accumulatedPauseMs: 0,
  pomodorosCompleted: 0,
  sessionStartedAt: null,
  focusMs: DEFAULT_FOCUS_MS,
  shortBreakMs: DEFAULT_SHORT_BREAK_MS,
  longBreakMs: DEFAULT_LONG_BREAK_MS,
  sessionGoal: DEFAULT_SESSION_GOAL,
  longBreakInterval: DEFAULT_LONG_BREAK_INTERVAL,
  soundEnabled: true,
  tickingEnabled: false,
  volume: DEFAULT_VOLUME,
};

interface TimerState extends PersistedState {
  now: number; // volatile "current time"; frozen while idle/paused
  hydrated: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  skipBreak: () => void;
  reset: () => void;
  setConfig: (config: TimerConfig) => void;
  setSound: (sound: Partial<SoundConfig>) => void;
  hydrate: () => void;
  tick: () => void;
}

// A break is the *long* one when the pomodoro that just finished completed a full
// interval. `pomodorosCompleted` is incremented exactly when we enter the break,
// so `% longBreakInterval === 0` (and > 0) deterministically marks the long break
// — no extra stored flag needed, which keeps it correct across refresh / sleep.
function isLongBreakState(
  s: Pick<PersistedState, "phase" | "pomodorosCompleted" | "longBreakInterval">,
): boolean {
  return (
    s.phase === "break" &&
    s.pomodorosCompleted > 0 &&
    s.pomodorosCompleted % s.longBreakInterval === 0
  );
}

function phaseDurationMs(
  s: Pick<
    PersistedState,
    | "phase"
    | "focusMs"
    | "shortBreakMs"
    | "longBreakMs"
    | "pomodorosCompleted"
    | "longBreakInterval"
  >,
): number {
  if (s.phase !== "break") return s.focusMs;
  return isLongBreakState(s) ? s.longBreakMs : s.shortBreakMs;
}

function isRunning(s: Pick<PersistedState, "phase" | "pausedAt">): boolean {
  return s.phase !== "idle" && s.pausedAt === null;
}

function persistedOf(s: PersistedState): PersistedState {
  return {
    phase: s.phase,
    phaseStartedAt: s.phaseStartedAt,
    pausedAt: s.pausedAt,
    accumulatedPauseMs: s.accumulatedPauseMs,
    pomodorosCompleted: s.pomodorosCompleted,
    sessionStartedAt: s.sessionStartedAt,
    focusMs: s.focusMs,
    shortBreakMs: s.shortBreakMs,
    longBreakMs: s.longBreakMs,
    sessionGoal: s.sessionGoal,
    longBreakInterval: s.longBreakInterval,
    soundEnabled: s.soundEnabled,
    tickingEnabled: s.tickingEnabled,
    volume: s.volume,
  };
}

function persist(s: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedOf(s)));
  } catch {
    // storage unavailable (private mode etc.) — timer still works in-memory
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

// Advance past any phase whose time has fully elapsed. We pause at each boundary
// so finishing a block is a deliberate moment (and so a long sleep advances at
// most focus→break, never runs away). Returns a NEW state if the phase changed,
// or the same reference if nothing changed.
function advanceIfElapsed(s: PersistedState): PersistedState {
  if (!isRunning(s) || s.phaseStartedAt == null) return s;
  const total = phaseDurationMs(s);
  const elapsed = Date.now() - s.phaseStartedAt - s.accumulatedPauseMs;
  if (elapsed < total) return s;

  const completedAt = s.phaseStartedAt + s.accumulatedPauseMs + total;
  if (s.phase === "focus") {
    return {
      ...s,
      phase: "break",
      phaseStartedAt: completedAt,
      pausedAt: completedAt, // ready & paused — user starts the break
      accumulatedPauseMs: 0,
      pomodorosCompleted: s.pomodorosCompleted + 1,
    };
  }
  return {
    ...s,
    phase: "focus",
    phaseStartedAt: completedAt,
    pausedAt: completedAt,
    accumulatedPauseMs: 0,
  };
}

// --- module-level ticking (shared across all consumers) ---
let intervalId: ReturnType<typeof setInterval> | null = null;
let consumers = 0;

export const useTimerStore = create<TimerState>((set, get) => ({
  ...INITIAL,
  now: 0,
  hydrated: false,

  hydrate() {
    if (get().hydrated) return;
    let loaded: PersistedState = INITIAL;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState> & {
          breakMs?: number; // legacy single break length (pre long-break)
          roundLength?: number; // legacy combined cadence+goal (pre split)
        };
        if (parsed.shortBreakMs == null && typeof parsed.breakMs === "number") {
          parsed.shortBreakMs = parsed.breakMs;
        }
        // The old `roundLength` did double duty; map it to the long-break cadence
        // (the more meaningful half) and leave the session goal at its default.
        if (
          parsed.longBreakInterval == null &&
          typeof parsed.roundLength === "number"
        ) {
          parsed.longBreakInterval = parsed.roundLength;
        }
        loaded = { ...INITIAL, ...parsed };
      }
    } catch {
      loaded = INITIAL;
    }
    const advanced = advanceIfElapsed(loaded); // catch up after refresh / sleep
    if (advanced !== loaded) persist(advanced);
    set({ ...advanced, now: Date.now(), hydrated: true });
    ensureTicking();
  },

  start() {
    const s = get();
    if (s.phase !== "idle") return get().resume();
    const t = Date.now();
    const next: PersistedState = {
      ...persistedOf(s),
      phase: "focus",
      phaseStartedAt: t,
      pausedAt: null,
      accumulatedPauseMs: 0,
      pomodorosCompleted: 0,
      sessionStartedAt: t,
    };
    persist(next);
    set({ ...next, now: t });
    ensureTicking();
  },

  pause() {
    const s = get();
    if (!isRunning(s)) return;
    const next = { ...persistedOf(s), pausedAt: Date.now() };
    persist(next);
    set({ ...next, now: Date.now() });
    ensureTicking();
  },

  resume() {
    const s = get();
    if (s.phase === "idle") return get().start();
    if (s.pausedAt == null) return; // already running
    const next = {
      ...persistedOf(s),
      accumulatedPauseMs: s.accumulatedPauseMs + (Date.now() - s.pausedAt),
      pausedAt: null,
    };
    persist(next);
    set({ ...next, now: Date.now() });
    ensureTicking();
  },

  restart() {
    // Restart only the *current* pomodoro/break: its clock goes back to full,
    // but the session itself (completed pomodoros, session start, phase) is kept.
    // Preserves the running/paused status so a restart-while-paused stays paused
    // at full. The full clear-to-idle is `reset()` (used after posting).
    const s = get();
    if (s.phase === "idle") return; // nothing underway to restart
    const t = Date.now();
    const next: PersistedState = {
      ...persistedOf(s),
      phaseStartedAt: t,
      accumulatedPauseMs: 0,
      pausedAt: s.pausedAt !== null ? t : null,
    };
    persist(next);
    set({ ...next, now: t });
    ensureTicking();
  },

  skipBreak() {
    // Skip the rest of a break and jump straight into the next focus block,
    // running immediately. Keeps the session (completed pomodoros, session start);
    // only meaningful during a break.
    const s = get();
    if (s.phase !== "break") return;
    const t = Date.now();
    const next: PersistedState = {
      ...persistedOf(s),
      phase: "focus",
      phaseStartedAt: t,
      pausedAt: null,
      accumulatedPauseMs: 0,
    };
    persist(next);
    set({ ...next, now: t });
    ensureTicking();
  },

  reset() {
    const s = get();
    // Keep all config (durations, goal, cadence, sound) across a reset; only the
    // running session goes idle.
    const next: PersistedState = {
      ...INITIAL,
      focusMs: s.focusMs,
      shortBreakMs: s.shortBreakMs,
      longBreakMs: s.longBreakMs,
      sessionGoal: s.sessionGoal,
      longBreakInterval: s.longBreakInterval,
      soundEnabled: s.soundEnabled,
      tickingEnabled: s.tickingEnabled,
      volume: s.volume,
    };
    persist(next);
    set({ ...next, now: Date.now() });
    ensureTicking();
  },

  setConfig(config) {
    if (get().phase !== "idle") return; // durations locked once a session is underway
    const s = get();
    const next: PersistedState = {
      ...INITIAL,
      focusMs: clamp(config.focusMin, LIMITS.focusMin.min, LIMITS.focusMin.max) * 60000,
      shortBreakMs:
        clamp(config.shortBreakMin, LIMITS.shortBreakMin.min, LIMITS.shortBreakMin.max) *
        60000,
      longBreakMs:
        clamp(config.longBreakMin, LIMITS.longBreakMin.min, LIMITS.longBreakMin.max) *
        60000,
      sessionGoal: clamp(
        config.sessionGoal,
        LIMITS.sessionGoal.min,
        LIMITS.sessionGoal.max,
      ),
      longBreakInterval: clamp(
        config.longBreakInterval,
        LIMITS.longBreakInterval.min,
        LIMITS.longBreakInterval.max,
      ),
      // sound prefs are independent of a reset
      soundEnabled: s.soundEnabled,
      tickingEnabled: s.tickingEnabled,
      volume: s.volume,
    };
    persist(next);
    set({ ...next, now: Date.now() });
  },

  setSound(sound) {
    const s = get();
    const next: PersistedState = {
      ...persistedOf(s),
      ...(sound.soundEnabled != null ? { soundEnabled: sound.soundEnabled } : {}),
      ...(sound.tickingEnabled != null ? { tickingEnabled: sound.tickingEnabled } : {}),
      ...(sound.volume != null
        ? { volume: Math.min(1, Math.max(0, sound.volume)) }
        : {}),
    };
    persist(next);
    set(next);
  },

  tick() {
    const p = persistedOf(get());
    const advanced = advanceIfElapsed(p);
    if (advanced !== p) {
      persist(advanced);
      set({ ...advanced, now: Date.now() });
    } else {
      set({ now: Date.now() });
    }
  },
}));

function ensureTicking(): void {
  const shouldTick = isRunning(useTimerStore.getState()) && consumers > 0;
  if (shouldTick && intervalId == null) {
    intervalId = setInterval(() => {
      useTimerStore.getState().tick();
      ensureTicking(); // stop the interval if we just paused at a boundary
    }, 1000);
  } else if (!shouldTick && intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// --- derived values ---
type DerivableState = Pick<
  PersistedState,
  | "phase"
  | "phaseStartedAt"
  | "pausedAt"
  | "accumulatedPauseMs"
  | "pomodorosCompleted"
  | "focusMs"
  | "shortBreakMs"
  | "longBreakMs"
  | "longBreakInterval"
> & { now: number };

function deriveRemaining(s: DerivableState): {
  remainingMs: number;
  totalMs: number;
} {
  if (s.phase === "idle" || s.phaseStartedAt == null) {
    return { remainingMs: s.focusMs, totalMs: s.focusMs };
  }
  const totalMs = phaseDurationMs(s);
  const end = s.pausedAt ?? s.now;
  const elapsed = end - s.phaseStartedAt - s.accumulatedPauseMs;
  return { remainingMs: Math.max(0, totalMs - elapsed), totalMs };
}

function deriveFocusMinutes(s: DerivableState): number {
  let ms = s.pomodorosCompleted * s.focusMs;
  if (s.phase === "focus" && s.phaseStartedAt != null) {
    const end = s.pausedAt ?? s.now;
    ms += Math.min(
      s.focusMs,
      Math.max(0, end - s.phaseStartedAt - s.accumulatedPauseMs),
    );
  }
  return Math.floor(ms / 60000);
}

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Snapshot of the in-progress session for the post-session modal. Null when
// there's nothing worth posting (idle / no session started).
export interface PendingSession {
  focusMinutes: number;
  pomodorosCompleted: number;
  pomodorosPlanned: number;
  startedAt: string; // ISO
  endedAt: string; // ISO
}

export function getPendingSession(): PendingSession | null {
  const s = useTimerStore.getState();
  if (s.phase === "idle" || s.sessionStartedAt == null) return null;
  const now = Date.now();
  const focusMinutes = deriveFocusMinutes({ ...s, now });
  return {
    // sessions.focus_minutes is CHECK 1..1440 — floor a sub-minute session to 1.
    focusMinutes: Math.max(1, focusMinutes),
    pomodorosCompleted: s.pomodorosCompleted,
    pomodorosPlanned: s.sessionGoal,
    startedAt: new Date(s.sessionStartedAt).toISOString(),
    endedAt: new Date(now).toISOString(),
  };
}

export interface TimerView {
  phase: TimerPhase;
  running: boolean;
  isLongBreak: boolean;
  remainingMs: number;
  totalMs: number;
  progress: number; // 0..1
  pomodorosCompleted: number;
  focusMinutes: number;
  clock: string; // "mm:ss"
  // current config (for the settings modal)
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  sessionGoal: number;
  longBreakInterval: number;
  soundEnabled: boolean;
  tickingEnabled: boolean;
  volume: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  skipBreak: () => void;
  reset: () => void;
  setConfig: (config: TimerConfig) => void;
  setSound: (sound: Partial<SoundConfig>) => void;
}

export function useTimer(): TimerView {
  const s = useTimerStore();

  // Hydrate from localStorage and register as a ticking consumer. hydrate() is
  // idempotent, so multiple consumers (e.g. a future navbar indicator) are fine.
  useEffect(() => {
    useTimerStore.getState().hydrate();
    consumers += 1;
    ensureTicking();
    return () => {
      consumers -= 1;
      ensureTicking();
    };
  }, []);

  const { remainingMs, totalMs } = deriveRemaining(s);
  return {
    phase: s.phase,
    running: isRunning(s),
    isLongBreak: isLongBreakState(s),
    remainingMs,
    totalMs,
    progress: totalMs > 0 ? 1 - remainingMs / totalMs : 0,
    pomodorosCompleted: s.pomodorosCompleted,
    focusMinutes: deriveFocusMinutes(s),
    clock: formatClock(remainingMs),
    focusMin: Math.round(s.focusMs / 60000),
    shortBreakMin: Math.round(s.shortBreakMs / 60000),
    longBreakMin: Math.round(s.longBreakMs / 60000),
    sessionGoal: s.sessionGoal,
    longBreakInterval: s.longBreakInterval,
    soundEnabled: s.soundEnabled,
    tickingEnabled: s.tickingEnabled,
    volume: s.volume,
    start: s.start,
    pause: s.pause,
    resume: s.resume,
    restart: s.restart,
    skipBreak: s.skipBreak,
    reset: s.reset,
    setConfig: s.setConfig,
    setSound: s.setSound,
  };
}
