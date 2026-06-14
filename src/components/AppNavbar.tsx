"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutList, User, Users } from "lucide-react";
import { avatarColor, initials } from "@/lib/format";

export default function AppNavbar({
  userId,
  username,
  displayName,
}: {
  userId: string;
  username: string;
  displayName: string;
}) {
  const pathname = usePathname();
  const av = avatarColor(userId);

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
        {/* Notification bell — static placeholder; unread dot + panel land in Step 10. */}
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-full border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white"
        >
          <Bell size={15} aria-hidden />
        </button>
        <Link
          href={`/${username}`}
          aria-label="Your profile"
          title={displayName}
          style={{ backgroundColor: av.bg, color: av.text }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-medium"
        >
          {initials(displayName)}
        </Link>
      </div>
    </header>
  );
}
