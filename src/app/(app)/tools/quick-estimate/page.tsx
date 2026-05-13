import { Calculator } from "lucide-react";
import { QuickEstimateBuilder } from "./QuickEstimateBuilder";

export const dynamic = "force-dynamic";

export default function QuickEstimatePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Calculator className="h-3.5 w-3.5" /> Sales · Estimating</span>
          <h1 className="mt-2 display-h2">
            On-the-spot <em>quick estimate</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Add line items, set markup, hand a number to the homeowner before
            you leave the driveway. Nothing saved — pure calculator. When
            you&apos;re ready to send a formal quote, use Proposals.
          </p>
        </div>
      </header>

      <QuickEstimateBuilder />
    </div>
  );
}
