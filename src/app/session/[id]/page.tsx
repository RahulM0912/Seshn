import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import SessionCard from "@/components/SessionCard";
import { getLikedSessionIds, getSessionById } from "@/lib/queries";
import { getViewer } from "@/lib/viewer";

// Session permalink — a root-level public route (seshn.in/session/<id>), the
// deep-link target for like/comment notifications and a shareable single-session
// page. Like the profile page it's reachable signed-out and uses the cookie-aware
// client, so RLS scopes visibility per viewer (a private session 404s for anyone
// but its owner). Chrome is conditional: signed-in → full AppShell; signed-out →
// the light standalone bar. `?c=1` opens the comment thread (comment deep-links).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await getSessionById(id);
  if (!session) return { title: "Not found · Seshn" };
  return {
    title: `${session.profiles.display_name}'s focus session · Seshn`,
    description:
      session.caption ?? `A focus session by ${session.profiles.display_name} on Seshn.`,
  };
}

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const { c } = await searchParams;
  const [session, viewer] = await Promise.all([getSessionById(id), getViewer()]);
  if (!session) notFound();

  const likedIds = viewer
    ? await getLikedSessionIds(viewer.id, [session.id])
    : new Set<string>();

  const body = (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/feed"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[#888888] transition-colors hover:text-white"
      >
        <ArrowLeft size={14} aria-hidden />
        Back to feed
      </Link>
      <SessionCard
        session={session}
        viewerId={viewer?.id ?? null}
        liked={likedIds.has(session.id)}
        defaultCommentsOpen={c === "1"}
      />
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
