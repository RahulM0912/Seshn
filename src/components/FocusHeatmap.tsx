import { buildFocusHeatmap, formatFocusTime } from "@/lib/format";

// Profile focus heatmap (Step 15) — a GitHub-style contribution grid where each
// cell is a day and its green deepens with the minutes focused that day. Stays a
// Server Component: it's pure display (no interactivity), with a native `title`
// tooltip per cell and a single `role="img"` summary for assistive tech. The grid
// scrolls horizontally on narrow screens rather than shrinking the cells.
//
// `minutesByDay` is the `{ "YYYY-MM-DD": minutes }` map from `getFocusHeatmap`,
// already bucketed in the profile's timezone; `buildFocusHeatmap` lays out the
// 53-week grid against that same timezone so the columns end on the local today.

// Intensity ramp on the #141414 card: empty cell → brand green (#22C55E).
const LEVEL_BG = ["#1C1C1C", "#0E3A1C", "#14622E", "#1C9D49", "#22C55E"];
// Weekday rail (Sun→Sat); only Mon/Wed/Fri are labelled, like GitHub.
const DAY_LETTERS = ["", "M", "", "W", "", "F", ""];

// YYYY-MM-DD → "Mon, Jun 3". Rendered at UTC noon so the date never shifts a day.
function prettyDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function FocusHeatmap({
  minutesByDay,
  timeZone,
}: {
  minutesByDay: Record<string, number>;
  timeZone: string;
}) {
  const { weeks, monthLabels, totalMinutes, activeDays } = buildFocusHeatmap(
    minutesByDay,
    timeZone,
  );
  const labelByCol = new Map(monthLabels.map((m) => [m.col, m.label]));

  return (
    <section className="mt-6 rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-white">Focus activity</h2>
        <span className="text-[11px] text-[#555555] tabular-nums">
          {activeDays === 0
            ? "No focus logged yet"
            : `${formatFocusTime(totalMinutes)} · ${activeDays} active day${
                activeDays === 1 ? "" : "s"
              }`}
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div
          role="img"
          aria-label={`Focus activity over the last year: ${activeDays} active days totalling ${formatFocusTime(
            totalMinutes,
          )}.`}
          className="inline-flex flex-col gap-1"
        >
          {/* Month axis — offset past the weekday rail (cell 11px + 3px gap). */}
          <div className="flex gap-[3px] pl-[14px]">
            {weeks.map((_, col) => (
              <div key={col} className="relative h-[10px] w-[11px]">
                {labelByCol.has(col) && (
                  <span className="absolute left-0 top-0 whitespace-nowrap text-[9px] leading-none text-[#555555]">
                    {labelByCol.get(col)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Weekday rail + week columns. */}
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px]">
              {DAY_LETTERS.map((letter, i) => (
                <span
                  key={i}
                  className="flex h-[11px] w-[11px] items-center justify-center text-[8px] leading-none text-[#555555]"
                >
                  {letter}
                </span>
              ))}
            </div>

            {weeks.map((week, col) => (
              <div key={col} className="flex flex-col gap-[3px]">
                {week.map((cell, row) =>
                  cell ? (
                    <span
                      key={row}
                      title={`${
                        cell.minutes > 0
                          ? formatFocusTime(cell.minutes)
                          : "No focus"
                      } · ${prettyDay(cell.date)}`}
                      style={{ backgroundColor: LEVEL_BG[cell.level] }}
                      className="h-[11px] w-[11px] rounded-[2px]"
                    />
                  ) : (
                    <span key={row} className="h-[11px] w-[11px]" />
                  ),
                )}
              </div>
            ))}
          </div>

          {/* Legend. */}
          <div className="mt-1 flex items-center gap-1.5 self-end">
            <span className="text-[9px] text-[#555555]">Less</span>
            {LEVEL_BG.map((bg, i) => (
              <span
                key={i}
                aria-hidden
                style={{ backgroundColor: bg }}
                className="h-[10px] w-[10px] rounded-[2px]"
              />
            ))}
            <span className="text-[9px] text-[#555555]">More</span>
          </div>
        </div>
      </div>
    </section>
  );
}
