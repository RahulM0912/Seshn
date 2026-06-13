import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set in .env",
  );
}

// Narrowed to `string` after the guard; aliased so the closures below capture
// `string` rather than `string | undefined`.
const SUPABASE_URL = supabaseUrl;
const SUPABASE_KEY = supabaseKey;

/**
 * Cookie-aware server client — for Server Components, Route Handlers, and the
 * OAuth callback. Reads the session from cookies and (where the runtime allows
 * writing them) refreshes it.
 *
 * Create a fresh client per request; never cache one across requests. Because
 * it calls `cookies()` — a request-time API — any route that uses it renders
 * dynamically. Don't use it on statically-prerendered pages; use
 * `createAnonClient` for public reads there.
 *
 * On the server always use `supabase.auth.getUser()` (revalidates the JWT with
 * Supabase), never `getSession()` (which trusts the cookie unverified).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called during a Server Component render, where cookies are
          // read-only. Safe to ignore: token refreshes are persisted from
          // writable contexts (Route Handlers / Server Actions).
        }
      },
    },
  });
}

/**
 * Anonymous, cookie-free client for PUBLIC reads on static / ISR pages (e.g.
 * the landing-page waitlist count). It never touches cookies, so it does NOT
 * force dynamic rendering — the page stays prerenderable. It has no session;
 * never use it for anything user-specific.
 */
export function createAnonClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
}
