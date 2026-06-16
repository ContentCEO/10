import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Launchpad — opening Q1 2027",
};

const ORANGE = "#f97316";
const ORANGE_DARK = "#ea580c";

export default function LaunchpadComingSoon() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            `radial-gradient(900px 500px at 80% -10%, ${ORANGE}33, transparent 60%),` +
            `radial-gradient(700px 400px at -10% 10%, ${ORANGE_DARK}22, transparent 60%)`,
        }} />

      <div className="relative max-w-3xl mx-auto px-6 py-20 sm:py-28">
        <Link href="https://contractorflowstore.com" className="text-xs uppercase tracking-[0.18em] font-mono hover:text-white"
          style={{ color: "rgba(255,255,255,0.40)" }}>
          ← contractorflowstore.com
        </Link>

        <div className="mt-8 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono"
          style={{
            color: "#fdba74",
            background: "rgba(249, 115, 22, 0.12)",
            border: "1px solid rgba(249, 115, 22, 0.32)",
            padding: "5px 12px",
            borderRadius: 999,
          }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          Opening Q1 2027
        </div>

        <h1 style={{
          fontFamily: "var(--font-instrument-serif), serif",
          fontSize: "clamp(48px, 9vw, 112px)",
          lineHeight: 0.95,
          letterSpacing: "-0.035em",
        }} className="mt-5">
          We&apos;re building <em style={{
            background: `linear-gradient(135deg, #fdba74, ${ORANGE}, ${ORANGE_DARK})`,
            WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
            fontStyle: "italic",
          }}>Launchpad.</em>
        </h1>

        <p className="mt-7 text-lg max-w-xl" style={{ color: "rgba(255,255,255,0.70)", lineHeight: 1.55 }}>
          Done-for-you website, ad management, and monthly reports — for Massachusetts contractors. We&apos;re heads-down building it. Get on the waitlist so you&apos;re first when it opens.
        </p>

        <form action="https://contractorflowstore.com/api/waitlist" method="POST"
          className="mt-10 flex flex-col sm:flex-row gap-2 items-stretch max-w-md">
          <input type="hidden" name="module" value="launchpad" />
          <input type="hidden" name="source" value="launchpad-subdomain" />
          <input name="email" type="email" required placeholder="you@yourbusiness.com"
            className="flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff" }} />
          <button type="submit"
            className="px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DARK})`,
              color: "#fff",
              boxShadow: `0 10px 22px -8px ${ORANGE}88`,
            }}>
            Join waitlist
          </button>
        </form>

        <div className="mt-6 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
          First 10 clients get founding-member rates locked.
        </div>

        <div className="mt-16 grid sm:grid-cols-3 gap-4 max-w-xl">
          <Pillar label="Website" body="Custom site, 14-day delivery, 2 free revisions" />
          <Pillar label="Ads" body="Google + Meta managed, weekly optimization" />
          <Pillar label="Reports" body="Monthly performance + Loom walkthrough" />
        </div>

        <div className="mt-20 pt-8 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              Looking for something live today? Try{" "}
              <Link href="https://marketplace.contractorflowstore.com" className="font-semibold" style={{ color: "#34d399" }}>
                Marketplace
              </Link>{" "}or{" "}
              <Link href="https://contractorflowstore.com/crm" className="font-semibold" style={{ color: "#a5b4fc" }}>
                CRM
              </Link>.
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
              © {new Date().getFullYear()} Contractor Flow
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Pillar({ label, body }: { label: string; body: string }) {
  return (
    <div className="p-4 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.50)" }}>{label}</div>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{body}</p>
    </div>
  );
}
