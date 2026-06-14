"use client";

// Post-session modal state (Slice 3 / Step 4) — zustand.
//
// The modal is mounted once in the app shell; the TimerCard's "End session"
// button snapshots the in-progress session (focus minutes, pomodoros, the
// started/ended timestamps) and opens the modal with it. Keeping this in its own
// store decouples "what we're about to post" from the timer's own state.

import { create } from "zustand";
import type { PendingSession } from "@/lib/timer-store";

interface SessionPostState {
  open: boolean;
  pending: PendingSession | null;
  openModal: (pending: PendingSession) => void;
  close: () => void;
}

export const useSessionPostStore = create<SessionPostState>((set) => ({
  open: false,
  pending: null,
  openModal: (pending) => set({ open: true, pending }),
  close: () => set({ open: false }),
}));
