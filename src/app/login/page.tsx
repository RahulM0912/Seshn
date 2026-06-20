import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default async function LoginPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise — must be awaited.
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-lg font-semibold"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[#22C55E]"
          />
          Seshn
        </Link>

        <h1
          className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Welcome to Seshn.
        </h1>
        <p className="mt-3 text-[#888888]">
          Sign in to track your focus and see what your friends are grinding.
        </p>

        {error === "auth" && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            Sign-in didn&apos;t complete. Please try again.
          </p>
        )}

        <div className="mt-10">
          <GoogleSignInButton />
        </div>

        <p className="mt-8 text-xs text-[#666666]">
          By continuing you agree to focus honestly. No cheating — just
          discipline made visible.
        </p>
      </div>
    </main>
  );
}
