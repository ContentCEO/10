import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: campaigns } = await admin.from("ao_campaigns")
    .select("id, name, channel, subject_tpl, body_tpl, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <div className="text-xs uppercase tracking-wider text-brand-300 font-semibold">Auto-Outreach</div>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold">Campaign templates</h1>
        <p className="mt-2 text-sm text-white/70">
          Reusable email + SMS templates. Use these when you want consistent messaging instead of
          per-prospect AI personalization. Variables: <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">{"{{business_name}} {{first_name}} {{city}} {{category}} {{preview_url}}"}</code>
        </p>
      </header>

      {!campaigns?.length && (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/60">
          No campaigns yet. Templates created here become selectable when sending outreach.
          (Add UI for create/edit in a follow-up — for now, insert rows directly into <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">ao_campaigns</code>.)
        </div>
      )}

      <ul className="space-y-3">
        {(campaigns ?? []).map((c) => (
          <li key={c.id} className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{c.name}</div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10">{c.channel}</span>
            </div>
            {c.subject_tpl && <div className="text-xs text-white/60 mb-1">Subject: {c.subject_tpl}</div>}
            <pre className="text-xs text-white/80 whitespace-pre-wrap">{c.body_tpl}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
