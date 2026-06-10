import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/messaging";

export const runtime = "nodejs";
export const maxDuration = 60;

// Runs daily at 7 AM ET (12 UTC) and Monday at 7 AM ET (12 UTC).
// Sends a digest email to contractors who opted into daily_digest or
// weekly_digest, filtered to their preferences. Vercel cron config decides
// the schedule; the route just looks at "now" to decide what window to pull.
export async function GET(request: Request) {
  // Cron auth — Vercel sends a token in the Authorization header.
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "daily";
  const since = mode === "weekly"
    ? new Date(Date.now() - 7 * 24 * 3600 * 1000)
    : new Date(Date.now() - 24 * 3600 * 1000);

  const prefField = mode === "weekly" ? "weekly_digest" : "daily_digest";

  // Get every contractor opted into this digest cadence.
  const { data: optins } = await admin
    .from("marketplace_preferences")
    .select("user_id,trades,zips,min_budget_cents,paused_until,email_enabled")
    .eq(prefField, true)
    .eq("email_enabled", true);

  if (!optins?.length) return NextResponse.json({ ok: true, sent: 0 });

  const nowIso = new Date().toISOString();
  let sent = 0;

  for (const o of optins as Array<{
    user_id: string;
    trades: string[];
    zips: string[];
    min_budget_cents: number;
    paused_until: string | null;
    email_enabled: boolean;
  }>) {
    if (o.paused_until && o.paused_until > nowIso) continue;

    // Resolve contact email from profiles.
    const { data: profile } = await admin
      .from("profiles")
      .select("email,business_name,first_name")
      .eq("id", o.user_id)
      .maybeSingle();
    const email = (profile as { email?: string } | null)?.email;
    if (!email) continue;

    // Pull matching leads. Apply preference filters in JS for clarity.
    const { data: leads } = await admin
      .from("marketplace_leads")
      .select("id,name,service_type,city,zip,budget,timeline,created_at,phone")
      .eq("status", "available")
      .gte("created_at", since.toISOString())
      .not("name", "is", null)
      .not("phone", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    const matching = (leads ?? []).filter((l) => {
      if (o.trades?.length && !o.trades.includes(String((l as { service_type?: string }).service_type ?? ""))) return false;
      if (o.zips?.length   && !o.zips.includes(String((l as { zip?: string }).zip ?? "")))                   return false;
      return true;
    });

    if (!matching.length) continue;

    const cadenceLabel = mode === "weekly" ? "this week" : "in the last 24 hours";
    const businessName = (profile as { business_name?: string; first_name?: string } | null)?.business_name
                      ?? (profile as { first_name?: string } | null)?.first_name
                      ?? "there";
    const subject = `${matching.length} new ${matching.length === 1 ? "lead" : "leads"} ${cadenceLabel}`;
    const html = renderDigestHtml(businessName, mode === "weekly", matching);
    const text = renderDigestText(businessName, mode === "weekly", matching);

    try {
      await sendEmail(email, subject, text, "Contractor Flow", html);
      sent++;
    } catch {
      // Skip and continue; messaging failures shouldn't kill the cron.
    }
  }

  return NextResponse.json({ ok: true, sent });
}

interface DigestLead {
  id: string;
  name: string | null;
  service_type: string | null;
  city: string | null;
  zip: string | null;
  budget: string | null;
  timeline: string | null;
  created_at: string;
}

function renderDigestHtml(name: string, weekly: boolean, leads: DigestLead[]): string {
  const cadence = weekly ? "this week" : "yesterday";
  const rows = leads.map((l) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:600;color:#0f172a;">${escapeHtml(l.name ?? "—")}</div>
        <div style="font-size:13px;color:#64748b;margin-top:2px;">
          ${escapeHtml(l.service_type ?? "")}${l.city ? " · " + escapeHtml(l.city) : ""}${l.zip ? " " + escapeHtml(l.zip) : ""}
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">
          ${l.budget ? "Budget: " + escapeHtml(l.budget) : ""}${l.budget && l.timeline ? " · " : ""}${l.timeline ? "Timeline: " + escapeHtml(l.timeline) : ""}
        </div>
      </td>
      <td style="padding:12px;text-align:right;border-bottom:1px solid #e5e7eb;">
        <a href="https://contractorflowstore.com/marketplace?lead=${l.id}"
           style="display:inline-block;background:#10b981;color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">View</a>
      </td>
    </tr>`).join("");

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;">
    <tr><td align="center" style="padding:24px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="padding:24px 28px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.16em;opacity:0.9;">Contractor Flow Marketplace</div>
          <div style="font-size:24px;font-weight:600;margin-top:6px;">Hey ${escapeHtml(name)} — ${leads.length} new ${leads.length === 1 ? "lead" : "leads"} ${cadence}</div>
        </td></tr>
        <tr><td style="padding:0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>
        </td></tr>
        <tr><td style="padding:20px 28px;text-align:center;background:#f8fafc;">
          <a href="https://contractorflowstore.com/marketplace" style="display:inline-block;background:#0f172a;color:#fff;padding:11px 22px;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">Open marketplace</a>
        </td></tr>
        <tr><td style="padding:18px 28px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e5e7eb;">
          <a href="https://contractorflowstore.com/marketplace/preferences" style="color:#10b981;">Update notification preferences</a>
          &nbsp;·&nbsp;
          <a href="https://contractorflowstore.com/account/billing" style="color:#94a3b8;">Manage subscription</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function renderDigestText(name: string, weekly: boolean, leads: DigestLead[]): string {
  const cadence = weekly ? "this week" : "yesterday";
  const lines = leads.map((l) =>
    `• ${l.name ?? "—"} — ${l.service_type ?? ""}${l.city ? ", " + l.city : ""}${l.zip ? " " + l.zip : ""}\n  https://contractorflowstore.com/marketplace?lead=${l.id}`
  );
  return `Hey ${name},

${leads.length} new ${leads.length === 1 ? "lead" : "leads"} ${cadence} in Contractor Flow Marketplace:

${lines.join("\n\n")}

Open marketplace: https://contractorflowstore.com/marketplace
Update preferences: https://contractorflowstore.com/marketplace/preferences

— Contractor Flow`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
