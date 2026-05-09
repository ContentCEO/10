"use client";

import Link from "next/link";
import { CONTENT_TYPE_LABELS, type ContentItem } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function CalendarGrid({
  year,
  month,
  items,
}: {
  year: number;
  month: number;
  items: ContentItem[];
}) {
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: string; dayNum: number } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${year}-${pad(month + 1)}-${pad(d)}`, dayNum: d });
  }

  const byDate = new Map<string, ContentItem[]>();
  for (const i of items) {
    if (!i.scheduled_for) continue;
    const arr = byDate.get(i.scheduled_for) ?? [];
    arr.push(i);
    byDate.set(i.scheduled_for, arr);
  }

  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const label = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`/dashboard/calendar?m=${prev.getFullYear()}-${prev.getMonth() + 1}`}
          className="btn-ghost text-sm"
        >
          ← Prev
        </Link>
        <h2 className="text-lg font-medium">{label}</h2>
        <Link
          href={`/dashboard/calendar?m=${next.getFullYear()}-${next.getMonth() + 1}`}
          className="btn-ghost text-sm"
        >
          Next →
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-slate-200 bg-slate-200">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
            {w}
          </div>
        ))}
        {cells.map((c, idx) => (
          <div key={idx} className="bg-white min-h-[110px] p-2 text-xs">
            {c && (
              <>
                <div className="text-slate-500">{c.dayNum}</div>
                <div className="mt-1 space-y-1">
                  {(byDate.get(c.date) ?? []).slice(0, 3).map((i) => (
                    <div
                      key={i.id}
                      className={`truncate rounded px-1.5 py-0.5 ${
                        i.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-brand-50 text-brand-700"
                      }`}
                      title={i.body}
                    >
                      {CONTENT_TYPE_LABELS[i.type]}: {i.title ?? i.body.slice(0, 28)}
                    </div>
                  ))}
                  {(byDate.get(c.date)?.length ?? 0) > 3 && (
                    <div className="text-slate-500">
                      +{(byDate.get(c.date)?.length ?? 0) - 3} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
