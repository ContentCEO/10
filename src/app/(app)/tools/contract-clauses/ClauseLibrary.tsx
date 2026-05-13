"use client";

import { useState } from "react";
import { Check, Copy, FileText, Search } from "lucide-react";
import { toast } from "@/components/Toaster";

interface Clause {
  category: string;
  title: string;
  body: string;
}

const CLAUSES: Clause[] = [
  {
    category: "Payment",
    title: "Payment schedule · 30 / 40 / 30",
    body: "Payment shall be made as follows: 30% upon contract signing as a mobilization deposit; 40% upon substantial completion of rough-in (carpentry, plumbing, electrical, HVAC); 30% upon final completion and final walk-through approval. All payments are due within 5 business days of invoice.",
  },
  {
    category: "Payment",
    title: "Late payment interest",
    body: "Invoices not paid within 14 days of the invoice date shall accrue interest at 1.5% per month (18% APR) until paid in full, plus reasonable costs of collection including attorneys' fees.",
  },
  {
    category: "Payment",
    title: "Deposit non-refundable after mobilization",
    body: "The initial deposit becomes non-refundable upon material order or project mobilization (whichever occurs first). If the client cancels prior to mobilization, the deposit is refundable less a 3% credit-card processing fee.",
  },
  {
    category: "Scope",
    title: "Change orders in writing",
    body: "Any change to the scope of work, materials, or schedule must be documented in a written Change Order signed by both parties prior to execution. Verbal change requests will not be honored. Change Orders may modify both price and timeline.",
  },
  {
    category: "Scope",
    title: "Concealed conditions",
    body: "If concealed conditions (rot, asbestos, mold, structural deficiencies, hidden plumbing/electrical issues) are discovered during the work, the Contractor will pause and notify the Owner before proceeding. Remediation will be priced as a Change Order.",
  },
  {
    category: "Scope",
    title: "Permits and inspections",
    body: "The Contractor shall pull all required permits and call for required inspections. Permit fees and inspection fees are reimbursable to the Contractor at cost. The Owner authorizes the Contractor to act as agent for permitting purposes.",
  },
  {
    category: "Schedule",
    title: "Force majeure",
    body: "The Contractor shall not be liable for delays caused by acts of God, severe weather, government shutdowns, supplier delays beyond the Contractor's reasonable control, or labor strikes. The schedule shall be extended day-for-day for the duration of any such delay.",
  },
  {
    category: "Schedule",
    title: "Owner-caused delay",
    body: "If the project is delayed by the Owner (failure to make payments, failure to provide site access, failure to make selections, etc.), the schedule shall be extended day-for-day plus a 2-day remobilization allowance. The Contractor reserves the right to charge a daily standby fee of $250 for delays exceeding 5 business days.",
  },
  {
    category: "Warranty",
    title: "One-year labor warranty",
    body: "The Contractor warrants all labor and workmanship for a period of one (1) year from the date of substantial completion. Material warranties are assigned to the Owner as provided by the manufacturer. This warranty does not cover damage from misuse, neglect, modifications by others, or normal wear and tear.",
  },
  {
    category: "Warranty",
    title: "Warranty exclusions",
    body: "This warranty excludes: (a) cosmetic cracks in caulk, paint, or grout; (b) damage caused by water from sources outside the work (roof, exterior drainage); (c) settling of the structure; (d) failures caused by Owner-supplied materials; (e) issues caused by other contractors working on the property.",
  },
  {
    category: "Indemnification",
    title: "Mutual indemnification",
    body: "Each party shall indemnify and hold harmless the other from and against any and all claims, damages, losses, and expenses arising out of the indemnifying party's negligent acts or omissions. The Contractor maintains liability insurance and shall provide a Certificate of Insurance upon request.",
  },
  {
    category: "Indemnification",
    title: "Limitation of liability",
    body: "The Contractor's total liability under this agreement shall not exceed the total contract price. In no event shall the Contractor be liable for consequential, indirect, or punitive damages.",
  },
  {
    category: "Termination",
    title: "Termination for cause",
    body: "Either party may terminate this agreement for cause upon 10 days' written notice if the other party materially breaches the agreement and fails to cure within the notice period. If the Owner terminates without cause, the Owner shall pay for all work performed plus a 15% restocking fee on unused materials.",
  },
  {
    category: "Termination",
    title: "Lien rights preserved",
    body: "The Contractor's lien rights are preserved through final payment. Upon receipt of final payment, the Contractor shall execute an unconditional waiver and release on final payment.",
  },
  {
    category: "General",
    title: "Entire agreement",
    body: "This contract represents the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements, written or oral. Any modifications must be in writing and signed by both parties.",
  },
  {
    category: "General",
    title: "Governing law",
    body: "This agreement shall be governed by the laws of the Commonwealth of Massachusetts. Any dispute arising under this agreement shall be resolved by binding arbitration in Suffolk County, Massachusetts under the Construction Industry Rules of the American Arbitration Association.",
  },
];

const CATEGORIES = Array.from(new Set(CLAUSES.map((c) => c.category)));

export function ClauseLibrary() {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = query.trim()
    ? CLAUSES.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.body.toLowerCase().includes(query.toLowerCase()))
    : CLAUSES;

  async function copy(c: Clause) {
    try {
      await navigator.clipboard.writeText(c.body);
      setCopied(c.title);
      toast({ message: `Copied "${c.title}"`, type: "success", duration: 1500 });
      setTimeout(() => setCopied(null), 2000);
    } catch { /* */ }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><FileText className="h-3.5 w-3.5" /> Sales · Legal</span>
          <h1 className="mt-2 display-h2"><span className="gradient-text">Contract clause library</span></h1>
          <p className="mt-2 text-sm text-ink-600 max-w-2xl">
            Battle-tested clauses for payment schedules, change orders, force majeure, warranty,
            indemnification, and termination. Copy directly into your proposals.
            <strong> Always have your own counsel review</strong> before relying for legal protection.
          </p>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white ring-1 ring-ink-200 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          placeholder="Search clauses..."
        />
      </div>

      {CATEGORIES.map((cat) => {
        const list = filtered.filter((c) => c.category === cat);
        if (list.length === 0) return null;
        return (
          <section key={cat} className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 mb-3">{cat}</h2>
            <ul className="space-y-3">
              {list.map((c) => (
                <li key={c.title} className="rounded-xl bg-ink-50/60 ring-1 ring-ink-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-sm tracking-tight flex-1 min-w-0">{c.title}</h3>
                    <button
                      onClick={() => copy(c)}
                      className="btn bg-white ring-1 ring-ink-200 hover:bg-ink-50 text-xs px-2.5 py-1 shrink-0"
                    >
                      {copied === c.title ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === c.title ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ink-700 leading-relaxed">{c.body}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
