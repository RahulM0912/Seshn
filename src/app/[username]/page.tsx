import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import ProfileContent from "@/components/ProfileContent";
import { getProfileByUsername } from "@/lib/queries";
import { getViewer } from "@/lib/viewer";

// Public profile — a root-level route (seshn.in/<username>), reachable signed-out.
// It uses the cookie-aware client (via the queries), so RLS shows each visitor
// only what they're allowed to see; no special-casing here. createClient touches
// cookies, so this renders dynamically — correct, it's per-viewer.
//
// Chrome is conditional: a signed-in visitor gets the full app shell (navbar +
// the persistent sidebar timer) so nav and the running timer stay put; a
// signed-out visitor gets a light standalone bar so the page is shareable. The
// body is the shared ProfileContent component (also rendered for your own
// profile here — this is your @handle URL).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: { absolute: "Not found · Seshn" } };

  // Bare title — the root layout's template appends "· Seshn".
  const title = `${profile.display_name} (@${profile.username})`;
  const description =
    profile.bio ?? `${profile.display_name}'s focus sessions on Seshn.`;
  return {
    title,
    description,
    alternates: { canonical: `/${profile.username}` },
    openGraph: { title, description, type: "profile", url: `/${profile.username}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [profile, viewer] = await Promise.all([
    getProfileByUsername(username),
    getViewer(),
  ]);
  if (!profile) notFound();

  const content = <ProfileContent profile={profile} viewer={viewer} />;

  // Signed-in (viewing someone else): reuse the app shell so the navbar + running
  // timer stay on screen.
  if (viewer) {
    return (
      <AppShell
        userId={viewer.id}
        username={viewer.username}
        displayName={viewer.displayName}
      >
        {content}
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
      {content}
    </div>
  );
}
