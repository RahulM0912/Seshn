import { CircleDot, Flame, MessageCircle } from "lucide-react";
import type { SessionWithProfile } from "@/lib/database.types";
import { avatarColor, formatFocusTime, initials, relativeTime } from "@/lib/format";
import LikeButton from "@/components/LikeButton";

// One feed/profile post. Presentational + data-driven (the landing page keeps its
// own `FeedMockup`). Stays a Server Component — only the 🔥 extracts an
// interactive client child (`LikeButton`) when there's a signed-in viewer; a
// signed-out / public view keeps the read-only count. Comments (Step 9) follow.
//
// `viewerId` is the signed-in user (null when signed out); `liked` is whether
// that viewer has already liked this session (from a batch lookup by the page).
export default function SessionCard({
  session,
  viewerId = null,
  liked = false,
}: {
  session: SessionWithProfile;
  viewerId?: string | null;
  liked?: boolean;
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

      {/* Footer — 🔥 is interactive for a signed-in viewer; 💬 lands in Step 9 */}
      <footer className="flex items-center gap-3 border-t-[0.5px] border-[#1C1C1C] pt-2.5">
        {viewerId ? (
          <LikeButton
            sessionId={session.id}
            viewerId={viewerId}
            initialLiked={liked}
            initialCount={session.like_count}
          />
        ) : (
          <span className="flex items-center gap-[5px] text-[12px] text-[#555555]">
            <Flame size={14} aria-hidden /> {session.like_count}
            <span className="sr-only">likes</span>
          </span>
        )}
        <span className="flex items-center gap-[5px] text-[12px] text-[#555555]">
          <MessageCircle size={14} aria-hidden /> {session.comment_count}
          <span className="sr-only">comments</span>
        </span>
        {session.visibility === "public" ? (
          <span className="ml-auto rounded-[20px] border-[0.5px] border-[#22C55E33] px-2 py-[2px] text-[10px] text-[#22C55E]">
            Public
          </span>
        ) : (
          <span className="ml-auto rounded-[20px] border-[0.5px] border-[#2A2A2A] px-2 py-[2px] text-[10px] capitalize text-[#888888]">
            {session.visibility}
          </span>
        )}
      </footer>
    </article>
  );
}
