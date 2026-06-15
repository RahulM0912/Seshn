import { CircleDot, Flame, MessageCircle } from "lucide-react";
import type { SessionWithProfile } from "@/lib/database.types";
import { avatarColor, formatFocusTime, initials, relativeTime } from "@/lib/format";
import SessionCardFooter from "@/components/SessionCardFooter";
import SessionOwnerMenu from "@/components/SessionOwnerMenu";
import VisibilityBadge from "@/components/VisibilityBadge";

// One feed/profile post. Presentational + data-driven (the landing page keeps its
// own `FeedMockup`). Stays a Server Component — a signed-in viewer gets the
// interactive `SessionCardFooter` (🔥 like + 💬 comments) as a client child; a
// signed-out / public view keeps a static, read-only footer.
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
}: {
  session: SessionWithProfile;
  viewerId?: string | null;
  liked?: boolean;
  defaultCommentsOpen?: boolean;
}) {
  const author = session.profiles;
  const av = avatarColor(author.id);

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
        {viewerId === author.id && <SessionOwnerMenu session={session} />}
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

      {/* Subject */}
      {session.subject && (
        <div className="mb-2 inline-flex items-center gap-[5px] rounded-[20px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-2.5 py-[3px] text-[11px] text-[#22C55E]">
          <CircleDot size={10} aria-hidden />
          {session.subject}
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
