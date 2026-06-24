import {
  ProfileHeatmapSkeleton,
  ProfileSessionsSkeleton,
} from "@/components/ProfileSkeletons";

// Shown by the App Router while the profile page's shell (header) resolves. The
// profile is a root-level route that renders its own AppShell *inside* the page,
// so this boundary sits under the root layout with no chrome — hence the minimal
// brand bar, sized to match the real 52px header so there's no layout jump. The
// body mirrors the page: header card → heatmap → session list (the latter two
// reuse the same section skeletons the page streams behind).
export default function ProfileLoading() {
  return (
    <div className="min-h-dvh bg-[#0A0A0A]">
      <header className="flex h-[52px] items-center border-b-[0.5px] border-[#2A2A2A] bg-[#111111] px-4 sm:px-5">
        <span className="flex items-center gap-[7px]">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[#22C55E]" />
          <span className="text-base font-medium text-white">Seshn</span>
        </span>
      </header>

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
    </div>
  );
}
