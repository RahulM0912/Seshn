import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AppShell from "@/components/AppShell";

// Every screen in this group is per-user and behind auth — keep them out of
// search results (robots.txt disallows the same paths; this is the in-page
// belt-and-suspenders for anything a crawler reaches via a direct link).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Canonical auth gate for every signed-in screen (Slices 2–11). getUser()
// revalidates the JWT server-side — never use getSession() here. Calling
// cookies() (inside createClient) makes every page in this group render
// dynamically, which is correct: these screens are per-user. The chrome itself
// lives in AppShell, shared with the public profile page (when signed in).
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded) redirect("/onboarding");

  return (
    <AppShell
      userId={user.id}
      username={profile.username}
      displayName={profile.display_name}
    >
      {children}
    </AppShell>
  );
}
