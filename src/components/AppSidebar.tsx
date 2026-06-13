// App-shell sidebar. It lives in `(app)/layout.tsx` (not per-page) so it persists
// across navigation — the Pomodoro timer must keep running while moving between
// the feed and profiles. The real cards drop into these slots later:
// TimerCard (Step 3), StreakCard (Step 11), FriendsActivityCard.
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
    <aside className="hidden flex-col gap-3 overflow-y-auto p-4 lg:flex">
      <PlaceholderCard
        title="Your session"
        note="Your Pomodoro timer lands here — start a focus block and it keeps running as you move around the app."
      />
      <PlaceholderCard
        title="Day streak"
        note="Post a session today to start a streak. Your 7-day strip shows up here."
      />
      <PlaceholderCard
        title="Friends activity"
        note="See who's focusing right now and how long they've put in today."
      />
    </aside>
  );
}
