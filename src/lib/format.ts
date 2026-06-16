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
export function dayInTimeZone(date: Date, timeZone: string): string {
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

export interface HeatmapDay {
  /** Local day-string (YYYY-MM-DD, user tz) this cell represents. */
  date: string;
  minutes: number;
  /** 0 (none) → 4 (most) intensity bucket, drives the cell's green shade. */
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapView {
  /** 53 columns (weeks) × 7 rows (Sun→Sat). Cells past today are null. */
  weeks: (HeatmapDay | null)[][];
  /** Short month name + the column it first appears in, for the top axis. */
  monthLabels: { label: string; col: number }[];
  totalMinutes: number;
  activeDays: number;
}

const HEATMAP_WEEKS = 53;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Minutes → 0–4 intensity. Half-open buckets: 0 / <30 / <60 / <120 / 120+. */
function heatLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

/**
 * The GitHub-style focus heatmap grid (Step 15): 53 columns (weeks) × 7 rows
 * (Sun→Sat), ending on today in the user's timezone. `minutesByDay` maps a local
 * day-string (YYYY-MM-DD, user tz) to that day's focus minutes; each cell takes a
 * 0–4 intensity from it. Cells beyond today (the current week's tail) are null.
 * Month labels mark the column where each new month first appears. Day stepping
 * mirrors `buildStreakWeek` (±24h from now, re-bucketed per tz).
 */
export function buildFocusHeatmap(
  minutesByDay: Record<string, number>,
  timeZone: string,
): HeatmapView {
  const now = new Date();
  const todayWeekday =
    WEEKDAY_INDEX[
      new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now)
    ] ?? 0;
  // today sits in the last column at its weekday row; column 0 row 0 is a Sunday.
  const todayIndex = (HEATMAP_WEEKS - 1) * 7 + todayWeekday;

  const weeks: (HeatmapDay | null)[][] = [];
  const monthLabels: { label: string; col: number }[] = [];
  let totalMinutes = 0;
  let activeDays = 0;
  let lastMonth = -1;

  for (let col = 0; col < HEATMAP_WEEKS; col++) {
    const week: (HeatmapDay | null)[] = [];
    for (let row = 0; row < 7; row++) {
      const i = col * 7 + row;
      if (i > todayIndex) {
        week.push(null);
        continue;
      }
      const date = new Date(now.getTime() + (i - todayIndex) * 86_400_000);
      const day = dayInTimeZone(date, timeZone);
      const minutes = minutesByDay[day] ?? 0;
      if (minutes > 0) {
        totalMinutes += minutes;
        activeDays += 1;
      }
      week.push({ date: day, minutes, level: heatLevel(minutes) });
    }
    weeks.push(week);

    // Label the column where a new month starts (keyed off its first real cell).
    const firstCell = week.find((c): c is HeatmapDay => c !== null);
    if (firstCell) {
      const month = Number(firstCell.date.slice(5, 7)) - 1;
      if (month !== lastMonth) {
        monthLabels.push({ label: MONTHS[month], col });
        lastMonth = month;
      }
    }
  }

  return { weeks, monthLabels, totalMinutes, activeDays };
}

export interface StreakWeekDay {
  /** Weekday initial in the user's timezone (e.g. "M"). */
  letter: string;
  state: "done" | "today" | "pending";
}

/**
 * The 7-cell streak strip ending today (oldest → today), each cell labelled with
 * its weekday initial in the user's timezone. `activeDays` is the set of local
 * day-strings (YYYY-MM-DD, user tz) on which a session was posted. The final cell
 * is always "today"; earlier cells are "done" when a session landed that day,
 * else "pending". Powers `StreakCard` (Step 11) — mirrors the mockup's strip.
 */
export function buildStreakWeek(
  activeDays: Set<string>,
  timeZone: string,
): StreakWeekDay[] {
  const now = new Date();
  const today = dayInTimeZone(now, timeZone);
  const cells: StreakWeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = dayInTimeZone(d, timeZone);
    const letter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "narrow",
    }).format(d);
    cells.push({
      letter,
      state:
        dayStr === today ? "today" : activeDays.has(dayStr) ? "done" : "pending",
    });
  }
  return cells;
}
