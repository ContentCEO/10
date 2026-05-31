import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Mail, Phone, Rocket, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";

export const dynamic = "force-dynamic";

const STAGES = ["intake", "design", "build", "review", "live", "paused", "churned"] as const;

interface Client {
  id: string;
  user_id: string;
  business_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  state: string | null;
  tier: string | null;
  stage: string;
  website_url: string | null;
  preview_url: string | null;
  google_ads_customer_id: string | null;
  meta_ad_account_id: string | null;
  monthly_budget_cents: number;
  notes: string | null;
  started_at: string;
  went_live_at: string | null;
}

async function updateClient(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) throw new Error("Forbidden");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    stage: String(formData.get("stage") ?? "intake"),
    website_url: String(formData.get("website_url") ?? "").trim() || null,
    preview_url: String(formData.get("preview_url") ?? "").trim() || null,
    google_ads_customer_id: String(formData.get("google_ads_customer_id") ?? "").trim() || null,
    meta_ad_account_id: String(formData.get("meta_ad_account_id") ?? "").trim() || null,
    monthly_budget_cents: Math.floor(Number(formData.get("monthly_budget") ?? 0) * 100),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
  if (patch.stage === "live") {
    patch.went_live_at = new Date().toISOString();
  }
  const { error } = await admin.from("launchpad_clients").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  redirect(`/owner/launchpad/clients/${id}?saved=1`);
}

async function deleteClient(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) throw new Error("Forbidden");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const admin = createAdminClient();
  await admin.from("launchpad_clients").delete().eq("id", id);
  redirect("/owner/launchpad");
}

export default async function LaunchpadClientPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("launchpad_clients")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!client) notFound();
  const c = client as Client;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/owner/launchpad" className="text-xs text-white/40 hover:text-white/70 inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back to clients
      </Link>

      <header>
        <span className="section-eyebrow"><Rocket className="h-3.5 w-3.5" /> Owner · Launchpad</span>
        <h1 className="mt-2 display-h2">{c.business_name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/60">
          {c.contact_name && <span>{c.contact_name}</span>}
          {c.contact_email && (
            <a href={`mailto:${c.contact_email}`} className="inline-flex items-center gap-1 text-orange-300 hover:underline">
              <Mail className="h-3 w-3" /> {c.contact_email}
            </a>
          )}
          {c.contact_phone && (
            <a href={`tel:${c.contact_phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1 text-orange-300 hover:underline">
              <Phone className="h-3 w-3" /> {c.contact_phone}
            </a>
          )}
          <span>· {c.city ?? "—"}{c.state ? `, ${c.state}` : ""}</span>
          <span>· tier <strong className="text-white">{c.tier ?? "—"}</strong></span>
        </div>
      </header>

      {searchParams.saved && (
        <div className="card p-3 bg-emerald-500/10 ring-1 ring-emerald-400/30 text-emerald-100 text-sm">
          Saved.
        </div>
      )}

      <form action={updateClient} className="card p-5 space-y-4">
        <input type="hidden" name="id" value={c.id} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-white/70 mb-1 block">Stage</span>
            <select name="stage" defaultValue={c.stage}
              className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400/60 focus:outline-none">
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <Field name="monthly_budget" label="Monthly ad budget ($)" type="number" defaultValue={String(c.monthly_budget_cents / 100)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field name="preview_url"  label="Preview URL"  type="url" defaultValue={c.preview_url ?? ""} placeholder="contractorflowstore.com/preview/their-slug" />
          <Field name="website_url"  label="Live website" type="url" defaultValue={c.website_url ?? ""} placeholder="https://…" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field name="google_ads_customer_id" label="Google Ads customer ID" defaultValue={c.google_ads_customer_id ?? ""} placeholder="123-456-7890" />
          <Field name="meta_ad_account_id"      label="Meta ad account ID"    defaultValue={c.meta_ad_account_id ?? ""}    placeholder="act_…" />
        </div>

        <label className="block">
          <span className="text-xs font-medium text-white/70 mb-1 block">Notes</span>
          <textarea name="notes" rows={5} defaultValue={c.notes ?? ""}
            className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400/60 focus:outline-none" />
        </label>

        <div className="flex items-center justify-between gap-3">
          <button type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 text-white font-semibold px-4 py-2.5 text-sm hover:bg-orange-400 transition">
            Save changes
          </button>
          {c.preview_url && (
            <Link href={c.preview_url} target="_blank" rel="noreferrer" className="text-xs text-orange-300 hover:underline inline-flex items-center gap-1">
              Open preview <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </form>

      <form action={deleteClient} className="card p-4 ring-1 ring-rose-400/20 bg-rose-500/[0.04]">
        <input type="hidden" name="id" value={c.id} />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-white/60">
            Remove this client from the dashboard. Their <code className="text-white/80">cf-launchpad</code> subscription is unaffected.
          </div>
          <button type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 ring-1 ring-rose-400/40 text-rose-200 hover:bg-rose-500/30 px-3 py-1.5 text-xs font-semibold">
            <Trash2 className="h-3.5 w-3.5" /> Delete client
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ name, label, type = "text", defaultValue, placeholder }: { name: string; label: string; type?: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-white/70 mb-1 block">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder}
        className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400/60 focus:outline-none" />
    </label>
  );
}
