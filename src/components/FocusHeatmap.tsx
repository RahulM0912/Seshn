"use client";

import { useRef, useState, type MouseEvent } from "react";
import {
  buildFocusHeatmap,
  formatFocusTime,
  type HeatmapDay,
} from "@/lib/format";

// Profile focus heatmap (Step 15) — a GitHub-style contribution grid where each
// cell is a day and its green deepens with the minutes focused that day. The grid
// is fluid: week columns flex to fill the card and cells stay square, so the full
// ~year fits with no horizontal scroll at any width. Hovering a cell raises a
// styled tooltip (a Client Component just for that hover state); a single
// `role="img"` summary covers assistive tech. Layout math (`buildFocusHeatmap`)
// runs against the profile's timezone passed down from the server.

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

interface Hover {
  x: number;
  y: number;
  below: boolean;
  minutes: number;
  date: string;
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
  const gridRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  // Position the tooltip from the hovered cell's box (offsets are relative to the
  // positioned grid container). Clamp X so edge cells don't push it off-card, and
  // flip below the cell for the top two rows so it never collides with the header.
  function showTip(
    e: MouseEvent<HTMLSpanElement>,
    cell: HeatmapDay,
    row: number,
  ) {
    const grid = gridRef.current;
    if (!grid) return;
    const el = e.currentTarget;
    const center = el.offsetLeft + el.offsetWidth / 2;
    const x = Math.min(Math.max(center, 62), grid.clientWidth - 62);
    const below = row <= 1;
    const y = below ? el.offsetTop + el.offsetHeight + 6 : el.offsetTop - 6;
    setHover({ x, y, below, minutes: cell.minutes, date: cell.date });
  }

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

      <div
        ref={gridRef}
        role="img"
        aria-label={`Focus activity over the last year: ${activeDays} active days totalling ${formatFocusTime(
          totalMinutes,
        )}.`}
        onMouseLeave={() => setHover(null)}
        className="relative flex flex-col gap-1"
      >
        {/* Month axis — a fixed rail spacer then one fluid slot per week column. */}
        <div className="flex gap-[3px]">
          <div className="w-[12px] flex-shrink-0" />
          {weeks.map((_, col) => (
            <div key={col} className="relative h-[10px] min-w-0 flex-1">
              {labelByCol.has(col) && (
                <span className="absolute left-0 top-0 whitespace-nowrap text-[9px] leading-none text-[#555555]">
                  {labelByCol.get(col)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Weekday rail + fluid week columns. The rail stretches to the grid's
            height and splits into 7 equal rows, aligning with the cells. */}
        <div className="flex gap-[3px]">
          <div className="flex w-[12px] flex-shrink-0 flex-col gap-[2px]">
            {DAY_LETTERS.map((letter, i) => (
              <span
                key={i}
                className="flex flex-1 items-center justify-center text-[8px] leading-none text-[#555555]"
              >
                {letter}
              </span>
            ))}
          </div>

          {weeks.map((week, col) => (
            <div key={col} className="flex min-w-0 flex-1 flex-col gap-[2px]">
              {week.map((cell, row) =>
                cell ? (
                  <span
                    key={row}
                    onMouseEnter={(e) => showTip(e, cell, row)}
                    style={{ backgroundColor: LEVEL_BG[cell.level] }}
                    className="block aspect-square w-full rounded-[2px]"
                  />
                ) : (
                  <span key={row} className="block aspect-square w-full" />
                ),
              )}
            </div>
          ))}
        </div>

        {/* Tooltip. */}
        {hover && (
          <div
            role="tooltip"
            style={{ left: hover.x, top: hover.y }}
            className={`pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-2.5 py-1.5 shadow-lg shadow-black/50 ${
              hover.below ? "" : "-translate-y-full"
            }`}
          >
            <div className="text-[11px] font-semibold text-white">
              {hover.minutes > 0 ? formatFocusTime(hover.minutes) : "No focus"}
            </div>
            <div className="mt-0.5 text-[10px] text-[#888888]">
              {prettyDay(hover.date)}
            </div>
            <span
              aria-hidden
              className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-[#2A2A2A] bg-[#1C1C1C] ${
                hover.below
                  ? "bottom-full -mb-1 border-l-[0.5px] border-t-[0.5px]"
                  : "top-full -mt-1 border-b-[0.5px] border-r-[0.5px]"
              }`}
            />
          </div>
        )}
      </div>

      {/* Legend. */}
      <div className="mt-3 flex items-center justify-end gap-1.5">
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
    </section>
  );
}
