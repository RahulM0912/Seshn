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
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-white">Arjun Rao</span>
                  <span className="text-[#888888] text-sm truncate">
                    @arjun_rao
                  </span>
                </div>
                <div className="text-[#888888] text-xs font-[family-name:var(--font-mono)]">
                  2 hours ago
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
                3h 20m
              </div>
              <div className="mt-1 text-[#888888] text-sm font-[family-name:var(--font-mono)] uppercase tracking-wider">
                Total focus time
              </div>
            </div>

            {/* Subject pill */}
            <div className="mt-6">
              <span className="inline-flex items-center gap-2 bg-[#22C55E]/15 text-[#22C55E] px-3 py-1.5 rounded-full text-sm font-medium border border-[#22C55E]/25">
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"
                />
                Physics — Electrostatics
              </span>
            </div>

            {/* Caption */}
            <p className="mt-5 text-white/90 leading-relaxed">
              Finally cracked Gauss&apos;s law. 8 pomodoros, zero distractions.
            </p>

            {/* Footer */}
            <footer className="mt-6 pt-5 border-t border-[#2A2A2A] flex items-center gap-5 text-sm text-[#888888]">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">🔥</span> 14
              </span>
              <span aria-hidden="true" className="text-[#2A2A2A]">
                ·
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">💬</span> 3 comments
              </span>
              <span
                aria-hidden="true"
                className="ml-auto text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#22C55E] border border-[#22C55E]/30 px-2 py-0.5 rounded-full"
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
