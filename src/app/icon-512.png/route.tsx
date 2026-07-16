import { renderAppIcon } from "@/lib/pwa-icon";

// /icon-512.png — the manifest's 512×512 launcher icon, also declared with
// `purpose: "maskable"` (the mark sits inside the safe zone; see pwa-icon.tsx).
export const dynamic = "force-static";

export function GET() {
  return renderAppIcon(512);
}
