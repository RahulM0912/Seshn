"use client";

// Pomodoro sounds, synthesized with the Web Audio API — no audio files to ship,
// host, or license. A phase-boundary "alarm" (a short ascending three-note
// chime) and an optional soft "tick" each second during focus.
//
// Browsers block audio until a user gesture; since the only way a timer starts is
// the user clicking Start, the AudioContext is created/resumed lazily on first
// play and is unlocked by that gesture. Everything is best-effort: if audio is
// unavailable we just stay silent.

type WindowWithWebkit = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// Call from a user gesture (e.g. pressing Start) to unlock audio ahead of the
// first programmatic sound on some browsers.
export function unlockAudio(): void {
  getCtx();
}

function beep(
  ac: AudioContext,
  freq: number,
  startAt: number,
  durationMs: number,
  volume: number,
  type: OscillatorType = "sine",
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const dur = durationMs / 1000;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.02);
}

// Three ascending notes (A5 · C#6 · E6) — a pleasant "phase done" chime.
export function playAlarm(volume = 0.5): void {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const notes = [880, 1108.73, 1318.51];
  notes.forEach((freq, i) => {
    beep(ac, freq, now + i * 0.16, 230, Math.min(1, volume) * 0.6);
  });
}

// A short, quiet click — the classic ticking clock during a focus block.
export function playTick(volume = 0.5): void {
  const ac = getCtx();
  if (!ac) return;
  beep(ac, 1100, ac.currentTime, 35, Math.min(1, volume) * 0.18, "square");
}
