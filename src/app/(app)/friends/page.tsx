import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import PersonRow from "@/components/PersonRow";
import { createClient } from "@/lib/supabase-server";
import { getFollowers, getFollowing } from "@/lib/queries";

// The follow graph (Step 7): who you follow and who follows you, each row with a
// live follow toggle. Per-user / per-request, so never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Friends · Seshn" };

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
          <PersonRow
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
          <PersonRow
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
