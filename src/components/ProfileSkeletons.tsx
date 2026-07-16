import SessionCardSkeleton from "@/components/SessionCardSkeleton";

// Section skeletons for the profile page's two heavy, streamed blocks. Shared by
// the route `loading.tsx` (initial navigation) and the page's inline <Suspense>
// fallbacks (header paints first, these stream in) so the placeholder shape is
// identical in both. Margins live here so spacing matches the real sections.

// Mirrors the FocusHeatmap card 1:1 (same p-5, mt-6, header row, the ~53 fluid
// week columns with square day cells, and the legend) so the placeholder is the
// same size as the real grid — no oversized cells, no jump when it resolves.
const HEATMAP_WEEKS = 53; // ~12 months, like the live "Current" range
export function ProfileHeatmapSkeleton() {
  return (
    <section className="mt-6 animate-pulse rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5">
      {/* Header: title + stats + range button */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="h-3 w-24 rounded bg-[#1C1C1C]" />
        <div className="flex items-center gap-4">
          <div className="hidden h-2.5 w-32 rounded bg-[#1C1C1C] sm:block" />
          <div className="h-7 w-20 rounded-full bg-[#1C1C1C]" />
        </div>
      </div>

      {/* Month axis: weekday-rail spacer + a thin row over the columns */}
      <div className="flex gap-[3px]">
        <div className="w-[12px] flex-shrink-0" />
        <div className="h-[10px] flex-1" />
      </div>

      {/* Weekday rail spacer + fluid week columns of square day cells */}
      <div className="mt-1 flex gap-[3px]">
        <div className="w-[12px] flex-shrink-0" />
        {Array.from({ length: HEATMAP_WEEKS }).map((_, col) => (
          <div key={col} className="flex min-w-0 flex-1 flex-col gap-[2px]">
            {Array.from({ length: 7 }).map((_, row) => (
              <span
                key={row}
                className="block aspect-square w-full rounded-[2px] bg-[#1C1C1C]"
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-[10px] w-[10px] rounded-[2px] bg-[#1C1C1C]" />
        ))}
      </div>
    </section>
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
