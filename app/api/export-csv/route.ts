import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCSV } from "@/lib/csv";
import type { ContentItem } from "@/lib/types";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("user_id", user.id)
    .order("scheduled_for", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCSV((data ?? []) as ContentItem[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="localcontent-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
