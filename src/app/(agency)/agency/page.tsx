import { revalidatePath } from "next/cache";
import { Briefcase, Building2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AgencyLink {
  id: string;
  contractor_id: string;
  role: string;
  created_at: string;
}

interface ContractorRow {
  id: string;
  business_name: string | null;
  email: string | null;
  subscription_status: string | null;
}

async function linkContractor(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;

  const admin = createAdminClient();
  const { data: contractor } = await admin
    .from("profiles").select("id,account_type")
    .ilike("email", email).single();
  if (!contractor || contractor.account_type !== "contractor") return;

  await supabase.from("agency_links").upsert({
    agency_id: user.id,
    contractor_id: contractor.id,
    role: "manager",
  }, { onConflict: "agency_id,contractor_id" });
  revalidatePath("/agency");
}

async function unlinkContractor(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("agency_links").delete().eq("id", id);
  revalidatePath("/agency");
}

export default async function AgencyDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: links } = await supabase
    .from("agency_links").select("*").eq("agency_id", user.id);
  const linkList = (links ?? []) as AgencyLink[];

  const admin = createAdminClient();
  const contractorIds = linkList.map((l) => l.contractor_id);
  const [{ data: contractors }, { data: leadsAgg }, { data: marketplaceAgg }] = contractorIds.length
    ? await Promise.all([
        admin.from("profiles").select("id,business_name,email,subscription_status").in("id", contractorIds),
        admin.from("leads").select("user_id,status").in("user_id", contractorIds),
        admin.from("marketplace_leads").select("buyer_id,price_cents").in("buyer_id", contractorIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const proList = (contractors ?? []) as ContractorRow[];
  type LeadAgg = { user_id: string; status: string };
  type MarketAgg = { buyer_id: string; price_cents: number };

  const statsByContractor = new Map<string, { leads: number; won: number; marketplaceSpend: number }>();
  for (const l of (leadsAgg ?? []) as LeadAgg[]) {
    const s = statsByContractor.get(l.user_id) ?? { leads: 0, won: 0, marketplaceSpend: 0 };
    s.leads++; if (l.status === "won") s.won++;
    statsByContractor.set(l.user_id, s);
  }
  for (const m of (marketplaceAgg ?? []) as MarketAgg[]) {
    const s = statsByContractor.get(m.buyer_id) ?? { leads: 0, won: 0, marketplaceSpend: 0 };
    s.marketplaceSpend += m.price_cents;
    statsByContractor.set(m.buyer_id, s);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-brand-600" /> Your contractor clients
        </h1>
        <p className="text-sm text-slate-500">
          Manage multiple contractor accounts from one login. Add a client by
          their account email (they need to have already signed up as a contractor).
        </p>
      </header>

      <section className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">Add a client</h2>
        </div>
        <form action={linkContractor} className="grid sm:grid-cols-[1fr_auto] gap-2">
          <input name="email" type="email" required className="input"
            placeholder="contractor@example.com" />
          <button className="btn-primary">Link</button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Roster ({proList.length})</h2>
        {proList.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">
            No clients linked. Add one above.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {proList.map((p) => {
              const stats = statsByContractor.get(p.id) ?? { leads: 0, won: 0, marketplaceSpend: 0 };
              const link = linkList.find((l) => l.contractor_id === p.id);
              return (
                <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      {p.business_name ?? "Unnamed"}
                    </div>
                    <div className="text-xs text-slate-500">{p.email}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span><strong>{stats.leads}</strong> leads</span>
                    <span><strong>{stats.won}</strong> won</span>
                    <span><strong>${(stats.marketplaceSpend / 100).toFixed(0)}</strong> spend</span>
                    <span className="badge bg-slate-100 text-slate-600 ring-slate-200">
                      {p.subscription_status ?? "—"}
                    </span>
                  </div>
                  {link && (
                    <form action={unlinkContractor.bind(null, link.id)}>
                      <button className="btn-secondary !py-1 text-xs">
                        <X className="h-3 w-3" /> Unlink
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-6 bg-slate-50 border-slate-200 text-sm text-slate-700">
        <strong>Agency tier:</strong> charge each contractor client their own
        subscription. They keep ownership of their pipeline + marketplace claims.
        You see aggregate stats here. Direct CRM access requires the contractor's
        invitation (coming soon).
      </section>
    </div>
  );
}
