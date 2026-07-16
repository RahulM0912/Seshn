"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";

// Root error boundary — catches a thrown render/data error from any route that
// doesn't have a closer boundary (landing, profile, session, login, onboarding).
// Replaces Next's bare default with a branded, recoverable screen: `reset()`
// re-renders the segment (retries the failed server fetch), with a feed link as
// the escape hatch. Layout errors are handled separately by `global-error.tsx`.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the digest in the console; the full error is server-side only.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0A0A0A] px-6 text-center">
      <span aria-hidden className="mb-5 h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
      <h1 className="text-lg font-semibold text-white">Something broke</h1>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[#888888]">
        That didn&apos;t load — usually a passing hiccup. Try again, or head back
        to your feed.
      </p>
      <div className="mt-6 flex items-center gap-2.5">
        <button
          type="button"
          onClick={reset}
          className="flex cursor-pointer items-center gap-1.5 rounded-[20px] bg-[#22C55E] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055]"
        >
          <RotateCw size={14} aria-hidden />
          Try again
        </button>
        <Link
          href="/feed"
          className="rounded-[20px] border-[0.5px] border-[#2A2A2A] px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-white"
        >
          Back to feed
        </Link>
      </div>
    </div>
  );
}
