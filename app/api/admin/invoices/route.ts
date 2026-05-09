import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

const Body = z.object({
  customer_id: z.string().uuid(),
  job_id: z.string().uuid().optional().nullable(),
  due_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lines: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unit_price_cents: z.number().int().nonnegative()
      })
    )
    .min(1)
});

function nextInvoiceNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${ymd}-${rand}`;
}

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const subtotal = parsed.data.lines.reduce(
    (s, l) => s + Math.round(l.quantity * l.unit_price_cents),
    0
  );

  const supabase = createSupabaseServerClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      number: nextInvoiceNumber(),
      customer_id: parsed.data.customer_id,
      job_id: parsed.data.job_id ?? null,
      subtotal_cents: subtotal,
      tax_cents: 0,
      total_cents: subtotal,
      status: "open",
      notes: parsed.data.notes ?? null,
      due_date: parsed.data.due_date ?? null
    })
    .select()
    .single();

  if (error || !invoice) return NextResponse.json({ error: error?.message }, { status: 500 });

  const lineRows = parsed.data.lines.map((l) => ({
    invoice_id: invoice.id,
    description: l.description,
    quantity: l.quantity,
    unit_price_cents: l.unit_price_cents,
    total_cents: Math.round(l.quantity * l.unit_price_cents)
  }));
  const { error: lineErr } = await supabase.from("invoice_line_items").insert(lineRows);
  if (lineErr) return NextResponse.json({ error: lineErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, invoice });
}
