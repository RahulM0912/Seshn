const steps = [
  {
    n: "01",
    title: "Start your timer",
    body:
      "Run a Pomodoro session. 25 minutes of pure focus. The app tracks everything automatically.",
  },
  {
    n: "02",
    title: "Post your session",
    body:
      "When you're done, post your session to your feed — Pomodoros, total time, subject, and a one-line caption. Public or just for followers.",
  },
  {
    n: "03",
    title: "See your friends grind",
    body:
      "Your friends feed shows everyone's daily sessions. React, comment, compete. Accountability without a group chat.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="mb-14 sm:mb-20 max-w-2xl">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.25em] text-[#22C55E] mb-4">
            How it works
          </p>
          <h2
            className="font-[family-name:var(--font-display)] font-bold leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(36px, 5vw, 64px)" }}
          >
            Three steps. <span className="text-[#888888]">That&apos;s it.</span>
          </h2>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {steps.map((s) => (
            <li
              key={s.n}
              className="relative pt-8 border-t border-[#2A2A2A] group"
            >
              <span
                aria-hidden="true"
                className="absolute -top-px left-0 h-px w-0 bg-[#22C55E] group-hover:w-full transition-all duration-500"
              />
              <div className="font-[family-name:var(--font-mono)] text-[#22C55E] text-sm tracking-widest mb-4">
                {s.n}
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
                {s.title}
              </h3>
              <p className="text-[#888888] leading-relaxed text-base sm:text-lg">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
