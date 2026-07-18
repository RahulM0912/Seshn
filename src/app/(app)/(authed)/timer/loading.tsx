// Shown by the App Router while /timer resolves its per-request data (session
// user + streak + friends activity). The page is `force-dynamic`, so without
// this boundary a tab tap blocks on the server round-trip and the app feels
// hung on mobile — with it, navigation swaps instantly to skeletons like the
// other tabs. Mirrors the page's stack: timer card, streak card, friends card.
export default function TimerLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      {/* TimerCard */}
      <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="h-3 w-24 animate-pulse rounded bg-[#1C1C1C]" />
          <div className="h-5 w-14 animate-pulse rounded-[20px] bg-[#1C1C1C]" />
        </div>
        <div className="mx-auto mt-1 mb-3 h-[42px] w-36 animate-pulse rounded bg-[#1C1C1C]" />
        <div className="mb-3.5 h-[3px] rounded-[2px] bg-[#2A2A2A]" />
        <div className="mb-3.5 flex justify-center gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[9px] w-[9px] animate-pulse rounded-full bg-[#1C1C1C]"
            />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-[42px] flex-1 animate-pulse rounded-[8px] bg-[#1C1C1C]" />
          <div className="h-[42px] w-[42px] animate-pulse rounded-[8px] bg-[#1C1C1C]" />
        </div>
      </div>

      {/* StreakCard */}
      <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-12 animate-pulse rounded bg-[#1C1C1C]" />
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 w-16 animate-pulse rounded bg-[#1C1C1C]" />
            <div className="h-2 w-32 animate-pulse rounded bg-[#1C1C1C]" />
          </div>
        </div>
        <div className="mt-2.5 flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-7 flex-1 animate-pulse rounded-[4px] bg-[#1C1C1C]"
            />
          ))}
        </div>
      </div>

      {/* FriendsActivityCard */}
      <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
        <div className="mb-3 h-2.5 w-28 animate-pulse rounded bg-[#1C1C1C]" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-7 w-7 flex-shrink-0 animate-pulse rounded-full bg-[#1C1C1C]" />
              <div className="h-2.5 w-40 animate-pulse rounded bg-[#1C1C1C]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
