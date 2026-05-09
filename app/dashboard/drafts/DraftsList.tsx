"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CONTENT_TYPE_LABELS, type ContentItem, type ContentStatus } from "@/lib/types";

const STATUS_STYLE: Record<ContentStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  scheduled: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
};

export default function DraftsList({ items }: { items: ContentItem[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [filter, setFilter] = useState<"all" | ContentStatus>("all");

  async function update(id: string, patch: Partial<ContentItem>) {
    await supabase.from("content_items").update(patch).eq("id", id);
    router.refresh();
  }

  async function remove(id: string) {
    await supabase.from("content_items").delete().eq("id", id);
    router.refresh();
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  if (items.length === 0) {
    return (
      <div className="card text-slate-600">
        Nothing here yet. Head to <span className="font-medium">Generate</span> to create your
        first month of content.
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        {(["all", "draft", "scheduled", "published"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`btn-ghost text-sm ${
              filter === s ? "bg-slate-200 text-slate-900" : ""
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4">
        {filtered.map((i) => (
          <div key={i.id} className="card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="badge bg-brand-50 text-brand-700">
                    {CONTENT_TYPE_LABELS[i.type]}
                  </span>
                  <span className={`badge ${STATUS_STYLE[i.status]}`}>{i.status}</span>
                  {i.scheduled_for && (
                    <span className="text-xs text-slate-500">
                      {new Date(i.scheduled_for).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {i.title && <h3 className="mt-2 font-medium">{i.title}</h3>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  className="input !py-1 !text-xs w-36"
                  defaultValue={i.scheduled_for ?? ""}
                  onChange={(e) =>
                    update(i.id, {
                      scheduled_for: e.target.value || null,
                      status: e.target.value ? "scheduled" : i.status,
                    })
                  }
                />
                <select
                  className="input !py-1 !text-xs w-32"
                  value={i.status}
                  onChange={(e) =>
                    update(i.id, { status: e.target.value as ContentStatus })
                  }
                >
                  <option value="draft">draft</option>
                  <option value="scheduled">scheduled</option>
                  <option value="published">published</option>
                </select>
                <button
                  className="btn-ghost !py-1 !text-xs text-red-600"
                  onClick={() => remove(i.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{i.body}</pre>
            {i.hashtags && (
              <p className="mt-2 text-xs text-brand-700 break-words">{i.hashtags}</p>
            )}
            {i.image_prompt && (
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-medium">Image prompt:</span> {i.image_prompt}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
