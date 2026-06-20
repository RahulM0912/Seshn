// Loading placeholder that mirrors `SessionCard`'s layout (avatar + author, the
// pomodoro dots row, the big focus-time block, a subject pill, the footer). Shown
// while a session list is loading its *first* set of cards — the feed's route
// `loading.tsx` and the profile's visibility-filter reset — where the shape is
// known and a skeleton beats a blank gap. Pure presentation; reuses the app's
// `animate-pulse` + #141414/#1C1C1C skeleton idiom (see `AppSidebar`).
export default function SessionCardSkeleton() {
  return (
    <div
      aria-hidden
      className="animate-pulse rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] px-4 py-3.5"
    >
      {/* Author */}
      <div className="mb-3 flex items-center gap-2.5">
        <div className="h-[34px] w-[34px] flex-shrink-0 rounded-full bg-[#1C1C1C]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-28 rounded bg-[#1C1C1C]" />
          <div className="h-2.5 w-36 rounded bg-[#1C1C1C]" />
        </div>
      </div>

      {/* Pomodoro dots */}
      <div className="mb-2.5 flex items-center gap-[5px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[9px] w-[9px] rounded-full bg-[#1C1C1C]" />
        ))}
      </div>

      {/* Focus time + label */}
      <div className="h-8 w-32 rounded bg-[#1C1C1C]" />
      <div className="mb-2.5 mt-[6px] h-2.5 w-24 rounded bg-[#1C1C1C]" />

      {/* Subject pill */}
      <div className="mb-2.5 h-5 w-40 rounded-[20px] bg-[#1C1C1C]" />

      {/* Footer */}
      <div className="flex items-center gap-3 border-t-[0.5px] border-[#1C1C1C] pt-2.5">
        <div className="h-3 w-8 rounded bg-[#1C1C1C]" />
        <div className="h-3 w-8 rounded bg-[#1C1C1C]" />
        <div className="ml-auto h-4 w-12 rounded-full bg-[#1C1C1C]" />
      </div>
    </div>
  );
}
