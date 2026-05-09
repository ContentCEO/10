import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateProposal } from "@/lib/ai";

const InputSchema = z.object({
  client_name: z.string().min(1),
  client_email: z.string().email().optional().nullable(),
  client_address: z.string().optional().nullable(),
  project_type: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  measurements: z.string().optional().nullable(),
  materials: z.string().optional().nullable(),
  labor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await generateProposal(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
