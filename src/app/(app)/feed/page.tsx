import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SessionCard from "@/components/SessionCard";
import InviteFriendCard from "@/components/InviteFriendCard";
import FeedTabs from "@/components/FeedTabs";
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
      {/* Following / Explore tabs — both live now (Step 12). */}
      <FeedTabs active="following" />

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
