import {
  ProfileHeatmapSkeleton,
  ProfileSessionsSkeleton,
} from "@/components/ProfileSkeletons";

// Suspense fallback while the profile page resolves its per-viewer data. The
// chrome (navbar + sidebar when signed-in, light bar signed-out) is rendered by
// the parent (app) layout and stays put — this only fills <main>, so it mirrors
// just the body: header card → heatmap → session list (the latter two reuse the
// same section skeletons the real page renders).
export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header card: avatar + name/handle + stat row */}
      <section className="animate-pulse rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 flex-shrink-0 rounded-full bg-[#1C1C1C]" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-5 w-40 rounded bg-[#1C1C1C]" />
            <div className="h-3 w-24 rounded bg-[#1C1C1C]" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-4 w-10 rounded bg-[#1C1C1C]" />
              <div className="h-2 w-12 rounded bg-[#1C1C1C]" />
            </div>
          ))}
        </div>
      </section>

      <ProfileHeatmapSkeleton />
      <ProfileSessionsSkeleton />
    </div>
  );
}
