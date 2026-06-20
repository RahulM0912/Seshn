import type { MetadataRoute } from "next";

// Served at /sitemap.xml. Only the marketing landing page is listed here — the
// public profile and session pages are discovered by crawlers through links and
// are intentionally left out of the sitemap (listing every user would mean
// enumerating accounts). A dynamic profile sitemap can be added later if SEO on
// individual profiles becomes a goal.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://seshn.in",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
