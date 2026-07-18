import Link from "next/link";
import { Flame } from "lucide-react";
import SessionList from "@/components/SessionList";
import FocusHeatmap from "@/components/FocusHeatmap";
import FollowButton from "@/components/FollowButton";
import ShareTodayButton from "@/components/ShareTodayButton";
import {
  SESSIONS_PAGE_SIZE,
  getDailyFocusMinutes,
  getFocusHeatmap,
  getFollowCounts,
  getLikedSessionIds,
  getStreak,
  getUserSessions,
  isFollowing,
} from "@/lib/queries";
import type { Profile } from "@/lib/database.types";
import type { Viewer } from "@/lib/viewer";
import { avatarColor, formatFocusTime, initials, isStreakAlive } from "@/lib/format";

// The profile body (header + heatmap + sessions), without any page chrome. Lives
// in its own component so the /[username] route can keep its chrome logic (own
// AppShell when signed-in, light bar signed-out) separate from the body. `viewer`
// is passed in by the caller (the route already resolves it) rather than
// re-fetched here.

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[18px] font-semibold leading-none text-white tabular-nums">
        {value}
      </span>
      <span className="mt-1.5 text-[10px] uppercase tracking-[0.06em] text-[#8A8A8A]">
        {label}
      </span>
    </div>
  );
}

export default async function ProfileContent({
  profile,
  viewer,
}: {
  profile: Profile;
  viewer: Viewer | null;
}) {
  const [sessions, dailyMinutes, follows, streak, heatmap] = await Promise.all([
    getUserSessions(profile.id),
    getDailyFocusMinutes(profile.id),
    getFollowCounts(profile.id),
    getStreak(profile.id),
    getFocusHeatmap(profile.id, profile.timezone),
  ]);

  const av = avatarColor(profile.id);
  const streakDisplay =
    streak && isStreakAlive(streak.last_session_date, profile.timezone)
      ? streak.current_streak
      : 0;

  // Follow control: a live optimistic button for a signed-in viewer looking at
  // someone else; a login nudge for signed-out visitors; nothing on your own
  // profile (you can't follow yourself).
  const isOwnProfile = viewer?.id === profile.id;
  const following =
    viewer && !isOwnProfile ? await isFollowing(viewer.id, profile.id) : false;

  // Which of these sessions the signed-in viewer has 🔥'd (one query for the
  // list). Signed-out visitors get the read-only count — no lookup needed.
  const likedIds = viewer
    ? await getLikedSessionIds(
        viewer.id,
        sessions.map((s) => s.id),
      )
    : new Set<string>();
  const followSlot =
    viewer && !isOwnProfile ? (
      <FollowButton
        viewerId={viewer.id}
        targetId={profile.id}
        initialFollowing={following}
      />
    ) : !viewer ? (
      <Link
        href="/login"
        className="flex-shrink-0 rounded-[20px] bg-[#22C55E] px-4 py-1.5 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055]"
      >
        Follow
      </Link>
    ) : null;

  // On your own profile the follow slot is empty — reuse it for "Share today",
  // but only once there's something to brag about (focus logged today).
  const topRightSlot =
    isOwnProfile && dailyMinutes > 0 ? <ShareTodayButton /> : followSlot;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Profile header */}
      <section className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            style={{ backgroundColor: av.bg, color: av.text }}
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-medium"
          >
            {initials(profile.display_name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-white">
              {profile.display_name}
            </h1>
            <p className="truncate text-[13px] text-[#8A8A8A]">
              @{profile.username}
            </p>
            {profile.bio && (
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#888888]">
                {profile.bio}
              </p>
            )}
          </div>
          {topRightSlot}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-6">
          <Stat
            value={
              <span className="flex items-center gap-1">
                <Flame size={16} className="text-[#22C55E]" aria-hidden />
                {streakDisplay}
              </span>
            }
            label="Day streak"
          />
          <Stat value={formatFocusTime(dailyMinutes)} label="Today" />
          <Stat value={follows.followers} label="Followers" />
          <Stat value={follows.following} label="Following" />
        </div>
      </section>

      {/* Focus activity heatmap */}
      <FocusHeatmap
        minutesByDay={heatmap}
        timeZone={profile.timezone}
        isOwnProfile={isOwnProfile}
        maxStreak={streak?.longest_streak ?? 0}
      />

      {/* Sessions — keyset-paginated; the owner gets a visibility filter. */}
      <SessionList
        context={{ kind: "profile", profileId: profile.id }}
        title="Sessions"
        viewerId={viewer?.id ?? null}
        initialSessions={sessions.map((s) => ({ ...s, profiles: profile }))}
        initialLikedIds={[...likedIds]}
        initialCursor={
          sessions.length === SESSIONS_PAGE_SIZE
            ? {
                createdAt: sessions[sessions.length - 1].created_at,
                id: sessions[sessions.length - 1].id,
              }
            : null
        }
        showVisibilityFilter={isOwnProfile}
      />
    </div>
  );
}
