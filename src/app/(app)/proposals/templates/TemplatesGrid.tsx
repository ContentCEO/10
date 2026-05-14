"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/Toaster";
import { EmptyState } from "@/components/EmptyState";

interface Tier { name: string; price_cents: number }
interface Template {
  id: string;
  name: string;
  service_type: string | null;
  tiers: Tier[];
  updated_at: string;
}

export function TemplatesGrid({ initial }: { initial: Template[] }) {
  const [templates, setTemplates] = useState(initial);
  const [, startTransition] = useTransition();

  function remove(id: string) {
    if (!confirm("Delete this template? Existing proposals are unaffected.")) return;
    const before = templates;
    setTemplates(templates.filter((t) => t.id !== id));
    startTransition(async () => {
      try {
        const res = await fetch(`/api/proposal-templates/${id}`, { method: "DELETE" });
        if (!res.ok) {
          setTemplates(before);
          toast({ message: "Couldn't delete template", type: "error" });
        } else {
          toast({ message: "Template deleted", type: "success" });
        }
      } catch {
        setTemplates(before);
        toast({ message: "Couldn't delete template", type: "error" });
      }
    });
  }

  if (templates.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={FileText}
          headline="No templates yet"
          body="Templates save you hours. Build a great proposal once, then start every future one from this saved shape."
          cta={{ label: "Create your first template", href: "/proposals/new?save_template=1" }}
        />
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((t) => {
        const totalLow  = Math.min(...t.tiers.map((x) => x.price_cents));
        const totalHigh = Math.max(...t.tiers.map((x) => x.price_cents));
        return (
          <div key={t.id} className="card card-hover p-5 group flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold tracking-tight truncate">{t.name}</h3>
                {t.service_type && (
                  <div className="mt-0.5 text-xs text-ink-500 truncate">{t.service_type}</div>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                aria-label="Delete template"
                className="text-ink-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 text-xs text-ink-600 space-y-1">
              {t.tiers.slice(0, 3).map((tier, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate">{tier.name}</span>
                  <span className="tabular-nums">${(tier.price_cents / 100).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4 flex items-center justify-between gap-2">
              <span className="text-[10px] text-ink-400 font-mono">
                ${(totalLow / 100).toLocaleString()} – ${(totalHigh / 100).toLocaleString()}
              </span>
              <Link
                href={`/proposals/new?from_template=${t.id}`}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <Plus className="h-3 w-3" /> Use template
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
