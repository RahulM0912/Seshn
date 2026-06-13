import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// OAuth callback: Google → Supabase → here with `?code=...`. We exchange the
// code for a session (which sets the auth cookies via the server client) and
// then redirect into the app. The gate on the destination route bounces
// un-onboarded users to /onboarding.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only allow internal redirect targets (guards against open redirect).
  const requested = searchParams.get("next") ?? "/feed";
  const next = requested.startsWith("/") ? requested : "/feed";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
