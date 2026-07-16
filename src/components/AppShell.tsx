import type { ReactNode } from "react";
import AppNavbar from "@/components/AppNavbar";
import AppSidebar from "@/components/AppSidebar";
import PostSessionModal from "@/components/PostSessionModal";

// The signed-in app chrome: navbar + the two-column grid (main + the persistent
// sidebar timer) + the post-session modal. Extracted from the (app) layout so the
// public profile page can reuse the SAME shell when a signed-in user views it —
// keeping the navbar and the running timer on screen across that navigation
// (the timer state is a module-level store, so it survives the remount).
// Signed-out profile visitors get a lighter standalone layout instead.
export default function AppShell({
  userId,
  username,
  displayName,
  dailyGoalMinutes,
  children,
}: {
  userId: string;
  username: string;
  displayName: string;
  /** Daily focus goal in minutes; null hides the navbar progress ring. */
  dailyGoalMinutes: number | null;
  children: ReactNode;
}) {
  // `fixed inset-0` pins the frame to the viewport so the document itself never
  // scrolls — only the two columns scroll internally. (The shared <body> is
  // `min-h-full flex` for the landing page; an `h-dvh` child inside it lets the
  // window scroll too, which produced a stray third scrollbar.)
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0A0A0A]">
      <AppNavbar
        userId={userId}
        username={username}
        displayName={displayName}
        dailyGoalMinutes={dailyGoalMinutes}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[1fr_320px] md:overflow-hidden lg:grid-cols-[1fr_400px]">
        <main className="order-2 md:order-1 md:overflow-y-auto md:border-r-[0.5px] md:border-[#2A2A2A]">
          {children}
        </main>
        <AppSidebar userId={userId} />
      </div>
      {/* Mounted at the shell level so it overlays the whole app; opened from the
          TimerCard's "End session" button via the post-session store. */}
      <PostSessionModal userId={userId} />
    </div>
  );
}
