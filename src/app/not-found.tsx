import Link from "next/link";

// Branded 404 — shown for unknown routes and wherever a page calls `notFound()`
// (a bad @username, a deleted/private session permalink). Replaces Next's bare
// default with the app's look + a way back. Renders under the root layout, so it
// gets the standalone brand bar rather than the signed-in chrome.
export default function NotFound() {
  return (
    <div className="min-h-dvh bg-[#0A0A0A]">
      <header className="flex h-[52px] items-center border-b-[0.5px] border-[#2A2A2A] bg-[#111111] px-4 sm:px-5">
        <Link href="/feed" className="flex items-center gap-[7px]">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[#22C55E]" />
          <span className="text-base font-medium text-white">Seshn</span>
        </Link>
      </header>

      <div className="flex flex-col items-center px-6 py-24 text-center">
        <p className="font-[family-name:var(--font-mono)] text-[44px] font-bold leading-none text-[#1F1F1F]">
          404
        </p>
        <h1 className="mt-5 text-lg font-semibold text-white">Not found</h1>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[#888888]">
          This page doesn&apos;t exist, or it&apos;s private. The link may be old
          or the session may have been deleted.
        </p>
        <Link
          href="/feed"
          className="mt-6 rounded-[20px] bg-[#22C55E] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055]"
        >
          Back to feed
        </Link>
      </div>
    </div>
  );
}
