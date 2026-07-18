"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import SessionCard from "@/components/SessionCard";
import SessionCardSkeleton from "@/components/SessionCardSkeleton";
import { loadSessions, type LoadSessionsInput } from "@/lib/actions";
import { useSessionPostStore } from "@/lib/session-post-store";
import type { SessionEdit } from "@/lib/mutations";
import type {
  SessionCursor,
  SessionWithProfile,
  VisibilityFilter,
} from "@/lib/database.types";

// The interactive session list shared by the profile page and the feed. It owns
// the rendered cards, the keyset "Load more" pager (calling the `loadSessions`
// server action), and — on the owner's own profile — a visibility filter
// dropdown. The initial page is still server-rendered by the page and handed in
// as props, so first paint / SEO are unchanged; this only drives what happens
// *after* that first batch.

type Context = { kind: "feed" } | { kind: "profile"; profileId: string };

// Owner-only filter options. RLS is the real visibility gate — this just lets the
// owner narrow their own list. "All" first (the default).
const FILTERS: { value: VisibilityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "followers", label: "Followers" },
  { value: "private", label: "Private" },
];

export default function SessionList({
  context,
  viewerId,
  initialSessions,
  initialLikedIds,
  initialCursor,
  title,
  showVisibilityFilter = false,
  showEmptyState = true,
}: {
  context: Context;
  viewerId: string | null;
  initialSessions: SessionWithProfile[];
  initialLikedIds: string[];
  initialCursor: SessionCursor | null;
  /** Optional header label (the profile renders "Sessions"; the feed renders none). */
  title?: string;
  /** Show the owner-only visibility dropdown (profile, own profile). */
  showVisibilityFilter?: boolean;
  /** Render a built-in empty state when the list is empty (off for the feed,
   *  which shows its own invite-a-friend card instead). */
  showEmptyState?: boolean;
}) {
  const [items, setItems] = useState(initialSessions);
  const [liked, setLiked] = useState(() => new Set(initialLikedIds));
  const [cursor, setCursor] = useState(initialCursor);
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");

  const [loadingMore, setLoadingMore] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLButtonElement>(null);

  // A monotonic token so a slow filter request that resolves after a newer one is
  // discarded instead of clobbering the list.
  const requestId = useRef(0);

  function fetchPage(cur: SessionCursor | null, vis: VisibilityFilter) {
    const input: LoadSessionsInput =
      context.kind === "profile"
        ? { kind: "profile", profileId: context.profileId, cursor: cur, visibility: vis }
        : { kind: "feed", cursor: cur };
    return loadSessions(input);
  }

  async function loadMore() {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(cursor, visibility);
      setItems((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...page.sessions.filter((s) => !seen.has(s.id))];
      });
      setLiked((prev) => new Set([...prev, ...page.likedSessionIds]));
      setCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  // Keep the observer calling the freshest loadMore without re-creating the
  // observer on every render (which a function-in-deps would force).
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  // Auto-load on scroll (Instagram/Strava-style): an IntersectionObserver fires
  // the next fetch as the sentinel button nears the viewport — `rootMargin` makes
  // it prefetch ~a screen early so cards stream in before you hit the bottom. The
  // button stays in the tree as a focusable keyboard fallback + loading row.
  // Re-running on `cursor` re-arms the observer after each page, so it keeps
  // loading until the viewport is full or there's nothing left.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor]);

  async function selectVisibility(next: VisibilityFilter) {
    setMenuOpen(false);
    if (next === visibility) return;
    setVisibility(next);
    setFiltering(true);
    const token = ++requestId.current;
    try {
      const page = await fetchPage(null, next);
      if (token !== requestId.current) return; // a newer filter won
      setItems(page.sessions);
      setLiked(new Set(page.likedSessionIds));
      setCursor(page.nextCursor);
    } finally {
      if (token === requestId.current) setFiltering(false);
    }
  }

  // Owner edited/deleted one of their cards (via the ⋯ menu). The list owns the
  // rendered array in client state, which `router.refresh()` can't reach, so we
  // patch it here for an instant update — no reload, and the accumulated
  // infinite-scroll pages stay intact.
  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id));
  }

  function handleEdited(id: string, fields: SessionEdit) {
    setItems((prev) => {
      // On the owner's filtered profile list, a visibility change that no longer
      // matches the active filter drops the card out — same as a reload would.
      const filterActive = context.kind === "profile" && visibility !== "all";
      if (filterActive && fields.visibility !== visibility) {
        return prev.filter((s) => s.id !== id);
      }
      return prev.map((s) => (s.id === id ? { ...s, ...fields } : s));
    });
  }

  // A session just posted through the global post-session modal. That modal lives
  // in the app shell — outside this list's tree — so it can't call down via props
  // like the owner menu does; it signals through the post store instead. We
  // *subscribe* to the store (rather than read a rendered value and patch in an
  // effect) so the prepend runs in an external-event callback, not during render.
  // Prepend only if the new card belongs here (same rules the server query uses),
  // consuming each id once so a later re-render or delete can't bring it back.
  const consumedPostId = useRef<string | null>(null);
  useEffect(() => {
    return useSessionPostStore.subscribe((state) => {
      const posted = state.posted;
      if (!posted || consumedPostId.current === posted.id) return;
      consumedPostId.current = posted.id;
      // Your post never shows on someone else's profile.
      if (context.kind === "profile" && context.profileId !== posted.user_id) {
        return;
      }
      // On the owner's profile, respect an active visibility filter.
      if (
        context.kind === "profile" &&
        visibility !== "all" &&
        posted.visibility !== visibility
      ) {
        return;
      }
      setItems((prev) =>
        prev.some((s) => s.id === posted.id) ? prev : [posted, ...prev],
      );
    });
  }, [context, visibility]);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: Event) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const header = title ? (
    <div className="mb-3 mt-6 flex items-center justify-between gap-3">
      <h2 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-[#8A8A8A]">
        {title}
      </h2>
      {showVisibilityFilter && (
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] pl-3 pr-2 text-[12px] font-medium text-white transition-colors hover:bg-[#252525] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
          >
            {FILTERS.find((f) => f.value === visibility)?.label}
            <ChevronDown
              size={13}
              aria-hidden
              className={`text-[#888888] transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div
              role="listbox"
              className="absolute right-0 top-9 z-30 flex w-36 flex-col overflow-hidden rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] py-1 shadow-lg shadow-black/40"
            >
              {FILTERS.map((f) => {
                const selected = f.value === visibility;
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => selectVisibility(f.value)}
                    className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-[#252525] focus-visible:bg-[#252525] focus-visible:outline-none ${selected ? "font-semibold text-white" : "text-[#888888]"}`}
                  >
                    {f.label}
                    {selected && (
                      <Check size={13} className="text-[#22C55E]" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  ) : null;

  // Empty state — only when we actually have nothing and aren't mid-filter.
  if (items.length === 0 && !filtering && showEmptyState) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center justify-center rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] px-6 py-16 text-center">
          <p className="text-[13px] font-medium text-white">
            {visibility === "all"
              ? "No sessions yet"
              : `No ${visibility} sessions`}
          </p>
          {visibility === "all" && (
            <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-[#888888]">
              Posted focus sessions show up here.
            </p>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      {filtering ? (
        // The filter swaps *which* sessions are shown, so the old list is the
        // wrong content — skeletons signal "new set incoming" rather than dimming
        // stale cards.
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SessionCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              viewerId={viewerId}
              liked={liked.has(session.id)}
              onDeleted={handleDeleted}
              onEdited={handleEdited}
            />
          ))}
        </div>
      )}

      {!filtering && cursor && (
        <div className="mt-3 flex justify-center">
          <button
            ref={sentinelRef}
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            aria-busy={loadingMore}
            aria-label={loadingMore ? "Loading more sessions" : "Load more sessions"}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-full border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-5 text-[12px] font-medium text-[#888888] transition-colors hover:bg-[#252525] hover:text-white disabled:cursor-default disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
          >
            <Loader2
              size={13}
              aria-hidden
              className={loadingMore ? "animate-spin" : "hidden"}
            />
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
