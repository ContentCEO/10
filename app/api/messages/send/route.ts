import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/resend";
import type { Lead } from "@/lib/types";

const Body = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(["sms", "email"]),
  subject: z.string().max(300).optional(),
  body: z.string().min(1).max(10_000),
  campaignId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", body.leadId)
    .eq("workspace_id", ws.id)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const l = lead as Lead;

  let providerId = "";
  let state: "sent" | "failed" = "sent";
  let errorMsg: string | null = null;

  try {
    if (body.channel === "sms") {
      if (!l.phone) throw new Error("Lead has no phone");
      const r = await sendSms(l.phone, body.body);
      providerId = r.id;
    } else {
      if (!l.email) throw new Error("Lead has no email");
      const r = await sendEmail({
        to: l.email,
        subject: body.subject || "Quick question",
        body: body.body,
      });
      providerId = r.id;
    }
  } catch (e) {
    state = "failed";
    errorMsg = e instanceof Error ? e.message : "Send failed";
  }

  const { data: msg, error: insertErr } = await supabase
    .from("messages")
    .insert({
      workspace_id: ws.id,
      lead_id: l.id,
      campaign_id: body.campaignId ?? null,
      channel: body.channel,
      direction: "outbound",
      state,
      subject: body.channel === "email" ? body.subject ?? null : null,
      body: body.body,
      provider_id: providerId || null,
      error: errorMsg,
      sent_at: state === "sent" ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  if (state === "sent") {
    await supabase
      .from("leads")
      .update({ status: l.status === "not_contacted" ? "sent" : l.status, last_contacted_at: new Date().toISOString() })
      .eq("id", l.id)
      .eq("workspace_id", ws.id);
  }

  if (state === "failed") {
    return NextResponse.json({ error: errorMsg, message: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: msg });
}
