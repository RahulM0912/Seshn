"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutList, Timer, User, Users } from "lucide-react";

// Bottom tab bar, phones only (Step 24) — the thumb-reachable primary nav:
// Feed / Timer / Friends / Profile. A normal flex child at the bottom of the
// fixed app shell (not position:fixed), so content above can never render
// underneath it; the safe-area padding keeps it clear of gesture-nav bars.
// Desktop (md+) keeps the top navbar links and never sees this.
export default function MobileTabBar({ username }: { username: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/feed", label: "Feed", Icon: LayoutList },
    { href: "/timer", label: "Timer", Icon: Timer },
    { href: "/friends", label: "Friends", Icon: Users },
    { href: `/${username}`, label: "Profile", Icon: User },
  ];

  return (
    <nav
      aria-label="Primary"
      className="flex flex-shrink-0 border-t-[0.5px] border-[#2A2A2A] bg-[#111111] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
              active ? "text-white" : "text-[#8A8A8A]"
            }`}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
