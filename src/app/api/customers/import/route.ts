import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Bulk customer import from CSV. Accepts text/csv or JSON {rows}.
//
// Recognized headers (case-insensitive, any order):
//   name (required) · phone · email · address · city · state · zip · notes
//
// Skips rows without a name. Dedupes by case-insensitive email match
// within the contractor's existing customers.

interface Row {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
}

// RFC 4180-ish parser. Handles quoted fields and embedded commas/newlines.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { row.push(field); field = ""; i++; continue; }
    if (ch === "\n" || ch === "\r") {
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      if (ch === "\r" && text[i + 1] === "\n") i++;
      i++; continue;
    }
    field += ch; i++;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvToRows(text: string): Row[] {
  const grid = parseCsv(text);
  if (grid.length === 0) return [];
  const headers = grid[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const get = (cols: string[], col: number) => col >= 0 && col < cols.length ? cols[col].trim() : "";
  return grid.slice(1).map((cols) => ({
    name:    get(cols, idx("name")),
    phone:   get(cols, idx("phone")),
    email:   get(cols, idx("email")),
    address: get(cols, idx("address")),
    city:    get(cols, idx("city")),
    state:   get(cols, idx("state")),
    zip:     get(cols, idx("zip")),
    notes:   get(cols, idx("notes")),
  })).filter((r) => r.name);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ct = request.headers.get("content-type") ?? "";
  let rows: Row[] = [];
  if (ct.includes("application/json")) {
    const body = await request.json().catch(() => null) as { rows?: Row[] } | null;
    rows = body?.rows ?? [];
  } else {
    const text = await request.text();
    rows = csvToRows(text);
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows parsed" }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "Max 500 rows per import" }, { status: 400 });
  }

  // Existing emails for dedup
  const { data: existing } = await supabase.from("customers")
    .select("email").eq("user_id", user.id).not("email", "is", null);
  const existingEmails = new Set(
    ((existing ?? []) as { email: string | null }[])
      .map((r) => r.email?.toLowerCase().trim())
      .filter(Boolean) as string[],
  );

  let inserted = 0;
  let dupes = 0;
  let failed = 0;
  const seenInBatch = new Set<string>();

  for (const r of rows) {
    if (!r.name) { failed++; continue; }
    const emailKey = r.email?.toLowerCase().trim();
    if (emailKey) {
      if (existingEmails.has(emailKey) || seenInBatch.has(emailKey)) {
        dupes++;
        continue;
      }
      seenInBatch.add(emailKey);
    }
    const { error } = await supabase.from("customers").insert({
      user_id: user.id,
      name: r.name.slice(0, 200),
      phone: r.phone?.slice(0, 40) || null,
      email: r.email?.slice(0, 200) || null,
      address: [r.address, r.city, r.state, r.zip].filter(Boolean).join(", ").slice(0, 400) || null,
      notes: r.notes?.slice(0, 2000) || null,
    });
    if (error) failed++;
    else inserted++;
  }

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    inserted,
    duplicates: dupes,
    failed,
  });
}
