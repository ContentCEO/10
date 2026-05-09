"use client";

import { useState } from "react";
import type { AdCreative } from "@/lib/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      className="text-xs text-forge-700 hover:underline"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
        <CopyButton text={value} />
      </div>
      <p className={`mt-1 text-sm text-zinc-800 whitespace-pre-wrap ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function CreativeCard({ creative }: { creative: AdCreative }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{creative.variant_label}</h3>
        <span className="badge bg-forge-100 text-forge-700">{creative.angle}</span>
      </div>
      <Field label="Hook" value={creative.hook} />
      <Field label="Headline" value={creative.headline} />
      <Field label="Primary text" value={creative.primary_text} />
      <Field label="Description" value={creative.description} />
      <Field label="CTA" value={creative.cta} />
      <Field label="Image prompt" value={creative.image_prompt} mono />
      <Field label="Video script" value={creative.video_script} />
    </div>
  );
}
