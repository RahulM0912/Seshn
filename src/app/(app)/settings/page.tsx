import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import SettingsForm from "@/components/SettingsForm";

// Settings (Step 12) — inside the (app) group, so it already has the auth gate
// and the app chrome (navbar + sidebar). We re-read the full profile here (the
// layout only selects a few columns) to seed the form. The edit/sign-out/delete
// interactions live in the client SettingsForm.
export const metadata: Metadata = { title: "Settings · Seshn" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold text-white">Settings</h1>
      <p className="mb-6 mt-1 text-[13px] text-[#555555]">
        Manage your profile and account.
      </p>
      <SettingsForm profile={profile} />
    </div>
  );
}
