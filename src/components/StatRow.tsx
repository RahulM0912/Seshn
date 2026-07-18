"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, start: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    // Reduced motion: land on the final number in one frame, no ticker.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      if (reduced) {
        setValue(target);
        return;
      }
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return value;
}

// One live number instead of the old static gimmick stats (Step 26): the
// site-wide focus total, fetched server-side on the landing page and counted
// up on scroll-into-view. Real usage is the pitch.
export default function StatRow({ totalMinutes }: { totalMinutes: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const minutes = useCountUp(totalMinutes, visible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-label="Total minutes focused on Seshn"
      className="border-y border-[#2A2A2A]"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 py-12 sm:py-16 flex flex-col items-center text-center">
        <div
          className="font-[family-name:var(--font-mono)] text-white tabular-nums"
          style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
        >
          {minutes.toLocaleString("en-US")}
        </div>
        <div className="mt-2 text-sm sm:text-base text-[#888888] uppercase tracking-wider font-[family-name:var(--font-mono)]">
          Minutes focused on Seshn — and counting
        </div>
      </div>
    </section>
  );
}
