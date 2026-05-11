"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

export function CopyField({
  value,
  monospace = true,
  mask = false,
}: {
  value: string;
  monospace?: boolean;
  mask?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!mask);
  const display = revealed ? value : "•".repeat(Math.min(28, value.length));

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={display}
        className={`input ${monospace ? "font-mono text-xs" : ""}`}
        onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
      />
      {mask && (
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="btn-secondary shrink-0"
          aria-label={revealed ? "Hide" : "Reveal"}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
      <button type="button" onClick={copy} className="btn-secondary shrink-0">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
