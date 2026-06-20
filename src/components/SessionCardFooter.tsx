"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import LikeButton from "@/components/LikeButton";
import CommentSection from "@/components/CommentSection";
import VisibilityBadge from "@/components/VisibilityBadge";
import type { SessionWithProfile } from "@/lib/database.types";

// The interactive card footer for a signed-in viewer (Step 9): the 🔥 LikeButton,
// the 💬 toggle, and the visibility badge, plus the comment thread that expands
// below when the toggle is open. The comment count lives here (seeded from the
// session) so the toggle reflects the viewer's own posts/deletes instantly —
// CommentSection reports deltas via `onCountChange`. Signed-out viewers get the
// static footer in SessionCard instead (no auth = nothing to toggle/write).
export default function SessionCardFooter({
  session,
  viewerId,
  liked,
  defaultCommentsOpen = false,
}: {
  session: SessionWithProfile;
  viewerId: string;
  liked: boolean;
  defaultCommentsOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultCommentsOpen);
  const [count, setCount] = useState(session.comment_count);

  return (
    <>
      <footer className="flex items-center gap-3 border-t-[0.5px] border-[#1C1C1C] pt-2.5">
        <LikeButton
          sessionId={session.id}
          viewerId={viewerId}
          initialLiked={liked}
          initialCount={session.like_count}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Hide comments" : "Show comments"}
          className={`-m-1 flex cursor-pointer items-center gap-[5px] rounded-md p-1 text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#22C55E] ${
            open ? "text-[#888888]" : "text-[#555555] hover:text-[#888888]"
          }`}
        >
          <MessageCircle size={14} aria-hidden />
          <span className="tabular-nums">{count}</span>
        </button>
        <VisibilityBadge visibility={session.visibility} />
      </footer>

      {open && (
        <CommentSection
          sessionId={session.id}
          viewerId={viewerId}
          onCountChange={(delta) => setCount((c) => Math.max(0, c + delta))}
        />
      )}
    </>
  );
}
