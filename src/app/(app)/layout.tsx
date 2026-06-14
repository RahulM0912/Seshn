import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AppNavbar from "@/components/AppNavbar";
import AppSidebar from "@/components/AppSidebar";

// Canonical auth gate for every signed-in screen (Slices 2–11). getUser()
// revalidates the JWT server-side — never use getSession() here. Calling
// cookies() (inside createClient) makes every page in this group render
// dynamically, which is correct: these screens are per-user.
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

  // h-dvh (not h-screen) so the mobile URL bar doesn't clip the layout. The body
  // uses the FULL screen width (no max-w cap); the timer column is widened instead
  // (320px on tablet → 400px on laptop) so the timer gets more room and the
  // feed:sidebar ratio reads balanced rather than a thin rail beside a huge feed.
  // Two columns from md up (tablets side-by-side); below md it's one scrolling
  // column with the sidebar reflowed above the feed via `order`.
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0A0A0A]">
      <AppNavbar username={profile.username} displayName={profile.display_name} />
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[1fr_320px] md:overflow-hidden lg:grid-cols-[1fr_400px]">
        <main className="order-2 md:order-1 md:overflow-y-auto md:border-r-[0.5px] md:border-[#2A2A2A]">
          {children}
        </main>
        <AppSidebar />
      </div>
    </div>
  );
}
