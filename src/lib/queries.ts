import "server-only";
import { createClient } from "@/lib/supabase-server";
import type {
  Profile,
  Session,
  SessionWithProfile,
  Streak,
} from "@/lib/database.types";

// Server-side reads — the cookie-aware client runs every query as the current
// viewer, so RLS decides what each request can see (a signed-out visitor gets
// only `public` rows; the owner / a follower see more). Reads live here; writes
// live in `src/lib/mutations.ts`. Filled in per slice.

/** Look up a profile by its (unique) username. Null when it doesn't exist. */
export async function getProfileByUsername(
  username: string,
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) console.error("getProfileByUsername:", error.message);
  return data;
}

/**
 * A user's sessions, newest first. Flat (no author embed) — for a profile page
 * every row belongs to the same profile the caller already has, so the caller
 * attaches it. The multi-author feed (Step 6) does its own `profiles(*)` embed.
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) console.error("getUserSessions:", error.message);
  return data ?? [];
}

/**
 * The "Following" feed: sessions from the viewer plus everyone they follow,
 * newest first (capped at 50). RLS enforces visibility independently — a
 * `followers`-only post from someone you follow shows up, a `private` one never
 * does — so this query doesn't re-implement that.
 *
 * Authors are attached in a second query rather than a PostgREST `profiles(*)`
 * embed: that embed silently returned no rows against this project's Supabase
 * instance in Step 5, so we join in app code (two round-trips, fully RLS-safe).
 */
export async function getFeedSessions(
  userId: string,
): Promise<SessionWithProfile[]> {
  const supabase = await createClient();

  // My outgoing follow edges (the graph is public). Author set = me + them.
  const { data: edges, error: edgesError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (edgesError) console.error("getFeedSessions follows:", edgesError.message);

  const authorIds = [userId, ...(edges ?? []).map((e) => e.following_id)];

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*")
    .in("user_id", authorIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) console.error("getFeedSessions sessions:", error.message);
  if (!sessions || sessions.length === 0) return [];

  // One fetch for the distinct authors of the returned page of sessions.
  const ids = [...new Set(sessions.map((s) => s.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (profilesError) {
    console.error("getFeedSessions profiles:", profilesError.message);
  }

  const byId = new Map((profiles ?? []).map((p) => [p.id, p] as const));
  return sessions
    .map((s) => {
      const author = byId.get(s.user_id);
      return author ? { ...s, profiles: author } : null;
    })
    .filter((s): s is SessionWithProfile => s !== null);
}

/** Profiles `userId` follows, most-recently-followed first. */
export async function getFollowing(userId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data: edges, error } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (error) console.error("getFollowing:", error.message);
  if (!edges || edges.length === 0) return [];

  const ids = edges.map((e) => e.following_id);
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (pErr) console.error("getFollowing profiles:", pErr.message);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p] as const));
  return ids.map((id) => byId.get(id)).filter((p): p is Profile => p != null);
}

/** Profiles that follow `userId`, most-recent-follower first. */
export async function getFollowers(userId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data: edges, error } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });
  if (error) console.error("getFollowers:", error.message);
  if (!edges || edges.length === 0) return [];

  const ids = edges.map((e) => e.follower_id);
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (pErr) console.error("getFollowers profiles:", pErr.message);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p] as const));
  return ids.map((id) => byId.get(id)).filter((p): p is Profile => p != null);
}

/** Does `followerId` currently follow `followingId`? (RLS allows reading any edge.) */
export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  if (error) console.error("isFollowing:", error.message);
  return data !== null;
}

/** Today's focus minutes for a user, in their timezone (DB RPC). */
export async function getDailyFocusMinutes(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_daily_focus_minutes", {
    p_user_id: userId,
  });
  return data ?? 0;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

/** Follower / following counts for a user (DB RPC returns a single row). */
export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_follow_counts", {
    p_user_id: userId,
  });
  const row = Array.isArray(data) ? data[0] : data;
  return { followers: row?.followers ?? 0, following: row?.following ?? 0 };
}

/** A user's streak row (null before their first session). */
export async function getStreak(userId: string): Promise<Streak | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}
