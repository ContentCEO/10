import { MessageSquare, Mail } from "lucide-react";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function LaunchpadMessages() {
  await requireModule("cf-launchpad");

  const supportEmail = process.env.NEXT_PUBLIC_LAUNCHPAD_SUPPORT_EMAIL ?? "davi@contractorflowstore.com";

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <span className="section-eyebrow"><MessageSquare className="h-3.5 w-3.5" /> Launchpad</span>
        <h1 className="mt-2 display-h2"><em>Messages</em></h1>
        <p className="mt-2 text-sm text-white/60">
          Direct line to Davi and the Launchpad team. Response within one business day.
        </p>
      </header>

      <section className="card p-5">
        <h2 className="section-title mb-3">Email</h2>
        <p className="text-sm text-white/60">
          Until in-app chat ships, email is the fastest way to reach us.
        </p>
        <a href={`mailto:${supportEmail}`}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white font-semibold px-4 py-2.5 text-sm hover:bg-orange-400 transition">
          <Mail className="h-4 w-4" /> Email Davi
        </a>
      </section>

      <section className="card p-5 space-y-2">
        <h2 className="section-title">What to expect</h2>
        <ul className="text-sm text-white/70 list-disc pl-5 space-y-1">
          <li><strong>Same business day</strong> response for urgent issues (down site, ad budget concerns).</li>
          <li><strong>1 business day</strong> for design changes, content updates, ad campaign tweaks.</li>
          <li><strong>3 business days</strong> for net-new feature requests beyond scope.</li>
        </ul>
        <p className="text-xs text-white/40 mt-2">
          In-app chat is on the roadmap. For now, email lands fastest.
        </p>
      </section>
    </div>
  );
}
