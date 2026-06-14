import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import FollowButton from "@/components/FollowButton";
import { createClient } from "@/lib/supabase-server";
import { getFollowers, getFollowing } from "@/lib/queries";
import type { Profile } from "@/lib/database.types";
import { avatarColor, initials } from "@/lib/format";

// The follow graph (Step 7): who you follow and who follows you, each row with a
// live follow toggle. Per-user / per-request, so never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Friends · Seshn" };

function FriendRow({
  profile,
  viewerId,
  following,
}: {
  profile: Profile;
  viewerId: string;
  following: boolean;
}) {
  const av = avatarColor(profile.id);
  return (
    <div className="flex items-center gap-3 rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] px-4 py-3">
      <Link
        href={`/${profile.username}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span
          aria-hidden
          style={{ backgroundColor: av.bg, color: av.text }}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-medium"
        >
          {initials(profile.display_name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-white">
            {profile.display_name}
          </div>
          <div className="truncate text-[11px] text-[#555555]">
            @{profile.username}
          </div>
        </div>
      </Link>
      {profile.id !== viewerId && (
        <FollowButton
          viewerId={viewerId}
          targetId={profile.id}
          initialFollowing={following}
        />
      )}
    </div>
  );
}

function Section({
  title,
  count,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-[#555555]">
        {title}
        {count > 0 && <span className="text-[#888888]"> · {count}</span>}
      </h2>
      {count === 0 ? (
        <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] px-6 py-10 text-center text-[12px] leading-relaxed text-[#888888]">
          {emptyText}
        </div>
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </section>
  );
}

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [following, followers] = await Promise.all([
    getFollowing(user.id),
    getFollowers(user.id),
  ]);
  // Which of my followers I follow back — drives the toggle state in that list.
  const followingIds = new Set(following.map((p) => p.id));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-7 p-4">
      <Section
        title="Following"
        count={following.length}
        emptyText="You're not following anyone yet. Open someone's profile and hit Follow — their sessions then show up in your feed."
      >
        {following.map((profile) => (
          <FriendRow
            key={profile.id}
            profile={profile}
            viewerId={user.id}
            following
          />
        ))}
      </Section>

      <Section
        title="Followers"
        count={followers.length}
        emptyText="No followers yet. Share your profile so friends can find and follow you."
      >
        {followers.map((profile) => (
          <FriendRow
            key={profile.id}
            profile={profile}
            viewerId={user.id}
            following={followingIds.has(profile.id)}
          />
        ))}
      </Section>
    </div>
  );
}
