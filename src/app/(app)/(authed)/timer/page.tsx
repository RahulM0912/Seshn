import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TimerCard from "@/components/TimerCard";
import StreakCard from "@/components/StreakCard";
import FriendsActivityCard from "@/components/FriendsActivityCard";
import MobileOnlyRedirect from "@/components/MobileOnlyRedirect";
import { getSessionUser } from "@/lib/viewer";

// The mobile Timer tab (Step 24): the existing TimerCard full-width with the
// streak and friends activity under it — the whole desktop sidebar, as a page.
// Pure composition, no new UI. The timer state lives in the global zustand
// store, so hopping Feed ↔ Timer never resets a running session. On md+ this
// bounces to /feed (the sidebar already shows the timer there); the mobile
// sidebar stacking this replaces is gone from AppSidebar.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Timer · Seshn" };

export default async function TimerPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      <MobileOnlyRedirect to="/feed" />
      {/* effects={false}: the CSS-hidden sidebar TimerCard is still mounted and
          owns the global side effects (sounds, title, shortcuts) — a second
          owner would double-fire them. */}
      <TimerCard userId={user.id} effects={false} />
      <StreakCard userId={user.id} />
      <FriendsActivityCard userId={user.id} />
    </div>
  );
}
