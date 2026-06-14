"use client";

// Shared Pomodoro timer store (Slice 2 / Step 3).
//
// Why a module-level store instead of component state: the timer renders in the
// app-shell sidebar but must keep running while navigating, AND a later step
// (Step 10) hides the notification bell while a focus block is running — so the
// navbar needs to read the timer's state too. A single source of truth shared
// via `useSyncExternalStore` gives every consumer the same, tear-free state.
//
// Persistence (the critical part — PRD §9.3, client-trusted): we store
// *timestamps*, never a remaining-seconds counter. On mount we recompute elapsed
// from `Date.now()`, so a refresh or a laptop sleeping through the countdown
// can't reset it. The 1s interval only *renders* the derived value.

import { useSyncExternalStore } from "react";

export type TimerPhase = "idle" | "focus" | "break";

export const FOCUS_MS = 25 * 60 * 1000;
export const BREAK_MS = 5 * 60 * 1000;
export const SESSION_GOAL = 8; // pomodoro dots shown in the timer card

const STORAGE_KEY = "seshn:timer:v1";

interface PersistedState {
  phase: TimerPhase;
  phaseStartedAt: number | null; // epoch ms the running phase's clock began
  pausedAt: number | null; // epoch ms when paused; null while running
  accumulatedPauseMs: number; // total paused time within the current phase
  pomodorosCompleted: number; // filled dots this session
  sessionStartedAt: number | null; // first focus start of the session
}

export interface Snapshot extends PersistedState {
  now: number; // volatile "current time"; frozen while idle/paused
}

const INITIAL: PersistedState = {
  phase: "idle",
  phaseStartedAt: null,
  pausedAt: null,
  accumulatedPauseMs: 0,
  pomodorosCompleted: 0,
  sessionStartedAt: null,
};

function phaseDurationMs(phase: TimerPhase): number {
  return phase === "break" ? BREAK_MS : FOCUS_MS;
}

function isRunning(s: PersistedState): boolean {
  return s.phase !== "idle" && s.pausedAt === null;
}

// --- module-level state (single source of truth) ---
let persisted: PersistedState = INITIAL;
let now = 0;
let hydrated = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function buildSnapshot(): Snapshot {
  return { ...persisted, now };
}

let snapshot: Snapshot = buildSnapshot();

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // storage unavailable (private mode etc.) — timer still works in-memory
  }
}

function emit(): void {
  snapshot = buildSnapshot();
  for (const l of listeners) l();
}

// Advance past any phase whose time has fully elapsed. We pause at each boundary
// so finishing a block is a deliberate moment (and so a long sleep advances at
// most focus→break, never runs away). Returns true if the phase changed.
function advanceIfElapsed(): boolean {
  if (!isRunning(persisted) || persisted.phaseStartedAt == null) return false;
  const total = phaseDurationMs(persisted.phase);
  const elapsed = Date.now() - persisted.phaseStartedAt - persisted.accumulatedPauseMs;
  if (elapsed < total) return false;

  const completedAt = persisted.phaseStartedAt + persisted.accumulatedPauseMs + total;
  if (persisted.phase === "focus") {
    persisted = {
      phase: "break",
      phaseStartedAt: completedAt,
      pausedAt: completedAt, // ready & paused — user starts the break
      accumulatedPauseMs: 0,
      pomodorosCompleted: persisted.pomodorosCompleted + 1,
      sessionStartedAt: persisted.sessionStartedAt,
    };
  } else {
    persisted = {
      ...persisted,
      phase: "focus",
      phaseStartedAt: completedAt,
      pausedAt: completedAt,
      accumulatedPauseMs: 0,
    };
  }
  persist();
  return true;
}

function ensureTicking(): void {
  const shouldTick = isRunning(persisted) && listeners.size > 0;
  if (shouldTick && intervalId == null) {
    intervalId = setInterval(tick, 1000);
  } else if (!shouldTick && intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function tick(): void {
  now = Date.now();
  advanceIfElapsed();
  emit();
  ensureTicking(); // stop the interval if we just paused at a boundary
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) persisted = { ...INITIAL, ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch {
    persisted = INITIAL;
  }
  now = Date.now();
  advanceIfElapsed(); // catch up after a refresh / sleep
  snapshot = buildSnapshot();
}

function commit(next: PersistedState): void {
  persisted = next;
  now = Date.now();
  persist();
  emit();
  ensureTicking();
}

// --- actions ---
export function startTimer(): void {
  if (persisted.phase !== "idle") return resumeTimer();
  const t = Date.now();
  commit({
    phase: "focus",
    phaseStartedAt: t,
    pausedAt: null,
    accumulatedPauseMs: 0,
    pomodorosCompleted: 0,
    sessionStartedAt: t,
  });
}

export function pauseTimer(): void {
  if (!isRunning(persisted)) return;
  commit({ ...persisted, pausedAt: Date.now() });
}

export function resumeTimer(): void {
  if (persisted.phase === "idle") return startTimer();
  if (persisted.pausedAt == null) return; // already running
  commit({
    ...persisted,
    accumulatedPauseMs: persisted.accumulatedPauseMs + (Date.now() - persisted.pausedAt),
    pausedAt: null,
  });
}

export function resetTimer(): void {
  commit({ ...INITIAL });
}

// --- store wiring for useSyncExternalStore ---
function subscribe(listener: () => void): () => void {
  if (!hydrated) hydrate();
  listeners.add(listener);
  ensureTicking();
  return () => {
    listeners.delete(listener);
    ensureTicking();
  };
}

function getSnapshot(): Snapshot {
  return snapshot;
}

const SERVER_SNAPSHOT: Snapshot = { ...INITIAL, now: 0 };
function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

// --- derived values ---
function deriveRemaining(s: Snapshot): { remainingMs: number; totalMs: number } {
  if (s.phase === "idle" || s.phaseStartedAt == null) {
    return { remainingMs: FOCUS_MS, totalMs: FOCUS_MS };
  }
  const totalMs = phaseDurationMs(s.phase);
  const end = s.pausedAt ?? s.now;
  const elapsed = end - s.phaseStartedAt - s.accumulatedPauseMs;
  return { remainingMs: Math.max(0, totalMs - elapsed), totalMs };
}

function deriveFocusMinutes(s: Snapshot): number {
  let ms = s.pomodorosCompleted * FOCUS_MS;
  if (s.phase === "focus" && s.phaseStartedAt != null) {
    const end = s.pausedAt ?? s.now;
    ms += Math.min(FOCUS_MS, Math.max(0, end - s.phaseStartedAt - s.accumulatedPauseMs));
  }
  return Math.floor(ms / 60000);
}

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
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
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useTimer(): TimerView {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
    start: startTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    reset: resetTimer,
  };
}
