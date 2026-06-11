"use client";

import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, start: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
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

export default function StatRow() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const minutes = useCountUp(25, visible);

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

  const stats = [
    { value: `${minutes} min`, label: "One Pomodoro" },
    { value: "∞", label: "Subjects supported" },
    { value: "0 excuses", label: "Policy on skipping" },
  ];

  return (
    <section
      ref={ref}
      aria-label="Quick stats"
      className="border-y border-[#2A2A2A]"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-0 sm:divide-x divide-[#2A2A2A]">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex flex-col items-center sm:px-6 text-center"
          >
            <div
              className="font-[family-name:var(--font-mono)] text-white"
              style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
            >
              {s.value}
            </div>
            <div className="mt-2 text-sm sm:text-base text-[#888888] uppercase tracking-wider font-[family-name:var(--font-mono)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
