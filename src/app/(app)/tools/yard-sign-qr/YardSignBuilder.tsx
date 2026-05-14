"use client";

import { useMemo, useState } from "react";
import { Download, Printer, QrCode } from "lucide-react";

interface Defaults { business_name: string; phone: string; website: string; service: string; }

/*
 * Plan 1 / Section D / Idea #4 — Yard sign QR code generator.
 *
 * Generates a print-ready 18" x 24" yard sign with a QR code that points
 * to either a contractor's website or a contractor-branded review page on
 * ContractorFlow. Uses Google Charts QR API (free, no key) for the QR
 * image so we don't pull a heavy JS QR library into the bundle.
 */

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

function qrUrl(text: string, size: number): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: text,
    ecc: "H",
    margin: "0",
  });
  return `${QR_API}?${params.toString()}`;
}

export function YardSignBuilder({ defaults }: { defaults: Defaults }) {
  const [biz, setBiz] = useState(defaults.business_name);
  const [phone, setPhone] = useState(defaults.phone);
  const [headline, setHeadline] = useState(defaults.service ? `${defaults.service.toUpperCase()} BY` : "FREE QUOTE TODAY");
  const [cta, setCta] = useState("Scan for free quote");
  const [url, setUrl] = useState(defaults.website || (defaults.phone ? `tel:${defaults.phone.replace(/[^\d]/g, "")}` : "https://contractorflow.app"));
  const [color, setColor] = useState<"indigo" | "emerald" | "rose" | "amber">("indigo");

  const palettes = {
    indigo:  { bg: "#4f46e5", fg: "#ffffff", accent: "#fbbf24" },
    emerald: { bg: "#059669", fg: "#ffffff", accent: "#fde047" },
    rose:    { bg: "#e11d48", fg: "#ffffff", accent: "#fde047" },
    amber:   { bg: "#d97706", fg: "#0f172a", accent: "#0f172a" },
  } as const;
  const c = palettes[color];

  const qr = useMemo(() => qrUrl(url || "https://contractorflow.app", 400), [url]);

  function printSign() { window.print(); }

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><QrCode className="h-3.5 w-3.5" /> Marketing · Print</span>
          <h1 className="mt-2 display-h2"><span className="gradient-text">Yard sign with QR code</span></h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Print-ready 18&quot;×24&quot; yard sign. QR points wherever you want — your website,
            a phone number (auto-dial), or a quote form. Drop it in front of every job site.
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        <section className="card p-5 space-y-4 print:hidden">
          <div>
            <label className="label" htmlFor="headline">Top headline</label>
            <input id="headline" className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="ROOFING BY" maxLength={40} />
          </div>
          <div>
            <label className="label" htmlFor="biz">Business name</label>
            <input id="biz" className="input" value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="Reliable Roofing" maxLength={28} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(617) 555-0100" />
          </div>
          <div>
            <label className="label" htmlFor="cta">CTA above QR</label>
            <input id="cta" className="input" value={cta} onChange={(e) => setCta(e.target.value)} maxLength={28} />
          </div>
          <div>
            <label className="label" htmlFor="url">QR destination</label>
            <input id="url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yoursite.com  ·  tel:617..." />
            <div className="mt-1 text-xs text-ink-500">Tip: use <code>tel:6175551234</code> for click-to-call.</div>
          </div>
          <div>
            <div className="label">Color</div>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(palettes) as Array<keyof typeof palettes>).map((k) => (
                <button
                  key={k} onClick={() => setColor(k)}
                  className={color === k ? "h-10 rounded-lg ring-2 ring-offset-2 ring-brand-500" : "h-10 rounded-lg ring-1 ring-ink-200"}
                  style={{ background: palettes[k].bg }}
                  aria-label={k}
                />
              ))}
            </div>
          </div>
          <button onClick={printSign} className="btn-primary w-full justify-center">
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </button>
          <a href={qr} download={`yard-sign-qr-${biz || "contractor"}.png`} className="btn-secondary w-full justify-center">
            <Download className="h-4 w-4" /> Download QR only
          </a>
          <p className="text-xs text-ink-500">
            Take the printed PDF to any sign shop (Vistaprint / FastSigns / local print shop).
            Tell them: <strong>18×24 corrugated plastic yard sign</strong>, ~$15-25 each.
          </p>
        </section>

        <section className="card p-0 overflow-hidden print:shadow-none print:border-0">
          <div className="bg-ink-100 px-4 py-2 text-xs text-ink-500 print:hidden">Preview (18&quot; × 24&quot; @ 1:6 scale)</div>
          <div className="p-6 print:p-0">
            <div
              className="mx-auto rounded-2xl print:rounded-none flex flex-col items-center justify-center text-center shadow-soft-lg print:shadow-none"
              style={{
                width: "min(100%, 540px)",
                aspectRatio: "3 / 4",
                backgroundColor: c.bg,
                color: c.fg,
                padding: "8% 6%",
              }}
            >
              <div style={{ fontSize: "min(7vw, 38px)", fontWeight: 800, letterSpacing: "0.02em", lineHeight: 1, color: c.accent }}>
                {headline || "ROOFING BY"}
              </div>
              <div style={{ fontSize: "min(11vw, 64px)", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.05, marginTop: "4%" }}>
                {biz || "Your Business"}
              </div>
              {phone && (
                <div style={{ fontSize: "min(7vw, 38px)", fontWeight: 700, marginTop: "3%" }}>
                  {phone}
                </div>
              )}
              <div style={{ flex: 1 }} />
              <div style={{ background: "#fff", padding: "12px", borderRadius: "12px", marginTop: "4%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR" width={200} height={200} style={{ display: "block", width: "100%", height: "auto", maxWidth: "200px" }} />
              </div>
              <div style={{ fontSize: "min(4.5vw, 22px)", fontWeight: 600, marginTop: "3%", opacity: 0.95 }}>{cta}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
