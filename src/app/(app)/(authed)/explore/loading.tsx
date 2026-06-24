import FeedTabs from "@/components/FeedTabs";
import PersonRowSkeleton from "@/components/PersonRowSkeleton";

// Shown by the App Router while the Explore page resolves its per-request people
// list. The page is `force-dynamic`, so `<Link>` prefetch only reaches this
// boundary — having it makes the Following → Explore tab switch swap instantly.
// Renders the real (already-static) tabs so they stay live, with a search-bar
// placeholder and a few person skeletons standing in for the directory.
export default function ExploreLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      <FeedTabs active="explore" />
      <div className="h-[42px] w-full animate-pulse rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414]" />
      <div className="mt-1 h-2.5 w-16 animate-pulse rounded bg-[#1C1C1C]" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <PersonRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
