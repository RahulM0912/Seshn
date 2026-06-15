import TimerCard from "@/components/TimerCard";
import StreakCard from "@/components/StreakCard";
import FriendsActivityCard from "@/components/FriendsActivityCard";

// App-shell sidebar. It lives in `(app)/layout.tsx` (not per-page) so it persists
// across navigation — the Pomodoro timer keeps running while moving between the
// feed and profiles. StreakCard and FriendsActivityCard (Step 11) both ship here.
//
// `userId` is the signed-in viewer (the sidebar always shows the VIEWER's streak
// and the VIEWER's friends, even when they're looking at someone else's profile
// via the shared AppShell).
//
// Responsive: on mobile this column reflows ABOVE the feed (see the layout's
// `order` classes) so the timer — the primary action — is the first thing you
// see. Streak/friends stay desktop-only (the mobile sidebar is timer-first).
export default function AppSidebar({ userId }: { userId: string }) {
  return (
    <aside className="order-1 flex flex-col gap-3 p-4 md:order-2 md:overflow-y-auto">
      <TimerCard />
      <div className="hidden flex-col gap-3 md:flex">
        <StreakCard userId={userId} />
        <FriendsActivityCard userId={userId} />
      </div>
    </aside>
  );
}
