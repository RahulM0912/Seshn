"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  buildFocusHeatmap,
  dayInTimeZone,
  formatFocusLong,
  formatFocusTime,
  type HeatmapDay,
  type HeatmapRange,
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
  /** Caret nudge so it keeps pointing at the cell when the body is edge-clamped. */
  caretOffset: number;
  minutes: number;
  date: string;
}

// Tooltip box is ~2 lines; reserve this much room to decide above vs. below and to
// keep the body from spilling off the card's edges.
const TIP_HALF_WIDTH = 48;
const TIP_HEIGHT = 48;

export default function FocusHeatmap({
  minutesByDay,
  timeZone,
}: {
  minutesByDay: Record<string, number>;
  timeZone: string;
}) {
  // Dropdown options: "Current" (rolling 12 months) plus every year from now back
  // to the earliest year with logged focus. New users see just Current + this year.
  const currentYear = Number(dayInTimeZone(new Date(), timeZone).slice(0, 4));
  const options = useMemo<HeatmapRange[]>(() => {
    let earliest = currentYear;
    for (const day in minutesByDay) {
      const y = Number(day.slice(0, 4));
      if (y < earliest) earliest = y;
    }
    const years = Array.from(
      { length: currentYear - earliest + 1 },
      (_, i) => currentYear - i,
    );
    return ["current", ...years];
  }, [minutesByDay, currentYear]);

  const [view, setView] = useState<HeatmapRange>("current");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const { weeks, monthLabels, totalMinutes, activeDays } = useMemo(
    () => buildFocusHeatmap(minutesByDay, view, timeZone),
    [minutesByDay, view, timeZone],
  );
  const labelByCol = new Map(monthLabels.map((m) => [m.col, m.label]));
  const viewLabel = view === "current" ? "Current" : String(view);
  const rangeLabel = view === "current" ? "the last 12 months" : String(view);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: Event) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Switching range closes the menu and clears any open tooltip (its position
  // belongs to the old grid).
  function selectView(next: HeatmapRange) {
    setHover(null);
    setView(next);
    setMenuOpen(false);
  }

  // Position the tooltip from the hovered cell's box (offsets are relative to the
  // positioned grid container). Clamp X so edge cells don't push the body off-card
  // (nudging the caret back to the cell), and flip the tooltip below the cell when
  // there isn't room above it — so top-row cells don't collide with the header.
  function showTip(e: MouseEvent<HTMLSpanElement>, cell: HeatmapDay) {
    const grid = gridRef.current;
    if (!grid) return;
    const el = e.currentTarget;
    const center = el.offsetLeft + el.offsetWidth / 2;
    const x = Math.min(
      Math.max(center, TIP_HALF_WIDTH),
      grid.clientWidth - TIP_HALF_WIDTH,
    );
    // Keep the caret on the cell even after the body is clamped (capped so it
    // can't slide past the tooltip's rounded corner).
    const caretOffset = Math.max(-34, Math.min(34, center - x));
    const below = el.offsetTop < TIP_HEIGHT;
    const y = below ? el.offsetTop + el.offsetHeight + 6 : el.offsetTop - 6;
    setHover({ x, y, below, caretOffset, minutes: cell.minutes, date: cell.date });
  }

  return (
    <section className="mt-6 rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5">
      {/* Header — title, stats and the range selector. Stacks on mobile (title on
          its own row, then stats + range below) and collapses onto a single line
          from sm up, with the stats/range pinned right and everything vertically
          centred. */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h2 className="text-[13px] font-semibold text-white">Focus activity</h2>
        <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-5">
          {/* Stats — LeetCode-style labeled pairs. Wrap on very narrow screens so
              they never collide with the range button. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-5">
            <div>
              <span className="text-[11px] text-[#555555]">Total focus: </span>
              <span className="text-[11px] font-semibold text-white tabular-nums">
                {activeDays === 0 ? "—" : formatFocusLong(totalMinutes)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-[#555555]">Active days: </span>
              <span className="text-[11px] font-semibold text-white tabular-nums">
                {activeDays}
              </span>
            </div>
          </div>
          {/* Range dropdown — custom listbox (LeetCode-style): "Current" then years,
              a check on the selected one. A button + menu (not a native select) so it
              matches the app's dark surface language and shows the tick. */}
          <div ref={menuRef} className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] pl-3 pr-2 text-[12px] font-medium text-white transition-colors hover:bg-[#252525] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
            >
              {viewLabel}
              <ChevronDown
                size={13}
                aria-hidden
                className={`text-[#888888] transition-transform ${menuOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {menuOpen && (
              <div
                role="listbox"
                className="absolute right-0 top-9 z-30 flex max-h-64 w-32 flex-col overflow-y-auto rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] py-1 shadow-lg shadow-black/40"
              >
                {options.map((opt) => {
                  const selected = opt === view;
                  return (
                    <button
                      key={String(opt)}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => selectView(opt)}
                      className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-[#252525] focus-visible:bg-[#252525] focus-visible:outline-none ${selected ? "font-semibold text-white" : "text-[#888888]"
                        }`}
                    >
                      {opt === "current" ? "Current" : opt}
                      {selected && (
                        <Check size={13} className="text-[#22C55E]" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={gridRef}
        role="img"
        aria-label={`Focus activity in ${rangeLabel}: ${activeDays} active days totalling ${formatFocusTime(
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
                    onMouseEnter={(e) => showTip(e, cell)}
                    style={{ backgroundColor: LEVEL_BG[cell.level] }}
                    className="block aspect-square w-full cursor-pointer rounded-[2px]"
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
            className={`pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-2.5 py-1.5 shadow-lg shadow-black/50 ${hover.below ? "" : "-translate-y-full"
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
              style={{ left: `calc(50% + ${hover.caretOffset}px)` }}
              className={`absolute h-2 w-2 -translate-x-1/2 rotate-45 border-[#2A2A2A] bg-[#1C1C1C] ${hover.below
                  ? "bottom-full -mb-1 border-l-[0.5px] border-t-[0.5px]"
                  : "top-full -mt-1 border-b-[0.5px] border-r-[0.5px]"
                }`}
            />
          </div>
        )}
      </div>

      {/* Intensity legend. */}
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
