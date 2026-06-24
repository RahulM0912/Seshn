import PersonRowSkeleton from "@/components/PersonRowSkeleton";

// Shown by the App Router while the Friends page resolves its per-request follow
// graph. Because the page is `force-dynamic`, `<Link>` prefetch can only reach
// this loading boundary — having it here is what makes navigating to Friends feel
// instant (the navbar + sidebar stay put; only this column swaps to skeletons).
// Mirrors the page's two-section layout (Following / Followers).
export default function FriendsLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-7 p-4">
      {Array.from({ length: 2 }).map((_, section) => (
        <section key={section}>
          <div className="mb-3 h-2.5 w-24 animate-pulse rounded bg-[#1C1C1C]" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <PersonRowSkeleton key={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
