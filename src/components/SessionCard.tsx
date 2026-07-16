"use client";

import { Flame, MessageCircle } from "lucide-react";
import type { SessionWithProfile } from "@/lib/database.types";
import type { SessionEdit } from "@/lib/mutations";
import {
  avatarColor,
  formatFocusTime,
  initials,
  relativeTime,
  splitSubjects,
} from "@/lib/format";
import SessionCardFooter from "@/components/SessionCardFooter";
import SessionOwnerMenu from "@/components/SessionOwnerMenu";
import VisibilityBadge from "@/components/VisibilityBadge";

// One feed/profile post. Presentational + data-driven (the landing page keeps its
// own `FeedMockup`). A Client Component so `SessionList` can append more cards
// after a "Load more" without a server round-trip per card — it still SSRs to
// HTML on first paint (public profiles stay crawlable). A signed-in viewer gets
// the interactive `SessionCardFooter` (🔥 like + 💬 comments); a signed-out /
// public view keeps a static, read-only footer.
//
// `viewerId` is the signed-in user (null when signed out); `liked` is whether
// that viewer has already liked this session (from a batch lookup by the page).
// `defaultCommentsOpen` lets the session permalink start with the thread expanded
// (a comment notification deep-links straight to its conversation).
export default function SessionCard({
  session,
  viewerId = null,
  liked = false,
  defaultCommentsOpen = false,
  onDeleted,
  onEdited,
}: {
  session: SessionWithProfile;
  viewerId?: string | null;
  liked?: boolean;
  defaultCommentsOpen?: boolean;
  /** Owner-list hooks: let the parent list update its own state on edit/delete
   *  instead of a server round-trip. Omitted on the permalink (server-rendered),
   *  where the owner menu falls back to `router.refresh()`. */
  onDeleted?: (id: string) => void;
  onEdited?: (id: string, fields: SessionEdit) => void;
}) {
  const author = session.profiles;
  const av = avatarColor(author.id);

  // "maths, chem" stored as one string renders as separate pills (Step 19) —
  // display-only, capped at 3 with a "+n" overflow so a tag pile can't take over.
  const subjects = session.subject ? splitSubjects(session.subject) : [];

  const completed = session.pomodoros_completed;
  const planned = session.pomodoros_planned;
  const total = planned ?? completed;
  const filled = Math.min(completed, total);
  const empty = Math.max(0, total - filled);

  return (
    <article className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] px-4 py-3.5">
      {/* Author */}
      <header className="mb-3 flex items-center gap-2.5">
        <span
          aria-hidden
          style={{ backgroundColor: av.bg, color: av.text }}
          className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
        >
          {initials(author.display_name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-white">
            {author.display_name}
          </div>
          <div className="truncate text-[11px] text-[#555555]">
            @{author.username} · {relativeTime(session.created_at)}
          </div>
        </div>

        {/* Owner-only edit/delete — shows wherever this card renders (feed,
            profile, permalink) for the author's own posts. */}
        {viewerId === author.id && (
          <SessionOwnerMenu
            session={session}
            onDeleted={onDeleted ? () => onDeleted(session.id) : undefined}
            onEdited={
              onEdited ? (fields) => onEdited(session.id, fields) : undefined
            }
          />
        )}
      </header>

      {/* Pomodoro dots */}
      <div
        className="mb-2.5 flex flex-wrap items-center gap-[5px]"
        aria-label={`${completed} of ${total} pomodoros completed`}
      >
        {Array.from({ length: filled }).map((_, i) => (
          <span
            key={`f${i}`}
            aria-hidden
            className="h-[9px] w-[9px] rounded-full bg-[#22C55E]"
          />
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <span
            key={`e${i}`}
            aria-hidden
            className="h-[9px] w-[9px] rounded-full bg-[#2A2A2A]"
          />
        ))}
        <span className="ml-1 text-[11px] text-[#555555]">
          {planned != null ? `${completed} / ${planned}` : completed}
        </span>
      </div>

      {/* Focus time */}
      <div className="text-[32px] font-bold leading-none tracking-[-1px] text-white tabular-nums">
        {formatFocusTime(session.focus_minutes)}
      </div>
      <div className="mb-2.5 mt-[3px] text-[10px] uppercase tracking-[0.08em] text-[#555555]">
        Total focus time
      </div>

      {/* Subject tags */}
      {subjects.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {subjects.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-[5px] rounded-[20px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-2.5 py-[3px] text-[11px] text-[#22C55E]"
            >
              <span aria-hidden className="h-[6px] w-[6px] flex-shrink-0 rounded-full bg-[#22C55E]" />
              {tag}
            </span>
          ))}
          {subjects.length > 3 && (
            <span className="rounded-[20px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-2 py-[3px] text-[11px] text-[#888888]">
              +{subjects.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Caption */}
      {session.caption && (
        <p className="mb-2.5 whitespace-pre-wrap text-[12px] leading-[1.5] text-[#888888]">
          {session.caption}
        </p>
      )}

      {/* Footer — signed-in viewers get the interactive like/comment footer;
          signed-out / public views keep a static, read-only one. */}
      {viewerId ? (
        <SessionCardFooter
          session={session}
          viewerId={viewerId}
          liked={liked}
          defaultCommentsOpen={defaultCommentsOpen}
        />
      ) : (
        <footer className="flex items-center gap-3 border-t-[0.5px] border-[#1C1C1C] pt-2.5">
          <span className="flex items-center gap-[5px] text-[12px] text-[#555555]">
            <Flame size={14} aria-hidden /> {session.like_count}
            <span className="sr-only">likes</span>
          </span>
          <span className="flex items-center gap-[5px] text-[12px] text-[#555555]">
            <MessageCircle size={14} aria-hidden /> {session.comment_count}
            <span className="sr-only">comments</span>
          </span>
          <VisibilityBadge visibility={session.visibility} />
        </footer>
      )}
    </article>
  );
}
