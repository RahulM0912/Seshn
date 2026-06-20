"use server";

// Server Actions for the infinite "Load more" session lists. A Client Component
// (`SessionList`) calls these to fetch the next keyset page; the work runs on the
// server with the cookie-aware client, so RLS scopes every result to the caller
// exactly like the initial server render. Reads themselves live in `queries.ts` —
// this file is the thin, security-conscious boundary the client can reach.

import {
  SESSIONS_PAGE_SIZE,
  getFeedSessions,
  getLikedSessionIds,
  getProfileById,
  getUserSessions,
} from "@/lib/queries";
import { getViewer } from "@/lib/viewer";
import type {
  SessionCursor,
  SessionWithProfile,
  VisibilityFilter,
} from "@/lib/database.types";

export interface SessionPage {
  sessions: SessionWithProfile[];
  /** Session ids in this page the viewer has 🔥'd (empty when signed out). */
  likedSessionIds: string[];
  /** Cursor for the next "Load more", or null when this was the last page. */
  nextCursor: SessionCursor | null;
}

export type LoadSessionsInput =
  | {
      kind: "profile";
      profileId: string;
      cursor: SessionCursor | null;
      visibility: VisibilityFilter;
    }
  | { kind: "feed"; cursor: SessionCursor | null };

const EMPTY_PAGE: SessionPage = {
  sessions: [],
  likedSessionIds: [],
  nextCursor: null,
};

/**
 * Fetch the next page of a profile's or the feed's sessions.
 *
 * Security notes: the feed's author set is derived from the *current viewer*
 * (`getViewer`), never a client-supplied id — a caller can't fetch someone
 * else's feed. The profile branch takes a `profileId` from the client, but that
 * only selects *whose* sessions to read; RLS still decides which rows come back,
 * so the worst a tampered id does is return that user's already-public sessions.
 */
export async function loadSessions(
  input: LoadSessionsInput,
): Promise<SessionPage> {
  const viewer = await getViewer();

  let sessions: SessionWithProfile[];

  if (input.kind === "profile") {
    const profile = await getProfileById(input.profileId);
    if (!profile) return EMPTY_PAGE;
    const rows = await getUserSessions(input.profileId, {
      cursor: input.cursor,
      visibility: input.visibility,
    });
    // Every row on a profile shares one author — attach it once.
    sessions = rows.map((s) => ({ ...s, profiles: profile }));
  } else {
    // The feed is per-viewer and private; a signed-out caller gets nothing.
    if (!viewer) return EMPTY_PAGE;
    sessions = await getFeedSessions(viewer.id, { cursor: input.cursor });
  }

  const likedSessionIds = viewer
    ? [
        ...(await getLikedSessionIds(
          viewer.id,
          sessions.map((s) => s.id),
        )),
      ]
    : [];

  // A full page means there may be more; a short page is the end.
  const last = sessions[sessions.length - 1];
  const nextCursor =
    sessions.length === SESSIONS_PAGE_SIZE && last
      ? { createdAt: last.created_at, id: last.id }
      : null;

  return { sessions, likedSessionIds, nextCursor };
}
