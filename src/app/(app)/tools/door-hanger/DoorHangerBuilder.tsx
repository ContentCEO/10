"use client";

import { useState } from "react";
import { Printer, Sparkles } from "lucide-react";

interface Defaults { business_name: string; phone: string; license_number: string; service: string }

/*
 * Plan 1 / D-7 — Door-hanger printable.
 *
 * 4.25" × 11" door hanger with cut-out at top. Print at home OR send to
 * the same sign shop that prints yard signs. Designed for hanging on
 * neighbor doors while a job is in progress.
 */

export function DoorHangerBuilder({ defaults }: { defaults: Defaults }) {
  const [biz, setBiz] = useState(defaults.business_name);
  const [phone, setPhone] = useState(defaults.phone);
  const [license, setLicense] = useState(defaults.license_number);
  const [headline, setHeadline] = useState("Working next door");
  const [subline, setSubline] = useState(`Free ${defaults.service || "estimate"} for your home`);
  const [cta, setCta] = useState("Call us today");

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Marketing · Print</span>
          <h1 className="mt-2 display-h2"><span className="gradient-text">Door hanger</span></h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Print-ready 4.25&quot;×11&quot; door hanger. Drop these on neighbors&apos; doors
            while you&apos;re mid-job: instant credibility (&quot;we&apos;re already working on this street&quot;),
            instant proximity (&quot;same crew can come look at yours next week&quot;).
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6 print:block">
        <section className="card p-5 space-y-4 print:hidden">
          <div>
            <label className="label" htmlFor="headline">Headline</label>
            <input id="headline" className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={30} />
          </div>
          <div>
            <label className="label" htmlFor="subline">Sub-headline</label>
            <input id="subline" className="input" value={subline} onChange={(e) => setSubline(e.target.value)} maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="biz">Business name</label>
            <input id="biz" className="input" value={biz} onChange={(e) => setBiz(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="license">License #</label>
            <input id="license" className="input" value={license} onChange={(e) => setLicense(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="cta">CTA</label>
            <input id="cta" className="input" value={cta} onChange={(e) => setCta(e.target.value)} maxLength={28} />
          </div>
          <button onClick={() => window.print()} className="btn-primary w-full justify-center">
            <Printer className="h-4 w-4" /> Print
          </button>
          <p className="text-xs text-ink-500">
            Print at 4.25&quot; × 11&quot; on heavy stock. Cut the hole at the top.
            Or send the PDF to a print shop for $0.50-$1 each.
          </p>
        </section>

        <section className="card p-6 print:shadow-none print:border-0 print:p-0">
          <div className="text-xs section-eyebrow mb-3 print:hidden">Preview (~30% of actual size)</div>
          <div
            className="mx-auto rounded-2xl print:rounded-none flex flex-col items-center justify-between text-center text-white shadow-soft-lg print:shadow-none p-6"
            style={{
              width: "min(100%, 280px)",
              aspectRatio: "4.25 / 11",
              background: "linear-gradient(180deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)",
            }}
          >
            {/* Cut-out indicator */}
            <div className="w-12 h-2 rounded-full bg-white/30 mt-1" aria-hidden />

            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-80 font-mono">Hello neighbor</div>
              <div className="mt-3 text-2xl font-bold leading-tight">{headline}</div>
              <div className="mt-2 text-sm opacity-90 leading-snug">{subline}</div>
            </div>

            <div className="flex-1" />

            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70 font-mono">From</div>
              <div className="mt-1 text-lg font-bold leading-tight">{biz || "Your Business"}</div>
              <div className="mt-2 text-xl font-bold tabular-nums">{phone}</div>
              {license && <div className="mt-1 text-[10px] opacity-70">License {license}</div>}
            </div>

            <div className="mt-4 px-4 py-2 rounded-full bg-white text-ink-900 font-bold text-sm">
              {cta}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
