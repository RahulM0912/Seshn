"use client";

import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0A0A]/70 backdrop-blur-xl border-b border-[#2A2A2A]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-6 sm:px-8 h-16 flex items-center justify-between">
        <a
          href="#top"
          aria-label="Seshn home"
          className="flex items-center gap-2 group"
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_12px_#22C55E80] group-hover:scale-125 transition-transform"
          />
          <span className="font-[family-name:var(--font-display)] font-bold text-lg tracking-tight">
            Seshn
          </span>
        </a>

        <a
          href="#waitlist"
          aria-label="Join the waitlist"
          className="hidden sm:inline-flex items-center gap-2 bg-[#22C55E] text-[#0A0A0A] px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#16a34a] hover:scale-[1.03] transition-all"
        >
          Join waitlist
        </a>
      </nav>
    </header>
  );
}
