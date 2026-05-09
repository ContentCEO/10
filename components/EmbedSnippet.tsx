"use client";

import { useState } from "react";

export function EmbedSnippet({
  appUrl,
  slug,
  color,
}: {
  appUrl: string;
  slug: string;
  color: string;
}) {
  const snippet = `<script async src="${appUrl}/widget-loader.js" data-aistaffer="${slug}" data-color="${color}"></script>`;
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
        {snippet}
      </pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(snippet);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="btn-secondary"
      >
        {copied ? "Copied!" : "Copy embed code"}
      </button>
    </div>
  );
}
