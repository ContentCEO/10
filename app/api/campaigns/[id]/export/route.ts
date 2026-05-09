import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { creativesToCsv } from "@/lib/csv";
import type { AdCreative } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: creatives, error } = await supabase
    .from("ad_creatives")
    .select("variant_label, angle, headline, primary_text, description, hook, cta, image_prompt, video_script")
    .eq("campaign_id", params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = creativesToCsv((creatives ?? []) as AdCreative[]);
  const filename = `${campaign.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
