// Loading placeholder that mirrors `PersonRow` (avatar + name/@handle + a follow
// pill on the right). Shown by the Friends and Explore route `loading.tsx` files
// while their per-request lists resolve. Pure presentation; reuses the app's
// `animate-pulse` + #141414/#1C1C1C skeleton idiom (see `SessionCardSkeleton`).
export default function PersonRowSkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-pulse items-center gap-3 rounded-[12px] border-[0.5px] border-[#2A2A2A] bg-[#141414] px-4 py-3"
    >
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[#1C1C1C]" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-28 rounded bg-[#1C1C1C]" />
        <div className="h-2.5 w-20 rounded bg-[#1C1C1C]" />
      </div>
      <div className="h-7 w-16 flex-shrink-0 rounded-[20px] bg-[#1C1C1C]" />
    </div>
  );
}
