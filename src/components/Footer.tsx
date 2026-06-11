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
        <div className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider">
          Built by a solo founder · Still in development
        </div>
      </div>
    </footer>
  );
}
