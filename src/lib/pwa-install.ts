"use client";

// Install-prompt plumbing (Step 25). Chromium fires `beforeinstallprompt` once,
// early — often before any component mounts — so the capture lives at module
// scope (this file loads with the navbar bundle) and components subscribe to
// what was caught. iOS Safari never fires it: there the UI shows "Add to Home
// Screen" instructions instead (see isIos below). Never auto-popups — the
// prompt only opens from an explicit user click.

import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // no mini-infobar; we surface our own entry points
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

/** Already running as an installed app (any platform)? */
export function isStandalone(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari's non-standard flag for home-screen launches.
      (navigator as { standalone?: boolean }).standalone === true)
  );
}

/** iOS device (incl. iPadOS pretending to be a Mac) — no install prompt API. */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Open the captured Chromium install prompt (no-op if none was captured).
 *  Chrome allows one prompt() per captured event, so it's cleared after. */
export async function promptInstall(): Promise<void> {
  const ev = deferred;
  if (!ev) return;
  deferred = null;
  notify();
  await ev.prompt();
}

/** Reactive "an install prompt is available" flag (false during SSR). */
export function useCanInstall(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => deferred !== null,
    () => false,
  );
}
