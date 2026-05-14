import Link from "next/link";
import { Sparkles } from "lucide-react";
import { EstimatorForm } from "./EstimatorForm";

export const dynamic = "force-dynamic";

export default function EstimatorPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link href="/home" className="text-sm text-slate-500">← Home</Link>

      <header>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="badge bg-brand-50 text-brand-700 ring-brand-200">Free · AI-powered</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold">Instant project estimate</h1>
        <p className="mt-1 text-sm text-slate-600">
          Describe your project (and drop in a photo or two) — Claude gives you a
          ballpark cost range in seconds. Not a binding quote, but a great gut-check
          before you start calling contractors.
        </p>
      </header>

      <EstimatorForm />

      <div className="card p-5 bg-slate-50 border-slate-200 text-sm text-slate-700">
        <strong>Heads up:</strong> AI estimates are rough. Real prices depend on
        local labor rates, materials, permit requirements, and hidden conditions.
        Use this to set expectations before getting real quotes — then{" "}
        <Link href="/find-pro" className="text-brand-600 font-medium">request a quote from a vetted pro</Link>.
      </div>
    </div>
  );
}
