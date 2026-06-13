import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import SignOutButton from "@/components/SignOutButton";

// TEMPORARY — Step 1 verification target. The auth gate logic below moves into
// `(app)/layout.tsx` in Step 2, and the real feed (Step 6) replaces this page.
// When Step 2 creates `(app)/feed/page.tsx`, delete this file to avoid a route
// collision on `/feed`.
export default async function FeedPage() {
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
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.25em] text-[#22C55E]">
        You&apos;re in
      </span>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
        {profile.display_name}
      </h1>
      <p className="mt-1 text-[#888888]">@{profile.username}</p>

      <p className="mt-8 max-w-sm text-sm text-[#666666]">
        Auth is wired up. The app shell — feed + timer sidebar — lands in Step 2.
      </p>

      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
