import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";
export const maxDuration = 30;

/*
 * Owner-only diagnostic: fires a real BatchData skip-trace request
 * against a known MA address and reports exactly what happens — env
 * var presence, HTTP status, response shape, and whether we got a
 * usable phone back.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ ok: false, stage: "auth", error: "Forbidden" }, { status: 403 });
  }

  const key = process.env.BATCHDATA_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      stage: "env",
      error: "BATCHDATA_API_KEY is not set on this deployment. Add it in Vercel → Settings → Environment Variables, then redeploy.",
    });
  }

  // Allow custom test address via query string; default to a real
  // Cambridge address (Harvard Square / Boston-area public location).
  const url = new URL(request.url);
  const street = url.searchParams.get("street") ?? "1 City Hall Square";
  const city   = url.searchParams.get("city")   ?? "Boston";
  const state  = url.searchParams.get("state")  ?? "MA";
  const zip    = url.searchParams.get("zip")    ?? "02201";
  const first  = url.searchParams.get("first")  ?? "";
  const last   = url.searchParams.get("last")   ?? "";

  const body = {
    requests: [{
      propertyAddress: { street, city, state, zip },
      ...(first || last ? { name: { first, last } } : {}),
    }],
  };

  const started = Date.now();
  let httpStatus = 0;
  let rawText = "";
  let json: unknown = null;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch("https://api.batchdata.com/api/v1/property/skip-trace", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    httpStatus = res.status;
    rawText = await res.text();
    try { json = JSON.parse(rawText); } catch { /* not json */ }

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        stage: "http",
        http_status: httpStatus,
        latency_ms: Date.now() - started,
        error: httpStatus === 401 ? "API key rejected (401 Unauthorized). Re-check the key in Vercel."
             : httpStatus === 403 ? "Forbidden (403). Account may need plan upgrade or skip-trace not enabled."
             : httpStatus === 429 ? "Rate-limited (429). Slow down or upgrade plan."
             : `HTTP ${httpStatus}`,
        body_preview: rawText.slice(0, 800),
      });
    }
  } catch (e) {
    return NextResponse.json({
      ok: false,
      stage: "fetch",
      error: (e as Error).message,
      latency_ms: Date.now() - started,
    });
  }

  // Walk the response shape — handle the two known variants.
  type Phone = { number?: string; phone?: string; type?: string };
  type Person = { phoneNumbers?: Phone[]; phones?: Phone[]; name?: unknown };
  const persons: Person[] =
    (json as { results?: { persons?: Person[] } } | null)?.results?.persons ??
    (json as { persons?: Person[] } | null)?.persons ??
    [];

  const phonesFound: string[] = [];
  for (const p of persons) {
    const phones = p?.phoneNumbers ?? p?.phones ?? [];
    for (const ph of phones) {
      const num = (ph?.number ?? ph?.phone ?? "").replace(/\D/g, "");
      if (num.length === 10 || num.length === 11) phonesFound.push(num);
    }
  }

  return NextResponse.json({
    ok: true,
    stage: "done",
    http_status: httpStatus,
    latency_ms: Date.now() - started,
    persons_returned: persons.length,
    phones_found: phonesFound.length,
    phones_sample: phonesFound.slice(0, 3).map((p) => p.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")),
    test_address: { street, city, state, zip },
    raw_response_preview: rawText.slice(0, 600),
  });
}

export async function GET(request: Request) {
  return POST(request);
}
