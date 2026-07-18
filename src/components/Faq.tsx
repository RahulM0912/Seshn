import { Plus } from "lucide-react";
import { SUPPORT_MAILTO } from "@/lib/support";

// Three-question FAQ (Step 26) — the objections people actually have, nothing
// more. Native <details>/<summary>: accordion behavior, keyboard support, and
// SEO-readable answers for free, zero client JS.
const items = [
  {
    q: "Is it free?",
    a: "Yes. The timer, the feed, streaks, daily goals — all of it. Sign in with Google and start your first session.",
  },
  {
    q: "Do I need friends on it?",
    a: "No. The timer, streaks, and daily goal work solo from day one. Friends make it better — their sessions show up in your feed and yours in theirs — and the Explore tab helps you find people to follow.",
  },
  {
    q: "What stops cheating?",
    a: "Posts come from the timer, not a text box. There's no field to type “3 hours” into — you run the session, then post what you actually did. That's the whole point: discipline made visible.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.25em] text-[#22C55E] mb-4">
          FAQ
        </p>
        <h2
          className="font-[family-name:var(--font-display)] font-bold leading-[1.05] tracking-tight"
          style={{ fontSize: "clamp(36px, 5vw, 64px)" }}
        >
          Quick answers.
        </h2>

        <div className="mt-10 border-t border-[#2A2A2A]">
          {items.map(({ q, a }) => (
            <details key={q} className="group border-b border-[#2A2A2A]">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-5 text-left text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/50 sm:text-lg [&::-webkit-details-marker]:hidden">
                {q}
                <Plus
                  size={18}
                  aria-hidden
                  className="shrink-0 text-[#22C55E] transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                />
              </summary>
              <p className="pb-6 text-[#888888] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-sm text-[#888888]">
          Still have questions?{" "}
          <a
            href={SUPPORT_MAILTO}
            className="text-[#22C55E] underline underline-offset-4 transition-colors hover:text-[#1FB055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/50 rounded-sm"
          >
            Email me
          </a>{" "}
          — I read everything.
        </p>
      </div>
    </section>
  );
}
