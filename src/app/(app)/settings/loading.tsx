// Shown by the App Router while the Settings page re-reads the full profile. The
// page is dynamic, so `<Link>` prefetch only reaches this boundary — having it
// makes opening Settings swap instantly instead of waiting on the round-trip.
// Mirrors the heading + a few labelled form fields.
export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold text-white">Settings</h1>
      <p className="mb-6 mt-1 text-[13px] text-[#555555]">
        Manage your profile and account.
      </p>
      <div className="flex animate-pulse flex-col gap-5" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-2.5 w-20 rounded bg-[#1C1C1C]" />
            <div className="h-[42px] w-full rounded-[8px] border-[0.5px] border-[#2A2A2A] bg-[#141414]" />
          </div>
        ))}
        <div className="mt-1 h-[42px] w-28 rounded-[8px] bg-[#1C1C1C]" />
      </div>
    </div>
  );
}
