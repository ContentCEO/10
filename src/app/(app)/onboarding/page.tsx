import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Play, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Step {
  key: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  done: boolean;
  videoEmbed?: string; // optional YouTube embed ID
}

export default async function OnboardingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Pull the user's current state to mark steps complete.
  const [
    { data: profile },
    { count: leadCount },
    { count: customerCount },
    { count: jobCount },
    { count: webhookLeadCount },
    { count: bookingSlotCount },
    { count: ruleCount },
    { count: referralCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("source", "Website form"),
    supabase.from("booking_slots").select("id", { count: "exact", head: true }),
    supabase.from("auto_bid_rules").select("id", { count: "exact", head: true }),
    supabase.from("referral_codes").select("id", { count: "exact", head: true }),
  ]);

  const p = profile as Record<string, unknown> | null;

  const steps: Step[] = [
    {
      key: "profile",
      title: "Set up your public profile",
      body: "Business name, headline, services, service area, license info. This is what homeowners see in the directory and on your local SEO pages.",
      href: "/profile",
      cta: "Edit profile",
      done: Boolean(p?.business_name && (p?.headline || (Array.isArray(p?.services) && (p.services as string[]).length > 0))),
    },
    {
      key: "publish",
      title: "Publish to the public directory",
      body: "Toggle 'Publish to directory' on your profile so homeowners find you at /pros.",
      href: "/profile",
      cta: "Open profile",
      done: Boolean(p?.is_published),
    },
    {
      key: "first_lead",
      title: "Create your first lead",
      body: "Click '+ New lead' or use AI quick-add to type 'John 555-1234 kitchen remodel' and Claude fills the form.",
      href: "/leads",
      cta: "Add a lead",
      done: (leadCount ?? 0) > 0,
    },
    {
      key: "customer",
      title: "Convert a lead into a customer + job",
      body: "On any lead's detail page, hit 'Convert to job' — it creates a customer and a scheduled job in one click.",
      href: "/leads",
      cta: "View leads",
      done: (customerCount ?? 0) > 0 && (jobCount ?? 0) > 0,
    },
    {
      key: "capture",
      title: "Share your capture form",
      body: "Every contractor gets a free public form at /l/<your-id>. Post it in Instagram bio, embed in your site, or drop in DMs.",
      href: "/lead-gen",
      cta: "Get your form URL",
      done: (webhookLeadCount ?? 0) > 0,
    },
    {
      key: "alerts",
      title: "Set up speed-to-lead alerts",
      body: "Add your Slack or Discord webhook on your profile — every new lead pings instantly. <5 min response = ~70% close rate.",
      href: "/profile",
      cta: "Add webhook",
      done: Boolean(p?.alert_webhook_url),
    },
    {
      key: "wallet",
      title: "Fund your marketplace wallet",
      body: "Top up with $25-250 to start claiming Reddit, permit, and homeowner-form leads instantly.",
      href: "/marketplace",
      cta: "Top up",
      done: ((p?.credit_cents as number | undefined) ?? 0) > 0,
    },
    {
      key: "auto_bid",
      title: "Turn on AI auto-bid (optional)",
      body: "Set criteria (service, ZIP, max price). AI buys qualifying leads while you sleep, up to your daily cap.",
      href: "/auto-bid",
      cta: "Create rule",
      done: (ruleCount ?? 0) > 0,
    },
    {
      key: "booking",
      title: "Publish open booking slots",
      body: "Add availability — homeowners self-book estimate visits, no email back-and-forth.",
      href: "/booking",
      cta: "Add slots",
      done: (bookingSlotCount ?? 0) > 0,
    },
    {
      key: "referral",
      title: "Generate your first referral code",
      body: "Every closed customer gets a $50 code to share. Both sides earn credit when their referral books.",
      href: "/referrals",
      cta: "Create code",
      done: (referralCount ?? 0) > 0,
    },
    {
      key: "lsa",
      title: "Apply for Google Local Service Ads",
      body: "Highest-ROI paid channel. Google Guaranteed badge. ~45 min of setup, leads start in ~1 week.",
      href: "/lsa-setup",
      cta: "Setup playbook",
      done: false, // self-attest only
    },
    {
      key: "partnerships",
      title: "Apply to 3 partnerships",
      body: "Realtor board, BNI chapter, Home Depot Pro. 20+ programs with direct apply links.",
      href: "/partnerships",
      cta: "See partnerships",
      done: false,
    },
  ];

  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" /> Get started
        </h1>
        <p className="text-sm text-slate-500">
          Personalized walkthrough. Complete these {steps.length} steps and you'll
          have a fully-tuned lead engine running on autopilot.
        </p>
      </header>

      <section className="card p-5 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <span className="text-sm text-slate-500">Setup progress</span>
          <span className="text-lg font-bold gradient-text">{done} / {steps.length} · {pct}%</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-brand-gradient transition-all" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.key} className={`card p-5 flex items-start gap-3 ${s.done ? "opacity-60" : ""}`}>
            <div className="shrink-0 pt-0.5">
              {s.done
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                : <Circle className="h-5 w-5 text-slate-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-semibold">{s.title}</h3>
              </div>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
              {!s.done && (
                <Link href={s.href} className="btn-primary !py-1 text-xs mt-3 inline-flex">
                  {s.cta} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <section className="card p-6">
        <h2 className="font-semibold flex items-center gap-2">
          <Play className="h-4 w-4 text-brand-600" /> Video walkthroughs
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Embed videos here when you record them. Drop a YouTube ID in the
          source code and they'll play inline.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          {[
            "Quick tour (5 min)",
            "Setting up Google LSA",
            "Wiring Google Ads + Meta",
            "Building a referral funnel",
            "AI auto-bid walk-through",
            "Inviting your crew",
          ].map((t) => (
            <div key={t} className="aspect-video rounded-lg border border-dashed border-slate-300 grid place-items-center text-xs text-slate-400 bg-slate-50">
              {t}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
