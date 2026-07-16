"use client";

// Read-side data layer for the BROWSER client — the handful of reads that must
// run client-side rather than on the server. `src/lib/queries.ts` is `server-only`
// (it can't be imported into a Client Component), so anything fetched lazily in
// the browser — comment threads opened on demand, the notification inbox polled
// by the bell — lives here instead. Writes still live in `src/lib/mutations.ts`.
//
// Authors are attached with a second `profiles` query (same as the feed), not the
// PostgREST `profiles(*)` embed, which returned no rows against this instance.

import { supabase } from "@/lib/supabase";
import { splitSubjects } from "@/lib/format";
import type {
  CommentWithProfile,
  NotificationFeedItem,
} from "@/lib/database.types";

/**
 * Comments on a session, oldest first (soft-deleted rows excluded by RLS). RLS
 * also scopes them to the session's visibility, so this is safe to call from any
 * viewer. Returns `[]` on error or when there are none.
 */
export async function getSessionComments(
  sessionId: string,
): Promise<CommentWithProfile[]> {
  const { data: rows, error } = await supabase
    .from("comments")
    .select("*")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getSessionComments:", error.message);
    return [];
  }
  if (!rows || rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (pErr) console.error("getSessionComments profiles:", pErr.message);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p] as const));
  return rows
    .map((r) => {
      const author = byId.get(r.user_id);
      return author ? { ...r, profiles: author } : null;
    })
    .filter((c): c is CommentWithProfile => c !== null);
}

/**
 * Whether `username` is free to claim — used for live feedback while a user
 * picks/changes their handle (onboarding + settings). Profiles are world-readable
 * (public profile pages), so this is safe from the browser. A row owned by
 * `excludeId` (the caller's own profile) counts as available — it's already
 * theirs. Returns `true` on error so a hiccup never blocks submit; the DB unique
 * constraint is the real guard (callers handle `23505`).
 */
export async function isUsernameAvailable(
  username: string,
  excludeId?: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error) {
    console.error("isUsernameAvailable:", error.message);
    return true;
  }
  if (!data) return true;
  return excludeId ? data.id === excludeId : false;
}

/** Unread notification count for the bell badge (cheap RPC, polled on load). */
export async function getUnreadNotificationCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_unread_notification_count");
  if (error) {
    console.error("getUnreadNotificationCount:", error.message);
    return 0;
  }
  return data ?? 0;
}

/**
 * The viewer's UNREAD inbox, newest first (RLS already scopes rows to the
 * recipient). Only unread rows are returned: opening the panel marks them read,
 * so each notification is shown exactly once and is gone on the next open.
 * Attaches each actor's profile, and for `comment` rows the comment body preview.
 */
export async function getNotifications(
  limit = 30,
): Promise<NotificationFeedItem[]> {
  const { data: rows, error } = await supabase
    .from("notifications")
    .select("*")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("getNotifications:", error.message);
    return [];
  }
  if (!rows || rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((r) => r.actor_id))];
  const { data: actors, error: aErr } = await supabase
    .from("profiles")
    .select("*")
    .in("id", actorIds);
  if (aErr) console.error("getNotifications actors:", aErr.message);
  const actorById = new Map((actors ?? []).map((p) => [p.id, p] as const));

  // Body previews for `comment` notifications (one query for the page).
  const commentIds = rows
    .map((r) => r.comment_id)
    .filter((id): id is string => id != null);
  const bodyById = new Map<string, string>();
  if (commentIds.length > 0) {
    const { data: comments } = await supabase
      .from("comments")
      .select("id, body")
      .in("id", commentIds);
    for (const c of comments ?? []) bodyById.set(c.id, c.body);
  }

  return rows
    .map((r) => {
      const actor = actorById.get(r.actor_id);
      if (!actor) return null;
      return {
        ...r,
        actor,
        commentBody: r.comment_id ? bodyById.get(r.comment_id) ?? null : null,
      };
    })
    .filter((n): n is NotificationFeedItem => n !== null);
}

/**
 * The viewer's current streak count, straight off the `streaks` row (0 before
 * the first session or on error). Used by the post-session success step to
 * celebrate an extension — it compares the value fetched at modal-open with the
 * one fetched after the insert, so no timezone math is needed here.
 */
/**
 * The viewer's most recently used subject tags, newest first — the tap-to-fill
 * chips above the subject input in the post modal (Step 19). Reads a window of
 * the user's own recent sessions (RLS: owners see all visibilities), splits
 * comma-joined subjects into tags, and dedupes case-insensitively. `[]` on
 * error or for a first-time poster (the chips row simply doesn't render).
 */
export async function getRecentSubjects(
  userId: string,
  limit = 5,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("subject")
    .eq("user_id", userId)
    .not("subject", "is", null)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    console.error("getRecentSubjects:", error.message);
    return [];
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    for (const tag of splitSubjects(row.subject ?? "")) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
      if (out.length === limit) return out;
    }
  }
  return out;
}

export async function getStreakCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("getStreakCount:", error.message);
    return 0;
  }
  return data?.current_streak ?? 0;
}
