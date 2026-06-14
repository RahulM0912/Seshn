import type { Visibility } from "@/lib/database.types";

// The session visibility pill in a card footer. Pure presentation (no hooks, no
// directive) so it renders in both the Server Component footer (signed-out) and
// the client `SessionCardFooter` (signed-in). `ml-auto` pushes it to the right.
export default function VisibilityBadge({
  visibility,
}: {
  visibility: Visibility;
}) {
  if (visibility === "public") {
    return (
      <span className="ml-auto rounded-[20px] border-[0.5px] border-[#22C55E33] px-2 py-[2px] text-[10px] text-[#22C55E]">
        Public
      </span>
    );
  }
  return (
    <span className="ml-auto rounded-[20px] border-[0.5px] border-[#2A2A2A] px-2 py-[2px] text-[10px] capitalize text-[#888888]">
      {visibility}
    </span>
  );
}
