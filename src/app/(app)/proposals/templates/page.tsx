import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TemplatesGrid } from "./TemplatesGrid";

export const dynamic = "force-dynamic";

interface Template {
  id: string;
  name: string;
  service_type: string | null;
  tiers: { name: string; price_cents: number }[];
  updated_at: string;
}

export default async function ProposalTemplatesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("proposal_templates")
    .select("id,name,service_type,tiers,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const templates = (data ?? []) as Template[];

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="section-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Sales · Proposal Templates</span>
            <h1 className="mt-2 display-h2"><span className="gradient-text">Save a proposal once, send it 100 times</span></h1>
            <p className="mt-2 text-sm text-ink-600 max-w-2xl">
              Reusable templates with your intro, terms, and pricing tiers locked in.
              Start any new proposal from a template — fill in the customer specifics and send in 2 minutes.
            </p>
          </div>
          <Link href="/proposals/new" className="btn-primary shrink-0">
            <Plus className="h-4 w-4" /> New proposal
          </Link>
        </div>
      </header>

      <TemplatesGrid initial={templates} />
    </div>
  );
}
