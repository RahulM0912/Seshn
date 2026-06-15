"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, LogOut, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { updateProfile, updateTimezone } from "@/lib/mutations";
import { isUsernameAvailable } from "@/lib/client-queries";
import type { Profile } from "@/lib/database.types";

// Settings page form (Step 12): edit display name / username / bio, sign out.
// Writes go through the browser client (`updateProfile`) — RLS scopes the update
// to your own row. Username keeps onboarding's `23505` handling and adds a live
// availability check so a clash is caught before submit. Timezone is auto-detected
// from the browser (no manual picker): we silently correct the stored zone on load
// if the device's differs, and show it read-only.

const USERNAME_RE = /^[a-z0-9_]{3,20}$/; // mirrors the DB check
const NAME_MAX = 50;
const BIO_MAX = 160;

type Availability = "idle" | "checking" | "available" | "taken";

const inputClass =
  "w-full rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-3 py-2.5 text-[13px] text-white placeholder:text-[#555555] outline-none transition-colors focus:border-[#22C55E] disabled:opacity-60";
const labelClass = "text-[12px] font-medium text-[#888888]";

export default function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [availability, setAvailability] = useState<Availability>("idle");
  const [signingOut, setSigningOut] = useState(false);

  // Auto-correct the stored timezone to the device's, silently. Runs once on load
  // (and after the refresh, when stored === detected, the guard makes it a no-op,
  // so there's no loop). No setState here keeps the effect lint-clean.
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || detected === profile.timezone) return;
    let cancelled = false;
    void (async () => {
      const { error: tzError } = await updateTimezone(profile.id, detected);
      if (!cancelled && !tzError) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.id, profile.timezone, router]);

  // Live username availability: debounced, only when the handle is a valid change
  // from the current one. All setState happens inside the timeout/async callback,
  // never synchronously in the effect body (avoids react-hooks/set-state-in-effect).
  const handle = username.trim().toLowerCase();
  const usernameChanged = handle !== profile.username;
  const usernameValid = USERNAME_RE.test(handle);

  useEffect(() => {
    if (!usernameChanged || !usernameValid) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setAvailability("checking");
      const free = await isUsernameAvailable(handle, profile.id);
      if (!cancelled) setAvailability(free ? "available" : "taken");
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle, usernameChanged, usernameValid, profile.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const name = displayName.trim();
    const trimmedBio = bio.trim();

    if (name.length < 1 || name.length > NAME_MAX) {
      setError("Display name must be 1–50 characters.");
      return;
    }
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
    if (trimmedBio.length > BIO_MAX) {
      setError(`Bio must be ${BIO_MAX} characters or fewer.`);
      return;
    }

    setSaving(true);
    const { error: updateError } = await updateProfile(profile.id, {
      displayName: name,
      username: handle,
      bio: trimmedBio || null,
    });
    setSaving(false);

    if (updateError) {
      setError(
        updateError.code === "23505"
          ? "That username is taken. Try another."
          : "Couldn't save your changes. Please try again.",
      );
      return;
    }

    setSaved(true);
    // Reconcile the navbar/profile (which read username + name from the server).
    router.refresh();
  }

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Profile */}
      <form
        onSubmit={save}
        noValidate
        className="flex flex-col gap-4 rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5"
      >
        <h2 className="text-[13px] font-medium text-white">Profile</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="displayName" className={labelClass}>
            Display name
          </label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={NAME_MAX}
            disabled={saving}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="username" className={labelClass}>
            Username
          </label>
          <div className="flex items-center rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-3 transition-colors focus-within:border-[#22C55E]">
            <span aria-hidden className="text-[13px] text-[#555555]">
              @
            </span>
            <input
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                // Reset until the debounced check re-runs, so a stale "available"
                // never lingers on a freshly-typed handle.
                setAvailability("idle");
              }}
              autoComplete="off"
              spellCheck={false}
              disabled={saving}
              className="w-full bg-transparent py-2.5 pl-1 text-[13px] text-white outline-none disabled:opacity-60"
            />
            {usernameChanged && usernameValid && (
              <span aria-hidden className="pl-2">
                {availability === "checking" && (
                  <Loader2 size={14} className="animate-spin text-[#555555]" />
                )}
                {availability === "available" && (
                  <Check size={14} className="text-[#22C55E]" />
                )}
                {availability === "taken" && (
                  <X size={14} className="text-[#F87171]" />
                )}
              </span>
            )}
          </div>
          <p
            aria-live="polite"
            className={`text-[11px] ${
              usernameChanged && availability === "taken"
                ? "text-[#F87171]"
                : usernameChanged && availability === "available"
                  ? "text-[#22C55E]"
                  : "text-[#555555]"
            }`}
          >
            {usernameChanged && availability === "taken"
              ? "That username is taken. Try another."
              : usernameChanged && availability === "available"
                ? `@${handle} is available.`
                : "Lowercase letters, numbers, underscores. 3–20 characters. Changing it changes your profile URL."}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bio" className={labelClass}>
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            rows={3}
            disabled={saving}
            placeholder="A line about what you're focusing on."
            className={`${inputClass} resize-none`}
          />
          <p className="text-right text-[10px] tabular-nums text-[#555555]">
            {bio.length}/{BIO_MAX}
          </p>
        </div>

        {/* Timezone is auto-detected from the device — shown read-only. */}
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Timezone</span>
          <div className="flex items-center justify-between rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-3 py-2.5">
            <span className="text-[13px] text-white">{profile.timezone}</span>
            <span className="text-[11px] text-[#555555]">From your device</span>
          </div>
          <p className="text-[11px] text-[#555555]">
            Sets your day boundary for streaks and daily focus totals. Updated
            automatically from your device.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-[12px] text-[#F87171]">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || availability === "checking"}
            className="cursor-pointer rounded-[20px] bg-[#22C55E] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055] disabled:cursor-default disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && !saving && (
            <span className="text-[12px] text-[#22C55E]">Saved</span>
          )}
        </div>
      </form>

      {/* Account */}
      <section className="flex flex-col gap-4 rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5">
        <h2 className="text-[13px] font-medium text-white">Account</h2>

        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-3.5 py-2 text-[13px] text-[#888888] transition-colors hover:text-white disabled:opacity-60"
        >
          <LogOut size={14} aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </section>
    </div>
  );
}
