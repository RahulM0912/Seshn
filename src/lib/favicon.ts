// Timer favicon dot (Step 15). While a session runs the tab icon becomes a
// solid status dot (green = focusing, gray = paused, blue = break) so the
// timer stays glanceable from another tab. Next.js emits the real icon links
// from src/app/favicon.ico + icon.svg — we detach them while overriding and
// re-attach on reset, so going idle restores the branded icon exactly.

const LINK_ID = "seshn-timer-favicon";

let originalLinks: HTMLLinkElement[] | null = null;
let currentColor: string | null = null;

function drawDot(color: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.beginPath();
  ctx.arc(16, 16, 12, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  return canvas.toDataURL("image/png");
}

export function setFaviconDot(color: string): void {
  if (typeof document === "undefined" || color === currentColor) return;
  const href = drawDot(color);
  if (!href) return; // canvas unavailable — keep the real favicon

  // Stash + detach the real icon links once ("rel~=" also catches "shortcut icon").
  if (originalLinks === null) {
    originalLinks = Array.from(
      document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"),
    );
    for (const link of originalLinks) link.remove();
  }

  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
  }
  link.href = href;
  currentColor = color;
}

export function resetFavicon(): void {
  if (typeof document === "undefined" || currentColor === null) return;
  document.getElementById(LINK_ID)?.remove();
  if (originalLinks) {
    for (const link of originalLinks) document.head.appendChild(link);
  }
  originalLinks = null;
  currentColor = null;
}
