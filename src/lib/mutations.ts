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

// Claim username + display name and flip `onboarded` (Slice 1). `23505` on the
// returned error means the handle is taken.
export function completeOnboarding(
  userId: string,
  username: string,
  displayName: string,
) {
  return supabase
    .from("profiles")
    .update({ username, display_name: displayName, onboarded: true })
    .eq("id", userId);
}
