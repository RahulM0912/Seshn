"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Bounces md+ viewports off a mobile-only page (Step 24: /timer → /feed, where
// the sidebar already shows the timer). The server can't know the viewport, so
// this runs client-side on mount; checked once — a desktop user resizing down
// mid-visit just keeps the page they're on.
export default function MobileOnlyRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) router.replace(to);
  }, [router, to]);
  return null;
}
