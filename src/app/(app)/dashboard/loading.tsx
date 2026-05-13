// Plan 1 / Section F / Idea #4 — skeleton loaders.
//
// Renders the same dark layout as the real dashboard with shimmer
// placeholders, so the user sees the shape immediately while the
// data fetches.

export default function DashboardLoading() {
  return (
    <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 -my-6 min-h-screen text-white px-4 sm:px-6 lg:px-8 py-8 pb-24"
         style={{
           background:
             "radial-gradient(900px 600px at 0% -10%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(700px 500px at 100% 40%, rgba(6,182,212,0.10), transparent 60%), linear-gradient(180deg, #0a0f1f 0%, #0c1224 100%)",
         }}>
      <div className="space-y-6 max-w-7xl mx-auto">
        <SkeletonBlock h="h-32" />
        <SkeletonBlock h="h-12" rounded="rounded-2xl" />
        <SkeletonBlock h="h-36" />
        <SkeletonBlock h="h-24" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} h="h-44" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} h="h-24" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} h="h-72" />)}
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock({ h, rounded = "rounded-2xl" }: { h: string; rounded?: string }) {
  return (
    <div className={`relative overflow-hidden ${rounded} bg-white/[0.03] ring-1 ring-white/10 ${h}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer"
           style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)" }} />
    </div>
  );
}
