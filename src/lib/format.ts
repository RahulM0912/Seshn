// Shared pure presentation helpers. No React, no server imports — safe to use in
// both Server and Client Components. One home for avatar color, initials, and the
// time/streak formatting so every card renders identically.

// Avatar palette from `docs/design.md → App design language` (rotate per user).
const AVATAR_COLORS = [
  { bg: "#22C55E", text: "#0A0A0A" }, // green
  { bg: "#378ADD", text: "#FFFFFF" }, // blue
  { bg: "#7F77DD", text: "#FFFFFF" }, // purple
] as const;

/**
 * Deterministic avatar color from a user id — same user, same color, everywhere
 * (feed, profile, navbar). Hashes the id into the green/blue/purple trio.
 */
export function avatarColor(id: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
}

/** Up to two uppercase initials from a display name (falls back to "?"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Minutes → "3h 20m" / "45m" (minutes zero-padded only when there's an hour). */
export function formatFocusTime(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** ISO timestamp → "just now" / "2 hours ago" / "3 days ago" / "Jan 5". */
export function relativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} week${wk === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** A YYYY-MM-DD day string for a moment, in a given IANA timezone. */
function dayInTimeZone(date: Date, timeZone: string): string {
  // en-CA renders as YYYY-MM-DD — matches a Postgres `date` column's text form.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * The `streaks` row updates only on posting, so a stored streak can be stale.
 * A streak is alive only if the last session was today or yesterday in the
 * user's timezone (PRD §9.2) — otherwise the UI must render it broken. Step 11
 * (Streak UI) reuses this; here it gates the streak number on the profile.
 */
export function isStreakAlive(
  lastSessionDate: string | null,
  timeZone: string,
): boolean {
  if (!lastSessionDate) return false;
  const now = new Date();
  const today = dayInTimeZone(now, timeZone);
  const yesterday = dayInTimeZone(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
    timeZone,
  );
  return lastSessionDate === today || lastSessionDate === yesterday;
}
