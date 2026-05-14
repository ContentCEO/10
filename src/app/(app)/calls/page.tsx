import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CheckCircle2, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Plus, Voicemail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CallRow {
  id: string;
  lead_id: string | null;
  customer_id: string | null;
  direction: "outbound" | "inbound";
  outcome: string;
  notes: string | null;
  duration_min: number | null;
  called_at: string;
}

interface LeadLite { id: string; name: string; }
interface CustLite { id: string; name: string; }

const OUTCOMES = [
  { v: "connected",          label: "Connected",       icon: CheckCircle2, tone: "text-emerald-700" },
  { v: "voicemail",          label: "Voicemail",       icon: Voicemail,    tone: "text-amber-700" },
  { v: "no_answer",          label: "No answer",       icon: PhoneMissed,  tone: "text-rose-700" },
  { v: "wrong_number",       label: "Wrong number",    icon: PhoneMissed,  tone: "text-rose-700" },
  { v: "callback_scheduled", label: "Callback set",    icon: Phone,        tone: "text-brand-700" },
  { v: "not_interested",     label: "Not interested",  icon: PhoneMissed,  tone: "text-ink-500" },
];

async function add(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("call_log").insert({
    user_id: user.id,
    lead_id: String(formData.get("lead_id") ?? "") || null,
    customer_id: String(formData.get("customer_id") ?? "") || null,
    direction: (String(formData.get("direction") ?? "outbound")) as "outbound" | "inbound",
    outcome: String(formData.get("outcome") ?? "connected"),
    duration_min: Number(formData.get("duration_min") ?? 0) || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/calls");
}

export default async function CallsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: calls }, { data: leads }, { data: customers }] = await Promise.all([
    supabase.from("call_log").select("*")
      .eq("user_id", user.id).order("called_at", { ascending: false }).limit(100),
    supabase.from("leads").select("id,name")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("customers").select("id,name")
      .eq("user_id", user.id).order("name").limit(200),
  ]);

  const rows = (calls ?? []) as CallRow[];
  const leadList = (leads ?? []) as LeadLite[];
  const custList = (customers ?? []) as CustLite[];
  const leadMap = new Map(leadList.map((l) => [l.id, l.name]));
  const custMap = new Map(custList.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Phone className="h-3.5 w-3.5" /> Sales · Call Log</span>
          <h1 className="mt-2 display-h2">
            Log <em>every call</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Track outbound and inbound calls that didn&apos;t come through
            Twilio. Useful for cold calls, callbacks, voicemails left.
            Link to a lead or customer so it shows in their timeline.
          </p>
        </div>
      </header>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" /> Log a call
        </h2>
        <form action={add} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Direction</label>
            <select name="direction" className="input">
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
          </div>
          <div>
            <label className="label">Outcome</label>
            <select name="outcome" className="input">
              {OUTCOMES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Duration (min)</label>
            <input name="duration_min" type="number" inputMode="decimal" className="input text-right tabular-nums" placeholder="0" />
          </div>
          <div>
            <label className="label">Linked lead</label>
            <select name="lead_id" className="input">
              <option value="">— None —</option>
              {leadList.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Linked customer</label>
            <select name="customer_id" className="input">
              <option value="">— None —</option>
              {custList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input name="notes" className="input" placeholder="Followup Tuesday" maxLength={500} />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">
              <Plus className="h-4 w-4" /> Log call
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Recent calls</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">No calls logged yet.</div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {rows.map((c) => {
              const oc = OUTCOMES.find((o) => o.v === c.outcome);
              const Icon = oc?.icon ?? Phone;
              const DirIcon = c.direction === "outbound" ? PhoneOutgoing : PhoneIncoming;
              return (
                <li key={c.id} className="px-4 py-3 flex items-center gap-3">
                  <Icon className={`h-4 w-4 shrink-0 ${oc?.tone ?? "text-ink-500"}`} />
                  <DirIcon className="h-3 w-3 text-ink-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {oc?.label ?? c.outcome}
                      {c.lead_id && leadMap.get(c.lead_id) && (
                        <Link href={`/leads/${c.lead_id}`} className="ml-2 text-brand-600 hover:underline">
                          → {leadMap.get(c.lead_id)}
                        </Link>
                      )}
                      {c.customer_id && custMap.get(c.customer_id) && (
                        <Link href={`/customers/${c.customer_id}`} className="ml-2 text-brand-600 hover:underline">
                          → {custMap.get(c.customer_id)}
                        </Link>
                      )}
                    </div>
                    {c.notes && <div className="text-xs text-ink-600 truncate">{c.notes}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    {c.duration_min ? (
                      <div className="text-sm tabular-nums font-mono">{c.duration_min}m</div>
                    ) : null}
                    <div className="text-[10px] text-ink-400 tabular-nums font-mono">
                      {new Date(c.called_at).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
