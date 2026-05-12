import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron-auth";
import { sendSms, sendEmail, isOutboundConfigured } from "@/lib/messaging";
import { generateText } from "@/lib/ai";

export const runtime = "nodejs";

// Cron: every 10 min, send scheduled review requests whose send_at <= now.
// Generates an AI-drafted SMS + email, sends, marks sent.

interface Profile {
  id: string;
  business_name: string | null;
  google_review_url: string | null;
  yelp_review_url: string | null;
  facebook_review_url: string | null;
}
interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}
interface ReviewRequest {
  id: string;
  user_id: string;
  customer_id: string | null;
  job_id: string | null;
  channel: "sms" | "email" | "both";
}

const SYSTEM =
`You write SHORT review-request messages for contractors. Output the message
body only — no greeting like "here is" or markdown. SMS: 2-3 sentences, under
320 chars. Email: 2-3 paragraphs. Always thank the customer warmly, reference
the work briefly, ask for a quick review on Google with the link, and sign off
with the business name. NEVER promise a discount in exchange for a review
(against Google's terms).`;

async function generateMessage(args: {
  channel: "sms" | "email";
  customerName: string;
  business: string;
  googleUrl: string | null;
  yelpUrl: string | null;
  facebookUrl: string | null;
}): Promise<string> {
  try {
    const links = [
      args.googleUrl ? `Google: ${args.googleUrl}` : null,
      args.yelpUrl ? `Yelp: ${args.yelpUrl}` : null,
      args.facebookUrl ? `Facebook: ${args.facebookUrl}` : null,
    ].filter(Boolean).join(" | ");

    return await generateText({
      system: SYSTEM,
      user:
`Channel: ${args.channel.toUpperCase()}
Customer name: ${args.customerName}
Business name: ${args.business}
Review links: ${links || "(no review URLs configured — encourage them to find the business on Google)"}`,
      maxTokens: 350,
    });
  } catch {
    // Fallback if AI fails
    const link = args.googleUrl ?? args.yelpUrl ?? args.facebookUrl ?? "";
    return `Hi ${args.customerName}, thanks for choosing ${args.business}! Would you mind leaving us a quick review? ${link ? `It really helps: ${link}` : ""} — ${args.business}`;
  }
}

async function run() {
  const admin = createAdminClient();
  const outbound = isOutboundConfigured();
  const nowIso = new Date().toISOString();

  const { data: due } = await admin
    .from("review_requests")
    .select("id,user_id,customer_id,job_id,channel")
    .eq("status", "scheduled")
    .lte("send_at", nowIso)
    .limit(50);

  const requests = (due ?? []) as ReviewRequest[];
  if (requests.length === 0) return { sent: 0, skipped: 0 };

  // Bulk-fetch users + customers
  const userIds = Array.from(new Set(requests.map((r) => r.user_id)));
  const custIds = Array.from(new Set(requests.map((r) => r.customer_id).filter(Boolean) as string[]));

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,business_name,google_review_url,yelp_review_url,facebook_review_url")
    .in("id", userIds);
  const { data: customers } = await admin
    .from("customers")
    .select("id,name,phone,email")
    .in("id", custIds);

  const profileById = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));
  const customerById = new Map(((customers ?? []) as Customer[]).map((c) => [c.id, c]));

  let sent = 0, skipped = 0, failed = 0;
  for (const r of requests) {
    const profile = r.user_id ? profileById.get(r.user_id) : undefined;
    const customer = r.customer_id ? customerById.get(r.customer_id) : undefined;
    if (!customer) {
      await admin.from("review_requests").update({ status: "cancelled" }).eq("id", r.id);
      skipped++;
      continue;
    }
    const business = profile?.business_name ?? "our team";
    const wantsSms = (r.channel === "sms" || r.channel === "both") && Boolean(outbound.sms && customer.phone);
    const wantsEmail = (r.channel === "email" || r.channel === "both") && Boolean(outbound.email && customer.email);

    if (!wantsSms && !wantsEmail) { skipped++; continue; }

    let smsOk = false, emailOk = false;
    if (wantsSms) {
      const body = await generateMessage({
        channel: "sms",
        customerName: customer.name,
        business,
        googleUrl: profile?.google_review_url ?? null,
        yelpUrl: profile?.yelp_review_url ?? null,
        facebookUrl: profile?.facebook_review_url ?? null,
      });
      const result = await sendSms(customer.phone!, body);
      smsOk = result.ok;
      await admin.from("message_log").insert({
        user_id: r.user_id, channel: "sms", to_address: customer.phone!,
        body, status: result.ok ? "sent" : "failed",
        error: result.error ?? null, sent_at: result.ok ? new Date().toISOString() : null,
      });
    }
    if (wantsEmail) {
      const body = await generateMessage({
        channel: "email",
        customerName: customer.name,
        business,
        googleUrl: profile?.google_review_url ?? null,
        yelpUrl: profile?.yelp_review_url ?? null,
        facebookUrl: profile?.facebook_review_url ?? null,
      });
      const result = await sendEmail(customer.email!, `Quick favor from ${business}`, body, business);
      emailOk = result.ok;
      await admin.from("message_log").insert({
        user_id: r.user_id, channel: "email", to_address: customer.email!,
        subject: `Quick favor from ${business}`, body,
        status: result.ok ? "sent" : "failed",
        error: result.error ?? null, sent_at: result.ok ? new Date().toISOString() : null,
      });
    }

    if (smsOk || emailOk) {
      await admin.from("review_requests").update({
        status: "sent", sent_at: new Date().toISOString(),
      }).eq("id", r.id);
      sent++;
    } else {
      await admin.from("review_requests").update({ status: "failed" }).eq("id", r.id);
      failed++;
    }
  }

  return { sent, skipped, failed, totalDue: requests.length };
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await run());
}
export async function POST(request: Request) { return GET(request); }
