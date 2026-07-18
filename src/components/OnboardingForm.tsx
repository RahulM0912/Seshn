"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { completeOnboarding } from "@/lib/mutations";
import { isUsernameAvailable } from "@/lib/client-queries";

// Mirror of the DB constraint (profiles.username check). Client-side validation
// is for fast feedback only; the database remains the source of truth.
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

type Availability = "idle" | "checking" | "available" | "taken";

export default function OnboardingForm({
  userId,
  initialDisplayName,
}: {
  userId: string;
  initialDisplayName: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<Availability>("idle");

  const handle = username.trim().toLowerCase();
  const usernameValid = USERNAME_RE.test(handle);

  // Live availability: debounced, only for a valid handle. setState stays inside
  // the timeout/async callback (no react-hooks/set-state-in-effect violation).
  useEffect(() => {
    if (!usernameValid) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setAvailability("checking");
      const free = await isUsernameAvailable(handle);
      if (!cancelled) setAvailability(free ? "available" : "taken");
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle, usernameValid]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const name = displayName.trim();

    if (!USERNAME_RE.test(handle)) {
      setError(
        "Username must be 3–20 characters: lowercase letters, numbers, or underscores.",
      );
      return;
    }
    if (availability === "taken") {
      setError("That username is taken. Try another.");
      return;
    }
    if (name.length < 1 || name.length > 50) {
      setError("Display name must be 1–50 characters.");
      return;
    }

    // Auto-detect the timezone here so streak/day-boundary math is correct from
    // day one — there's no manual picker anywhere in the app.
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

    setLoading(true);
    const { error: updateError } = await completeOnboarding(
      userId,
      handle,
      name,
      timezone,
    );

    if (updateError) {
      // 23505 = unique_violation → the handle is already taken.
      if (updateError.code === "23505") {
        setError("That username is taken. Try another.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
      return;
    }

    router.replace("/feed");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="username"
          className="text-sm font-medium text-[#888888]"
        >
          Username
        </label>
        <div className="flex items-center rounded-xl border border-white/15 bg-white/[0.04] px-4 transition-colors focus-within:border-[#22C55E] focus-within:bg-white/[0.06]">
          <span aria-hidden="true" className="text-[#8A8A8A]">
            @
          </span>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              // Reset until the debounced check re-runs, so a stale "available"
              // never lingers on a freshly-typed handle.
              setAvailability("idle");
            }}
            disabled={loading}
            autoFocus
            autoComplete="off"
            placeholder="yourhandle"
            className="w-full bg-transparent py-3 pl-1 text-base text-white placeholder:text-[#8A8A8A] outline-none disabled:opacity-60"
          />
          {usernameValid && (
            <span aria-hidden="true" className="pl-2">
              {availability === "checking" && (
                <Loader2 size={16} className="animate-spin text-[#8A8A8A]" />
              )}
              {availability === "available" && (
                <Check size={16} className="text-[#22C55E]" />
              )}
              {availability === "taken" && (
                <X size={16} className="text-red-400" />
              )}
            </span>
          )}
        </div>
        <p
          aria-live="polite"
          className={`text-xs ${
            usernameValid && availability === "taken"
              ? "text-red-400"
              : usernameValid && availability === "available"
                ? "text-[#22C55E]"
                : "text-[#8A8A8A]"
          }`}
        >
          {usernameValid && availability === "taken"
            ? "That username is taken. Try another."
            : usernameValid && availability === "available"
              ? `@${handle} is available.`
              : "Lowercase letters, numbers, underscores. 3–20 characters."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="displayName"
          className="text-sm font-medium text-[#888888]"
        >
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={loading}
          maxLength={50}
          placeholder="Your name"
          className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-[#8A8A8A] outline-none transition-colors focus:border-[#22C55E] focus:bg-white/[0.06] disabled:opacity-60"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || availability === "checking"}
        className="mt-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#22C55E] px-7 py-3.5 text-base font-semibold text-[#0A0A0A] transition-all hover:bg-[#16a34a] hover:scale-[1.02] disabled:cursor-default disabled:opacity-60 disabled:hover:scale-100"
      >
        {loading ? "Setting up…" : "Claim your handle"}
        {!loading && <span aria-hidden="true">→</span>}
      </button>
    </form>
  );
}
