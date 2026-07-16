"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  isIos,
  isStandalone,
  promptInstall,
  useCanInstall,
} from "@/lib/pwa-install";

// "Install app" row in the avatar menu (Step 25). Chromium: opens the captured
// install prompt and closes the menu. iOS Safari (no prompt API): toggles a
// short "Add to Home Screen" instruction line instead. Renders nothing when
// already installed or when the browser offers no install path at all — the
// menu stays clean for everyone else.
export default function InstallAppMenuItem({
  onInstalled,
}: {
  /** Called after the Chromium prompt opens (the caller closes its menu). */
  onInstalled: () => void;
}) {
  const canPrompt = useCanInstall();
  // Environment checks need `window` — resolved after mount so the SSR pass
  // (row hidden) matches the first client paint.
  const [iosInstallable, setIosInstallable] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    setIosInstallable(isIos() && !isStandalone());
  }, []);

  if (!canPrompt && !iosInstallable) return null;

  function onClick() {
    if (canPrompt) {
      void promptInstall();
      onInstalled();
      return;
    }
    setShowIosHelp((v) => !v);
  }

  return (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={onClick}
        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[13px] text-[#888888] transition-colors hover:bg-[#1C1C1C] hover:text-white"
      >
        <Download size={15} aria-hidden />
        Install app
      </button>
      {showIosHelp && (
        <p className="px-3 pb-2 text-[11px] leading-relaxed text-[#555555]">
          Open the <span className="text-[#888888]">Share</span> menu in Safari
          and tap{" "}
          <span className="text-[#888888]">&ldquo;Add to Home Screen&rdquo;</span>.
        </p>
      )}
    </>
  );
}
