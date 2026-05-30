import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

interface Lead {
  id: string;
  name: string;
  service_type: string;
  city: string | null;
  zip: string | null;
  source_channel: string;
  ai_score: number;
  price_cents: number;
  status: string;
  created_at: string;
}

export default async function AdminMarketplacePage({
  searchParams,
}: {
  searchParams: { status?: string; source?: string; q?: string };
}) {
  await requireModule("cf-marketplace");
  const admin = createAdminClient();
  let query = admin.from("marketplace_leads").select("*")
    .order("created_at", { ascending: false }).limit(200);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.source) query = query.eq("source_channel", searchParams.source);
  if (searchParams.q) {
    const q = searchParams.q;
    query = query.or(`name.ilike.%${q}%,service_type.ilike.%${q}%,city.ilike.%${q}%`);
  }
  const { data } = await query;
  const leads = (data ?? []) as Lead[];

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin" className="text-sm text-slate-500">← Overview</Link>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-brand-600" /> Marketplace leads ({leads.length})
        </h1>
      </header>

      <form className="card p-4 grid sm:grid-cols-[1fr_140px_140px_auto] gap-2" action="/admin/marketplace">
        <input name="q" defaultValue={searchParams.q ?? ""} className="input"
          placeholder="Search name / service / city" />
        <select name="status" className="input" defaultValue={searchParams.status ?? ""}>
          <option value="">All status</option>
          <option value="available">Available</option>
          <option value="sold">Sold</option>
          <option value="expired">Expired</option>
        </select>
        <select name="source" className="input" defaultValue={searchParams.source ?? ""}>
          <option value="">All sources</option>
          <option value="google_ads">Google Ads</option>
          <option value="meta_facebook">Meta Facebook</option>
          <option value="meta_instagram">Meta Instagram</option>
          <option value="marketplace_form">Marketplace form</option>
          <option value="website_form">Website form</option>
          <option value="webhook">Webhook</option>
          <option value="scraped">Scraped</option>
          <option value="manual">Manual</option>
        </select>
        <button className="btn-primary">Filter</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <div className="font-medium truncate max-w-sm">{l.service_type}</div>
                  <div className="text-xs text-slate-500 truncate max-w-sm">
                    {l.name} · {[l.city, l.zip].filter(Boolean).join(" · ") || "—"}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs">{l.source_channel}</td>
                <td className="px-4 py-2.5 text-xs">{l.ai_score}/100</td>
                <td className="px-4 py-2.5 text-xs">${(l.price_cents / 100).toFixed(0)}</td>
                <td className="px-4 py-2.5 text-xs">{l.status}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{formatDate(l.created_at)}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No matches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
