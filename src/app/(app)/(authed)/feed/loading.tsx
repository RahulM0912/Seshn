import FeedTabs from "@/components/FeedTabs";
import SessionCardSkeleton from "@/components/SessionCardSkeleton";

// Shown by the App Router while the feed page resolves its per-request server
// data. It renders inside the (app) layout's AppShell, so the navbar + sidebar
// stay put and only this main column swaps — no blank gap on navigation. Mirrors
// the feed's own container + tabs, with a few card skeletons standing in for the
// sessions that are loading.
export default function FeedLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      <FeedTabs active="following" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SessionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
