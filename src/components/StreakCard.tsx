import { Flame, Check, Zap } from "lucide-react";
import { getStreakCard } from "@/lib/queries";
import StreakNudge from "@/components/StreakNudge";

// The streak card in the sidebar (Step 11): 🔥 number + nudge + a 7-day strip
// (done / today / pending), per the mockup. An async Server Component — it reads
// the viewer's streak fresh on every navigation, so posting a session reflects
// immediately. The streak number is display-truth: getStreakCard zeroes it when
// the stored row is stale (last session older than yesterday in the user's tz),
// so a "broken" streak shows 0 here even while the DB row still holds the count.
export default async function StreakCard({ userId }: { userId: string }) {
  const { current, postedToday, week } = await getStreakCard(userId);

  const sub =
    current === 0
      ? "Post a session to start a streak"
      : postedToday
        ? "You're locked in for today"
        : "Post today to keep it alive";

  // Milestone chip (Step 17): the highest threshold the streak has reached.
  // Display-only, derived from `current` — no schema.
  const milestone = [30, 14, 7, 3].find((m) => current >= m);

  return (
    <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1 text-[28px] font-bold leading-none tabular-nums text-[#22C55E]">
          <Flame size={22} aria-hidden />
          {current}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-white">Day streak</p>
          <p className="text-[11px] text-[#8A8A8A]">{sub}</p>
        </div>
        {milestone && (
          <span className="rounded-[20px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-2 py-[3px] text-[10px] font-medium text-[#22C55E]">
            {milestone}+ days
          </span>
        )}
      </div>

      <div className="mt-2.5 flex gap-1" aria-hidden>
        {week.map((d, i) => (
          <div
            key={i}
            className={`flex h-7 flex-1 flex-col items-center justify-center gap-0.5 rounded-[4px] text-[9px] ${
              d.state === "today"
                ? "bg-[#22C55E] font-medium text-[#0A0A0A]"
                : d.state === "done"
                  ? "bg-[#0F2A15] text-[#22C55E]"
                  : "text-[#8A8A8A]"
            }`}
          >
            <span className="text-[8px]">{d.letter}</span>
            {d.state === "today" ? (
              <Zap size={9} aria-hidden />
            ) : d.state === "done" ? (
              <Check size={9} aria-hidden />
            ) : (
              <span className="h-[9px]" />
            )}
          </div>
        ))}
      </div>

      {/* Evening "streak ends tonight" reminder — client child; decides on the
          device clock and hides itself once posted/dismissed (Step 18). */}
      <StreakNudge current={current} postedToday={postedToday} />
    </div>
  );
}
