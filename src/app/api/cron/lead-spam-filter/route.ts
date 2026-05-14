import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Heuristic spam filter for marketplace_leads. Once an hour, scan
// recent leads for obvious spam signals and either mark status='spam'
// or apply a low ai_score. Pure pattern matching — no AI cost.
//
// Signals:
//   - Phone is a clearly invalid pattern (0000000000, 1234567890)
//   - Email is a known disposable-mail domain
//   - Notes contain "test" / "asdf" / very short / repeated chars
//   - Same exact name+phone+email created 3+ times in 24h

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","10minutemail.com","guerrillamail.com","tempmail.com",
  "yopmail.com","throwaway.email","fakeinbox.com","trashmail.com",
  "sharklasers.com","getairmail.com","dispostable.com","mailnesia.com",
]);

interface MktLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  ai_score: number | null;
  status: string;
  created_at: string;
}

function isObviouslyInvalidPhone(p: string): boolean {
  const digits = p.replace(/\D/g, "");
  if (digits.length < 7) return true;
  if (/^(\d)\1+$/.test(digits)) return true;          // 0000000, 9999999
  if (digits === "1234567890") return true;
  if (digits === "0123456789") return true;
  return false;
}

function isDisposableEmail(e: string): boolean {
  const domain = e.toLowerCase().split("@")[1] ?? "";
  return DISPOSABLE_DOMAINS.has(domain);
}

function looksLikeJunkText(s: string): boolean {
  const t = s.trim().toLowerCase();
  if (t.length < 5) return true;
  if (/^(asdf|qwer|test|hello)+$/i.test(t)) return true;
  if (/(.)\1{6,}/.test(t)) return true; // aaaaaaa
  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();

  const { data: rows } = await admin
    .from("marketplace_leads")
    .select("id,name,phone,email,notes,ai_score,status,created_at")
    .gte("created_at", oneDayAgo)
    .neq("status", "spam")
    .limit(500);

  const leads = (rows ?? []) as MktLead[];

  // Detect dupes (same name+phone+email) within the batch.
  const dupeKey = (l: MktLead) =>
    `${l.name.toLowerCase().trim()}|${l.phone ?? ""}|${l.email?.toLowerCase().trim() ?? ""}`;
  const dupeCounts = new Map<string, number>();
  for (const l of leads) {
    dupeCounts.set(dupeKey(l), (dupeCounts.get(dupeKey(l)) ?? 0) + 1);
  }

  let flagged = 0;
  let downscored = 0;

  for (const l of leads) {
    let isSpam = false;
    const reasons: string[] = [];

    if (l.phone && isObviouslyInvalidPhone(l.phone)) { isSpam = true; reasons.push("fake_phone"); }
    if (l.email && isDisposableEmail(l.email))       { isSpam = true; reasons.push("disposable_email"); }
    if (l.notes && looksLikeJunkText(l.notes))       { isSpam = true; reasons.push("junk_text"); }
    if (looksLikeJunkText(l.name))                   { isSpam = true; reasons.push("junk_name"); }
    if ((dupeCounts.get(dupeKey(l)) ?? 0) >= 3)      { isSpam = true; reasons.push("dup_3plus_24h"); }

    if (isSpam) {
      await admin.from("marketplace_leads").update({
        status: "spam",
        ai_summary: `Auto-flagged spam: ${reasons.join(", ")}`,
        ai_score: 0,
      }).eq("id", l.id);
      flagged++;
    } else if ((l.ai_score ?? 50) > 30 && (!l.phone && !l.email)) {
      // No phone AND no email = very low-quality signal; downscore.
      await admin.from("marketplace_leads").update({ ai_score: 25 }).eq("id", l.id);
      downscored++;
    }
  }

  return NextResponse.json({ ok: true, scanned: leads.length, flagged, downscored });
}

export async function POST(request: Request) { return GET(request); }
