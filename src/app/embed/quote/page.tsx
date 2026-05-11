import type { Metadata } from "next";
import { CostCalculatorForm } from "../../cost-calculator/CostCalculatorForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free instant cost calculator",
  robots: { index: false },
};

// Embeddable widget any contractor partner can drop on their site:
//   <iframe src="https://yourapp.com/embed/quote" style="border:0;width:100%;height:820px"></iframe>
//
// Submissions flow through /api/ai/estimate the same way as the main calculator.

export default function EmbedQuotePage() {
  return (
    <div className="bg-white min-h-screen">
      <main className="p-4 max-w-xl mx-auto">
        <header className="mb-4">
          <h1 className="text-xl font-bold">Free instant cost estimate</h1>
          <p className="text-sm text-slate-600">Get a ballpark price in 30 seconds.</p>
        </header>
        <CostCalculatorForm />
        <p className="mt-4 text-[10px] text-slate-400 text-center">
          Powered by ContractorFlow · AI estimates are approximate
        </p>
      </main>
    </div>
  );
}
