"use client";

import Link from "next/link";
import { type MarketplaceLead, BUDGET_LABELS } from "@/lib/marketplace";

interface Props { rows: MarketplaceLead[]; balanceCents: number; }

function money(cents: number) { return `$${(cents / 100).toFixed(0)}`; }

function scoreColor(score: number) {
  if (score >= 85) return "#fb7185";
  if (score >= 70) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#94a3b8";
}

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 60)   return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)     return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function TableView({ rows, balanceCents }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl p-12 text-center"
        style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
        <div style={{ color: "var(--text-muted)" }} className="text-sm">No leads match this view.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--surface-raised)" }}>
              <Th>Score</Th>
              <Th>Trade</Th>
              <Th>Homeowner &amp; project</Th>
              <Th>Location</Th>
              <Th align="right">Price</Th>
              <Th align="right">Age</Th>
              <Th align="right"></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const ring = scoreColor(l.ai_score);
              const affordable = balanceCents >= l.price_cents;
              return (
                <tr key={l.id} className="transition-colors"
                  style={{ borderTop: "1px solid var(--border)" }}>
                  <Td>
                    <span className="inline-flex h-8 w-10 items-center justify-center rounded-lg text-xs font-bold tabular-nums"
                      style={{ background: `${ring}1f`, border: `1px solid ${ring}55`, color: ring }}>
                      {l.ai_score}
                    </span>
                  </Td>
                  <Td>
                    <div className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: ring }} />
                      <span style={{ color: "var(--text)" }} className="text-xs font-medium">
                        {(l.service_type ?? "—").split(/[ ,]/)[0]}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <div style={{ color: "var(--text)" }} className="font-medium truncate max-w-[28ch]">
                      {l.name}
                    </div>
                    <div className="text-[11px] truncate max-w-[40ch]" style={{ color: "var(--text-muted)" }}>
                      {l.ai_summary ? l.ai_summary.slice(0, 60) : l.service_type ?? ""}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-xs" style={{ color: "var(--text)" }}>{l.city ?? "—"}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                      {BUDGET_LABELS[l.budget]}
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="font-semibold tabular-nums" style={{ color: ring }}>{money(l.price_cents)}</div>
                  </Td>
                  <Td align="right">
                    <div className="text-[11px] font-mono" style={{ color: "var(--text-faint)" }}>{timeAgo(l.created_at)}</div>
                  </Td>
                  <Td align="right">
                    <Link href={`/dashboard?lead=${l.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50"
                      style={{
                        background: affordable
                          ? "linear-gradient(135deg, var(--emerald-bright), var(--emerald-deep))"
                          : "var(--surface-raised)",
                        color: affordable ? "#fff" : "var(--text-muted)",
                      }}>
                      Claim · {money(l.price_cents)}
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: "right" }) {
  return (
    <th className={`px-3 py-2 text-[10px] font-mono uppercase tracking-wider ${align === "right" ? "text-right" : "text-left"}`}
      style={{ color: "var(--text-faint)" }}>
      {children}
    </th>
  );
}
function Td({ children, align }: { children?: React.ReactNode; align?: "right" }) {
  return <td className={`px-3 py-2.5 ${align === "right" ? "text-right" : ""}`}>{children}</td>;
}
