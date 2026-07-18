import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getSessionUser } from "@/lib/viewer";
import SettingsForm from "@/components/SettingsForm";

// Settings (Step 12) — inside the (authed) group, so it already has the auth gate
// and the app chrome (navbar + sidebar). We re-read the full profile here (the
// gate only selects a few columns) to seed the form. The edit/sign-out/delete
// interactions live in the client SettingsForm.
export const metadata: Metadata = { title: "Settings · Seshn" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold text-white">Settings</h1>
      <p className="mb-6 mt-1 text-[13px] text-[#8A8A8A]">
        Manage your profile and account.
      </p>
      <SettingsForm profile={profile} />
    </div>
  );
}
