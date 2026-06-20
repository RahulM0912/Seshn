"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { followUser, unfollowUser } from "@/lib/mutations";

// Optimistic follow/unfollow toggle (Step 7). Flips the label immediately, fires
// the write, and reverts on a real error. A `23505` on follow means the edge
// already exists — treat it as success (idempotent). After a successful write we
// `router.refresh()` so the server-rendered follower counts + feed reconcile.
// "Following" reads as "Unfollow" on hover so the destructive action is explicit.
export default function FollowButton({
  viewerId,
  targetId,
  initialFollowing,
}: {
  viewerId: string;
  targetId: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !following;
    setBusy(true);
    setFollowing(next); // optimistic
    try {
      const { error } = next
        ? await followUser(viewerId, targetId)
        : await unfollowUser(viewerId, targetId);
      // Already-following (23505) on a follow is a success, not a failure.
      if (error && !(next && error.code === "23505")) {
        setFollowing(!next); // revert
        console.error("FollowButton:", error.message);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!following) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={false}
        className="flex-shrink-0 cursor-pointer rounded-[20px] bg-[#22C55E] px-4 py-1.5 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E] disabled:cursor-default disabled:opacity-60"
      >
        Follow
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed
      className="group flex-shrink-0 cursor-pointer rounded-[20px] border-[0.5px] border-[#2A2A2A] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:border-[#7F1D1D] hover:text-[#F87171] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2A2A2A] disabled:cursor-default disabled:opacity-60"
    >
      <span className="group-hover:hidden">Following</span>
      <span className="hidden group-hover:inline">Unfollow</span>
    </button>
  );
}
