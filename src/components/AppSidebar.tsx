import TimerCard from "@/components/TimerCard";

// App-shell sidebar. It lives in `(app)/layout.tsx` (not per-page) so it persists
// across navigation — the Pomodoro timer keeps running while moving between the
// feed and profiles. StreakCard (Step 11) and FriendsActivityCard replace the
// placeholders below.
//
// Responsive: on mobile this column reflows ABOVE the feed (see the layout's
// `order` classes) so the timer — the primary action — is the first thing you
// see. The streak/friends placeholders are desktop-only for now (they're not
// real yet); Step 11 decides their mobile home when they ship.
function PlaceholderCard({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
      <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#888888]">
        {title}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-[#555555]">{note}</p>
    </div>
  );
}

export default function AppSidebar() {
  return (
    <aside className="order-1 flex flex-col gap-3 p-4 md:order-2 md:overflow-y-auto">
      <TimerCard />
      <div className="hidden flex-col gap-3 md:flex">
        <PlaceholderCard
          title="Day streak"
          note="Post a session today to start a streak. Your 7-day strip shows up here."
        />
        <PlaceholderCard
          title="Friends activity"
          note="See who's focusing right now and how long they've put in today."
        />
      </div>
    </aside>
  );
}
