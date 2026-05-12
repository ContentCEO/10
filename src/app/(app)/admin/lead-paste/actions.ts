"use server";

import { createClient } from "@/lib/supabase/server";

/*
 * Server actions for the admin Lead Paste page. Each action:
 *   1. Re-checks the caller is an admin (defense in depth — page already does).
 *   2. POSTs to the scraper endpoint with the server-side CRON_SECRET.
 *   3. Returns the endpoint's JSON result to the client form.
 *
 * Using the existing scraper endpoints means we don't duplicate the
 * dedup + categorization + insert logic that lives there.
 */

interface Result {
  ok: boolean;
  source: string;
  fetched?: number;
  inserted?: number;
  duplicates?: number;
  skipped?: number;
  error?: string;
}

async function assertAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { ok: false, error: "Not admin" };
  return { ok: true };
}

async function callScrape(path: string, body: unknown): Promise<Result> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const secret = process.env.CRON_SECRET;
  if (!baseUrl) return { ok: false, source: path, error: "NEXT_PUBLIC_APP_URL not configured" };
  if (!secret)  return { ok: false, source: path, error: "CRON_SECRET not configured" };

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json()) as Result;
    if (!res.ok) {
      return { ok: false, source: path, error: json.error ?? `HTTP ${res.status}` };
    }
    return { ...json, ok: true };
  } catch (e) {
    return { ok: false, source: path, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

export interface NextdoorRow {
  author?: string;
  neighborhood?: string;
  city?: string;
  zip?: string;
  body: string;
  url?: string;
  posted_at?: string;
}

export async function pasteNextdoor(posts: NextdoorRow[]): Promise<Result> {
  const ok = await assertAdmin();
  if (!ok.ok) return { ok: false, source: "nextdoor", error: ok.error };
  return callScrape("/api/scrape/nextdoor", { posts });
}

export interface FacebookRow {
  author?: string;
  group?: string;
  city?: string;
  zip?: string;
  body: string;
  url?: string;
  posted_at?: string;
}

export async function pasteFacebook(posts: FacebookRow[]): Promise<Result> {
  const ok = await assertAdmin();
  if (!ok.ok) return { ok: false, source: "facebook_groups", error: ok.error };
  return callScrape("/api/scrape/facebook-groups", { posts });
}

export interface LicenseRow {
  license_type: string;
  license_number?: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  city?: string;
  zip?: string;
  issued_at?: string;
  expires_at?: string;
}

export async function pasteLicenses(rows: LicenseRow[]): Promise<Result> {
  const ok = await assertAdmin();
  if (!ok.ok) return { ok: false, source: "ma_licenses", error: ok.error };
  return callScrape("/api/scrape/ma-licenses", { rows });
}

export interface DeedRow {
  county?: string;
  book?: string;
  page?: string;
  date?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  property_address?: string;
  city?: string;
  zip?: string;
  price?: string;
  property_type?: string;
}

export async function pasteDeeds(rows: DeedRow[]): Promise<Result> {
  const ok = await assertAdmin();
  if (!ok.ok) return { ok: false, source: "deeds", error: ok.error };
  return callScrape("/api/scrape/deeds", { rows });
}
