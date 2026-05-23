import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Universal RSS/Atom feed aggregator. Reads every active feed from the
// rss_sources table, matches by keyword, inserts as scraped marketplace
// leads. Lets us add new lead-gen sources without writing code — just
// insert a row in rss_sources via Supabase Studio.

interface RssSource {
  id: string;
  name: string;
  url: string;
  keywords: string[];
  city: string | null;
  ai_score: number;
  price_cents: number;
}

interface Entry {
  id: string;
  title: string;
  text: string;
  url: string;
  date: string;
}

function match1(s: string, re: RegExp): string | null {
  const m = s.match(re);
  return m ? m[1] : null;
}
function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseFeed(xml: string): Entry[] {
  const out: Entry[] = [];
  // Atom <entry>
  const atomRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = atomRegex.exec(xml)) !== null) {
    const block = m[1];
    const id = match1(block, /<id>([^<]+)<\/id>/) ?? `${Math.random()}`;
    const title = decodeHtml(match1(block, /<title[^>]*>([\s\S]*?)<\/title>/) ?? "");
    const link = match1(block, /<link[^>]*href="([^"]+)"/) ?? match1(block, /<link>([^<]+)<\/link>/) ?? "";
    const contentRaw = match1(block, /<content[^>]*>([\s\S]*?)<\/content>/) ?? match1(block, /<summary[^>]*>([\s\S]*?)<\/summary>/) ?? "";
    const cdata = match1(contentRaw, /<!\[CDATA\[([\s\S]*?)\]\]>/);
    const text = stripHtml(decodeHtml(cdata ?? contentRaw));
    const date = match1(block, /<updated>([^<]+)<\/updated>/) ?? match1(block, /<published>([^<]+)<\/published>/) ?? "";
    if (title && link) out.push({ id, title, text, url: link, date });
  }
  // RSS 2.0 <item>
  const rssRegex = /<item>([\s\S]*?)<\/item>/g;
  while ((m = rssRegex.exec(xml)) !== null) {
    const block = m[1];
    const url = match1(block, /<link>([^<]+)<\/link>/) ?? "";
    const guid = match1(block, /<guid[^>]*>([^<]+)<\/guid>/) ?? url;
    const id = guid;
    const title = decodeHtml(match1(block, /<title>([\s\S]*?)<\/title>/) ?? "");
    const desc = decodeHtml(match1(block, /<description>([\s\S]*?)<\/description>/) ?? "");
    const date = match1(block, /<pubDate>([^<]+)<\/pubDate>/) ?? match1(block, /<dc:date>([^<]+)<\/dc:date>/) ?? "";
    if (title && url) out.push({ id, title, text: stripHtml(desc), url, date });
  }
  return out;
}

async function pullFeed(url: string): Promise<{ entries: Entry[]; error: string | null }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ContractorFlow/1.0 (rss-aggregator)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      cache: "no-store",
    });
    if (!res.ok) return { entries: [], error: `HTTP ${res.status}` };
    const text = await res.text();
    return { entries: parseFeed(text), error: null };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : "fetch failed" };
  }
}

function keywordMatch(e: Entry, keywords: string[]): string | null {
  if (keywords.length === 0) return ""; // match all when no keywords
  const haystack = `${e.title}\n${e.text}`.toLowerCase();
  for (const k of keywords) {
    if (haystack.includes(k.toLowerCase())) return k;
  }
  return null;
}

async function runOnce() {
  const admin = createAdminClient();
  const { data: sources } = await admin
    .from("rss_sources").select("*").eq("is_active", true);
  const list = (sources ?? []) as RssSource[];
  if (list.length === 0) return { ok: true, sources: 0, fetched: 0, inserted: 0, duplicates: 0 };

  let fetched = 0, inserted = 0, duplicates = 0;
  const errors: Record<string, string> = {};

  for (const src of list) {
    const { entries, error } = await pullFeed(src.url);
    if (error) errors[src.name] = error;
    fetched += entries.length;

    for (const e of entries) {
      const matched = keywordMatch(e, src.keywords);
      if (matched === null) continue;
      const externalId = `rss:${src.id}:${e.id}`;

      const { data: existing } = await admin
        .from("marketplace_leads").select("id")
        .eq("source_channel", "scraped").eq("external_id", externalId)
        .maybeSingle();
      if (existing) { duplicates++; continue; }

      const notes = `From RSS source: ${src.name}${matched ? `\nMatched keyword: ${matched}` : ""}\n\n${e.text.slice(0, 800)}\n\nOriginal: ${e.url}`;
      const { error: insertErr } = await admin.from("marketplace_leads").insert({
        name: `RSS · ${src.name}`,
        service_type: e.title.slice(0, 200),
        city: src.city,
        budget: "unsure", timeline: "flexible",
        notes,
        ai_score: src.ai_score,
        ai_summary: e.title.slice(0, 200),
        price_cents: src.price_cents,
        source_channel: "scraped",
        external_id: externalId,
        raw_payload: { id: e.id, title: e.title, url: e.url, date: e.date, source_id: src.id } as unknown as Record<string, unknown>,
      });
      if (!insertErr) inserted++;
    }
    await admin.from("rss_sources").update({
      last_run_at: new Date().toISOString(),
    }).eq("id", src.id);
  }

  await admin.from("scraper_runs").insert({
    source: "rss_universal",
    region: `${list.length} feeds`,
    fetched, inserted, duplicates,
    error: Object.keys(errors).length > 0
      ? `errors on: ${Object.entries(errors).slice(0, 5).map(([k, v]) => `${k}=${v}`).join(", ")}`
      : null,
  });

  return { ok: true, sources: list.length, fetched, inserted, duplicates, errors };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runOnce());
}
export async function POST(request: Request) { return GET(request); }
