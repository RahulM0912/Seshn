import Link from "next/link";

// not-found boundary for the (app) group. A bad @username calls notFound() from
// [username]/page; catching it HERE (instead of letting it bubble to the root
// not-found) keeps it inside this group's layout, which already renders the
// chrome — the full AppShell when signed-in, the light brand bar when signed-out.
// So we render only the 404 body. The root not-found brings its own brand bar, so
// bubbling there stacked a second "Seshn" header on top of this layout's bar.
export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <p className="font-[family-name:var(--font-mono)] text-[44px] font-bold leading-none text-[#1F1F1F]">
        404
      </p>
      <h1 className="mt-5 text-lg font-semibold text-white">Not found</h1>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[#888888]">
        This page doesn&apos;t exist, or it&apos;s private. The link may be old
        or the session may have been deleted.
      </p>
      <Link
        href="/feed"
        className="mt-6 rounded-[20px] bg-[#22C55E] px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#1FB055]"
      >
        Back to feed
      </Link>
    </div>
  );
}
