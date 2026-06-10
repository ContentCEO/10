import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Contractor Flow.",
};

const UPDATED = "September 1, 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Contractor Flow
        </Link>

        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono text-emerald-600 mb-2">
          <FileText className="h-3 w-3" /> Legal
        </div>
        <h1 className="font-serif text-5xl tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-stone-500">Last updated: {UPDATED}</p>

        <Section title="The short version">
          <p>
            Use Contractor Flow honestly, treat homeowners and other contractors with respect, pay
            your bills on time. We&apos;ll deliver the platform as described. Cancel anytime.
          </p>
        </Section>

        <Section title="Who can use it">
          <p>
            Contractor Flow is for licensed contractors and homeowners primarily located in
            Massachusetts. You must be 18+ to create an account. Contractors must hold a valid
            Massachusetts HIC or trade license appropriate to the services offered.
          </p>
        </Section>

        <Section title="Your account">
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Keep your login secure. You&apos;re responsible for activity on your account.</li>
            <li>Use accurate business info. We may suspend accounts using false credentials.</li>
            <li>One account per business. Multiple accounts to manipulate matching is not allowed.</li>
          </ul>
        </Section>

        <Section title="Subscriptions + billing">
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Monthly plans renew automatically until you cancel. No contracts.</li>
            <li>Cancel anytime from <Link href="/account/billing" className="text-emerald-600 hover:underline">/account/billing</Link>. Access continues through the end of the billing period.</li>
            <li>Refunds are generally not provided for partial periods. Email us if something&apos;s off — we&apos;re reasonable.</li>
            <li>Stripe handles payments. Failed cards trigger a 7-day grace period before access is paused.</li>
          </ul>
        </Section>

        <Section title="Marketplace leads">
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Each lead is exclusive — assigned to one contractor in the matching trade + ZIP.</li>
            <li>We screen for real homeowner intent (name, phone, MA address). We can&apos;t guarantee every lead converts.</li>
            <li>You can dispute leads that don&apos;t meet our quality standards. Approved disputes are credited.</li>
            <li>Reselling, sharing, or scraping lead data is prohibited and grounds for termination.</li>
          </ul>
        </Section>

        <Section title="Launchpad agency services">
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Foundation tier ($1,997): one-time fee, includes 14-day delivery and 2 revision rounds.</li>
            <li>Growth + Revenue Share tiers: 6-month and 12-month minimums respectively.</li>
            <li>You own all deliverables (website code, ad accounts, content) after final payment.</li>
            <li>You provide ad budgets directly to Google + Meta — we manage, you pay them.</li>
          </ul>
        </Section>

        <Section title="What you can't do">
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Submit fake quote requests to inflate metrics or bait competitors.</li>
            <li>Misrepresent your licensing, insurance, or business identity.</li>
            <li>Harass homeowners or spam them outside the project they requested.</li>
            <li>Reverse engineer, scrape, or attack the platform.</li>
            <li>Use the platform for anything illegal under Massachusetts or federal law.</li>
          </ul>
        </Section>

        <Section title="Communications">
          <p>
            By creating an account, you agree to receive transactional messages (lead notifications,
            billing, account updates) via email + SMS to the contact info on file. Marketing emails
            are opt-out (unsubscribe link in every one).
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You can delete your account anytime. We can suspend or terminate accounts that violate
            these Terms, with notice when possible. After termination, you lose access to your
            dashboard but your data is retained per the Privacy Policy.
          </p>
        </Section>

        <Section title="Disclaimers + limits">
          <p>
            Contractor Flow is provided &ldquo;as is.&rdquo; We don&apos;t guarantee specific lead volume, conversion
            rates, or business outcomes. Aggregate platform liability is limited to fees paid in the
            previous 12 months. We&apos;re not liable for indirect damages.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These Terms are governed by Massachusetts law. Disputes are resolved in Suffolk County
            courts unless both parties agree to arbitration.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these Terms. Material changes get 30 days&apos; notice via email. Continued
            use after changes means you accept them.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Legal questions: <a href="mailto:legal@contractorflowstore.com" className="text-emerald-600 hover:underline">legal@contractorflowstore.com</a><br />
            General questions: <a href="mailto:hello@contractorflowstore.com" className="text-emerald-600 hover:underline">hello@contractorflowstore.com</a>
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
