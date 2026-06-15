import Link from "next/link";

// The Following / Explore tab bar above the feed (Step 12). Each tab is a real
// route, not in-page state, so it's shareable, back-button-friendly, and each
// side gets its own server render: Following = posts from your follow graph;
// Explore = people to follow. `active` paints the current tab green.
export default function FeedTabs({
  active,
}: {
  active: "following" | "explore";
}) {
  const tabs = [
    { key: "following", label: "Following", href: "/feed" },
    { key: "explore", label: "Explore", href: "/explore" },
  ] as const;

  return (
    <div className="flex gap-1" role="tablist" aria-label="Feed">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={
              isActive
                ? "rounded-[20px] border-[0.5px] border-[#22C55E] bg-[#22C55E] px-3.5 py-[5px] text-[12px] font-medium text-[#0A0A0A]"
                : "rounded-[20px] border-[0.5px] border-[#2A2A2A] px-3.5 py-[5px] text-[12px] text-[#888888] transition-colors hover:border-[#3A3A3A] hover:text-white"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
