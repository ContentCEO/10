"use client";

import { useMemo, useState } from "react";
import { Copy, FileSignature, Printer } from "lucide-react";
import { toast } from "@/components/Toaster";

interface Defaults { contractor_name: string; license_number: string; }

// Plan 1 / E-13 — Lien-waiver auto-generator.
//
// Conditional + unconditional waivers, partial + final. Templates follow
// the AIA G902/G903 plain-language pattern; user reviews + has counsel
// approve before relying on for legal protection.

const TEMPLATES = {
  conditional_progress: {
    title: "Conditional Waiver and Release on Progress Payment",
    body: (v: TemplateVars) =>
`CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT

Project: ${v.project_address}
Owner:   ${v.owner_name}
Contractor: ${v.contractor_name}${v.license_number ? ` (License ${v.license_number})` : ""}
Job through: ${v.through_date}
Amount paid: $${v.amount}

The undersigned has been paid on a progress payment by the owner for labor,
services, equipment, or material furnished to the above project through the
date stated above. Upon receipt by the undersigned of a check from the owner
in the amount stated above payable to the undersigned and the check being
honored by the bank upon which it is drawn, this document becomes effective
to release any mechanic's lien right, any state or federal statutory bond
right, any private bond right, any claim for payment, and any rights under
any similar ordinance, rule, or statute related to payment rights against
the owner for labor, services, equipment, or material furnished to the
above project through the date stated above. This release covers a progress
payment for labor, services, equipment, or material furnished to the project
through the date stated above only and does not cover any retentions or
items furnished after that date. Before any recipient of this document
relies on it, the recipient should verify evidence of payment to the
undersigned.

Signed: ____________________________   Date: ${v.signed_date}
Print name: ${v.contractor_name}`,
  },
  unconditional_final: {
    title: "Unconditional Waiver and Release on Final Payment",
    body: (v: TemplateVars) =>
`UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT

Project: ${v.project_address}
Owner:   ${v.owner_name}
Contractor: ${v.contractor_name}${v.license_number ? ` (License ${v.license_number})` : ""}
Through:    ${v.through_date}
Amount paid: $${v.amount}

NOTICE TO CLAIMANT: THIS DOCUMENT WAIVES RIGHTS UNCONDITIONALLY AND STATES
THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS. THIS DOCUMENT IS ENFORCEABLE
AGAINST YOU IF YOU SIGN IT, EVEN IF YOU HAVE NOT BEEN PAID. IF YOU HAVE NOT
BEEN PAID, USE A CONDITIONAL RELEASE FORM.

The undersigned has been paid in full for all labor, services, equipment, or
material furnished to the owner on the above project and does hereby waive
and release any mechanic's lien right, any state or federal statutory bond
right, any private bond right, any claim for payment, and any rights under
any similar ordinance, rule, or statute related to payment rights against
the owner.

Signed: ____________________________   Date: ${v.signed_date}
Print name: ${v.contractor_name}`,
  },
} as const;

interface TemplateVars {
  contractor_name: string;
  license_number: string;
  owner_name: string;
  project_address: string;
  amount: string;
  through_date: string;
  signed_date: string;
}

type TemplateKey = keyof typeof TEMPLATES;

export function LienWaiverGenerator({ defaults }: { defaults: Defaults }) {
  const [tplKey, setTplKey] = useState<TemplateKey>("conditional_progress");
  const [vars, setVars] = useState<TemplateVars>({
    contractor_name: defaults.contractor_name,
    license_number: defaults.license_number,
    owner_name: "",
    project_address: "",
    amount: "",
    through_date: new Date().toISOString().slice(0, 10),
    signed_date: new Date().toISOString().slice(0, 10),
  });

  const template = TEMPLATES[tplKey];
  const document = useMemo(() => template.body(vars), [template, vars]);

  function set<K extends keyof TemplateVars>(k: K, v: TemplateVars[K]) {
    setVars((prev) => ({ ...prev, [k]: v }));
  }

  async function copy() {
    try { await navigator.clipboard.writeText(document); toast({ message: "Copied", type: "success", duration: 1500 }); } catch { /* */ }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><FileSignature className="h-3.5 w-3.5" /> Sales · Legal</span>
          <h1 className="mt-2 display-h2"><span className="gradient-text">Lien waiver generator</span></h1>
          <p className="mt-2 text-sm text-ink-600 max-w-2xl">
            Plain-language lien waivers for progress + final payments.
            Print, sign, hand to the customer at the time of payment. Always have
            your own counsel review for jurisdiction-specific compliance.
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        <section className="card p-5 space-y-4">
          <div>
            <div className="label">Waiver type</div>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
                <label
                  key={k}
                  className={tplKey === k
                    ? "block p-3 rounded-xl cursor-pointer ring-2 ring-brand-500 bg-brand-50/40 text-sm font-semibold"
                    : "block p-3 rounded-xl cursor-pointer ring-1 ring-ink-200 bg-white hover:bg-ink-50 text-sm"
                  }
                >
                  <input type="radio" name="tpl" value={k} checked={tplKey === k} onChange={() => setTplKey(k)} className="sr-only" />
                  {TEMPLATES[k].title}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="owner">Owner name</label>
            <input id="owner" className="input" value={vars.owner_name} onChange={(e) => set("owner_name", e.target.value)} placeholder="John Smith" />
          </div>
          <div>
            <label className="label" htmlFor="address">Project address</label>
            <input id="address" className="input" value={vars.project_address} onChange={(e) => set("project_address", e.target.value)} placeholder="47 Beacon St, Brookline MA" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="amount">Amount paid</label>
              <input id="amount" className="input" value={vars.amount} onChange={(e) => set("amount", e.target.value)} placeholder="5,000" />
            </div>
            <div>
              <label className="label" htmlFor="through">Through date</label>
              <input id="through" type="date" className="input" value={vars.through_date} onChange={(e) => set("through_date", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="cn">Your business</label>
              <input id="cn" className="input" value={vars.contractor_name} onChange={(e) => set("contractor_name", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="lic">License #</label>
              <input id="lic" className="input" value={vars.license_number} onChange={(e) => set("license_number", e.target.value)} />
            </div>
          </div>
          <button onClick={() => window.print()} className="btn-primary w-full justify-center">
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </button>
          <button onClick={copy} className="btn-secondary w-full justify-center">
            <Copy className="h-4 w-4" /> Copy text
          </button>
          <p className="text-xs text-ink-500">
            Templates follow the AIA G902/G903 plain-language pattern. Have your own
            counsel review for jurisdiction-specific compliance before relying.
          </p>
        </section>

        <section className="card p-6 print:shadow-none print:border-0">
          <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-ink-900 leading-relaxed">{document}</pre>
        </section>
      </div>
    </div>
  );
}
