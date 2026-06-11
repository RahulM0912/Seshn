import { supabase } from "@/lib/supabase";

async function getWaitlistCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_waitlist_count");
  if (error || typeof data !== "number") return 0;
  return data;
}

export default async function Hero() {
  const count = await getWaitlistCount();

  return (
    <section
      id="top"
      className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 hero-grid pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#22C55E] opacity-10 blur-[140px] pointer-events-none"
      />

      <div className="relative mx-auto max-w-5xl px-6 sm:px-8 text-center">
        <div className="fade-up delay-100 inline-flex items-center gap-2 mb-8">
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"
          />
          <span className="font-[family-name:var(--font-mono)] text-[11px] sm:text-xs uppercase tracking-[0.25em] text-[#22C55E]">
            Now in development
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] font-bold leading-[0.95] tracking-tight">
          <span
            className="fade-up delay-200 block"
            style={{ fontSize: "clamp(48px, 8vw, 96px)" }}
          >
            Your focus,
          </span>
          <span
            className="fade-up delay-300 block"
            style={{ fontSize: "clamp(48px, 8vw, 96px)" }}
          >
            made{" "}
            <span className="relative inline-block">
              <span className="relative z-10">social.</span>
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 bottom-[0.08em] h-[0.18em] bg-[#22C55E] -z-0 rounded-sm"
              />
            </span>
          </span>
        </h1>

        <p
          className="fade-up delay-400 mt-8 max-w-2xl mx-auto text-[#888888] leading-relaxed"
          style={{ fontSize: "clamp(16px, 2vw, 20px)" }}
        >
          Track your Pomodoro sessions. Post your daily focus time. See what
          your friends are building. No cheating — just discipline made visible.
        </p>

        <div className="fade-up delay-500 mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <a
            href="#waitlist"
            aria-label="Join the waitlist"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#22C55E] text-[#0A0A0A] px-7 py-3.5 rounded-full text-base font-semibold hover:bg-[#16a34a] hover:scale-[1.03] transition-all"
          >
            Join the waitlist
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="#how"
            aria-label="See how it works"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/20 text-white px-7 py-3.5 rounded-full text-base font-semibold hover:bg-white/5 hover:border-white/40 hover:scale-[1.03] transition-all"
          >
            See how it works
            <span aria-hidden="true">↓</span>
          </a>
        </div>

        <p className="fade-up delay-500 mt-8 text-sm text-[#888888]">
          Join{" "}
          <span className="text-white font-semibold">
            {count.toLocaleString()} {count === 1 ? "person" : "people"}
          </span>{" "}
          on the waitlist
        </p>
      </div>
    </section>
  );
}
