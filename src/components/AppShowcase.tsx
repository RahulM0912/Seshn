import Image from "next/image";

// Real product screenshots (Step 26) — the actual UI is the pitch. Composed as a
// product hero: the desktop feed inside a browser-chrome frame, with the mobile
// timer overlapping its bottom-right corner (stacks below on phones). Files live
// in /public/screenshots; swap them for fresh captures anytime — the width/height
// props carry each file's real aspect so nothing stretches.
export default function AppShowcase() {
  return (
    <section id="product" className="py-24 sm:py-32 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[560px] rounded-full bg-[#22C55E] opacity-[0.07] blur-[150px] pointer-events-none"
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="mb-14 sm:mb-20 max-w-2xl">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.25em] text-[#22C55E] mb-4">
            Inside the app
          </p>
          <h2
            className="font-[family-name:var(--font-display)] font-bold leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(36px, 5vw, 64px)" }}
          >
            The real thing.{" "}
            <span className="text-[#888888]">Feed and timer.</span>
          </h2>
        </div>

        {/* Composition: browser frame is the base; phone is an absolutely-placed
            sibling that overlaps its corner on md+, and stacks centered below on
            small screens. The container is padded on the right at lg so the phone
            has room to hang off the browser without leaving the section. */}
        <div className="relative mx-auto max-w-5xl lg:pr-24">
          {/* Desktop feed in a browser-chrome window */}
          <figure className="glow-ring overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#141414]">
            <div className="flex items-center gap-2 border-b border-[#2A2A2A] bg-[#111111] px-4 py-3">
              <span aria-hidden className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span aria-hidden className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span aria-hidden className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 hidden rounded-md bg-[#0A0A0A] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] text-[#888888] sm:inline-block">
                seshn.in/feed
              </span>
            </div>
            <Image
              src="/screenshots/feed.png"
              alt="The Seshn feed on desktop — friends' posted focus sessions, with the live timer in the sidebar"
              width={1910}
              height={892}
              sizes="(min-width: 1024px) 64rem, 100vw"
              className="w-full h-auto"
            />
          </figure>

          {/* Mobile timer, in a slim device bezel, overlapping the browser's
              corner on md+ and centered below on phones. The bezel is thin with a
              small corner radius so it never clips into the screenshot's avatar. */}
          <figure className="mx-auto mt-6 w-[210px] sm:w-[220px] md:absolute md:-bottom-12 md:right-0 md:mt-0 md:w-[190px] lg:-right-2">
            <div className="overflow-hidden rounded-[18px] border-2 border-[#242424] bg-[#242424] shadow-[0_24px_70px_-15px_rgba(0,0,0,0.85)]">
              <Image
                src="/screenshots/timer.png"
                alt="The Seshn timer tab on a phone — Pomodoro countdown with streak and friends' activity below"
                width={286}
                height={630}
                sizes="220px"
                className="w-full h-auto rounded-[12px]"
              />
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
