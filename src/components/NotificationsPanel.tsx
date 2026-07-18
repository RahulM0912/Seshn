"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { avatarColor, initials, relativeTime } from "@/lib/format";
import type { NotificationFeedItem } from "@/lib/database.types";

// The inbox dropdown (Step 10) — newest first. Presentational: NotificationsBell
// owns the data + open state and renders this when open. Each row links somewhere
// sensible: a `follow` goes to the actor's profile; a `like`/`comment` deep-links
// to the session permalink (`comment` opens the thread via `?c=1`). Rows fetched
// while unread render highlighted, even though opening the panel marks them read.

function actionText(type: NotificationFeedItem["type"]): string {
  if (type === "like") return "liked your session";
  if (type === "comment") return "commented on your session";
  return "started following you";
}

// Where a row navigates. follow → the actor's profile; like/comment → the session
// permalink (comment opens its thread). A like/comment row always carries a
// session_id (DB CHECK), but fall back to your own profile defensively.
function hrefFor(n: NotificationFeedItem, viewerUsername: string): string {
  if (n.type === "follow") return `/${n.actor.username}`;
  if (!n.session_id) return `/${viewerUsername}`;
  return `/session/${n.session_id}${n.type === "comment" ? "?c=1" : ""}`;
}

export default function NotificationsPanel({
  items,
  loading,
  viewerUsername,
  onNavigate,
}: {
  items: NotificationFeedItem[];
  loading: boolean;
  viewerUsername: string;
  onNavigate: () => void;
}) {
  return (
    <motion.div
      role="menu"
      aria-label="Notifications"
      initial={{ opacity: 0, scale: 0.95, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -6 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute right-0 top-[calc(100%+8px)] z-50 max-h-[70vh] w-80 overflow-y-auto overflow-x-hidden overscroll-contain rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] py-1 shadow-xl shadow-black/40"
    >
      <div className="border-b-[0.5px] border-[#2A2A2A] px-3 py-2.5 text-[13px] font-medium text-white">
        Notifications
      </div>

      {loading ? (
        <p className="px-3 py-8 text-center text-[12px] text-[#8A8A8A]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-3 py-9 text-center">
          <Bell size={18} className="text-[#8A8A8A]" aria-hidden />
          <p className="text-[12px] font-medium text-[#888888]">Nothing yet</p>
          <p className="max-w-[200px] text-[11px] leading-relaxed text-[#8A8A8A]">
            Likes, comments, and new followers will show up here.
          </p>
        </div>
      ) : (
        <ul>
          {items.map((n) => {
            const av = avatarColor(n.actor.id);
            const href = hrefFor(n, viewerUsername);
            return (
              <li key={n.id}>
                <Link
                  href={href}
                  role="menuitem"
                  onClick={onNavigate}
                  className={`flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-[#1C1C1C] ${
                    n.read_at ? "" : "bg-[#22C55E0D]"
                  }`}
                >
                  <span
                    aria-hidden
                    style={{ backgroundColor: av.bg, color: av.text }}
                    className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
                  >
                    {initials(n.actor.display_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-snug text-[#888888]">
                      <span className="font-medium text-white">
                        {n.actor.display_name}
                      </span>{" "}
                      {actionText(n.type)}
                    </p>
                    {n.type === "comment" && n.commentBody && (
                      <p className="mt-0.5 truncate text-[11px] text-[#8A8A8A]">
                        “{n.commentBody}”
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-[#8A8A8A]">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.read_at && (
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#22C55E]"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
