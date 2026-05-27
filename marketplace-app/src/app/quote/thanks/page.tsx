import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckCircle2, Clock, Phone, Star } from "lucide-react";
import { ThanksContent } from "./ThanksContent";

export const metadata: Metadata = {
  title: "Thanks — we got your quote request | ContractorFlow",
  description: "We'll reach out within one business day. In the meantime, here's what to expect.",
};

export default function ThanksPage() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(900px 500px at 80% -10%, rgba(99, 102, 241, 0.25), transparent 60%)," +
              "radial-gradient(700px 400px at -10% 10%, rgba(167, 139, 250, 0.15), transparent 60%)",
          }} />
        <div className="relative max-w-3xl mx-auto px-6 py-16 sm:py-20">
          <Suspense fallback={null}>
            <ThanksContent />
          </Suspense>

          <div className="mt-12 grid sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <Clock className="h-5 w-5 text-brand-300 mb-2" />
              <div className="text-sm font-semibold">Fast response</div>
              <div className="mt-1 text-xs text-white/60">Most quotes go out within one business day. Emergencies same-day.</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <Star className="h-5 w-5 text-amber-300 mb-2" />
              <div className="text-sm font-semibold">5-star Google reviews</div>
              <div className="mt-1 text-xs text-white/60">Licensed, insured, and rated by hundreds of MA homeowners.</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <CheckCircle2 className="h-5 w-5 text-emerald-300 mb-2" />
              <div className="text-sm font-semibold">Zero pressure</div>
              <div className="mt-1 text-xs text-white/60">Free estimate, no obligation, no spam.</div>
            </div>
          </div>

          <div className="mt-10 text-center text-sm text-white/50">
            <p>Want to talk now?</p>
            <a
              href={`tel:${(process.env.NEXT_PUBLIC_OUTREACH_PHONE ?? "").replace(/\D/g, "") || "+15555550123"}`}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white font-semibold px-5 py-3 hover:bg-brand-400 transition"
            >
              <Phone className="h-4 w-4" /> Call us
            </a>
            <p className="mt-6 text-xs text-white/40">
              Wrong project? <Link href="/quote" className="text-brand-300 hover:underline">Pick a different trade</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
