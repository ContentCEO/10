import { revalidatePath } from "next/cache";
import { Gift, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { CopyField } from "../integrations/CopyField";

export const dynamic = "force-dynamic";

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

interface CodeRow {
  id: string;
  code: string;
  customer_id: string | null;
  credit_cents: number;
  uses: number;
  created_at: string;
}

interface RedemptionRow {
  id: string;
  code: string;
  referred_email: string | null;
  lead_id: string | null;
  closed_at: string | null;
  credit_cents: number;
  created_at: string;
}

async function createCode(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const customer_id = (formData.get("customer_id") as string) || null;
  const credit = Number(formData.get("credit") ?? 50);
  await supabase.from("referral_codes").insert({
    user_id: user.id,
    customer_id,
    code: randomCode(),
    credit_cents: Math.max(0, Math.round(credit * 100)),
  });
  revalidatePath("/referrals");
}

async function deleteCode(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("referral_codes").delete().eq("id", id);
  revalidatePath("/referrals");
}

export default async function ReferralsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: codes }, { data: customers }, { data: redemptions }] = await Promise.all([
    supabase.from("referral_codes").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("customers").select("id,name").eq("user_id", user.id).order("name"),
    supabase.from("referral_redemptions").select("*")
      .order("created_at", { ascending: false }).limit(50),
  ]);

  const codeList = (codes ?? []) as CodeRow[];
  const customerMap = new Map(((customers ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));
  const redemptionList = (redemptions ?? []) as RedemptionRow[];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  const closedRedemptions = redemptionList.filter((r) => r.closed_at);
  const totalCreditEarned = closedRedemptions.reduce((s, r) => s + r.credit_cents, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-5 w-5 text-brand-600" /> Referral program
        </h1>
        <p className="text-sm text-slate-500">
          Hand out a code to every closed customer. When they refer someone who
          books, both sides get credit. Single highest-ROI lead-gen lever.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-3">
        <Tile label="Active codes" value={String(codeList.length)} tone="from-indigo-500 to-violet-500" />
        <Tile label="Total redemptions" value={String(redemptionList.length)} tone="from-amber-500 to-orange-500" />
        <Tile label="Credit earned" value={`$${(totalCreditEarned / 100).toFixed(0)}`} tone="from-emerald-500 to-teal-500" />
      </section>

      <section className="card p-5 space-y-3 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">Generate a new code</h2>
        </div>
        <form action={createCode} className="grid sm:grid-cols-[1fr_140px_auto] gap-2">
          <select name="customer_id" className="input" defaultValue="">
            <option value="">— Any customer (unassigned) —</option>
            {(customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input name="credit" type="number" min="0" step="1" defaultValue="50"
            className="input" placeholder="Credit per side ($)" />
          <button className="btn-primary">Generate code</button>
        </form>
        <p className="text-xs text-slate-500">
          Share the URL or code with your customer. When their referral comes
          through the link and books a job, both get credited.
        </p>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Active codes</h2>
        {codeList.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">
            No codes yet. Generate one above.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {codeList.map((c) => (
              <li key={c.id} className="px-4 py-3 grid sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
                <div className="min-w-0">
                  <CopyField value={`${baseUrl}/r/${c.code}`} />
                  <div className="text-xs text-slate-500 mt-1">
                    <code className="font-mono">{c.code}</code> ·
                    {" "}${(c.credit_cents / 100).toFixed(0)} per side ·
                    {" "}{c.uses} use{c.uses === 1 ? "" : "s"}
                    {c.customer_id ? ` · ${customerMap.get(c.customer_id) ?? "customer"}` : ""}
                  </div>
                </div>
                <span className="text-xs text-slate-500">{formatDate(c.created_at)}</span>
                <form action={deleteCode.bind(null, c.id)}>
                  <button className="btn-secondary !py-1 text-xs">Delete</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {redemptionList.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Recent redemptions</h2>
          <ul className="card divide-y divide-slate-100">
            {redemptionList.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium">
                    <code className="font-mono">{r.code}</code> ·{" "}
                    {r.referred_email ?? "Anonymous"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.closed_at ? `Closed ${formatDate(r.closed_at)} — $${(r.credit_cents / 100).toFixed(0)} credit applied` : `Pending close · submitted ${formatDate(r.created_at)}`}
                  </div>
                </div>
                <span className={`badge ${r.closed_at ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                  {r.closed_at ? "Closed" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`stat-tile bg-gradient-to-br ${tone}`}>
      <div className="relative z-10 text-xs uppercase tracking-wider text-white/85">{label}</div>
      <div className="relative z-10 mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
