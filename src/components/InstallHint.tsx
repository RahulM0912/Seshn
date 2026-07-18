"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import {
  isIos,
  isStandalone,
  promptInstall,
  useCanInstall,
} from "@/lib/pwa-install";

const DISMISS_KEY = "seshn:install-hint-dismissed";

// One-time install hint on the /timer tab (Step 25) — the page a phone user
// hits every session, so it's the natural place for the single non-nagging
// nudge. Shows only when an install path exists (Chromium prompt captured, or
// iOS Safari) and never again after dismiss (localStorage, forever — the
// avatar-menu row remains the permanent entry point).
export default function InstallHint() {
  const canPrompt = useCanInstall();
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hidden until checked

  useEffect(() => {
    setIos(isIos() && !isStandalone());
    try {
      setDismissed(
        localStorage.getItem(DISMISS_KEY) === "1" || isStandalone(),
      );
    } catch {
      setDismissed(false); // storage unavailable — still show it
    }
  }, []);

  if (dismissed || (!canPrompt && !ios)) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // fine — it just reappears next visit
    }
    setDismissed(true);
  }

  return (
    <div className="flex items-center gap-3 rounded-[12px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-3.5 py-3">
      <Download size={15} className="shrink-0 text-[#22C55E]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-white">
          Add Seshn to your home screen
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[#3E7D4E]">
          {canPrompt
            ? "One tap from your home screen to your timer."
            : "In Safari: Share → “Add to Home Screen”."}
        </p>
      </div>
      {canPrompt && (
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="shrink-0 cursor-pointer rounded-[20px] bg-[#22C55E] px-3 py-1.5 text-[11px] font-medium text-[#0A0A0A] transition-opacity hover:opacity-90"
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install hint"
        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#3E7D4E] transition-colors hover:text-[#22C55E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/50"
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  );
}
