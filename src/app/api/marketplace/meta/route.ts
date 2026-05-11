import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  coerceBudget,
  coerceTimeline,
  insertMarketplaceLead,
  type LeadSourceChannel,
} from "@/lib/lead-intake";

export const runtime = "nodejs";

// Meta calls this with a verification challenge when you first subscribe a
// webhook to the leadgen event. Echo back hub.challenge after checking that
// hub.verify_token matches our META_VERIFY_TOKEN.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode      = url.searchParams.get("hub.mode");
  const token     = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected  = process.env.META_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

interface MetaLeadEntry {
  changes?: Array<{
    field?: string;
    value?: {
      leadgen_id?: string;
      page_id?: string;
      form_id?: string;
      ad_id?: string;
      adgroup_id?: string;
      created_time?: number;
    };
  }>;
}

interface MetaGraphLeadField {
  name: string;
  values: string[];
}

interface MetaGraphLead {
  id: string;
  created_time: string;
  field_data: MetaGraphLeadField[];
  ad_id?: string;
  campaign_id?: string;
  platform?: string;
}

function fieldValue(fields: MetaGraphLeadField[], names: string[]): string | null {
  for (const target of names) {
    const m = fields.find((f) => f.name.toLowerCase() === target.toLowerCase());
    if (m && m.values.length > 0) return m.values[0];
  }
  return null;
}

async function fetchLeadFromGraph(leadgenId: string): Promise<MetaGraphLead | null> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${token}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as MetaGraphLead;
  } catch {
    return null;
  }
}

// Meta lead notifications: a single POST may contain many entries, each with
// many changes. Each change.value.leadgen_id is the lead Meta wants us to
// fetch from Graph using a Page Access Token.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as { object?: string; entry?: MetaLeadEntry[] };
  if (b.object !== "page" || !Array.isArray(b.entry)) {
    return NextResponse.json({ ok: true, ignored: "not a page leadgen event" });
  }

  const admin = createAdminClient();
  const results: { id: string | null; deduped?: boolean; error?: string }[] = [];

  for (const entry of b.entry) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;

      const lead = await fetchLeadFromGraph(leadgenId);
      if (!lead) {
        // No access token configured (or fetch failed). Still record a stub
        // with raw_payload so the admin can chase the lead manually.
        const stub = await insertMarketplaceLead(admin, {
          name: "Meta lead (fetch failed)",
          phone: null,
          email: null,
          city:  null,
          zip:   null,
          service_type: "(set META_PAGE_ACCESS_TOKEN to enrich)",
          budget: coerceBudget(undefined),
          timeline: coerceTimeline(undefined),
          notes: `Meta leadgen_id: ${leadgenId}`,
          source_channel: "meta_facebook",
          external_id: leadgenId,
          raw_payload: change.value as Record<string, unknown>,
        });
        results.push(
          stub.ok
            ? { id: stub.id, deduped: stub.deduped }
            : { id: null, error: stub.error },
        );
        continue;
      }

      const fields = lead.field_data ?? [];
      const composed =
        [fieldValue(fields, ["first_name"]), fieldValue(fields, ["last_name"])]
          .filter(Boolean).join(" ").trim();
      const name =
        fieldValue(fields, ["full_name", "name"]) ||
        composed ||
        "Meta lead";
      const platform: LeadSourceChannel =
        lead.platform === "ig" || lead.platform === "instagram"
          ? "meta_instagram"
          : "meta_facebook";

      const result = await insertMarketplaceLead(admin, {
        name,
        phone: fieldValue(fields, ["phone_number", "phone"]),
        email: fieldValue(fields, ["email"]),
        city:  fieldValue(fields, ["city"]),
        zip:   fieldValue(fields, ["zip_code", "postal_code", "zip"]),
        service_type: fieldValue(fields, ["service", "what_service_do_you_need", "project"]) ??
          "(not specified — add to your Meta lead form)",
        budget:   coerceBudget(fieldValue(fields, ["budget"])),
        timeline: coerceTimeline(fieldValue(fields, ["timeline", "when"])),
        notes: fieldValue(fields, ["details", "comments", "additional_details", "message"]),
        source_channel: platform,
        external_id: leadgenId,
        raw_payload: lead as unknown as Record<string, unknown>,
      });
      results.push(
        result.ok
          ? { id: result.id, deduped: result.deduped }
          : { id: null, error: result.error },
      );
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
