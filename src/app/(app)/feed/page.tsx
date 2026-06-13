// Step 2: placeholder body inside the app shell so /feed renders within the
// navbar + two-column layout. The real feed — sessions from you and people you
// follow, newest first — is built in Step 6, which replaces everything below.
export default function FeedPage() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.2em] text-[#555555]">
        Following
      </h1>
      <div className="flex flex-col items-center justify-center rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] px-6 py-16 text-center">
        <p className="text-[13px] font-medium text-white">Your feed lives here</p>
        <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-[#888888]">
          Sessions from you and the people you follow will show up here once
          posting is live.
        </p>
      </div>
    </div>
  );
}
