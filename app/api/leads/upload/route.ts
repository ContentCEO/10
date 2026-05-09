import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { parseLeadsCsv } from "@/lib/csv";

const Body = z.object({
  csv: z.string().min(1).max(10_000_000),
  source: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let rows;
  try {
    rows = parseLeadsCsv(body.csv);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to parse CSV";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows found. CSV must include email or phone." }, { status: 400 });
  }

  const records = rows.map((r) => ({
    workspace_id: ws.id,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    notes: r.notes,
    source: r.source ?? body.source ?? null,
    tags: r.tags,
  }));

  const { data, error } = await supabase.from("leads").insert(records).select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted: data?.length ?? 0,
    skipped: rows.length - (data?.length ?? 0),
  });
}
