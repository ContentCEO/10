"use client";

import Link from "next/link";
import { EditableField } from "@/components/EditableField";

/*
 * Plan 1 / Section A / Idea #1 — Inline lead editor.
 *
 * Combines a clickable link to the detail page (clicking the visible
 * name navigates) with an inline editor that activates on the small
 * pencil hover affordance. Calls PATCH /api/leads/[id] for the save.
 */

async function patch(id: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
}

export function LeadNameCell({
  id, name, contact,
}: { id: string; name: string; contact: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <Link
          href={`/leads/${id}`}
          className="font-medium text-ink-900 hover:text-brand-700 transition-colors"
        >
          {name}
        </Link>
        <span className="inline-flex shrink-0">
          <EditableField
            value={name}
            placeholder="Name"
            displayClassName="text-xs text-ink-400 hover:text-brand-600"
            onSave={(v) => patch(id, { name: v })}
            formatDisplay={() => "edit"}
          />
        </span>
      </div>
      <div className="text-xs text-ink-500 truncate max-w-[260px]">
        <EditableField
          value={contact}
          placeholder="add phone or email"
          onSave={(v) => {
            // Naive split: if it looks like an email, save email; else phone.
            if (v.includes("@")) return patch(id, { email: v, phone: "" });
            return patch(id, { phone: v, email: "" });
          }}
        />
      </div>
    </div>
  );
}
