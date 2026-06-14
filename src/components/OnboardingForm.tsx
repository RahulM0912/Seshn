"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/lib/mutations";

// Mirror of the DB constraint (profiles.username check). Client-side validation
// is for fast feedback only; the database remains the source of truth.
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const handle = username.trim().toLowerCase();
    const name = displayName.trim();

    if (!USERNAME_RE.test(handle)) {
      setError(
        "Username must be 3–20 characters: lowercase letters, numbers, or underscores.",
      );
      return;
    }
    if (name.length < 1 || name.length > 50) {
      setError("Display name must be 1–50 characters.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await completeOnboarding(userId, handle, name);

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
          <span aria-hidden="true" className="text-[#666666]">
            @
          </span>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoFocus
            autoComplete="off"
            placeholder="yourhandle"
            className="w-full bg-transparent py-3 pl-1 text-base text-white placeholder:text-[#666666] outline-none disabled:opacity-60"
          />
        </div>
        <p className="text-xs text-[#666666]">
          Lowercase letters, numbers, underscores. 3–20 characters.
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
          className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-[#666666] outline-none transition-colors focus:border-[#22C55E] focus:bg-white/[0.06] disabled:opacity-60"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#22C55E] px-7 py-3.5 text-base font-semibold text-[#0A0A0A] transition-all hover:bg-[#16a34a] hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
      >
        {loading ? "Setting up…" : "Claim your handle"}
        {!loading && <span aria-hidden="true">→</span>}
      </button>
    </form>
  );
}
