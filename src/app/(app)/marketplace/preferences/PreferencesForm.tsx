"use client";

import { useState, useTransition } from "react";
import { Bell, CheckCircle2, Clock, Loader2, Mail, MessageSquare, Pause, Trash2 } from "lucide-react";
import { savePreferences, snoozePreferences, clearSnooze } from "./actions";

interface Prefs {
  trades: string[];
  zips: string[];
  min_budget_cents: number;
  max_distance_mi: number;
  sms_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  daily_digest: boolean;
  weekly_digest: boolean;
  paused_until: string | null;
}

interface Trade { slug: string; label: string; }

export function PreferencesForm({ initial, trades }: { initial: Prefs; trades: Trade[] }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [zipInput, setZipInput] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleTrade(slug: string) {
    setPrefs((p) => ({
      ...p,
      trades: p.trades.includes(slug) ? p.trades.filter((t) => t !== slug) : [...p.trades, slug],
    }));
  }

  function addZip() {
    const z = zipInput.trim();
    if (!/^\d{5}$/.test(z)) return;
    if (prefs.zips.includes(z)) { setZipInput(""); return; }
    setPrefs((p) => ({ ...p, zips: [...p.zips, z] }));
    setZipInput("");
  }

  function removeZip(z: string) {
    setPrefs((p) => ({ ...p, zips: p.zips.filter((x) => x !== z) }));
  }

  function save() {
    startTransition(async () => {
      await savePreferences(prefs);
      setSavedAt(Date.now());
    });
  }

  function snooze(hours: number) {
    startTransition(async () => {
      const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      await snoozePreferences(until);
      setPrefs((p) => ({ ...p, paused_until: until }));
    });
  }

  function unsnooze() {
    startTransition(async () => {
      await clearSnooze();
      setPrefs((p) => ({ ...p, paused_until: null }));
    });
  }

  const paused = prefs.paused_until && new Date(prefs.paused_until) > new Date();

  return (
    <div className="space-y-5">
      {paused && (
        <div className="card p-4 bg-amber-500/10 ring-1 ring-amber-400/30 flex items-start gap-3">
          <Pause className="h-5 w-5 text-amber-300 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-amber-100 font-semibold">Notifications paused</div>
            <div className="text-xs text-white/70 mt-0.5">
              Resumes {new Date(prefs.paused_until!).toLocaleString()}
            </div>
          </div>
          <button type="button" onClick={unsnooze}
            className="text-xs text-amber-200 hover:text-amber-100 font-semibold underline">
            Resume now
          </button>
        </div>
      )}

      <section className="card p-5">
        <h2 className="section-title mb-1">Trades</h2>
        <p className="text-xs text-white/50 mb-3">Only show leads matching these trades. Leave empty for all.</p>
        <div className="flex flex-wrap gap-2">
          {trades.map((t) => {
            const on = prefs.trades.includes(t.slug);
            return (
              <button key={t.slug} type="button" onClick={() => toggleTrade(t.slug)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  on
                    ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/40"
                    : "bg-white/[0.04] text-white/60 ring-1 ring-white/10 hover:bg-white/[0.08]"
                }`}>
                {on && <CheckCircle2 className="h-3 w-3" />}
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-1">ZIP codes</h2>
        <p className="text-xs text-white/50 mb-3">Only show leads from these MA ZIPs. Leave empty for all.</p>
        <div className="flex gap-2">
          <input type="text" inputMode="numeric" maxLength={5} placeholder="02148"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addZip(); } }}
            className="input max-w-[140px]" />
          <button type="button" onClick={addZip} className="btn-secondary text-sm">Add</button>
        </div>
        {prefs.zips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {prefs.zips.map((z) => (
              <span key={z} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 px-2.5 py-1 text-xs font-mono">
                {z}
                <button type="button" onClick={() => removeZip(z)} className="text-white/40 hover:text-rose-300">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-1">Minimum budget</h2>
        <p className="text-xs text-white/50 mb-3">Skip leads with stated budgets below this.</p>
        <div className="flex items-center gap-3">
          <span className="text-white/60">$</span>
          <input type="number" min={0} step={500} value={prefs.min_budget_cents / 100}
            onChange={(e) => setPrefs((p) => ({ ...p, min_budget_cents: Math.max(0, parseInt(e.target.value || "0", 10)) * 100 }))}
            className="input max-w-[160px]" />
          <span className="text-xs text-white/50">leave at 0 to skip this filter</span>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-1">Notifications</h2>
        <p className="text-xs text-white/50 mb-3">How you hear about new leads.</p>
        <div className="space-y-2.5">
          <Toggle icon={MessageSquare} label="SMS" desc="Text the moment a lead lands"
            on={prefs.sms_enabled} onChange={(v) => setPrefs((p) => ({ ...p, sms_enabled: v }))} />
          <Toggle icon={Mail} label="Email" desc="Email with lead details + 1-click contact"
            on={prefs.email_enabled} onChange={(v) => setPrefs((p) => ({ ...p, email_enabled: v }))} />
          <Toggle icon={Bell} label="Desktop push" desc="Native notifications via the desktop app"
            on={prefs.push_enabled} onChange={(v) => setPrefs((p) => ({ ...p, push_enabled: v }))} />
        </div>
        <div className="mt-4 pt-4 border-t border-white/5 space-y-2.5">
          <Toggle icon={Clock} label="Daily digest" desc="7 AM summary instead of real-time blasts"
            on={prefs.daily_digest} onChange={(v) => setPrefs((p) => ({ ...p, daily_digest: v }))} />
          <Toggle icon={Clock} label="Weekly digest" desc="Monday morning roundup of the week's leads"
            on={prefs.weekly_digest} onChange={(v) => setPrefs((p) => ({ ...p, weekly_digest: v }))} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-1">Snooze notifications</h2>
        <p className="text-xs text-white/50 mb-3">Temporarily pause alerts without canceling.</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "4 hours",  h: 4 },
            { label: "1 day",    h: 24 },
            { label: "1 week",   h: 24 * 7 },
            { label: "2 weeks",  h: 24 * 14 },
          ].map((opt) => (
            <button key={opt.h} type="button" onClick={() => snooze(opt.h)}
              className="btn-secondary text-xs">
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3">
        {savedAt && Date.now() - savedAt < 4000 && (
          <span className="text-xs text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}
        <button type="button" onClick={save} disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 text-sm transition disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Save preferences
        </button>
      </div>
    </div>
  );
}

function Toggle({ icon: Icon, label, desc, on, onChange }: {
  icon: typeof Bell;
  label: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="flex items-start gap-3">
        <Icon className="h-4 w-4 text-white/50 mt-1 shrink-0" />
        <span>
          <span className="block text-sm text-white">{label}</span>
          <span className="block text-xs text-white/50">{desc}</span>
        </span>
      </span>
      <span className="relative inline-block w-10 h-6 shrink-0">
        <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} />
        <span className="absolute inset-0 rounded-full bg-white/[0.08] peer-checked:bg-emerald-500/60 transition" />
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-4" : ""}`} />
      </span>
    </label>
  );
}
