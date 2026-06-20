import Link from "next/link";

// Closing call-to-action for the landing page. Replaces the old email waitlist
// now that the app is live — drops people straight into Google sign-in.
export default function FinalCta({ isAuthed = false }: { isAuthed?: boolean }) {
  return (
    <section
      id="get-started"
      aria-labelledby="cta-heading"
      className="py-24 sm:py-36 relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22C55E]/40 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 -bottom-40 w-[700px] h-[400px] rounded-full bg-[#22C55E] opacity-[0.12] blur-[140px] pointer-events-none"
      />

      <div className="relative mx-auto max-w-2xl px-6 sm:px-8 text-center">
        <h2
          id="cta-heading"
          className="font-[family-name:var(--font-display)] font-bold leading-[1] tracking-tight"
          style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
        >
          Make your focus <span className="text-[#22C55E]">count.</span>
        </h2>
        <p className="mt-5 text-[#888888] text-base sm:text-lg max-w-md mx-auto">
          Start your first session, post it to your feed, and see what your
          friends are grinding. It&apos;s free.
        </p>

        <div className="mt-10 flex justify-center">
          <Link
            href={isAuthed ? "/feed" : "/login"}
            aria-label={isAuthed ? "Open Seshn" : "Get started with Seshn"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#22C55E] px-8 py-4 text-base font-semibold text-[#0A0A0A] transition-all hover:bg-[#16a34a] hover:scale-[1.03]"
          >
            {isAuthed ? "Open Seshn" : "Get started"}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <p className="mt-6 text-xs sm:text-sm text-[#888888]">
          {isAuthed
            ? "You're signed in. Jump back into your feed."
            : "Sign in with Google. No cheating — just discipline made visible."}
        </p>
      </div>
    </section>
  );
}
