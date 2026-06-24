// Client helpers for sharing focus. The /api/share-card route is the real
// security boundary: it renders only the authenticated viewer's own data, so the
// optional target below just narrows which of *their own* cards to draw.

/** Which card to render — today's recap (default), a past day, or one session. */
export type ShareTarget = { date?: string; session?: string };

/** How a shareCard() call resolved — drives the right "done" feedback. */
export type ShareOutcome = "shared" | "copied" | "downloaded";

/** Build the /api/share-card URL for a target (empty = today). */
function cardUrl(target: ShareTarget): string {
  const qs = target.session
    ? `?session=${encodeURIComponent(target.session)}`
    : target.date
      ? `?date=${encodeURIComponent(target.date)}`
      : "";
  return `/api/share-card${qs}`;
}

/** Fetch the rendered card PNG as a Blob (throws on a non-OK response). */
async function fetchCardBlob(target: ShareTarget): Promise<Blob> {
  const res = await fetch(cardUrl(target), { cache: "no-store" });
  if (!res.ok) throw new Error(`share-card ${res.status}`);
  return res.blob();
}

/** Trigger a browser download of the PNG (the last-resort fallback). */
function downloadBlob(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = "seshn-focus.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

// Touch-primary devices get the native share sheet (the right UX for posting to
// an IG / WhatsApp story). On desktop (fine pointer) the OS share sheet is clunky
// and can't paste into a chat — so there we copy the image to the clipboard
// instead. `navigator.canShare` alone can't tell the two apart (desktop Chromium
// reports file-share support too), hence the pointer check.
function prefersNativeShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    window.matchMedia?.("(pointer: coarse)").matches === true
  );
}

// One adaptive "Share" action. Mobile → native share sheet. Desktop → copy the
// card image to the clipboard (paste straight into chat/docs), falling back to a
// download where the clipboard API isn't available. Returns how it resolved so
// the caller can show the matching confirmation. Throws on a failed fetch; a user
// dismissing the native sheet rejects with AbortError (a normal cancel).
export async function shareCard(target: ShareTarget = {}): Promise<ShareOutcome> {
  // Desktop: copy to clipboard. Pass a Promise<Blob> to ClipboardItem so the
  // user gesture stays alive while the card renders (Safari requires this).
  if (!prefersNativeShare()) {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": fetchCardBlob(target) }),
        ]);
        return "copied";
      } catch {
        // Clipboard blocked/unsupported — fall through to a download.
      }
    }
    downloadBlob(await fetchCardBlob(target));
    return "downloaded";
  }

  // Touch device: hand the file to the native share sheet.
  const blob = await fetchCardBlob(target);
  const file = new File([blob], "seshn-focus.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "My focus on Seshn",
      text: "My focus on Seshn",
    });
    return "shared";
  }

  downloadBlob(blob);
  return "downloaded";
}

/** A short confirmation line for a resolved share (empty for the native sheet,
 *  which gives its own UI). */
export function shareOutcomeMessage(outcome: ShareOutcome): string {
  if (outcome === "copied") return "Image copied — paste it anywhere";
  if (outcome === "downloaded") return "Image downloaded";
  return "";
}

// Copy a session's public permalink to the clipboard. Only meaningful for public
// sessions (anyone can open the link); the caller gates on visibility. Returns
// false if the clipboard write isn't available so the caller can stay quiet.
export async function copySessionLink(sessionId: string): Promise<boolean> {
  const url = `${window.location.origin}/session/${sessionId}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
