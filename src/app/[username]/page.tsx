import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flame } from "lucide-react";
import AppShell from "@/components/AppShell";
import SessionCard from "@/components/SessionCard";
import { createClient } from "@/lib/supabase-server";
import {
  getDailyFocusMinutes,
  getFollowCounts,
  getProfileByUsername,
  getStreak,
  getUserSessions,
} from "@/lib/queries";
import { avatarColor, formatFocusTime, initials, isStreakAlive } from "@/lib/format";

// Public profile — a root-level route (seshn.in/<username>), reachable signed-out.
// It uses the cookie-aware client (via the queries), so RLS shows each visitor
// only what they're allowed to see; no special-casing here. createClient touches
// cookies, so this renders dynamically — correct, it's per-viewer.
//
// Chrome is conditional: a signed-in visitor gets the full app shell (navbar +
// the persistent sidebar timer) so nav and the running timer stay put; a
// signed-out visitor gets a light standalone bar so the page is shareable.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Not found · Seshn" };
  return {
    title: `${profile.display_name} (@${profile.username}) · Seshn`,
    description: profile.bio ?? `${profile.display_name}'s focus sessions on Seshn.`,
  };
}

type Viewer = { id: string; username: string; displayName: string };

/** The signed-in viewer (any user), used to decide whether to render app chrome. */
async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, onboarded")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.onboarded) return null;
  return { id: user.id, username: data.username, displayName: data.display_name };
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[18px] font-semibold leading-none text-white tabular-nums">
        {value}
      </span>
      <span className="mt-1.5 text-[10px] uppercase tracking-[0.06em] text-[#555555]">
        {label}
      </span>
    </div>
  );
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const [sessions, dailyMinutes, follows, streak, viewer] = await Promise.all([
    getUserSessions(profile.id),
    getDailyFocusMinutes(profile.id),
    getFollowCounts(profile.id),
    getStreak(profile.id),
    getViewer(),
  ]);

  const av = avatarColor(profile.id);
  const streakDisplay =
    streak && isStreakAlive(streak.last_session_date, profile.timezone)
      ? streak.current_streak
      : 0;

  const body = (
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
            <p className="truncate text-[13px] text-[#555555]">
              @{profile.username}
            </p>
            {profile.bio && (
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#888888]">
                {profile.bio}
              </p>
            )}
          </div>
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

      {/* Sessions */}
      <h2 className="mb-3 mt-6 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-[#555555]">
        Sessions
      </h2>
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] px-6 py-16 text-center">
          <p className="text-[13px] font-medium text-white">No sessions yet</p>
          <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-[#888888]">
            Posted focus sessions show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={{ ...session, profiles: profile }}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Signed-in: reuse the app shell so the navbar + running timer stay on screen.
  if (viewer) {
    return (
      <AppShell
        userId={viewer.id}
        username={viewer.username}
        displayName={viewer.displayName}
      >
        {body}
      </AppShell>
    );
  }

  // Signed-out: light, shareable standalone layout.
  return (
    <div className="min-h-dvh bg-[#0A0A0A]">
      <header className="flex h-[52px] items-center border-b-[0.5px] border-[#2A2A2A] bg-[#111111] px-4 sm:px-5">
        <Link href="/feed" className="flex items-center gap-[7px]">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[#22C55E]" />
          <span className="text-base font-medium text-white">Seshn</span>
        </Link>
      </header>
      {body}
    </div>
  );
}
