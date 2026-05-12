import { ProposalBuilder } from "./ProposalBuilder";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NewProposalPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Sparkles className="h-3.5 w-3.5" /> AI proposal builder</span>
          <h1 className="mt-2 display-h2">New three-tier proposal</h1>
          <p className="mt-2 text-sm text-ink-600 max-w-2xl">
            Describe the job. AI drafts Good / Better / Best tiers with line items.
            You review, tweak, and send a shareable link.
          </p>
        </div>
      </header>
      <ProposalBuilder />
    </div>
  );
}
