"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { likeSession, unlikeSession } from "@/lib/mutations";

// The 🔥 toggle on a SessionCard (Step 8). Optimistic: flip liked + nudge the
// count instantly, fire the write, revert both on a real error. A `23505` on
// like means the row already exists (we're already liked) — treat as success,
// don't revert. Deliberately no `router.refresh()`: the count we show is the
// rendered count ± our own action, which is exactly what the viewer expects;
// other people's concurrent likes reconcile on the next real load. (Refreshing
// would also fight this local state, since useState ignores changed props.)
export default function LikeButton({
  sessionId,
  viewerId,
  initialLiked,
  initialCount,
}: {
  sessionId: string;
  viewerId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !liked;
    setBusy(true);
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const { error } = next
        ? await likeSession(viewerId, sessionId)
        : await unlikeSession(viewerId, sessionId);
      if (error && !(next && error.code === "23505")) {
        // Real failure — undo the optimistic flip.
        setLiked(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
        console.error("LikeButton:", error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={busy}
      whileTap={{ scale: 0.85 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this session" : "Like this session"}
      className={`-m-1 flex cursor-pointer items-center gap-[5px] rounded-md p-1 text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#22C55E] disabled:cursor-default ${
        liked ? "text-[#22C55E]" : "text-[#555555] hover:text-[#888888]"
      }`}
    >
      <motion.span
        key={liked ? "liked" : "unliked"}
        initial={liked ? { scale: 0.5, rotate: -15 } : { scale: 1, rotate: 0 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
      >
        <Flame
          size={14}
          aria-hidden
          className={liked ? "fill-[#22C55E]" : ""}
        />
      </motion.span>
      <span className="tabular-nums">{count}</span>
    </motion.button>
  );
}
