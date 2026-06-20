"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import {
  getNotifications,
  getUnreadNotificationCount,
} from "@/lib/client-queries";
import { markNotificationsRead } from "@/lib/mutations";
import { useTimerStore } from "@/lib/timer-store";
import NotificationsPanel from "@/components/NotificationsPanel";
import type { NotificationFeedItem } from "@/lib/database.types";

// The notification bell (Step 10). Delivery is polling in v1: the unread count is
// re-fetched on mount and on every navigation (no realtime subscription). Opening
// the panel loads the inbox and marks everything read.
//
// Anti-distraction (PRD §9.8): the bell vanishes entirely while a focus block is
// actively counting down, and reappears the moment the timer is paused/idle/ended
// or on a break. We read just the `running-focus` boolean from the timer store via
// a selector, so the navbar only re-renders when that flips — not every tick.
export default function NotificationsBell({
  viewerUsername,
}: {
  viewerUsername: string;
}) {
  const pathname = usePathname();
  const focusRunning = useTimerStore(
    (s) => s.phase === "focus" && s.pausedAt === null,
  );

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Poll the unread count on load + on navigation. No point while hidden.
  useEffect(() => {
    if (focusRunning) return;
    let active = true;
    getUnreadNotificationCount().then((n) => {
      if (active) setUnread(n);
    });
    return () => {
      active = false;
    };
  }, [pathname, focusRunning]);

  // Close the panel on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openPanel = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    setItems(await getNotifications());
    setLoading(false);
    if (unread > 0) {
      setUnread(0); // clear the dot immediately
      const { error } = await markNotificationsRead();
      if (error) console.error("markNotificationsRead:", error.message);
    }
  }, [unread]);

  // Hidden while focusing — render nothing (hooks above still run unconditionally).
  if (focusRunning) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={
          unread > 0 ? `Notifications (${unread} unread)` : "Notifications"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] text-[#888888] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]"
      >
        <Bell size={15} aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute right-[6px] top-[6px] h-2 w-2 rounded-full bg-[#22C55E] ring-2 ring-[#111111]"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <NotificationsPanel
            items={items}
            loading={loading}
            viewerUsername={viewerUsername}
            onNavigate={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
