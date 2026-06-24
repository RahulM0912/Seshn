import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SessionList from "@/components/SessionList";
import InviteFriendCard from "@/components/InviteFriendCard";
import FeedTabs from "@/components/FeedTabs";
import { createClient } from "@/lib/supabase-server";
import { getSessionUser } from "@/lib/viewer";
import {
  SESSIONS_PAGE_SIZE,
  getFeedSessions,
  getLikedSessionIds,
} from "@/lib/queries";

// The real "Following" feed (Step 6): sessions from you and everyone you follow,
// newest first, fetched on load (no realtime in v1). Per-user + per-request, so
// it must never be cached — createClient already forces dynamic via cookies(),
// and this makes that intent explicit.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Feed · Seshn" };

export default async function FeedPage() {
  // The (authed) layout already gates this, but the page needs the id and we
  // never trust a possibly-null user. getSessionUser() is cache()d, so this
  // reuses the layout's auth round-trip rather than making another.
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
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
        <SessionList
          context={{ kind: "feed" }}
          viewerId={user.id}
          initialSessions={sessions}
          initialLikedIds={[...likedIds]}
          initialCursor={
            sessions.length === SESSIONS_PAGE_SIZE
              ? {
                  createdAt: sessions[sessions.length - 1].created_at,
                  id: sessions[sessions.length - 1].id,
                }
              : null
          }
          showEmptyState={false}
        />
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
