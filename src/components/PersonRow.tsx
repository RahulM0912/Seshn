import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import type { Profile } from "@/lib/database.types";
import { avatarColor, initials } from "@/lib/format";

// One person in a list: avatar + display name + @handle, with an inline follow
// toggle. Shared by the Friends graph (Step 7) and Explore "people to follow"
// (Step 12). The whole left block links to the profile; the button sits OUTSIDE
// that link so tapping Follow never navigates. The viewer's own row shows no
// button (you can't follow yourself).
export default function PersonRow({
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
          <div className="truncate text-[11px] text-[#8A8A8A]">
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
