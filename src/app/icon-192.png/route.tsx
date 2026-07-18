import { renderAppIcon } from "@/lib/pwa-icon";

// /icon-192.png — the manifest's 192×192 launcher icon (see app/manifest.ts).
// Static: rendered once at build, served as a plain PNG.
export const dynamic = "force-static";

export function GET() {
  return renderAppIcon(192);
}
