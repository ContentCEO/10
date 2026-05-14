import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Global search across leads / jobs / customers / invoices / proposals.
// GET /api/search?q=foo
//
// Matches against name, title, number, email, phone — case-insensitive.
// Returns up to 5 results per category.

interface SearchHit {
  kind: "lead" | "job" | "customer" | "invoice" | "proposal";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  meta: string | null;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const like = `%${q}%`;
  const [{ data: leads }, { data: jobs }, { data: customers }, { data: invoices }, { data: proposals }] = await Promise.all([
    supabase.from("leads")
      .select("id,name,phone,email,service_type,status,price")
      .eq("user_id", user.id)
      .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like},service_type.ilike.${like}`)
      .limit(5),
    supabase.from("jobs")
      .select("id,title,status,price,customer_id")
      .eq("user_id", user.id)
      .ilike("title", like)
      .limit(5),
    supabase.from("customers")
      .select("id,name,phone,email,address")
      .eq("user_id", user.id)
      .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like},address.ilike.${like}`)
      .limit(5),
    supabase.from("invoices")
      .select("id,number,amount_cents,status,customer_id")
      .eq("user_id", user.id)
      .ilike("number", like)
      .limit(5),
    supabase.from("proposals")
      .select("id,title,status,total_cents")
      .eq("user_id", user.id)
      .ilike("title", like)
      .limit(5),
  ]);

  const results: SearchHit[] = [
    ...((leads ?? []) as Array<{ id: string; name: string; phone: string | null; email: string | null; service_type: string | null; status: string; price: number | null }>)
      .map<SearchHit>((l) => ({
        kind: "lead",
        id: l.id,
        title: l.name,
        subtitle: l.service_type ?? l.email ?? l.phone ?? null,
        href: `/leads/${l.id}`,
        meta: `${l.status}${l.price ? ` · $${l.price.toLocaleString()}` : ""}`,
      })),
    ...((jobs ?? []) as Array<{ id: string; title: string; status: string; price: number | null }>)
      .map<SearchHit>((j) => ({
        kind: "job",
        id: j.id,
        title: j.title,
        subtitle: null,
        href: `/jobs/${j.id}`,
        meta: `${j.status}${j.price ? ` · $${j.price.toLocaleString()}` : ""}`,
      })),
    ...((customers ?? []) as Array<{ id: string; name: string; phone: string | null; email: string | null; address: string | null }>)
      .map<SearchHit>((c) => ({
        kind: "customer",
        id: c.id,
        title: c.name,
        subtitle: c.address ?? c.email ?? c.phone ?? null,
        href: `/customers/${c.id}`,
        meta: null,
      })),
    ...((invoices ?? []) as Array<{ id: string; number: string | null; amount_cents: number; status: string }>)
      .map<SearchHit>((i) => ({
        kind: "invoice",
        id: i.id,
        title: i.number ?? `Invoice ${i.id.slice(0, 8)}`,
        subtitle: null,
        href: `/invoices`,
        meta: `${i.status} · $${(i.amount_cents / 100).toFixed(0)}`,
      })),
    ...((proposals ?? []) as Array<{ id: string; title: string; status: string; total_cents: number }>)
      .map<SearchHit>((p) => ({
        kind: "proposal",
        id: p.id,
        title: p.title,
        subtitle: null,
        href: `/proposals`,
        meta: `${p.status} · $${(p.total_cents / 100).toFixed(0)}`,
      })),
  ];

  return NextResponse.json({ ok: true, q, count: results.length, results });
}
