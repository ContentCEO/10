// Dark skeleton matching the v4 dashboard chrome.

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <SkeletonBlock h="h-16" />
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonBlock key={i} h="h-28" />)}
      </div>
      <div className="grid lg:grid-cols-5 gap-5">
        <SkeletonBlock h="h-44" className="lg:col-span-3" />
        <SkeletonBlock h="h-44" className="lg:col-span-2" />
      </div>
      <SkeletonBlock h="h-72" />
      <SkeletonBlock h="h-[440px]" />
      <div className="grid lg:grid-cols-5 gap-5">
        <SkeletonBlock h="h-64" className="lg:col-span-3" />
        <SkeletonBlock h="h-64" className="lg:col-span-2" />
      </div>
    </div>
  );
}

function SkeletonBlock({ h, className = "", rounded = "rounded-2xl" }: {
  h: string; className?: string; rounded?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${rounded} bg-white/[0.03] ring-1 ring-white/10 ${h} ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer"
           style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)" }} />
    </div>
  );
}
