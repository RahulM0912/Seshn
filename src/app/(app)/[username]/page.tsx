import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProfileContent from "@/components/ProfileContent";
import { getProfileByUsername } from "@/lib/queries";
import { getViewer } from "@/lib/viewer";

// Public profile — seshn.in/<username>, reachable signed-out. It lives inside the
// (app) group (NOT the auth-gated (authed) one) so a signed-in viewer keeps the
// navbar + running sidebar timer when they open it: navigating /feed ↔ /username
// stays within the shared (app) layout, so only <main> swaps — same feel as
// /friends. The chrome (full AppShell when signed-in, light bar signed-out) is
// chosen by that layout; this page renders only the body. createClient (via the
// queries) is cookie-aware, so RLS shows each visitor exactly what they may see.
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

  return <ProfileContent profile={profile} viewer={viewer} />;
}
