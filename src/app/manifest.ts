import type { MetadataRoute } from "next";

// PWA manifest (Step 25) — Next serves this at /manifest.webmanifest and links
// it from every page automatically. `standalone` + start_url makes the
// installed app open like a native one: no browser chrome, straight to the
// feed (with the mobile tab bar from Step 24). Icons are rendered by the
// /icon-192.png and /icon-512.png routes — the same green-dot mark as the
// favicon, on the app's #111111 surface. The dot sits well inside the maskable
// safe zone, so one asset serves both purposes.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Seshn — Your focus, made social.",
    short_name: "Seshn",
    description:
      "Track your Pomodoro sessions. Post your daily focus time. See what your friends are grinding.",
    start_url: "/feed",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
