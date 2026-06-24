import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getSessionUser } from "@/lib/viewer";

// Canonical auth gate for every signed-in screen (feed / friends / explore /
// settings). Split out from the parent (app) layout so the sibling public profile
// route (/[username]) can share that layout's chrome WITHOUT this redirect — only
// the authed pages live under this group. getUser() revalidates the JWT
// server-side (never getSession()); cookies() (inside createClient) makes these
// render dynamically, which is correct — they're per-user. The chrome (navbar +
// sidebar) comes from the parent layout; this one only guards and passes children
// straight through.
export const metadata: Metadata = {
  // Per-user, behind auth — keep out of search results (belt-and-suspenders
  // alongside robots.txt). The public profile sits OUTSIDE this group, so it
  // stays indexable.
  robots: { index: false, follow: false },
};

export default async function AuthedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded) redirect("/onboarding");

  return <>{children}</>;
}
