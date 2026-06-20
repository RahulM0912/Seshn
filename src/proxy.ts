import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Required by @supabase/ssr: refreshes the JWT on every request so the browser
// client always has a live token for client-side mutations (like / unlike, soft
// delete, etc.). Without this, the access token expires after ~1 hour and
// Supabase REST returns 403 because the request goes out as `anon` (no UPDATE
// policy) instead of `authenticated`.
//
// Next 16 renamed the `middleware` convention to `proxy` (same request-time hook,
// runs before a request is processed). Keep this function minimal: any code
// between createServerClient and supabase.auth.getUser() can cause users to be
// randomly signed out if the response is returned before the cookie rotation
// completes.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session. Do NOT add anything between here and the return.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
