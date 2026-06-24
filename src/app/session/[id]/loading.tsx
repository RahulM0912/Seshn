import SessionCardSkeleton from "@/components/SessionCardSkeleton";

// Shown by the App Router while the session permalink resolves (deep-link target
// for like/comment notifications). Like the profile page it's a root-level route
// that renders its own AppShell inside the page, so this boundary has no chrome —
// hence the minimal brand bar (matched to the real 52px header). Body mirrors the
// page: a "back to feed" link and the single session card.
export default function SessionLoading() {
  return (
    <div className="min-h-dvh bg-[#0A0A0A]">
      <header className="flex h-[52px] items-center border-b-[0.5px] border-[#2A2A2A] bg-[#111111] px-4 sm:px-5">
        <span className="flex items-center gap-[7px]">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[#22C55E]" />
          <span className="text-base font-medium text-white">Seshn</span>
        </span>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 h-3 w-24 animate-pulse rounded bg-[#1C1C1C]" />
        <SessionCardSkeleton />
      </div>
    </div>
  );
}
