"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";

// Error boundary for the signed-in app group (feed / friends / explore /
// settings). It renders *inside* the (app) layout, so the navbar + sidebar stay
// put and only the content column shows the error — the running timer and nav
// survive a failed page fetch. `reset()` retries the segment's server render.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center">
      <span aria-hidden className="mb-4 h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
      <h2 className="text-[15px] font-semibold text-white">
        Couldn&apos;t load this
      </h2>
      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[#888888]">
        Something went wrong fetching this page. Give it another go.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 flex cursor-pointer items-center gap-1.5 rounded-[20px] bg-[#22C55E] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055]"
      >
        <RotateCw size={14} aria-hidden />
        Try again
      </button>
    </div>
  );
}
