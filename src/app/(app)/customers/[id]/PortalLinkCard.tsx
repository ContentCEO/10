"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

export function PortalLinkCard({ token }: { token: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!token) return null;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = `${origin}/portal/${token}`;

  function copy() {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-4 w-4 text-brand-600" />
        <h2 className="text-sm font-semibold">Customer portal link</h2>
      </div>
      <p className="text-xs text-ink-600 mb-3">
        Text or email this to the customer. They&apos;ll see their open jobs,
        invoices, and proposals — no login required.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg bg-white ring-1 ring-ink-200/70 px-3 py-2 text-xs font-mono text-ink-700">
          {url}
        </code>
        <button onClick={copy} className="btn-secondary text-xs shrink-0">
          {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </button>
      </div>
    </section>
  );
}
