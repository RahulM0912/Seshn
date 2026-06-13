import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set in .env",
  );
}

// Browser client — publishable (anon) key; access is governed by Row Level
// Security. Backed by @supabase/ssr so the session (and the OAuth PKCE
// verifier) live in cookies the server can read — that's what makes the
// server-side auth gate and the /auth/callback exchange work.
//
// Import this in Client Components only. Server Components / Route Handlers use
// `@/lib/supabase-server`.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
