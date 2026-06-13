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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0A0A0A]">
      <AppNavbar username={profile.username} displayName={profile.display_name} />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_300px]">
        <main className="overflow-y-auto lg:border-r-[0.5px] lg:border-[#2A2A2A]">
          {children}
        </main>
        <AppSidebar />
      </div>
    </div>
  );
}
