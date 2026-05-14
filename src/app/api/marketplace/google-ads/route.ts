import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  insertMarketplaceLead,
  coerceBudget,
  coerceTimeline,
} from "@/lib/lead-intake";

export const runtime = "nodejs";

// Google Ads Lead Form Asset payload shape:
// https://support.google.com/google-ads/answer/9460796
//
// {
//   "lead_id": "TYPE2_...",
//   "api_version": "1.0",
//   "form_id": "12345678901",
//   "campaign_id": "...",
//   "gcl_id": "...",
//   "google_key": "secret-set-in-google-ads-ui",
//   "is_test": false,
//   "user_column_data": [
//     { "column_id": "FULL_NAME",    "column_name": "Full Name",    "string_value": "John Doe" },
//     { "column_id": "EMAIL",        "column_name": "Email",        "string_value": "john@x.com" },
//     { "column_id": "PHONE_NUMBER", "column_name": "Phone Number", "string_value": "+15551234" },
//     { "column_id": "POSTAL_CODE",  "column_name": "ZIP",          "string_value": "01720" },
//     ...
//   ]
// }

interface GoogleAdsColumn {
  column_id?: string;
  column_name?: string;
  string_value?: string;
}

function extract(cols: GoogleAdsColumn[] | undefined, ids: string[]): string | null {
  if (!cols) return null;
  for (const id of ids) {
    const found = cols.find(
      (c) =>
        c.column_id?.toUpperCase() === id ||
        c.column_name?.toUpperCase().replace(/\s+/g, "_") === id,
    );
    if (found?.string_value) return found.string_value.trim();
  }
  return null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  // Google sends the validation key in the payload itself.
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "WEBHOOK_SECRET not configured" }, { status: 500 });
  }
  if (b.google_key !== expected) {
    return NextResponse.json({ error: "Invalid google_key" }, { status: 401 });
  }

  // Ignore Google's test pings — they fire when you click "Send test data".
  // Keep the ack as 200 so Google flags the connection healthy.
  if (b.is_test === true) {
    return NextResponse.json({ ok: true, ignored: "test_payload" });
  }

  const cols = b.user_column_data as GoogleAdsColumn[] | undefined;

  const name =
    extract(cols, ["FULL_NAME", "NAME"]) ??
    [extract(cols, ["FIRST_NAME"]), extract(cols, ["LAST_NAME"])].filter(Boolean).join(" ").trim();
  const phone = extract(cols, ["PHONE_NUMBER", "PHONE"]);
  const email = extract(cols, ["EMAIL", "EMAIL_ADDRESS"]);
  const zip   = extract(cols, ["POSTAL_CODE", "ZIP", "ZIP_CODE"]);
  const city  = extract(cols, ["CITY"]);
  const service_type =
    extract(cols, ["WHAT_SERVICE_DO_YOU_NEED", "SERVICE", "JOB_TYPE", "PROJECT", "WHAT_PROJECT"]) ??
    "(not specified — set this in your Google Ads lead form)";
  const notes = extract(cols, ["ADDITIONAL_DETAILS", "DETAILS", "MESSAGE", "COMMENTS"]);

  if (!name) {
    return NextResponse.json({ error: "name missing in user_column_data" }, { status: 400 });
  }

  const externalId = typeof b.lead_id === "string" ? b.lead_id : null;

  const admin = createAdminClient();
  const result = await insertMarketplaceLead(admin, {
    name,
    phone: phone || null,
    email: email || null,
    city:  city  || null,
    zip:   zip   || null,
    service_type,
    budget:   coerceBudget(extract(cols, ["BUDGET"])),
    timeline: coerceTimeline(extract(cols, ["TIMELINE", "WHEN"])),
    notes: notes || null,
    source_channel: "google_ads",
    external_id: externalId,
    raw_payload: b,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: result.id, deduped: result.deduped });
}
