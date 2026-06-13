import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The profile row already exists (created by the handle_new_user trigger on
  // signup) with a placeholder username. maybeSingle() so a missing row is null
  // rather than a thrown error.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarded) redirect("/feed");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.25em] text-[#22C55E]">
            One last step
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            Claim your handle.
          </h1>
          <p className="mt-3 text-[#888888]">
            This is how friends find you. You can change it later.
          </p>
        </div>

        <OnboardingForm
          userId={user.id}
          initialDisplayName={profile?.display_name ?? ""}
        />
      </div>
    </main>
  );
}
