import { Suspense } from "react";
import TimerCard from "@/components/TimerCard";
import StreakCard from "@/components/StreakCard";
import FriendsActivityCard from "@/components/FriendsActivityCard";

function StreakSkeleton() {
  return (
    <div className="animate-pulse rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-16 rounded-[6px] bg-[#1C1C1C]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-20 rounded bg-[#1C1C1C]" />
          <div className="h-2.5 w-32 rounded bg-[#1C1C1C]" />
        </div>
      </div>
      <div className="mt-2.5 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-7 flex-1 rounded-[4px] bg-[#1C1C1C]" />
        ))}
      </div>
    </div>
  );
}

function FriendsSkeleton() {
  return (
    <div className="animate-pulse rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
      <div className="mb-3 h-2.5 w-28 rounded bg-[#1C1C1C]" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="mb-2 flex items-center gap-2 py-1">
          <div className="h-7 w-7 flex-shrink-0 rounded-full bg-[#1C1C1C]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-[#1C1C1C]" />
            <div className="h-2.5 w-16 rounded bg-[#1C1C1C]" />
          </div>
          <div className="h-5 w-10 rounded-full bg-[#1C1C1C]" />
        </div>
      ))}
    </div>
  );
}

// Desktop-only since Step 24: phones get the timer on the /timer tab instead of
// the old stacked-above-the-feed layout, so the whole aside hides below md (the
// old `order` reflow + the md-gated inner wrapper are gone with it).
export default function AppSidebar({ userId }: { userId: string }) {
  return (
    <aside className="scrollbar-slim hidden flex-col gap-3 p-4 md:flex md:overflow-y-auto">
      <TimerCard userId={userId} />
      <Suspense fallback={<StreakSkeleton />}>
        <StreakCard userId={userId} />
      </Suspense>
      <Suspense fallback={<FriendsSkeleton />}>
        <FriendsActivityCard userId={userId} />
      </Suspense>
    </aside>
  );
}
