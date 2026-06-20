import type { MetadataRoute } from "next";

// Served at /robots.txt. Public surfaces — the landing page, public profiles
// (/<username>) and session permalinks (/session/<id>) — stay crawlable; the
// signed-in app and auth plumbing are kept out of the index. RLS already hides
// private data, so this is about index hygiene, not access control.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/feed",
        "/explore",
        "/friends",
        "/settings",
        "/onboarding",
        "/login",
        "/auth/",
      ],
    },
    sitemap: "https://seshn.in/sitemap.xml",
    host: "https://seshn.in",
  };
}
