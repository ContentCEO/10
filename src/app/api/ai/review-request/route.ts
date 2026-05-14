import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";
import type { Customer, Job, Profile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const [{ data: job }, { data: profile }] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", jobId).single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const j = job as Job;
  const p = profile as Profile & { google_review_url?: string | null };

  let customerName = "there";
  if (j.customer_id) {
    const { data: c } = await supabase
      .from("customers").select("*").eq("id", j.customer_id).single();
    if (c) customerName = ((c as Customer).name || "there").split(" ")[0];
  }

  const business = p?.business_name || "our team";
  const reviewUrl = p?.google_review_url || "(insert your Google review link here)";

  const system =
    "You write short, friendly SMS messages from a contractor asking a recently-served " +
    "customer to leave a Google review. Output the message body only, no greetings like " +
    "'Sure, here is...' and no markdown. 2-4 short sentences. Warm but not pushy. " +
    "Include the review link at the end on its own line.";

  const userPrompt = `Customer first name: ${customerName}
Service completed: ${j.title}
Business name: ${business}
Review link: ${reviewUrl}

Write the SMS.`;

  try {
    const text = await generateText({ system, user: userPrompt, maxTokens: 350 });
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { error } = await supabase
    .from("jobs")
    .update({ review_requested_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
