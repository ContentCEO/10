import { NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { chatComplete, chatCompleteJson } from "@/lib/ai/provider";
import { buildSystemPrompt, buildQualifierPrompt } from "@/lib/ai/prompts";
import { corsPreflight, corsResponse } from "@/lib/cors";
import type { AIEmployee } from "@/lib/types";

export const runtime = "nodejs";

const Body = z.object({
  slug: z.string().min(1),
  visitorToken: z.string().min(8),
  message: z.string().min(1).max(4000),
  sourceUrl: z.string().url().optional(),
});

type QualifierResult = {
  is_lead: boolean;
  lead: {
    name: string | null;
    phone: string | null;
    email: string | null;
    service: string | null;
    address: string | null;
    timeline: string | null;
    notes: string | null;
  };
  qualification: {
    score: number;
    reason: string;
    suggested_next_step: string;
  };
};

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return corsResponse({ error: "Invalid request" }, { status: 400 }, origin);
  }

  const supa = createServiceClient();

  // 1) Load published employee by slug.
  const { data: empData } = await supa
    .from("ai_employees")
    .select("*")
    .eq("public_slug", parsed.slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!empData) {
    return corsResponse(
      { error: "AI employee not found or not published" },
      { status: 404 },
      origin,
    );
  }
  const emp = empData as AIEmployee;

  // 2) Find or create the conversation for this visitor.
  const { data: existingConv } = await supa
    .from("conversations")
    .select("id")
    .eq("ai_employee_id", emp.id)
    .eq("visitor_token", parsed.visitorToken)
    .maybeSingle();

  let conversationId: string;
  if (existingConv) {
    conversationId = existingConv.id;
    await supa
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
  } else {
    const { data: created, error } = await supa
      .from("conversations")
      .insert({
        ai_employee_id: emp.id,
        visitor_token: parsed.visitorToken,
        channel: "web",
        source_url: parsed.sourceUrl || null,
      })
      .select("id")
      .single();
    if (error || !created) {
      return corsResponse(
        { error: "Failed to create conversation" },
        { status: 500 },
        origin,
      );
    }
    conversationId = created.id;
  }

  // 3) Persist the user's incoming message.
  await supa.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: parsed.message,
  });

  // 4) Reload full transcript for the model.
  const { data: history } = await supa
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const transcript =
    history
      ?.filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })) ?? [];

  // 5) Generate assistant reply.
  let assistantText: string;
  try {
    assistantText = await chatComplete({
      system: buildSystemPrompt(emp),
      messages: transcript,
    });
  } catch (e) {
    return corsResponse(
      {
        error: "AI provider error",
        detail: e instanceof Error ? e.message : "unknown",
      },
      { status: 502 },
      origin,
    );
  }

  if (!assistantText) {
    assistantText =
      "Sorry — I had trouble responding. Could you tell me your name and the best phone number to reach you, and I'll have someone follow up?";
  }

  await supa.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: assistantText,
  });

  // 6) Best-effort: run qualifier and upsert a lead if this looks like one.
  // This is awaited (so we return one round-trip with everything) but is
  // tolerant of failures.
  try {
    const fullTranscript = [
      ...transcript,
      { role: "assistant" as const, content: assistantText },
    ];
    const qualifier = await chatCompleteJson<QualifierResult>({
      system: buildQualifierPrompt(emp),
      messages: [
        {
          role: "user",
          content: `TRANSCRIPT:\n${fullTranscript
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n\n")}`,
        },
      ],
      temperature: 0,
      maxTokens: 500,
    });

    if (qualifier?.is_lead) {
      const { lead, qualification } = qualifier;
      const { data: existingLead } = await supa
        .from("leads")
        .select("id")
        .eq("conversation_id", conversationId)
        .maybeSingle();

      const payload = {
        ai_employee_id: emp.id,
        conversation_id: conversationId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        service: lead.service,
        address: lead.address,
        timeline: lead.timeline,
        notes: lead.notes,
        qualification,
      };

      if (existingLead) {
        await supa.from("leads").update(payload).eq("id", existingLead.id);
      } else {
        await supa.from("leads").insert(payload);
      }
    }
  } catch {
    // Lead extraction failures should not block the chat.
  }

  return corsResponse(
    {
      conversationId,
      reply: assistantText,
    },
    { status: 200 },
    origin,
  );
}
