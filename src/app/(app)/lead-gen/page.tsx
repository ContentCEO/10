import Link from "next/link";
import { Globe, Megaphone, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Lead } from "@/lib/types";
import { CaptureToolbox } from "./CaptureToolbox";

export const dynamic = "force-dynamic";

export default async function LeadGenPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const captureUrl = `${baseUrl}/l/${user.id}`;

  const [{ data: webLeads }, { count: webTotal }, { count: webWon }] = await Promise.all([
    supabase.from("leads").select("*")
      .eq("source", "Website form")
      .order("created_at", { ascending: false }).limit(10),
    supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("source", "Website form"),
    supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("source", "Website form").eq("status", "won"),
  ]);

  const leads = (webLeads ?? []) as Lead[];
  const conversion = webTotal && webTotal > 0
    ? Math.round(((webWon ?? 0) / webTotal) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold">Lead generation</h1>
        <p className="text-sm text-slate-500">
          Drive leads into your pipeline — share your capture form, embed it on your site,
          or send the link in DMs.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        <StatTile label="Form submissions" value={String(webTotal ?? 0)} icon={Globe} />
        <StatTile label="Converted to won" value={String(webWon ?? 0)} icon={Megaphone} />
        <StatTile label="Conversion rate" value={`${conversion}%`} icon={Share2} />
      </section>

      <CaptureToolbox captureUrl={captureUrl} />

      <section>
        <h2 className="font-semibold mb-3">Recent form submissions</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Service</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length ? leads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${l.id}`} className="font-medium text-brand-700">
                      {l.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">{l.service_type ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                    {l.email ?? l.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(l.created_at)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No submissions yet. Share your form link to get your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold mb-2">More ways to drive leads</h2>
        <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-600">
          <li>📣 Run Google or Meta ads pointing to your capture URL.</li>
          <li>🏷️ Add the embed snippet to your website footer or contact page.</li>
          <li>🚪 Print the QR code on door hangers / business cards.</li>
          <li>📱 Drop the link in your Instagram bio + TikTok bio.</li>
          <li>👥 Send the link in DMs when someone asks about your services.</li>
          <li>📝 Every form submission lands as a `Website form` lead — track ROI on the Dashboard.</li>
        </ul>
      </section>
    </div>
  );
}

function StatTile({ label, value, icon: Icon }: {
  label: string; value: string; icon: typeof Globe;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
