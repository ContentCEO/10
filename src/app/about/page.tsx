import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Hammer, MapPin, Rocket } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "Why Contractor Flow exists — built in Massachusetts, for Massachusetts contractors.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="absolute inset-0 pointer-events-none -z-10"
        style={{
          backgroundImage:
            "radial-gradient(900px 500px at 80% -10%, rgba(16, 185, 129, 0.18), transparent 60%)," +
            "radial-gradient(700px 400px at -10% 10%, rgba(99, 102, 241, 0.14), transparent 60%)",
        }} />

      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition mb-10">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono text-emerald-300 mb-3">
          <MapPin className="h-3 w-3" /> Built in Massachusetts
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl tracking-tight leading-[1.02]">
          Why Contractor Flow <em className="italic text-emerald-300">exists.</em>
        </h1>

        <div className="mt-10 space-y-6 text-white/80 leading-relaxed text-[15px]">
          <p>
            Three years ago, my uncle&apos;s roofing business folded. Not because of competition. Because
            of Angi.
          </p>
          <p>
            He&apos;d been paying $3,000 a month for &ldquo;leads&rdquo; that turned out to be the same homeowner
            sold to four other roofers. He&apos;d quote a job, get told &ldquo;we got six other quotes,&rdquo; lose on
            price, and start the cycle over. Two years of that, and he was out.
          </p>
          <p>
            Meanwhile, every &ldquo;contractor SaaS&rdquo; pitch he got was built for a generic small business
            living in three time zones. Nothing knew anything about Massachusetts towns, our permit
            system, our weather, the way North Shore homeowners actually talk. So none of it fit.
          </p>
          <p>
            I started Contractor Flow in 2026 to fix one specific thing: small MA contractors deserve
            an operating system built FOR them, not built to extract from them.
          </p>
        </div>

        <h2 className="mt-16 font-serif text-3xl tracking-tight">What this means in practice</h2>
        <div className="mt-6 space-y-5">
          <Pillar icon={MapPin} title="One state. By design." emerald>
            Built for Massachusetts contractors. Every feature is shaped by MA towns, permits,
            weather, and homeowner behavior. Hyper-local is the moat.
          </Pillar>
          <Pillar icon={Hammer} title="Exclusive leads, never resold." emerald>
            Every Marketplace lead goes to ONE contractor. You buy access, you own the relationship.
            The opposite of how Angi works.
          </Pillar>
          <Pillar icon={Rocket} title="Modular. Pay for what you use." emerald>
            Marketplace ($49/mo for leads), CRM ($49-149/mo for the dashboard), Launchpad ($1,997 or
            $497/mo for website + ads). Unlock what you need. Like ProPresenter for trades.
          </Pillar>
        </div>

        <h2 className="mt-16 font-serif text-3xl tracking-tight">Who&apos;s building it</h2>
        <div className="mt-6 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6 flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 grid place-items-center text-white font-serif text-2xl shrink-0">D</div>
          <div>
            <div className="font-semibold text-white">Davi Chaves — Founder</div>
            <p className="mt-2 text-sm text-white/70 leading-relaxed">
              Born and raised watching small businesses succeed and fail at the margins. I&apos;m a
              solo founder building this in public. I answer every support email, I read every
              piece of feedback, and I&apos;ll personally onboard the first 50 contractors. If you have
              ideas, hard questions, or just want to vent about Angi —{" "}
              <a href="mailto:davi@contractorflowstore.com" className="text-emerald-300 hover:underline">email me</a>.
            </p>
          </div>
        </div>

        <div className="mt-16 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/30 p-7">
          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-emerald-300">Launches Sept 23, 2026</div>
          <h3 className="mt-2 font-serif text-2xl tracking-tight">First 50 contractors get founding-member pricing locked for life.</h3>
          <p className="mt-3 text-sm text-white/70">
            Join the waitlist on the home page. We&apos;ll email you the moment leads start flowing.
          </p>
          <Link href="/#editions" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 text-sm transition">
            See the modules <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

function Pillar({ icon: Icon, title, children, emerald }: {
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
  emerald?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 flex gap-4">
      <div className={`h-10 w-10 rounded-lg shrink-0 grid place-items-center ${emerald ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30" : "bg-white/[0.06] text-white/70 ring-1 ring-white/10"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-semibold text-white">{title}</div>
        <div className="mt-1 text-sm text-white/70 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
