import { Compass } from "lucide-react";
import { RoutePlanClient } from "./RoutePlanClient";

export const dynamic = "force-dynamic";

export default function RoutePlanPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Compass className="h-3.5 w-3.5" /> Operations · Route</span>
          <h1 className="mt-2 display-h2">
            Today&apos;s <em>optimal run</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Every scheduled job today, ordered by proximity from HQ. Cuts
            drive time vs. running them in clock order.
          </p>
        </div>
      </header>

      <RoutePlanClient />
    </div>
  );
}
