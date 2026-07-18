import Link from "next/link";
import { getFriendsActivity } from "@/lib/queries";
import { avatarColor, initials, formatFocusTime } from "@/lib/format";

// "Friends activity" sidebar card (Step 11): everyone the viewer follows, with how
// much focus they've logged today (each friend's own timezone) and a Done / Idle
// badge — active friends first. An async Server Component, read fresh on every
// navigation so a friend's new session shows up as soon as you move around. Counts
// only sessions RLS lets the viewer see, so private work never leaks in. Mirrors
// the mockup's `.friends-card`; rows link to each friend's profile.
export default async function FriendsActivityCard({
  userId,
}: {
  userId: string;
}) {
  const friends = await getFriendsActivity(userId);

  return (
    <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-4">
      <p className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#888888]">
        Friends activity
      </p>

      {friends.length === 0 ? (
        <p className="mt-2 text-[12px] leading-relaxed text-[#8A8A8A]">
          Follow friends to see who&apos;s focusing right now and how long they&apos;ve
          put in today.
        </p>
      ) : (
        // `getFriendsActivity` currently caps this list (top friends), so it
        // won't overflow today — but bound the height and scroll so it stays
        // tidy if that cap is ever raised. `-mr-1 pr-1` keeps the scrollbar off
        // the row content.
        <div className="scrollbar-slim mt-3 -mr-1 flex max-h-[320px] flex-col gap-1 overflow-y-auto overscroll-contain pr-1">
          {friends.map(({ profile, minutesToday, postedToday }) => {
            const av = avatarColor(profile.id);
            return (
              <Link
                key={profile.id}
                href={`/${profile.username}`}
                className="-mx-1 flex items-center gap-2 rounded-[8px] px-1 py-1 transition-colors hover:bg-[#1C1C1C]"
              >
                <span
                  aria-hidden
                  style={{ backgroundColor: av.bg, color: av.text }}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
                >
                  {initials(profile.display_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-white">
                    {profile.display_name}
                  </div>
                  <div className="truncate text-[11px] text-[#8A8A8A]">
                    {postedToday
                      ? `${formatFocusTime(minutesToday)} today`
                      : "No session yet"}
                  </div>
                </div>
                {postedToday ? (
                  <span className="flex-shrink-0 rounded-[20px] border-[0.5px] border-[#1A4D22] bg-[#0F2A15] px-[7px] py-0.5 text-[10px] text-[#22C55E]">
                    Done
                  </span>
                ) : (
                  <span className="flex-shrink-0 rounded-[20px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C] px-[7px] py-0.5 text-[10px] text-[#8A8A8A]">
                    Idle
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
