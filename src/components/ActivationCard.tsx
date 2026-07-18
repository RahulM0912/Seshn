import Link from "next/link";
import { ArrowRight, Check, Rocket } from "lucide-react";
import { getActivationState } from "@/lib/queries";

// New-user activation checklist (Step 21) — top of the feed until all three
// firsts are done: ① finish a pomodoro, ② post a session, ③ follow someone.
// A Server Component: done-ness is derived from existing data on every load
// (sessions ≥ 1 covers ①+②, following ≥ 1 covers ③), so the card disappears
// forever once complete — pure data, no dismissal flag. InviteFriendCard stays
// below as the helper for ③.
export default async function ActivationCard({ userId }: { userId: string }) {
  const { hasSession, hasFollowing } = await getActivationState(userId);
  if (hasSession && hasFollowing) return null;

  const doneCount = (hasSession ? 2 : 0) + (hasFollowing ? 1 : 0);
  const steps = [
    {
      label: "Finish a pomodoro",
      done: hasSession,
      // The Timer tab on phones; on desktop /timer bounces to /feed, where the
      // sidebar timer is already on screen (Step 24).
      href: "/timer",
      hint: "Start the timer",
    },
    {
      label: "Post your first session",
      done: hasSession,
      href: "/timer",
      hint: "End session → Post",
    },
    {
      label: "Follow one person",
      done: hasFollowing,
      href: "/explore",
      hint: "Find people",
    },
  ];

  return (
    <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] font-medium text-white">
          <Rocket size={14} className="text-[#22C55E]" aria-hidden />
          Getting started
        </span>
        <span className="text-[11px] tabular-nums text-[#8A8A8A]">
          {doneCount} of 3
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {steps.map((step) => (
          <li key={step.label}>
            {step.done ? (
              <div className="flex items-center gap-2.5 rounded-[8px] px-2 py-2">
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#22C55E]">
                  <Check size={11} className="text-[#0A0A0A]" aria-hidden />
                </span>
                <span className="text-[12px] text-[#8A8A8A] line-through">
                  {step.label}
                </span>
              </div>
            ) : (
              <Link
                href={step.href}
                className="group flex items-center gap-2.5 rounded-[8px] px-2 py-2 transition-colors hover:bg-[#1C1C1C]"
              >
                <span
                  aria-hidden
                  className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-[#2A2A2A] transition-colors group-hover:border-[#22C55E]"
                />
                <span className="flex-1 text-[12px] text-white">{step.label}</span>
                <span className="flex items-center gap-1 text-[11px] text-[#8A8A8A] transition-colors group-hover:text-[#22C55E]">
                  {step.hint}
                  <ArrowRight size={11} aria-hidden />
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
