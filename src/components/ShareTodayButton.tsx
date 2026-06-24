"use client";

import { useState } from "react";
import { Check, Loader2, Share2 } from "lucide-react";
import { shareCard } from "@/lib/share-card";

// "Share today" — own-profile only. Generates today's focus story card via the
// shared adaptive `shareCard` helper: native share sheet on mobile, copy-to-
// clipboard on desktop. The /api/share-card route is the security boundary (it
// renders only the authenticated viewer's own data), so this is pure UI.
export default function ShareTodayButton() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const outcome = await shareCard();
      // Mobile's native sheet gives its own UI; on desktop confirm the copy/save.
      if (outcome === "copied" || outcome === "downloaded") {
        setDone(outcome === "copied" ? "Copied" : "Saved");
        setTimeout(() => setDone(""), 1500);
      }
    } catch (err) {
      // The user dismissing the native share sheet rejects with AbortError —
      // that's a normal cancel, not a failure, so don't surface it.
      if ((err as Error).name !== "AbortError") {
        setError("Couldn't create card");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        aria-label="Share today's focus"
        className="flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-[20px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:border-[#22C55E] hover:text-[#22C55E] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {done ? (
          <Check size={14} className="text-[#22C55E]" aria-hidden />
        ) : busy ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : (
          <Share2 size={14} aria-hidden />
        )}
        {done || (busy ? "Creating…" : "Share")}
      </button>
      {error && (
        <span role="alert" className="text-[11px] text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
