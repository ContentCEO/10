import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Contractor Flow collects, uses, and protects your information.",
};

const UPDATED = "September 1, 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Contractor Flow
        </Link>

        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono text-emerald-600 mb-2">
          <Shield className="h-3 w-3" /> Legal
        </div>
        <h1 className="font-serif text-5xl tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-stone-500">Last updated: {UPDATED}</p>

        <Section title="The short version">
          <p>
            We collect what we need to deliver leads, send notifications, and bill you — and nothing
            we don&apos;t. We don&apos;t sell your data. We don&apos;t share it with advertisers. Every homeowner
            lead is exclusive — never resold.
          </p>
        </Section>

        <Section title="What we collect">
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong>Account info:</strong> business name, email, phone, address, trades, service area.</li>
            <li><strong>Homeowner submissions:</strong> name, contact info, project type, ZIP, optional notes — submitted via the public quote forms.</li>
            <li><strong>Usage data:</strong> pages visited, leads viewed, clicks, basic device info.</li>
            <li><strong>Payment info:</strong> handled entirely by Stripe. We never see or store card numbers.</li>
          </ul>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Match homeowners with contractors in the right trade + ZIP code.</li>
            <li>Send lead notifications via SMS, email, and push.</li>
            <li>Process billing, send receipts, prevent fraud.</li>
            <li>Improve product quality (e.g. lead-quality filtering, anti-spam).</li>
            <li>Reach out about platform updates (you can unsubscribe anytime).</li>
          </ul>
        </Section>

        <Section title="Who we share with">
          <p>
            We share information only with: (a) the contractor matched to a homeowner&apos;s submitted
            quote, (b) infrastructure providers (Supabase for storage, Vercel for hosting, Twilio for
            SMS, Stripe for billing, BatchData for phone verification, Anthropic + OpenAI for AI
            features). We have data-processing agreements with each.
          </p>
          <p className="mt-3">
            We do <strong>not</strong> sell personal information. We do <strong>not</strong> share leads with multiple
            contractors. We do <strong>not</strong> sell email lists.
          </p>
        </Section>

        <Section title="Cookies + tracking">
          <p>
            We use minimal first-party cookies for auth + session, and Vercel Analytics for aggregated,
            anonymous traffic stats. No third-party advertising trackers on this site.
          </p>
        </Section>

        <Section title="Your rights">
          <p>Massachusetts residents (and anyone else) can:</p>
          <ul className="list-disc pl-6 space-y-1.5 mt-2">
            <li>Request a copy of the data we hold about you.</li>
            <li>Ask us to delete your account and associated data.</li>
            <li>Opt out of marketing emails (link at the bottom of every email).</li>
            <li>Ask us to correct anything that&apos;s wrong.</li>
          </ul>
          <p className="mt-3">
            Email <a href="mailto:privacy@contractorflowstore.com" className="text-emerald-600 hover:underline">privacy@contractorflowstore.com</a> — we
            respond within 7 business days.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            Active account data is kept while your account is active. Deleted accounts: 90 days for
            backup recovery, then purged. Aggregated anonymous analytics may be retained longer.
          </p>
        </Section>

        <Section title="Children">
          <p>Contractor Flow is for businesses. We don&apos;t knowingly collect data from anyone under 16.</p>
        </Section>

        <Section title="Changes">
          <p>
            We&apos;ll post material changes on this page and email account holders. Continued use after
            an update means you accept the new policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Privacy questions: <a href="mailto:privacy@contractorflowstore.com" className="text-emerald-600 hover:underline">privacy@contractorflowstore.com</a><br />
            Anything else: <a href="mailto:hello@contractorflowstore.com" className="text-emerald-600 hover:underline">hello@contractorflowstore.com</a>
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
      <div className="mt-3 text-sm text-stone-700 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
