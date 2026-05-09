"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import {
  LEAD_STATUSES,
  STATUS_LABEL,
  type Channel,
  type Lead,
  type LeadStatus,
  type Message,
} from "@/lib/types";

export function LeadDetail({
  lead,
  messages,
  businessContext,
}: {
  lead: Lead;
  messages: Message[];
  businessContext: string | null;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>(lead.email ? "email" : "sms");
  const [tone, setTone] = useState("friendly, casual, professional");
  const [goal, setGoal] = useState("re-engage and book a 15-minute call");
  const [extra, setExtra] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/messages/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, channel, tone, goal, customPrompt: extra }),
    });
    setGenerating(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to generate");
      return;
    }
    setSubject(json.subject ?? "");
    setBody(json.body ?? "");
  }

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, channel, subject, body }),
    });
    setSending(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Send failed");
      return;
    }
    setInfo(`Sent via ${channel.toUpperCase()}.`);
    setSubject("");
    setBody("");
    router.refresh();
  }

  async function setStatus(status: LeadStatus) {
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unnamed lead";

  return (
    <div>
      <Link href="/leads" className="text-sm text-slate-600 hover:underline">← Back to leads</Link>
      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {lead.company ? `${lead.company} · ` : ""}{lead.email ?? "—"} · {lead.phone ?? "—"}
          </p>
          {lead.notes && <p className="mt-3 text-sm text-slate-700 max-w-2xl">{lead.notes}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={lead.status} />
          <select
            className="input max-w-xs"
            value={lead.status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold">Generate AI message</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Channel</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`btn ${channel === "sms" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setChannel("sms")}
                  disabled={!lead.phone}
                >SMS</button>
                <button
                  type="button"
                  className={`btn ${channel === "email" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setChannel("email")}
                  disabled={!lead.email}
                >Email</button>
              </div>
            </div>
            <div>
              <label className="label">Goal</label>
              <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div>
              <label className="label">Tone</label>
              <input className="input" value={tone} onChange={(e) => setTone(e.target.value)} />
            </div>
            <div>
              <label className="label">Extra instructions (optional)</label>
              <textarea className="input" rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} />
            </div>
            {!businessContext && (
              <p className="text-xs text-amber-700">
                Tip: add your <Link href="/settings" className="underline">business context</Link> for better personalization.
              </p>
            )}
            <button className="btn-primary" onClick={generate} disabled={generating}>
              {generating ? "Generating…" : "Generate with AI"}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold">Review & send</h2>
          <div className="mt-4 space-y-4">
            {channel === "email" && (
              <div>
                <label className="label">Subject</label>
                <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
            )}
            <div>
              <label className="label">Message</label>
              <textarea
                className="input"
                rows={channel === "email" ? 8 : 5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Generate a draft above, or write your own."
              />
              {channel === "sms" && (
                <p className="text-xs text-slate-500 mt-1">{body.length}/320 chars</p>
              )}
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            {info && <p className="text-sm text-emerald-700">{info}</p>}
            <button className="btn-primary" onClick={send} disabled={sending || !body.trim()}>
              {sending ? "Sending…" : `Send ${channel.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-semibold">Message history</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-slate-600 mt-2">No messages yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {messages.map((m) => (
              <li key={m.id} className="card p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {m.channel.toUpperCase()} · {m.direction} · {m.state}
                    {m.sent_at ? ` · ${new Date(m.sent_at).toLocaleString()}` : ""}
                  </span>
                </div>
                {m.subject && <p className="font-medium mt-2">{m.subject}</p>}
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{m.body}</p>
                {m.error && <p className="mt-2 text-xs text-rose-600">{m.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
