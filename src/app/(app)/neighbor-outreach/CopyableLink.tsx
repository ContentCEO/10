"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

export function CopyableLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="mb-2">
      <div className="text-xs text-ink-500 mb-1">{label}</div>
      <div className="flex items-center gap-1">
        <input value={url} readOnly className="input !py-1.5 text-xs font-mono flex-1" />
        <button onClick={copy} className="btn-secondary !py-1.5 text-xs whitespace-nowrap">
          <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
