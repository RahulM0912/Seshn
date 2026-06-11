"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Status = "idle" | "loading" | "success" | "error";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setStatus("loading");
    setError("");

    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email: trimmed });

    if (insertError) {
      // 23505 = unique_violation → already on the list, treat as success
      if (insertError.code === "23505") {
        setStatus("success");
        return;
      }
      setStatus("error");
      setError("Something went wrong. Please try again.");
      return;
    }

    setStatus("success");
  }

  return (
    <section
      id="waitlist"
      aria-labelledby="waitlist-heading"
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
          id="waitlist-heading"
          className="font-[family-name:var(--font-display)] font-bold leading-[1] tracking-tight"
          style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
        >
          Be first when <span className="text-[#22C55E]">we launch.</span>
        </h2>
        <p className="mt-5 text-[#888888] text-base sm:text-lg max-w-md mx-auto">
          Drop your email. We&apos;ll send you early access and nothing else.
        </p>

        <div className="mt-10 max-w-[480px] mx-auto">
          {status === "success" ? (
            <div
              role="status"
              className="flex items-center justify-center gap-3 rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/10 px-6 py-5"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-[#0A0A0A] text-sm font-bold"
              >
                ✓
              </span>
              <p className="text-left text-sm sm:text-base text-white">
                You&apos;re on the list. We&apos;ll email you when Seshn launches.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-stretch gap-3"
              noValidate
            >
              <label htmlFor="waitlist-email" className="sr-only">
                Email address
              </label>
              <input
                id="waitlist-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
                placeholder="you@example.com"
                autoComplete="email"
                className="flex-1 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3.5 text-base text-white placeholder:text-[#666666] outline-none transition-colors focus:border-[#22C55E] focus:bg-white/[0.06] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#22C55E] px-7 py-3.5 text-base font-semibold text-[#0A0A0A] transition-all hover:bg-[#16a34a] hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100"
              >
                {status === "loading" ? "Joining…" : "Join waitlist"}
                {status !== "loading" && <span aria-hidden="true">→</span>}
              </button>
            </form>
          )}

          {status === "error" && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>

        <p className="mt-6 text-xs sm:text-sm text-[#888888]">
          No spam. No marketing emails. Just early access.
        </p>
      </div>
    </section>
  );
}
