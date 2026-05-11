"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, QrCode } from "lucide-react";

export function CaptureToolbox({ captureUrl }: { captureUrl: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const embed = `<iframe src="${captureUrl}" style="width:100%;max-width:560px;height:760px;border:0;" loading="lazy"></iframe>`;

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(captureUrl)}`;

  return (
    <section className="card p-6 space-y-5">
      <div>
        <h2 className="font-semibold">Your public capture form</h2>
        <p className="text-sm text-slate-500">
          Share this link anywhere — DMs, ads, business cards, website. Submissions
          land in your pipeline as `Website form` leads.
        </p>
      </div>

      <div>
        <label className="label">Form URL</label>
        <div className="flex gap-2">
          <input className="input font-mono text-xs" readOnly value={captureUrl} />
          <button
            type="button"
            onClick={() => copy(captureUrl, "url")}
            className="btn-secondary shrink-0"
          >
            {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "url" ? "Copied" : "Copy"}
          </button>
          <a href={captureUrl} target="_blank" rel="noreferrer" className="btn-secondary shrink-0">
            <ExternalLink className="h-4 w-4" /> Open
          </a>
        </div>
      </div>

      <div>
        <label className="label">Embed on your website</label>
        <div className="flex gap-2">
          <textarea
            className="input font-mono text-xs h-20"
            readOnly
            value={embed}
          />
          <button
            type="button"
            onClick={() => copy(embed, "embed")}
            className="btn-secondary shrink-0 self-start"
          >
            {copied === "embed" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "embed" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="btn-secondary"
        >
          <QrCode className="h-4 w-4" /> {showQr ? "Hide" : "Show"} QR code
        </button>
        {showQr && (
          <div className="mt-3 inline-flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
            <img src={qrSrc} alt="QR code for capture form" width={240} height={240} />
            <div className="text-sm text-slate-600 max-w-xs">
              Print this on door hangers, business cards, or yard signs.
              Anyone who scans lands on your form.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
