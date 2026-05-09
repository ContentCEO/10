import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateJson } from "@/lib/ai/anthropic";
import {
  SALES_ANALYST_SYSTEM,
  buildAnalysisPrompt,
} from "@/lib/ai/prompts";
import type { CallAnalysis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  transcript: z.string().min(40, "Transcript looks too short"),
  title: z.string().max(200).optional(),
  prospect_name: z.string().max(120).optional(),
  job_type: z.string().max(120).optional(),
  trade: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let analysis: CallAnalysis;
  try {
    analysis = await generateJson<CallAnalysis>({
      system: SALES_ANALYST_SYSTEM,
      prompt: buildAnalysisPrompt(parsed.transcript, {
        trade: parsed.trade,
        jobType: parsed.job_type,
        prospectName: parsed.prospect_name,
      }),
      maxTokens: 2400,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data, error } = await supabase
    .from("calls")
    .insert({
      user_id: user.id,
      title: parsed.title ?? defaultTitle(parsed.prospect_name),
      prospect_name: parsed.prospect_name ?? null,
      job_type: parsed.job_type ?? null,
      transcript: parsed.transcript,
      score: clamp(analysis.score, 1, 100),
      close_probability: clamp(analysis.close_probability, 0, 100),
      summary: analysis.summary,
      strengths: analysis.strengths ?? [],
      missed_opportunities: analysis.missed_opportunities ?? [],
      objections: analysis.objections ?? [],
      followup_email: analysis.followup_email ?? null,
      followup_sms: analysis.followup_sms ?? null,
      next_steps: analysis.next_steps ?? [],
      raw_response: analysis,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

function clamp(n: number, lo: number, hi: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function defaultTitle(prospect?: string | null) {
  const date = new Date().toLocaleDateString();
  return prospect ? `${prospect} — ${date}` : `Sales call — ${date}`;
}
