"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutList, LogOut, Settings, User, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarColor, initials } from "@/lib/format";
import DailyGoalRing from "@/components/DailyGoalRing";
import NotificationsBell from "@/components/NotificationsBell";

export default function AppNavbar({
  userId,
  username,
  displayName,
  dailyGoalMinutes,
}: {
  userId: string;
  username: string;
  displayName: string;
  /** Daily focus goal in minutes; null hides the avatar progress ring. */
  dailyGoalMinutes: number | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const av = avatarColor(userId);

  // Account menu: the avatar opens a dropdown (profile + sign out) rather than
  // linking straight to the profile — Profile already has its own nav link.
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const links = [
    { href: "/feed", label: "Feed", Icon: LayoutList },
    { href: "/friends", label: "Friends", Icon: Users },
    { href: `/${username}`, label: "Profile", Icon: User },
  ];

  return (
    <header className="flex h-[52px] flex-shrink-0 items-center justify-between border-b-[0.5px] border-[#2A2A2A] bg-[#111111] px-4 sm:px-5">
      <Link href="/feed" className="flex items-center gap-[7px]">
        <span aria-hidden className="h-2 w-2 rounded-full bg-[#22C55E]" />
        <span className="text-base font-medium text-white">Seshn</span>
      </Link>

      <nav className="flex items-center gap-1">
        {links.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              title={label}
              className={`flex items-center gap-[5px] rounded-[20px] px-2.5 py-2 text-[13px] transition-colors sm:py-[5px] ${
                active
                  ? "bg-[#1C1C1C] text-white"
                  : "text-[#888888] hover:text-white"
              }`}
            >
              <Icon size={15} aria-hidden />
              {/* Labels collapse to icon-only below sm so the bar fits on phones */}
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-[10px]">
        {/* Unread dot + inbox panel; hides itself while a focus block runs. */}
        <NotificationsBell viewerUsername={username} />
        <div ref={menuRef} className="relative">
          {/* Goal progress ring around the avatar (Step 20) — absolutely
              positioned so it never shifts layout; hidden when no goal is set. */}
          <DailyGoalRing userId={userId} goalMinutes={dailyGoalMinutes} />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={displayName}
            style={{ backgroundColor: av.bg, color: av.text }}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[11px] font-medium transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]"
          >
            {initials(displayName)}
          </button>

          <AnimatePresence>
          {menuOpen && (
            <motion.div
              role="menu"
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] py-1 shadow-xl shadow-black/40"
            >
              <div className="border-b-[0.5px] border-[#2A2A2A] px-3 py-2.5">
                <div className="truncate text-[13px] font-medium text-white">
                  {displayName}
                </div>
                <div className="truncate text-[11px] text-[#555555]">
                  @{username}
                </div>
              </div>
              <Link
                href={`/${username}`}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#888888] transition-colors hover:bg-[#1C1C1C] hover:text-white"
              >
                <User size={15} aria-hidden />
                View profile
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#888888] transition-colors hover:bg-[#1C1C1C] hover:text-white"
              >
                <Settings size={15} aria-hidden />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[#888888] transition-colors hover:bg-[#1C1C1C] hover:text-[#F87171] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={15} aria-hidden />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
