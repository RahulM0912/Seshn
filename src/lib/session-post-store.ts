"use client";

// Post-session modal state (Slice 3 / Step 4) — zustand.
//
// The modal is mounted once in the app shell; the TimerCard's "End session"
// button snapshots the in-progress session (focus minutes, pomodoros, the
// started/ended timestamps) and opens the modal with it. Keeping this in its own
// store decouples "what we're about to post" from the timer's own state.

import { create } from "zustand";
import type { PendingSession } from "@/lib/timer-store";
import type { SessionWithProfile } from "@/lib/database.types";

interface SessionPostState {
  open: boolean;
  pending: PendingSession | null;
  /** The most recently posted session, used as a one-shot signal so a mounted
   *  `SessionList` (the feed / the owner's profile) can prepend the new card
   *  without a reload — the modal lives in the app shell, outside the list's
   *  tree, so it can't call down via props. Each list consumes a given id once. */
  posted: SessionWithProfile | null;
  openModal: (pending: PendingSession) => void;
  notifyPosted: (session: SessionWithProfile) => void;
  close: () => void;
}

export const useSessionPostStore = create<SessionPostState>((set) => ({
  open: false,
  pending: null,
  posted: null,
  openModal: (pending) => set({ open: true, pending }),
  notifyPosted: (session) => set({ posted: session }),
  close: () => set({ open: false }),
}));
