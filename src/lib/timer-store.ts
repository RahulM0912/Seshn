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

import { useEffect } from "react";
import { create } from "zustand";

export type TimerPhase = "idle" | "focus" | "break";

export const SESSION_GOAL = 8; // pomodoro dots shown in the timer card
export const DEFAULT_FOCUS_MS = 25 * 60 * 1000;
export const DEFAULT_BREAK_MS = 5 * 60 * 1000;

// Selectable focus / break lengths (minutes). Durations can only be changed
// while idle — changing mid-session is disallowed, which keeps every completed
// pomodoro in a session the same length (so `pomodorosCompleted * focusMs` for
// total focus time stays correct).
export const FOCUS_PRESETS = [15, 25, 50] as const;
export const BREAK_PRESETS = [5, 10, 15] as const;

const STORAGE_KEY = "seshn:timer:v1";

interface PersistedState {
  phase: TimerPhase;
  phaseStartedAt: number | null; // epoch ms the running phase's clock began
  pausedAt: number | null; // epoch ms when paused; null while running
  accumulatedPauseMs: number; // total paused time within the current phase
  pomodorosCompleted: number; // filled dots this session
  sessionStartedAt: number | null; // first focus start of the session
  focusMs: number; // chosen focus length
  breakMs: number; // chosen break length
}

const INITIAL: PersistedState = {
  phase: "idle",
  phaseStartedAt: null,
  pausedAt: null,
  accumulatedPauseMs: 0,
  pomodorosCompleted: 0,
  sessionStartedAt: null,
  focusMs: DEFAULT_FOCUS_MS,
  breakMs: DEFAULT_BREAK_MS,
};

interface TimerState extends PersistedState {
  now: number; // volatile "current time"; frozen while idle/paused
  hydrated: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setDurations: (focusMin: number, breakMin: number) => void;
  hydrate: () => void;
  tick: () => void;
}

function phaseDurationMs(
  s: Pick<PersistedState, "phase" | "focusMs" | "breakMs">,
): number {
  return s.phase === "break" ? s.breakMs : s.focusMs;
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
    breakMs: s.breakMs,
  };
}

function persist(s: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedOf(s)));
  } catch {
    // storage unavailable (private mode etc.) — timer still works in-memory
  }
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
        loaded = { ...INITIAL, ...(JSON.parse(raw) as Partial<PersistedState>) };
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

  reset() {
    const s = get();
    // Keep the chosen durations across a reset; everything else goes idle.
    const next: PersistedState = {
      ...INITIAL,
      focusMs: s.focusMs,
      breakMs: s.breakMs,
    };
    persist(next);
    set({ ...next, now: Date.now() });
    ensureTicking();
  },

  setDurations(focusMin, breakMin) {
    if (get().phase !== "idle") return; // locked once a session is underway
    const next: PersistedState = {
      ...INITIAL,
      focusMs: focusMin * 60 * 1000,
      breakMs: breakMin * 60 * 1000,
    };
    persist(next);
    set({ ...next, now: Date.now() });
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
  | "breakMs"
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
    startedAt: new Date(s.sessionStartedAt).toISOString(),
    endedAt: new Date(now).toISOString(),
  };
}

export interface TimerView {
  phase: TimerPhase;
  running: boolean;
  remainingMs: number;
  totalMs: number;
  progress: number; // 0..1
  pomodorosCompleted: number;
  focusMinutes: number;
  clock: string; // "mm:ss"
  focusMin: number; // current durations (minutes) for the settings UI
  breakMin: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setDurations: (focusMin: number, breakMin: number) => void;
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
    remainingMs,
    totalMs,
    progress: totalMs > 0 ? 1 - remainingMs / totalMs : 0,
    pomodorosCompleted: s.pomodorosCompleted,
    focusMinutes: deriveFocusMinutes(s),
    clock: formatClock(remainingMs),
    focusMin: Math.round(s.focusMs / 60000),
    breakMin: Math.round(s.breakMs / 60000),
    start: s.start,
    pause: s.pause,
    resume: s.resume,
    reset: s.reset,
    setDurations: s.setDurations,
  };
}
