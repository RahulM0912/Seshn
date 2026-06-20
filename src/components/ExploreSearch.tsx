"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

// Search box for Explore (Step 12). The input is controlled locally so typing is
// instant, then the trimmed query is pushed into the URL (`?q=`) — debounced —
// which re-renders the server page with the matching people. Keeping the query in
// the URL (not just state) makes a search shareable and survives refresh/back.
// Clearing the box routes back to `/explore` (the suggested list).
export default function ExploreSearch({
  initialQuery,
}: {
  initialQuery: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  // Skip the first effect run: the server already rendered with `initialQuery`,
  // so re-pushing it would be a redundant navigation.
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const q = value.trim();
      router.replace(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
    }, 300);
    return () => clearTimeout(timer);
  }, [value, router]);

  return (
    <div className="relative">
      <Search
        size={15}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search people by name or @username"
        aria-label="Search people"
        autoComplete="off"
        className="w-full rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] py-2.5 pl-9 pr-9 text-[13px] text-white placeholder:text-[#555555] focus:border-[#22C55E] focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#555555] transition-colors hover:bg-[#1C1C1C] hover:text-white"
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
