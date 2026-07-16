import type { ReactNode } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { getViewer } from "@/lib/viewer";

// Shared chrome for everything in this group — both the auth-gated screens (in the
// nested (authed) group) and the public profile route (/[username], which lives
// here too). The auth gate itself moved down into (authed)/layout; this layout
// only picks the chrome:
//   • signed-in, onboarded viewer → the full AppShell (navbar + sidebar timer)
//   • everyone else → a light, shareable brand bar (only the public profile ever
//     renders here signed-out — the (authed) pages redirect to /login themselves)
//
// Keeping AppShell in THIS persistent segment is what stops the full remount: a
// signed-in viewer navigating /feed ↔ /username now stays inside this layout, so
// only <main> swaps and the running sidebar timer survives — same as /friends.
// getViewer() (createClient → cookies()) renders this dynamically, which is right.
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await getViewer();

  if (viewer) {
    return (
      <AppShell
        userId={viewer.id}
        username={viewer.username}
        displayName={viewer.displayName}
        dailyGoalMinutes={viewer.dailyGoalMinutes}
      >
        {children}
      </AppShell>
    );
  }

  // Signed-out (or not-yet-onboarded): light standalone bar. Only the public
  // profile reaches this branch — the authed screens gate themselves one layer
  // down and redirect to /login before they'd ever render here.
  return (
    <div className="min-h-dvh bg-[#0A0A0A]">
      <header className="flex h-[52px] items-center border-b-[0.5px] border-[#2A2A2A] bg-[#111111] px-4 sm:px-5">
        <Link href="/feed" className="flex items-center gap-[7px]">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[#22C55E]" />
          <span className="text-base font-medium text-white">Seshn</span>
        </Link>
      </header>
      {children}
    </div>
  );
}
