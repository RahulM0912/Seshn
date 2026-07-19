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

/**
 * Compact focus duration. Spelled-out "hr"/"min" units, kept identical to
 * `formatFocusLong` so every surface (friends card, session card, tooltips,
 * profile) reads the same way: "45 min" / "2 hr" / "2 hr 15 min".
 */
export function formatFocusTime(minutes: number): string {
  return formatFocusLong(minutes);
}

/**
 * Verbose focus time for big summary stats: "45 min" under an hour, otherwise
 * "2 hr" / "2 hr 15 min". Spelled-out units read cleaner at a glance than "2h 15m"
 * for a headline total; the trailing "0 min" is dropped on the hour.
 */
export function formatFocusLong(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/**
 * A stored `subject` string → its display tags: split on commas, trim, drop
 * empties, dedupe case-insensitively (first casing wins). Storage stays a single
 * string — "maths, chem" becomes two tags only at render time (Step 19).
 */
export function splitSubjects(subject: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of subject.split(",")) {
    const tag = part.trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
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
  /** The daily target in force *that* day (change log), null if none. */
  goal: number | null;
  /** 0 (none) → 4 (most) intensity bucket, drives the cell's green shade. */
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapView {
  /** Week columns × 7 rows (Sun→Sat). Out-of-year / future cells are null. */
  weeks: (HeatmapDay | null)[][];
  /** Short month name + the column it first appears in, for the top axis. */
  monthLabels: { label: string; col: number }[];
  totalMinutes: number;
  activeDays: number;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_MS = 86_400_000;

/** Minutes → 0–4 intensity. Half-open buckets: 0 / <30 / <60 / <120 / 120+. */
function heatLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

/** A UTC-anchored calendar date → "YYYY-MM-DD" (its plain day label). */
function utcDay(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Heatmap range: `"current"` = rolling last 12 months, or a specific year. */
export type HeatmapRange = number | "current";

/**
 * The GitHub/LeetCode-style focus heatmap grid (Step 15): week columns × 7 rows
 * (Sun→Sat). `minutesByDay` maps a local day-string (YYYY-MM-DD, user tz) to that
 * day's focus minutes; each in-range cell takes a 0–4 intensity from it. Month
 * labels mark the column where each new month first appears.
 *
 * Two ranges:
 *  - `"current"` — a rolling 53 weeks ending on today's week (user tz), like the
 *    default LeetCode view; the current week's future tail renders blank.
 *  - a `year` — the full calendar year Jan→Dec, padded to whole weeks and always
 *    framed (future days of the current year render empty, like GitHub's year view).
 *
 * Calendar dates are enumerated in UTC so they're stable across DST — a date is
 * just a label here, matching the local day-strings the keys already use. Only
 * "today" is timezone-aware, to place the rolling window and blank out the future.
 *
 * `goalHistory` (the daily-goal change log, oldest first) resolves each cell to
 * the target in force *that* day — a day's goal is the last change on or before
 * it. Display-only (the cell tooltip): intensity stays purely minutes-based.
 */
export function buildFocusHeatmap(
  minutesByDay: Record<string, number>,
  goalHistory: readonly GoalChange[],
  range: HeatmapRange,
  timeZone: string,
): HeatmapView {
  const todayStr = dayInTimeZone(new Date(), timeZone);

  // Change log → (local day, minutes) pairs; cells are enumerated in date
  // order, so a single advancing pointer resolves each cell's goal in O(1).
  const changes = goalHistory.map((g) => ({
    day: dayInTimeZone(new Date(g.changed_at), timeZone),
    minutes: g.minutes,
  }));
  let changeIdx = 0;
  let currentGoal: number | null = null;

  let start: Date; // a Sunday (col 0, row 0), UTC-anchored
  let cols: number;
  let year: number | null; // null in rolling mode

  if (range === "current") {
    year = null;
    const today = new Date(`${todayStr}T00:00:00Z`);
    cols = 53;
    start = new Date(today.getTime() - (52 * 7 + today.getUTCDay()) * DAY_MS);
  } else {
    year = range;
    const jan1 = new Date(Date.UTC(range, 0, 1));
    const dec31 = new Date(Date.UTC(range, 11, 31));
    // Pad out to whole weeks: back to Sunday, forward to Saturday.
    start = new Date(jan1.getTime() - jan1.getUTCDay() * DAY_MS);
    const end = new Date(dec31.getTime() + (6 - dec31.getUTCDay()) * DAY_MS);
    cols = Math.round((end.getTime() - start.getTime()) / DAY_MS + 1) / 7;
  }

  const weeks: (HeatmapDay | null)[][] = [];
  const monthLabels: { label: string; col: number }[] = [];
  let totalMinutes = 0;
  let activeDays = 0;
  let lastMonth = -1;

  for (let col = 0; col < cols; col++) {
    const week: (HeatmapDay | null)[] = [];
    for (let row = 0; row < 7; row++) {
      const date = new Date(start.getTime() + (col * 7 + row) * DAY_MS);
      const day = utcDay(date);
      // Rolling: blank the future tail. Year: blank days outside the year.
      const outOfRange =
        year === null ? day > todayStr : date.getUTCFullYear() !== year;
      if (outOfRange) {
        week.push(null);
        continue;
      }
      while (changeIdx < changes.length && changes[changeIdx].day <= day) {
        currentGoal = changes[changeIdx].minutes;
        changeIdx += 1;
      }
      const goal = currentGoal && currentGoal > 0 ? currentGoal : null;
      const minutes = minutesByDay[day] ?? 0;
      if (minutes > 0) {
        totalMinutes += minutes;
        activeDays += 1;
      }
      week.push({ date: day, minutes, goal, level: heatLevel(minutes) });
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

/** One entry of the daily-goal change log (`daily_goal_history`). */
export interface GoalChange {
  /** The goal in minutes from this change on; null = goal turned off. */
  minutes: number | null;
  /** When the change happened (ISO timestamptz). */
  changed_at: string;
}

export interface StreakWeekDay {
  /** Weekday initial in the user's timezone (e.g. "M"). */
  letter: string;
  state: "done" | "today" | "pending";
}

/**
 * The 7-cell strip ending today (oldest → today), each cell labelled with its
 * weekday initial in the user's timezone. Cells show *real activity*: a past
 * day is "done" when that local day has a posted session (`activeDays`,
 * YYYY-MM-DD strings in the user's tz) — so days studied before a streak broke
 * still show, even though they're not in the current run. The final cell is
 * always "today". Powers `StreakCard` (Step 11).
 */
export function buildStreakWeek(
  activeDays: ReadonlySet<string>,
  timeZone: string,
): StreakWeekDay[] {
  const now = new Date();
  const cells: StreakWeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const letter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "narrow",
    }).format(d);
    cells.push({
      letter,
      state:
        i === 0
          ? "today"
          : activeDays.has(dayInTimeZone(d, timeZone))
            ? "done"
            : "pending",
    });
  }
  return cells;
}
