"use client";

// Write-side data layer — every client-initiated Supabase write lives here, not
// inline in components. Uses the BROWSER client (cookie session) and is for
// Client Components only. Reads live in `src/lib/queries.ts` (server client).
//
// Each function returns the raw Supabase result `{ data, error }` so callers can
// inspect `error.code` (e.g. `23505` unique_violation) and run optimistic UI.
// Filled in per slice — add a function when its feature is built.

import { supabase } from "@/lib/supabase";
import type { SessionInsert, Visibility } from "@/lib/database.types";

export interface PostSessionInput {
  userId: string;
  startedAt: string;
  endedAt: string;
  focusMinutes: number;
  pomodorosCompleted: number;
  pomodorosPlanned: number;
  subject: string | null;
  caption: string | null;
  visibility: Visibility;
}

// Insert a posted focus session (Slice 3 / Step 4). Deliberately omits
// like_count/comment_count — the RLS insert policy pins them to 0 and rejects
// any seeded value. The streak row updates itself via a DB trigger.
export function postSession(input: PostSessionInput) {
  const payload: SessionInsert = {
    user_id: input.userId,
    started_at: input.startedAt,
    ended_at: input.endedAt,
    focus_minutes: input.focusMinutes,
    pomodoros_completed: input.pomodorosCompleted,
    pomodoros_planned: input.pomodorosPlanned,
    subject: input.subject,
    caption: input.caption,
    visibility: input.visibility,
  };
  return supabase.from("sessions").insert(payload);
}

// Edit a posted session's text/sharing fields (Step 14). RLS scopes the UPDATE to
// the owner. Deliberately limited to subject/caption/visibility — the focus stats
// are a factual record of what happened and stay immutable. Counters and timing
// are never touched here.
export interface SessionEdit {
  subject: string | null;
  caption: string | null;
  visibility: Visibility;
}

export function updateSession(sessionId: string, fields: SessionEdit) {
  return supabase
    .from("sessions")
    .update({
      subject: fields.subject,
      caption: fields.caption,
      visibility: fields.visibility,
    })
    .eq("id", sessionId);
}

// Delete a posted session (Step 14). SOFT delete — set `deleted_at`, and RLS hides
// the row from every future read (feed, profile, permalink, daily totals all filter
// `deleted_at is null`). Mirrors the comment-delete pattern; the owner-only RLS
// update policy already permits this. Its likes/comments are left in place but
// become unreachable along with the hidden session.
export function softDeleteSession(sessionId: string) {
  return supabase
    .from("sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", sessionId);
}

// Follow / unfollow (Slice 6 / Step 7). RLS pins `follower_id` to the caller, so
// you can only create/remove your OWN outgoing edge. On follow, a `23505`
// (unique_violation) means the edge already exists — callers treat that as
// success. Unfollow deleting a non-existent row is a no-op (not an error).
export function followUser(followerId: string, followingId: string) {
  return supabase
    .from("follows")
    .insert({ follower_id: followerId, following_id: followingId });
}

export function unfollowUser(followerId: string, followingId: string) {
  return supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
}

// Like / unlike a session (Slice 7 / Step 8). RLS pins `user_id` to the caller,
// so you can only add/remove your OWN 🔥. `sessions.like_count` is bumped by a DB
// trigger — never written here. On like, a `23505` (the `(user_id, session_id)`
// PK already exists) means you already liked it — callers treat that as success.
// Unliking a row that isn't there is a harmless no-op.
export function likeSession(userId: string, sessionId: string) {
  return supabase
    .from("likes")
    .insert({ user_id: userId, session_id: sessionId });
}

export function unlikeSession(userId: string, sessionId: string) {
  return supabase
    .from("likes")
    .delete()
    .eq("user_id", userId)
    .eq("session_id", sessionId);
}

// Comments (Slice 8 / Step 9). RLS pins `user_id` to the caller and only allows
// commenting on sessions you can see; `sessions.comment_count` is maintained by a
// DB trigger — never written here. Deletes are SOFT (set `deleted_at`): the same
// trigger decrements the count, and RLS hides the row from future reads.
export function addComment(userId: string, sessionId: string, body: string) {
  return supabase
    .from("comments")
    .insert({ user_id: userId, session_id: sessionId, body });
}

export function softDeleteComment(commentId: string) {
  return supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);
}

// Mark every unread notification read (Slice 9 / Step 10) — called when the inbox
// panel opens. RLS scopes the UPDATE to the caller's own rows, so the `read_at`
// filter is all that's needed; it never touches anyone else's inbox.
export function markNotificationsRead() {
  return supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
}

// Claim username + display name, set the browser-detected timezone, and flip
// `onboarded` (Slice 1). Timezone is auto-detected on the client (no manual
// picker) so streak/day-boundary math is correct from day one. `23505` on the
// returned error means the handle is taken.
export function completeOnboarding(
  userId: string,
  username: string,
  displayName: string,
  timezone: string,
) {
  return supabase
    .from("profiles")
    .update({ username, display_name: displayName, timezone, onboarded: true })
    .eq("id", userId);
}

// Silent timezone correction. Called when the browser's detected zone differs
// from the stored one (e.g. the user moved or onboarded before this existed);
// keeps streak/day-boundary math accurate with no user action. RLS scopes it to
// the caller's own row.
export function updateTimezone(userId: string, timezone: string) {
  return supabase.from("profiles").update({ timezone }).eq("id", userId);
}

// Edit profile from the Settings page (Slice 11 / Step 12). RLS lets a user
// update only their own row. Username keeps the same `23505` (unique_violation)
// handling as onboarding — callers surface "username taken". `bio` is null when
// cleared. Timezone is managed separately (auto-detected via `updateTimezone`),
// so it's intentionally not touched here. Never touches `onboarded`.
export interface ProfileEdit {
  displayName: string;
  username: string;
  bio: string | null;
}

export function updateProfile(userId: string, fields: ProfileEdit) {
  return supabase
    .from("profiles")
    .update({
      display_name: fields.displayName,
      username: fields.username,
      bio: fields.bio,
    })
    .eq("id", userId);
}
