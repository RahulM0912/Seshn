import "server-only";
import { createClient } from "@/lib/supabase-server";

// The signed-in, onboarded viewer — just enough to decide whether to render the
// full app chrome (AppShell) vs the light standalone header on a public page.
// Shared by the public profile page and the session permalink page (both are
// reachable signed-out, so both branch on this). Returns null when signed out or
// not yet onboarded (those users belong on /login or /onboarding).
export interface Viewer {
  id: string;
  username: string;
  displayName: string;
}

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, onboarded")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.onboarded) return null;
  return { id: user.id, username: data.username, displayName: data.display_name };
}
