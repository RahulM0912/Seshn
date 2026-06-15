import "server-only";
import { createClient } from "@/lib/supabase-server";
import {
  buildStreakWeek,
  dayInTimeZone,
  isStreakAlive,
  type StreakWeekDay,
} from "@/lib/format";
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
 * A single session by id, with its author profile attached (for the session
 * permalink page / notification deep-links). RLS scopes visibility, so a private
 * session returns null for anyone but its owner — the page turns that into a 404.
 * Author joined in app code (2nd query), same as the feed.
 */
export async function getSessionById(
  id: string,
): Promise<SessionWithProfile | null> {
  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) console.error("getSessionById:", error.message);
  if (!session) return null;

  const { data: author, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user_id)
    .maybeSingle();
  if (pErr) console.error("getSessionById profile:", pErr.message);
  if (!author) return null;

  return { ...session, profiles: author };
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

/**
 * Profile search for Explore (Step 12 — "people to follow"). Case-insensitive
 * substring match on display name OR @username, excluding the viewer's own row.
 * Profiles are world-readable under RLS, so any signed-in user can discover anyone.
 *
 * The raw query is sanitized before it's spliced into the PostgREST `or(...)`
 * filter: commas/parens would change the filter's meaning and `%`/`_` are `ilike`
 * wildcards, so all of them are collapsed to spaces. This isn't SQL injection
 * (PostgREST parses the filter, not Postgres), but it keeps the match literal.
 */
export async function searchProfiles(
  viewerId: string,
  query: string,
  limit = 25,
): Promise<Profile[]> {
  const safe = query.replace(/[,()%_\\*]/g, " ").trim();
  if (!safe) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", viewerId)
    .or(`display_name.ilike.%${safe}%,username.ilike.%${safe}%`)
    .order("username", { ascending: true })
    .limit(limit);
  if (error) console.error("searchProfiles:", error.message);
  return data ?? [];
}

/**
 * The default Explore list when there's no search: the member directory — everyone
 * except the viewer, newest first. Followed and not-yet-followed alike are returned
 * (each row carries its own follow state), so the list never looks empty on a small
 * instance and matches what `searchProfiles` returns. RLS-safe (profiles are public).
 */
export async function getDiscoverProfiles(
  viewerId: string,
  limit = 50,
): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", viewerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) console.error("getDiscoverProfiles:", error.message);
  return data ?? [];
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

/**
 * Of the given sessions, which has `userId` liked? Returns a Set of session ids
 * for O(1) lookup while rendering a list (one query for the whole page, not one
 * per card). Empty input short-circuits — no pointless round-trip.
 */
export async function getLikedSessionIds(
  userId: string,
  sessionIds: string[],
): Promise<Set<string>> {
  if (sessionIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("likes")
    .select("session_id")
    .eq("user_id", userId)
    .in("session_id", sessionIds);
  if (error) console.error("getLikedSessionIds:", error.message);
  return new Set((data ?? []).map((l) => l.session_id));
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

export interface StreakCardView {
  /** The display streak: the stored number when alive, else 0 (PRD §9.2). */
  current: number;
  alive: boolean;
  postedToday: boolean;
  week: StreakWeekDay[];
}

/**
 * Everything `StreakCard` (Step 11) needs, computed for display. The `streaks`
 * row updates lazily (only on posting), so a stored streak can be stale — we
 * recompute "alive" here against the user's timezone and zero it out when broken,
 * rather than trusting the number. The 7-day strip is built from the days (user
 * tz) the user actually posted in the last week, using `ended_at` — the same day
 * boundary the streak trigger uses.
 */
export async function getStreakCard(userId: string): Promise<StreakCardView> {
  const supabase = await createClient();

  const [{ data: profile }, { data: streak }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const timezone = profile?.timezone ?? "Asia/Kolkata";

  // Sessions from the last 8 calendar days, bucketed into local days (user tz).
  const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("sessions")
    .select("ended_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("ended_at", since);

  const activeDays = new Set(
    (recent ?? [])
      .map((s) => s.ended_at)
      .filter((d): d is string => !!d)
      .map((d) => dayInTimeZone(new Date(d), timezone)),
  );
  const alive = isStreakAlive(streak?.last_session_date ?? null, timezone);

  return {
    current: alive ? streak?.current_streak ?? 0 : 0,
    alive,
    postedToday: activeDays.has(dayInTimeZone(new Date(), timezone)),
    week: buildStreakWeek(activeDays, timezone),
  };
}

export interface FriendActivity {
  profile: Profile;
  /** Focus minutes the friend has logged so far *today* (their own timezone). */
  minutesToday: number;
  /** True once they've posted any session today — drives the Done / Idle badge. */
  postedToday: boolean;
}

/**
 * The "Friends activity" sidebar card (Step 11): for everyone the viewer follows,
 * how much focus they've logged today — bucketed in each friend's OWN timezone, the
 * same day boundary their streak uses — and whether they've posted at all. Only
 * sessions the viewer is allowed to see are counted: the read is RLS-scoped, so a
 * friend's `private` work never leaks in (a `followers` post does, since the viewer
 * follows them). Active friends sort first (most focus first); idle friends follow.
 * Capped for the sidebar.
 *
 * One extra query on top of `getFollowing` (which itself is edges + profiles): a
 * single windowed `sessions` read for the whole followed set, bucketed in app code.
 */
export async function getFriendsActivity(
  userId: string,
  limit = 6,
): Promise<FriendActivity[]> {
  const supabase = await createClient();

  const following = await getFollowing(userId);
  if (following.length === 0) return [];

  const ids = following.map((p) => p.id);
  // A 48h window covers "today" in every timezone (max UTC offset is ±14h), so no
  // friend's local day is ever clipped regardless of where they are.
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: recent, error } = await supabase
    .from("sessions")
    .select("user_id, focus_minutes, ended_at")
    .in("user_id", ids)
    .is("deleted_at", null)
    .gte("ended_at", since);
  if (error) console.error("getFriendsActivity:", error.message);

  // Sum each friend's focus for sessions that ended on *their* current local day.
  // Cache today's day-string per timezone so we compute it once per distinct tz.
  const todayByTz = new Map<string, string>();
  const localToday = (tz: string) => {
    let day = todayByTz.get(tz);
    if (!day) {
      day = dayInTimeZone(new Date(), tz);
      todayByTz.set(tz, day);
    }
    return day;
  };
  const tzById = new Map(following.map((p) => [p.id, p.timezone] as const));

  const minutesByUser = new Map<string, number>();
  const postedToday = new Set<string>();
  for (const s of recent ?? []) {
    if (!s.ended_at) continue;
    const tz = tzById.get(s.user_id) ?? "Asia/Kolkata";
    if (dayInTimeZone(new Date(s.ended_at), tz) !== localToday(tz)) continue;
    postedToday.add(s.user_id);
    minutesByUser.set(
      s.user_id,
      (minutesByUser.get(s.user_id) ?? 0) + (s.focus_minutes ?? 0),
    );
  }

  return following
    .map((profile) => ({
      profile,
      minutesToday: minutesByUser.get(profile.id) ?? 0,
      postedToday: postedToday.has(profile.id),
    }))
    .sort((a, b) => {
      // Active friends first, then by most focus today.
      if (a.postedToday !== b.postedToday) return a.postedToday ? -1 : 1;
      return b.minutesToday - a.minutesToday;
    })
    .slice(0, limit);
}
