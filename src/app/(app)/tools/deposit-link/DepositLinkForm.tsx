"use client";

import { useState, useTransition } from "react";
import { Check, Copy, CreditCard, DollarSign, Loader2, MessageSquare } from "lucide-react";
import { toast } from "@/components/Toaster";

interface CreatedLink {
  url: string;
  id: string;
  amount_cents: number;
  description: string;
}

export function DepositLinkForm() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [link, setLink] = useState<CreatedLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const amountCents = Math.round(Number(amount.replace(/[^0-9.]/g, "")) * 100);
  const validAmount = Number.isFinite(amountCents) && amountCents >= 100;

  function submit() {
    setError(null);
    setLink(null);
    if (!validAmount) { setError("Enter a valid amount (at least $1)."); return; }
    if (!description.trim()) { setError("Enter a description."); return; }

    startTransition(async () => {
      try {
        const res = await fetch("/api/payments/deposit-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_cents: amountCents,
            description: description.trim(),
            customer_email: customerEmail.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data?.error ?? `HTTP ${res.status}`); return; }
        setLink(data);
        toast({ message: "Payment link created.", type: "success" });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
      }
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast({ message: "Copied to clipboard.", type: "success", duration: 1500 });
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  }

  function smsLink(): string {
    if (!link) return "";
    const body = encodeURIComponent(
      `Hi! Here's the deposit link for ${link.description}: ${link.url} — pay any time.`
    );
    return `sms:?body=${body}`;
  }

  function emailLink(): string {
    if (!link) return "";
    const subject = encodeURIComponent(`Deposit · ${link.description}`);
    const body = encodeURIComponent(
      `Hi,\n\nHere's a secure payment link for your deposit (${link.description}):\n\n${link.url}\n\nPay any time. Receipt is automatic.\n\nThanks,`
    );
    return `mailto:${customerEmail || ""}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><CreditCard className="h-3.5 w-3.5" /> Sales · Payments</span>
          <h1 className="mt-2 display-h2"><span className="gradient-text">Generate a deposit link</span></h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Enter the amount, copy the secure Stripe link, send via SMS or email.
            Customer pays in one click. Money lands in your Stripe account.
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="amount">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input id="amount" inputMode="decimal" className="input pl-9" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" />
            </div>
            <div className="mt-1 text-xs text-ink-500">Minimum $1.00 · max $100,000.00</div>
          </div>
          <div>
            <label className="label" htmlFor="description">What's it for?</label>
            <input id="description" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deposit · Bathroom remodel @ 47 Beacon St" maxLength={200} />
          </div>
          <div>
            <label className="label" htmlFor="customer_email">Customer email (optional, used for emailing the link)</label>
            <input id="customer_email" type="email" className="input" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
          <button onClick={submit} disabled={pending || !validAmount} className="btn-primary w-full justify-center">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Create payment link
          </button>
          {error && <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 p-3 text-sm text-rose-800">{error}</div>}
          <p className="text-xs text-ink-500">
            Requires <code className="text-ink-700">STRIPE_SECRET_KEY</code> env var. Not configured?
            Add it in your Vercel project settings; this page will work immediately after.
          </p>
        </section>

        <section className="card p-6">
          {!link ? (
            <div className="text-center text-sm text-ink-500 py-16">
              Fill the form, click Create.<br />
              The link will appear here ready to copy and share.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs section-eyebrow flex items-center gap-1.5">
                <Check className="h-3 w-3 text-emerald-500" /> Ready to share
              </div>
              <div className="rounded-xl bg-ink-900 text-white p-4 font-mono text-xs break-all">
                {link.url}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={copy} className="btn-primary justify-center">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <a href={smsLink()} className="btn-secondary justify-center">
                  <MessageSquare className="h-4 w-4" /> SMS
                </a>
                <a href={emailLink()} className="btn-secondary justify-center">
                  Email
                </a>
              </div>
              <div className="rounded-xl bg-ink-50 ring-1 ring-ink-200 p-4 text-sm">
                <div className="font-semibold">${(link.amount_cents / 100).toFixed(2)}</div>
                <div className="text-xs text-ink-500">{link.description}</div>
                <div className="text-[10px] text-ink-400 font-mono mt-1">{link.id}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
