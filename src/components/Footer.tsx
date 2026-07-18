import { SUPPORT_MAILTO } from "@/lib/support";

export default function Footer() {
  return (
    <footer className="border-t border-[#2A2A2A]">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 py-8 flex flex-col sm:flex-row gap-3 items-center justify-between text-sm text-[#888888]">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"
          />
          <span>Seshn © 2026</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider">
          <span>Built by a solo founder · Now live</span>
          <a
            href={SUPPORT_MAILTO}
            className="text-[#888888] underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/50 rounded-sm"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
