"use client";

import { useState } from "react";
import { Check, Share2, UserPlus } from "lucide-react";

// The cold-start feed card (PRD §9.1). The "Following" feed only fills up once
// you follow people who post, so until then we show your own sessions plus this
// nudge to bring friends in. The button shares your profile link (native share
// sheet on mobile, clipboard copy elsewhere) so "invite a friend" is a real,
// working action even before a people-search exists.
export default function InviteFriendCard({
  username,
  hasSessions,
}: {
  username: string;
  hasSessions: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/${username}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Seshn",
          text: "I'm tracking my focus sessions on Seshn — follow me:",
          url,
        });
      } catch {
        // Share sheet dismissed/cancelled — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — fail quietly.
    }
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] px-6 py-12 text-center">
      <span
        aria-hidden
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border-[0.5px] border-[#1A4D22] bg-[#0F2A15] text-[#22C55E]"
      >
        <UserPlus size={20} />
      </span>
      <p className="text-[13px] font-medium text-white">
        {hasSessions ? "Your feed is just you for now" : "Your feed lives here"}
      </p>
      <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-[#888888]">
        Sessions from people you follow show up here. Share your profile so
        friends can find you and follow back.
      </p>
      <button
        type="button"
        onClick={share}
        className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-[8px] bg-[#22C55E] px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]"
      >
        {copied ? (
          <>
            <Check size={15} aria-hidden /> Link copied
          </>
        ) : (
          <>
            <Share2 size={15} aria-hidden /> Share your profile
          </>
        )}
      </button>
    </div>
  );
}
