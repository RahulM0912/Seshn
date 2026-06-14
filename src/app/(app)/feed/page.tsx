import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SessionCard from "@/components/SessionCard";
import InviteFriendCard from "@/components/InviteFriendCard";
import { createClient } from "@/lib/supabase-server";
import { getFeedSessions, getLikedSessionIds } from "@/lib/queries";

// The real "Following" feed (Step 6): sessions from you and everyone you follow,
// newest first, fetched on load (no realtime in v1). Per-user + per-request, so
// it must never be cached — createClient already forces dynamic via cookies(),
// and this makes that intent explicit.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Feed · Seshn" };

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The (app) layout already gates this, but the page needs the id and we never
  // trust a possibly-null user.
  if (!user) redirect("/login");

  const [profileRes, sessions] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
    getFeedSessions(user.id),
  ]);
  const username = profileRes.data?.username ?? "";

  // Cold-start (PRD §9.1): if nothing in the feed comes from someone else, the
  // feed is effectively just you — show the invite-a-friend card alongside your
  // own posts.
  const hasOthers = sessions.some((s) => s.user_id !== user.id);

  // Which of these did I already 🔥? One query for the page (not per card).
  const likedIds = await getLikedSessionIds(
    user.id,
    sessions.map((s) => s.id),
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      {/* Tabs — only "Following" is live in v1; Explore is stubbed (deferred). */}
      <div className="flex gap-1" role="tablist" aria-label="Feed">
        <span
          role="tab"
          aria-selected
          className="rounded-[20px] border-[0.5px] border-[#22C55E] bg-[#22C55E] px-3.5 py-[5px] text-[12px] font-medium text-[#0A0A0A]"
        >
          Following
        </span>
        <span
          role="tab"
          aria-selected={false}
          aria-disabled
          title="Coming soon"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-[20px] border-[0.5px] border-[#2A2A2A] px-3.5 py-[5px] text-[12px] text-[#555555]"
        >
          Explore
          <span className="rounded-full bg-[#1C1C1C] px-1.5 py-px text-[9px] uppercase tracking-wide">
            Soon
          </span>
        </span>
      </div>

      {sessions.length > 0 && (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              viewerId={user.id}
              liked={likedIds.has(session.id)}
            />
          ))}
        </div>
      )}

      {!hasOthers && (
        <InviteFriendCard
          username={username}
          hasSessions={sessions.length > 0}
        />
      )}
    </div>
  );
}
