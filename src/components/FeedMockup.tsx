import { Flame, MessageCircle } from "lucide-react";

export default function FeedMockup() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#22C55E] opacity-[0.07] blur-[120px] pointer-events-none"
      />

      <div className="relative mx-auto max-w-2xl px-6 sm:px-8">
        <p className="text-center font-[family-name:var(--font-mono)] text-[11px] sm:text-xs uppercase tracking-[0.3em] text-[#22C55E] mb-8">
          — This is what your feed looks like —
        </p>

        <div className="float-anim">
          <article
            className="glow-ring bg-[#141414] rounded-2xl p-6 sm:p-8"
            aria-label="Example session post"
          >
            {/* Top row */}
            <header className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="w-11 h-11 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16a34a] flex items-center justify-center text-[#0A0A0A] font-bold text-sm"
              >
                AR
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-semibold text-white">
                  Arjun Rao
                </div>
                <div className="truncate text-sm text-[#888888]">
                  @arjun_rao · 2 hours ago
                </div>
              </div>
            </header>

            {/* Dots */}
            <div
              className="mt-6 flex items-center gap-2"
              aria-label="8 Pomodoros completed"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="dot w-3 h-3 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E80]"
                />
              ))}
              <span className="ml-2 text-xs font-[family-name:var(--font-mono)] text-[#888888]">
                8 / 8
              </span>
            </div>

            {/* Big stat */}
            <div className="mt-6">
              <div
                className="font-[family-name:var(--font-display)] font-bold text-white leading-none"
                style={{ fontSize: "clamp(48px, 7vw, 72px)" }}
              >
                3 hr 20 min
              </div>
              <div className="mt-1 text-[#888888] text-sm font-[family-name:var(--font-mono)] uppercase tracking-wider">
                Total focus time
              </div>
            </div>

            {/* Subject pill — same dark-green fill/border as the real feed card */}
            <div className="mt-6">
              <span className="inline-flex items-center gap-2 rounded-[20px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-3 py-1.5 text-sm font-medium text-[#22C55E]">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"
                />
                Physics — Electrostatics
              </span>
            </div>

            {/* Caption — muted grey like the real feed card, just sized up for
                the landing hero so it stays readable next to the big stat. */}
            <p className="mt-5 text-[#888888] leading-[1.5]">
              Finally cracked Gauss&apos;s law. 8 pomodoros, zero distractions.
            </p>

            {/* Footer — same lucide icons + badge as the real feed card */}
            <footer className="mt-6 pt-5 border-t border-[#2A2A2A] flex items-center gap-4 text-sm text-[#888888]">
              <span className="flex items-center gap-1.5 text-[#22C55E]">
                <Flame size={16} aria-hidden className="fill-[#22C55E]" /> 14
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle size={16} aria-hidden /> 3
              </span>
              <span
                aria-hidden="true"
                className="ml-auto rounded-[20px] border-[0.5px] border-[#22C55E33] px-2 py-[2px] text-[10px] text-[#22C55E]"
              >
                Public
              </span>
            </footer>
          </article>
        </div>
      </div>
    </section>
  );
}
