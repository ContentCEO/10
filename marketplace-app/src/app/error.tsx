"use client";

// Plan 1 / F-2 — Brand-aligned 500.
// Next.js requires the error boundary to be a client component.

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to whatever telemetry stack we have. console.error is the
    // fallback Sentry/Datadog hooks will pick up if installed.
    console.error("[ContractorFlow] Unhandled error:", error);
  }, [error]);

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center px-6 bg-ink-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10"
           style={{
             background:
               "radial-gradient(900px 600px at 50% -10%, rgba(225,29,72,0.25), transparent 60%), linear-gradient(180deg, #0a0f1f 0%, #0c1224 100%)",
           }}
      />
      <div className="text-center max-w-lg animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-rose-500/15 ring-1 ring-rose-400/30 text-rose-200">
          <AlertTriangle className="h-3 w-3" />
          500 · something broke
        </div>
        <h1 className="mt-6 text-5xl sm:text-6xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">Hit a snag.</span>
        </h1>
        <p className="mt-6 text-base text-white/70">
          We logged the error. Try again, or jump back to a working page.
        </p>
        {error.digest && (
          <p className="mt-3 text-[10px] font-mono text-white/40">ref: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={reset} className="btn bg-white text-ink-900 hover:bg-white/90 shadow-glow">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <Link href="/" className="btn bg-white/10 text-white border border-white/15 hover:bg-white/15">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </div>
    </main>
  );
}
