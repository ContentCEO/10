import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";

export const dynamic = "force-dynamic";

async function createClient_(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    throw new Error("Forbidden");
  }

  const businessName = String(formData.get("business_name") ?? "").trim();
  if (!businessName) throw new Error("Business name required");

  // Look up the user account by email if they're already signed up.
  const contactEmail = String(formData.get("contact_email") ?? "").trim().toLowerCase();
  let clientUserId = user.id; // default: created under owner (Davi)
  if (contactEmail) {
    const admin = createAdminClient();
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const match = users?.users.find((u) => u.email?.toLowerCase() === contactEmail);
    if (match) clientUserId = match.id;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("launchpad_clients").insert({
    user_id: clientUserId,
    business_name: businessName,
    contact_name: String(formData.get("contact_name") ?? "").trim() || null,
    contact_email: contactEmail || null,
    contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    state: String(formData.get("state") ?? "MA").trim() || "MA",
    tier: String(formData.get("tier") ?? "foundation"),
    stage: "intake",
    monthly_budget_cents: Math.floor(Number(formData.get("monthly_budget") ?? 0) * 100),
    notes: String(formData.get("notes") ?? "").trim() || null,
  }).select("id").single();
  if (error) throw new Error(error.message);

  redirect(`/owner/launchpad/clients/${data.id}`);
}

export default async function LaunchpadIntakePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/owner/launchpad" className="text-xs text-white/40 hover:text-white/70 inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back to Launchpad
      </Link>

      <header>
        <span className="section-eyebrow"><Rocket className="h-3.5 w-3.5" /> Owner · Launchpad</span>
        <h1 className="mt-2 display-h2">New <em>client</em></h1>
        <p className="mt-2 text-sm text-white/60">
          Onboard a contractor who&apos;s buying a Launchpad tier. Davi-only form.
        </p>
      </header>

      <form action={createClient_} className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field name="business_name"  label="Business name *" required />
          <Field name="contact_name"   label="Contact person" />
          <Field name="contact_email"  label="Contact email" type="email" hint="If they already have a CF account this email links the client to it." />
          <Field name="contact_phone"  label="Contact phone" type="tel" />
          <Field name="city"           label="City" placeholder="Concord" />
          <Field name="state"          label="State" defaultValue="MA" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-white/70 mb-1 block">Tier *</span>
            <select name="tier" required
              className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400/60 focus:outline-none">
              <option value="foundation">Foundation — $1,997 one-time</option>
              <option value="foundation_growth">Foundation + Growth — $997 setup + $997/mo</option>
              <option value="revenue_share">Revenue Share — $497 setup + $497/mo + 8%</option>
            </select>
          </label>
          <Field name="monthly_budget" label="Monthly ad budget ($)" type="number" placeholder="2000" />
        </div>

        <label className="block">
          <span className="text-xs font-medium text-white/70 mb-1 block">Notes</span>
          <textarea name="notes" rows={3}
            placeholder="Project scope, special requests, integration details…"
            className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400/60 focus:outline-none" />
        </label>

        <button type="submit"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 text-white font-semibold px-4 py-3 text-sm hover:bg-orange-400 transition">
          Create client
        </button>
      </form>
    </div>
  );
}

function Field({ name, label, type = "text", required = false, defaultValue, placeholder, hint }: {
  name: string; label: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-white/70 mb-1 block">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder}
        className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400/60 focus:outline-none" />
      {hint && <div className="text-[10px] text-white/40 mt-1">{hint}</div>}
    </label>
  );
}
