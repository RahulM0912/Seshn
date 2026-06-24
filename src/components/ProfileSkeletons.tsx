import SessionCardSkeleton from "@/components/SessionCardSkeleton";

// Section skeletons for the profile page's two heavy, streamed blocks. Shared by
// the route `loading.tsx` (initial navigation) and the page's inline <Suspense>
// fallbacks (header paints first, these stream in) so the placeholder shape is
// identical in both. Margins live here so spacing matches the real sections.

// Mirrors the FocusHeatmap card: a label bar over a grid of day cells.
export function ProfileHeatmapSkeleton() {
  return (
    <div className="mt-3 animate-pulse rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
      <div className="mb-3 h-2.5 w-28 rounded bg-[#1C1C1C]" />
      <div className="flex gap-1">
        {Array.from({ length: 16 }).map((_, col) => (
          <div key={col} className="flex flex-1 flex-col gap-1">
            {Array.from({ length: 7 }).map((_, row) => (
              <div key={row} className="aspect-square rounded-[2px] bg-[#1C1C1C]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Mirrors the SessionList: a "Sessions" label over a couple of card skeletons.
export function ProfileSessionsSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="h-2.5 w-20 animate-pulse rounded bg-[#1C1C1C]" />
      <SessionCardSkeleton />
      <SessionCardSkeleton />
    </div>
  );
}
