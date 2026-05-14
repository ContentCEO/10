import { revalidatePath } from "next/cache";
import { Code, DollarSign, Plus, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CopyField } from "../integrations/CopyField";

export const dynamic = "force-dynamic";

function randomToken() {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "wgt_";
  for (let i = 0; i < 16; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

interface WidgetRow {
  id: string;
  token: string;
  name: string;
  credit_per_lead_cents: number;
  total_leads: number;
  total_credit_cents: number;
  created_at: string;
}

async function createWidget(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const name = String(formData.get("name") ?? "My widget").trim();
  const credit = Number(formData.get("credit") ?? 10);
  await supabase.from("partner_widgets").insert({
    user_id: user.id,
    name,
    token: randomToken(),
    credit_per_lead_cents: Math.max(0, Math.round(credit * 100)),
  });
  revalidatePath("/widget");
}

async function deleteWidget(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("partner_widgets").delete().eq("id", id);
  revalidatePath("/widget");
}

export default async function WidgetPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: widgets } = await supabase
    .from("partner_widgets").select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const list = (widgets ?? []) as WidgetRow[];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  const totalLeads = list.reduce((s, w) => s + w.total_leads, 0);
  const totalCredit = list.reduce((s, w) => s + w.total_credit_cents, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Code className="h-5 w-5 text-brand-600" /> Embeddable widgets
        </h1>
        <p className="text-sm text-slate-500">
          Drop our AI quote calculator on any partner's site. Every lead it
          generates credits your wallet automatically. Set your own per-lead
          rate per widget.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-3">
        <Tile label="Widgets" value={String(list.length)} tone="from-indigo-500 to-violet-500" />
        <Tile label="Leads delivered" value={String(totalLeads)} icon={TrendingUp} tone="from-amber-500 to-orange-500" />
        <Tile label="Credit earned" value={`$${(totalCredit / 100).toFixed(0)}`} icon={DollarSign} tone="from-emerald-500 to-teal-500" />
      </section>

      <section className="card p-5 space-y-3 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">Create a new widget</h2>
        </div>
        <form action={createWidget} className="grid sm:grid-cols-[1fr_140px_auto] gap-2">
          <input name="name" className="input" defaultValue="My widget" placeholder="Internal name" />
          <input name="credit" type="number" min="0" step="1" defaultValue="10"
            className="input" placeholder="Credit per lead ($)" />
          <button className="btn-primary">Generate</button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Your widgets</h2>
        {list.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">
            No widgets yet. Generate one and embed it on any partner's site.
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((w) => {
              const url = `${baseUrl}/embed/quote?partner=${w.token}`;
              const embed = `<iframe src="${url}" style="border:0;width:100%;max-width:560px;height:820px;" loading="lazy"></iframe>`;
              return (
                <li key={w.id} className="card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <strong>{w.name}</strong>
                    <span className="text-xs text-slate-500">
                      · ${(w.credit_per_lead_cents / 100).toFixed(0)}/lead · {w.total_leads} delivered
                    </span>
                    <form action={deleteWidget.bind(null, w.id)} className="ml-auto">
                      <button className="btn-secondary !py-1 text-xs">Delete</button>
                    </form>
                  </div>
                  <div>
                    <div className="label">Widget URL</div>
                    <CopyField value={url} />
                  </div>
                  <div>
                    <div className="label">Embed snippet</div>
                    <pre className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs overflow-x-auto whitespace-pre-wrap">{embed}</pre>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-6 bg-brand-50 border-brand-100">
        <h2 className="font-semibold">How to sell this</h2>
        <ol className="mt-3 text-sm text-slate-800 space-y-1.5 list-decimal list-inside">
          <li>Reach out to other contractors who DON'T already have an instant-quote widget on their site.</li>
          <li>Offer to install ours on their site for free in exchange for a small kickback per lead it generates (we keep 1-2× your kickback as platform fee).</li>
          <li>Charge them by paying a flat $X for each lead the widget generates; you pocket the spread on each lead claim.</li>
          <li>Even simpler: give it away free, get backlinks + cross-promotion in return.</li>
        </ol>
      </section>
    </div>
  );
}

function Tile({
  label, value, tone, icon: Icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon?: typeof TrendingUp;
}) {
  return (
    <div className={`stat-tile bg-gradient-to-br ${tone}`}>
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/85">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-white" />}
      </div>
      <div className="relative z-10 mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}
