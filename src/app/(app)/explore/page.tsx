import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FeedTabs from "@/components/FeedTabs";
import ExploreSearch from "@/components/ExploreSearch";
import PersonRow from "@/components/PersonRow";
import { createClient } from "@/lib/supabase-server";
import {
  getDiscoverProfiles,
  getFollowing,
  searchProfiles,
} from "@/lib/queries";

// Explore (Step 12): discover people to follow. With no query it lists every member
// (newest first); typing searches by name/@username. Either way every row carries
// its own Follow/Following state. Per-user + per-request — never cached. This is
// what seeds an empty Following feed on day one.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Explore · Seshn" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { q: rawQ } = await searchParams;
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ ?? "").trim();
  const searching = q.length > 0;

  // Every row shows its own Follow/Following state, so we always need the viewer's
  // follow set — fetched in parallel with the people list (search vs. full directory).
  const [people, following] = await Promise.all([
    searching ? searchProfiles(user.id, q) : getDiscoverProfiles(user.id),
    getFollowing(user.id),
  ]);
  const followingIds = new Set(following.map((p) => p.id));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      <FeedTabs active="explore" />
      <ExploreSearch initialQuery={q} />

      <p className="mt-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-[#555555]">
        {searching ? `Results · ${people.length}` : "People"}
      </p>

      {people.length === 0 ? (
        <div className="rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] px-6 py-10 text-center text-[12px] leading-relaxed text-[#888888]">
          {searching
            ? `No one matches “${q}”. Try a different name or @username.`
            : "No one else is here yet — invite a friend to get started."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {people.map((profile) => (
            <PersonRow
              key={profile.id}
              profile={profile}
              viewerId={user.id}
              following={followingIds.has(profile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
