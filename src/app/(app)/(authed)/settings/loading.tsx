// Shown by the App Router while the Settings page re-reads the full profile. The
// page is dynamic, so `<Link>` prefetch only reaches this boundary — having it
// makes opening Settings swap instantly instead of waiting on the round-trip.
// Mirrors the real SettingsForm 1:1: a "Profile" card (display name + username +
// bio + timezone fields, then Save) and an "Account" card (Sign out) — same card
// chrome and field heights, so there's no jump when the form resolves.
export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold text-white">Settings</h1>
      <p className="mb-6 mt-1 text-[13px] text-[#8A8A8A]">
        Manage your profile and account.
      </p>

      <div className="flex flex-col gap-6" aria-hidden>
        {/* Profile card */}
        <section className="flex animate-pulse flex-col gap-4 rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5">
          <div className="h-3 w-14 rounded bg-[#1C1C1C]" />

          {/* Display name + Username: label over input */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-2.5 w-20 rounded bg-[#1C1C1C]" />
              <div className="h-[42px] w-full rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C]" />
            </div>
          ))}

          {/* Bio: label over taller textarea */}
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 w-8 rounded bg-[#1C1C1C]" />
            <div className="h-[84px] w-full rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C]" />
          </div>

          {/* Timezone: label over read-only row */}
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 w-16 rounded bg-[#1C1C1C]" />
            <div className="h-[42px] w-full rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C]" />
          </div>

          {/* Save button */}
          <div className="h-9 w-32 rounded-[20px] bg-[#1C1C1C]" />
        </section>

        {/* Account card */}
        <section className="flex animate-pulse flex-col gap-4 rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] p-5">
          <div className="h-3 w-16 rounded bg-[#1C1C1C]" />
          <div className="h-9 w-28 rounded-[10px] border-[0.5px] border-[#2A2A2A] bg-[#1C1C1C]" />
        </section>
      </div>
    </div>
  );
}
