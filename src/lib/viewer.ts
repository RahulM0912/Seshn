import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase-server";

// supabase.auth.getUser() revalidates the JWT with Supabase on every call — a
// network round-trip. In one render several layers need it (the (app) chrome
// layout, the (authed) gate, and the page itself), so wrap it in React cache():
// all callers in the same request collapse to a SINGLE auth round-trip. Returns
// the raw user (or null) — callers that also need the profile use getViewer.
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// The signed-in, onboarded viewer — just enough to decide whether to render the
// full app chrome (AppShell) vs the light standalone header on a public page.
// Shared by the (app) layout, the public profile page, and the session permalink
// page (all branch on this). Returns null when signed out or not yet onboarded
// (those users belong on /login or /onboarding). cache()d too, so the (app)
// layout and the page it wraps share one profile lookup per request.
export interface Viewer {
  id: string;
  username: string;
  displayName: string;
  /** Daily focus target in minutes; null = no goal (navbar ring hidden). */
  dailyGoalMinutes: number | null;
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, onboarded, daily_goal_minutes")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.onboarded) return null;
  return {
    id: user.id,
    username: data.username,
    displayName: data.display_name,
    dailyGoalMinutes: data.daily_goal_minutes,
  };
});
