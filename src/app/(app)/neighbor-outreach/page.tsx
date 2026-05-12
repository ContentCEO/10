import { Mailbox, MapPin, QrCode, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CopyableLink } from "./CopyableLink";
import { NeighborComposer } from "./NeighborComposer";

export const dynamic = "force-dynamic";

export default async function NeighborOutreachPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles").select("business_name,services").eq("id", user.id).single();
  const p = profile as { business_name?: string; services?: string[] } | null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const yardUrl = `${appUrl}/yard/${user.id}`;
  const captureUrl = `${appUrl}/l/${user.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(yardUrl)}&format=png`;

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="relative card p-6 sm:p-7 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><MapPin className="h-3.5 w-3.5" /> Neighborhood marketing</span>
          <h1 className="mt-2 display-h2">Yard signs + neighbor outreach</h1>
          <p className="mt-2 text-sm text-ink-600 max-w-2xl">
            Three tools to dominate the neighborhood after every job:
            QR-coded yard signs, an AI-drafted &ldquo;we just worked nearby&rdquo;
            postcard message, and instructions for triggering geo-fenced ads.
          </p>
        </div>
      </header>

      {/* Yard sign QR */}
      <section className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-4">
          <QrCode className="h-4 w-4 text-brand-600" /> Yard sign QR code
        </h2>
        <div className="grid sm:grid-cols-[200px_1fr] gap-5 items-start">
          <a href={qrUrl} download={`yard-qr-${user.id}.png`} className="block">
            <img src={qrUrl} alt="Yard sign QR code" className="w-full rounded-xl border border-ink-200 shadow-soft" />
            <span className="block text-xs text-brand-600 mt-2 text-center font-medium">Click to download PNG</span>
          </a>
          <div>
            <p className="text-sm text-ink-700 mb-3">
              Print this on every yard sign, vehicle wrap, and job-site board.
              Neighbors scan → land on your branded page → tap &ldquo;Get a free quote.&rdquo;
            </p>
            <CopyableLink label="Yard sign URL" url={yardUrl} />
            <CopyableLink label="Quote capture URL" url={captureUrl} />
            <p className="mt-3 text-xs text-ink-500">
              For physical signs: Vistaprint, FastSigns, BuildASign all accept the
              PNG above. Recommended size: 18&times;24 inches, white background, QR at 4&times;4 inches minimum.
            </p>
          </div>
        </div>
      </section>

      {/* Neighbor postcard composer */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-glow">
            <Mailbox className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">&ldquo;We just worked nearby&rdquo; postcard</h2>
            <p className="text-xs text-ink-500">AI-drafted copy for direct mail. Print via Lob/PostalMail/Vistaprint or hand-deliver.</p>
          </div>
        </div>
        <NeighborComposer
          businessName={p?.business_name ?? "our team"}
          defaultService={p?.services?.[0] ?? "home services"}
        />
      </section>

      {/* Geo-fenced ads guidance */}
      <section className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-brand-600" /> Geo-fenced ads
        </h2>
        <p className="text-sm text-ink-600">
          When you finish a job, run a 0.5-mile-radius retargeting campaign for 14
          days. People who live nearby see your ad multiple times per week, your
          brand becomes the obvious choice.
        </p>
        <ol className="mt-3 space-y-2 text-sm text-ink-700">
          <li className="flex gap-2"><span className="font-semibold text-brand-600">1.</span> <span><strong>Google Ads</strong> → new campaign → Performance Max → Locations → drop a pin on the job address → 0.5 mi radius → $5-15/day for 14 days</span></li>
          <li className="flex gap-2"><span className="font-semibold text-brand-600">2.</span> <span><strong>Meta Ads</strong> → Ads Manager → new campaign → Audience → Location → drop pin → 1 mi radius → $5-10/day</span></li>
          <li className="flex gap-2"><span className="font-semibold text-brand-600">3.</span> <span>Both creatives should use a before/after photo from the recent job + the &ldquo;You may have seen our crew in your neighborhood&rdquo; angle.</span></li>
        </ol>
      </section>
    </div>
  );
}

