import Link from "next/link";
import { ArrowLeft, Search, Sparkles } from "lucide-react";

// Plan 1 / F-2 — Brand-aligned 404.

export default function NotFound() {
  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center px-6 bg-ink-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10"
           style={{
             background:
               "radial-gradient(900px 600px at 50% -10%, rgba(99,102,241,0.30), transparent 60%), radial-gradient(700px 500px at 90% 80%, rgba(217,70,239,0.20), transparent 60%), linear-gradient(180deg, #0a0f1f 0%, #0c1224 100%)",
           }}
      />
      <div className="text-center max-w-lg animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-white/10 ring-1 ring-white/15">
          <Sparkles className="h-3 w-3" />
          404 · this page slipped a permit
        </div>
        <h1 className="mt-6 text-7xl sm:text-8xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">4</span>
          <span className="inline-block bg-gradient-to-br from-brand-400 to-fuchsia-400 bg-clip-text text-transparent animate-float">0</span>
          <span className="bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">4</span>
        </h1>
        <p className="mt-6 text-lg text-white/70">
          Can&apos;t find the page you&apos;re looking for. Maybe it&apos;s under construction.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="btn bg-white text-ink-900 hover:bg-white/90 shadow-glow">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
          <Link href="/download" className="btn bg-white/10 text-white border border-white/15 hover:bg-white/15">
            <Search className="h-4 w-4" /> Download the app
          </Link>
        </div>
      </div>
    </main>
  );
}
