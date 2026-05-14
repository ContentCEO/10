"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail, Phone, Shield, Sparkles } from "lucide-react";

interface Defaults {
  business_name: string;
  email: string;
  phone: string;
  website: string;
  services: string[];
  license_number: string;
}

const STYLES = [
  { id: "classic",  label: "Classic" },
  { id: "compact",  label: "Compact" },
  { id: "branded",  label: "Branded" },
  { id: "minimal",  label: "Minimal" },
] as const;

type Style = typeof STYLES[number]["id"];

export function SignatureBuilder({ defaults }: { defaults: Defaults }) {
  const [name, setName]         = useState("");
  const [title, setTitle]       = useState("Owner");
  const [biz, setBiz]           = useState(defaults.business_name);
  const [email, setEmail]       = useState(defaults.email);
  const [phone, setPhone]       = useState(defaults.phone);
  const [website, setWebsite]   = useState(defaults.website);
  const [license, setLicense]   = useState(defaults.license_number);
  const [services, setServices] = useState((defaults.services ?? []).join(", "));
  const [style, setStyle]       = useState<Style>("classic");
  const [copied, setCopied]     = useState<"html" | "text" | null>(null);

  const html = useMemo(() => renderHtml({ name, title, biz, email, phone, website, license, services, style }), [name, title, biz, email, phone, website, license, services, style]);
  const text = useMemo(() => renderText({ name, title, biz, email, phone, website, license, services }), [name, title, biz, email, phone, website, license, services]);

  async function copy(kind: "html" | "text") {
    try {
      if (kind === "html") {
        // Use rich-text clipboard with HTML.
        const data = new Blob([html], { type: "text/html" });
        const fallback = new Blob([text], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({ "text/html": data, "text/plain": fallback }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Marketing · Tools</span>
          <h1 className="mt-2 display-h2"><span className="gradient-text">Email signature builder</span></h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Brand-consistent signature in 60 seconds. Pick a style, fill in your details,
            copy once into Gmail / Outlook / Apple Mail. Updates anytime.
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* Form */}
        <section className="card p-5 space-y-4">
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Marco Rodriguez" />
          </div>
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Owner / Lead Estimator" />
          </div>
          <div>
            <label className="label" htmlFor="biz">Business</label>
            <input id="biz" className="input" value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="Reliable Roofing" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(617) 555-0100" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="website">Website</label>
            <input id="website" className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="reliableroofing.com" />
          </div>
          <div>
            <label className="label" htmlFor="license">License #</label>
            <input id="license" className="input" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="CSL-123456" />
          </div>
          <div>
            <label className="label" htmlFor="services">Services (comma-separated)</label>
            <input id="services" className="input" value={services} onChange={(e) => setServices(e.target.value)} placeholder="Roofing · Siding · Gutters" />
          </div>
          <div>
            <div className="label">Style</div>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <label
                  key={s.id}
                  className={
                    style === s.id
                      ? "block p-3 rounded-xl cursor-pointer ring-2 ring-brand-500 bg-brand-50/40 text-sm font-semibold"
                      : "block p-3 rounded-xl cursor-pointer ring-1 ring-ink-200 bg-white hover:bg-ink-50 text-sm"
                  }
                >
                  <input type="radio" name="style" value={s.id} checked={style === s.id} onChange={() => setStyle(s.id)} className="sr-only" />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Preview + Copy */}
        <section className="space-y-3">
          <div className="card p-6">
            <div className="text-xs section-eyebrow mb-3">Preview</div>
            <div className="rounded-xl bg-white p-5 ring-1 ring-ink-200 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => copy("html")} className="btn-primary flex-1 justify-center">
              {copied === "html" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "html" ? "Copied!" : "Copy formatted (Gmail / Outlook)"}
            </button>
            <button onClick={() => copy("text")} className="btn-secondary">
              {copied === "text" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "text" ? "Copied!" : "Plain text"}
            </button>
          </div>
          <div className="card p-4">
            <div className="text-xs section-eyebrow mb-2">How to install</div>
            <ol className="text-sm text-ink-600 space-y-1.5 list-decimal list-inside">
              <li>Click <strong>Copy formatted</strong> above.</li>
              <li>Open Gmail Settings → General → Signature → New.</li>
              <li>Paste into the signature box (Ctrl/Cmd-V).</li>
              <li>Click Save Changes. Done.</li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}

interface RenderInput {
  name: string; title: string; biz: string; email: string; phone: string;
  website: string; license: string; services: string; style: Style;
}

function renderHtml(i: RenderInput): string {
  const services = i.services.split(",").map((s) => s.trim()).filter(Boolean).join(" · ");
  const link = i.website ? (i.website.startsWith("http") ? i.website : `https://${i.website}`) : "";

  if (i.style === "compact") {
    return `<table style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:#0f172a;line-height:1.4"><tr><td>
      <strong style="color:#4f46e5">${i.name || "Your name"}</strong> · ${i.title}<br>
      ${i.biz} ${services ? `· <span style="color:#64748b">${services}</span>` : ""}<br>
      ${i.phone ? `📞 <a href="tel:${i.phone}" style="color:#4f46e5;text-decoration:none">${i.phone}</a> · ` : ""}
      ${i.email ? `✉ <a href="mailto:${i.email}" style="color:#4f46e5;text-decoration:none">${i.email}</a>` : ""}
      ${link ? `<br>🌐 <a href="${link}" style="color:#4f46e5;text-decoration:none">${i.website}</a>` : ""}
      ${i.license ? `<br><span style="color:#94a3b8;font-size:11px">License ${i.license}</span>` : ""}
    </td></tr></table>`;
  }

  if (i.style === "minimal") {
    return `<div style="font-family:Georgia,serif;font-size:13px;color:#0f172a;line-height:1.5">
      <div><strong>${i.name || "Your name"}</strong></div>
      <div style="color:#64748b">${i.title}, ${i.biz}</div>
      <div style="margin-top:6px">
        ${i.phone ? `${i.phone}` : ""}${i.phone && i.email ? " · " : ""}${i.email ? `<a href="mailto:${i.email}" style="color:#0f172a">${i.email}</a>` : ""}
      </div>
      ${link ? `<div style="margin-top:2px"><a href="${link}" style="color:#4f46e5">${i.website}</a></div>` : ""}
    </div>`;
  }

  if (i.style === "branded") {
    return `<table cellpadding="0" cellspacing="0" style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:#0f172a">
      <tr>
        <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6 50%,#06b6d4);color:#fff;padding:14px 18px;border-radius:12px 0 0 12px;vertical-align:middle;min-width:80px">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em">${(i.biz || "CF").slice(0, 2).toUpperCase()}</div>
        </td>
        <td style="padding:10px 14px;vertical-align:top">
          <div style="font-weight:700;font-size:15px">${i.name || "Your name"}</div>
          <div style="color:#475569;font-size:13px">${i.title} · ${i.biz}</div>
          ${services ? `<div style="color:#64748b;font-size:12px;margin-top:2px">${services}</div>` : ""}
          <div style="margin-top:6px;font-size:13px">
            ${i.phone ? `<a href="tel:${i.phone}" style="color:#4f46e5;text-decoration:none">${i.phone}</a>` : ""}
            ${i.phone && i.email ? " · " : ""}
            ${i.email ? `<a href="mailto:${i.email}" style="color:#4f46e5;text-decoration:none">${i.email}</a>` : ""}
            ${link ? ` · <a href="${link}" style="color:#4f46e5;text-decoration:none">${i.website}</a>` : ""}
          </div>
          ${i.license ? `<div style="color:#94a3b8;font-size:11px;margin-top:4px">Licensed · ${i.license}</div>` : ""}
        </td>
      </tr>
    </table>`;
  }

  // classic (default)
  return `<table cellpadding="0" cellspacing="0" style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.5">
    <tr><td style="border-left:3px solid #6366f1;padding-left:14px">
      <div style="font-weight:700;font-size:16px;color:#0f172a">${i.name || "Your name"}</div>
      <div style="color:#475569">${i.title} · ${i.biz}</div>
      ${services ? `<div style="color:#64748b;font-size:13px;margin-top:2px">${services}</div>` : ""}
      <div style="margin-top:8px;font-size:13px;color:#334155">
        ${i.phone ? `<span style="display:inline-block;margin-right:14px">📞 <a href="tel:${i.phone}" style="color:#4f46e5;text-decoration:none">${i.phone}</a></span>` : ""}
        ${i.email ? `<span style="display:inline-block;margin-right:14px">✉ <a href="mailto:${i.email}" style="color:#4f46e5;text-decoration:none">${i.email}</a></span>` : ""}
        ${link ? `<span>🌐 <a href="${link}" style="color:#4f46e5;text-decoration:none">${i.website}</a></span>` : ""}
      </div>
      ${i.license ? `<div style="color:#94a3b8;font-size:11px;margin-top:6px">Licensed · ${i.license}</div>` : ""}
    </td></tr>
  </table>`;
}

function renderText(i: Omit<RenderInput, "style">): string {
  const services = i.services.split(",").map((s) => s.trim()).filter(Boolean).join(" · ");
  return [
    i.name || "Your name",
    `${i.title} · ${i.biz}`,
    services,
    [i.phone, i.email, i.website].filter(Boolean).join(" · "),
    i.license ? `Licensed · ${i.license}` : "",
  ].filter(Boolean).join("\n");
}
