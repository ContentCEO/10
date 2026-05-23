/*
 * Lob.com postcard integration. Sends physical 4×6 postcards to
 * permit/deed leads with name + street address (Lane B compliant —
 * direct mail is allowed without prior consent).
 *
 * Env:
 *   LOB_API_KEY              — Lob secret key (live_... or test_...)
 *   LOB_FROM_NAME            — sender name on the return address
 *   LOB_FROM_LINE1           — sender street
 *   LOB_FROM_CITY            — sender city
 *   LOB_FROM_STATE           — sender state (e.g. "MA")
 *   LOB_FROM_ZIP             — sender zip
 *   LOB_POSTCARD_FRONT_HTML  — full HTML for the front (4x6 @ 300dpi)
 *   LOB_POSTCARD_BACK_HTML   — full HTML for the back
 *
 * For initial setup we ship sensible defaults so the first postcards
 * go out without writing HTML.
 */

export interface LobAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
}

export interface PostcardInput {
  to: LobAddress;
  description?: string;
  variables?: Record<string, string>;
}

export interface LobPostcardResponse {
  id: string;
  tracking_number?: string | null;
  expected_delivery_date?: string | null;
  send_date?: string | null;
  url?: string | null;
}

function defaultFrontHtml(): string {
  return `
<html>
<body style="margin:0;padding:0;width:6in;height:4in;font-family:Helvetica,Arial,sans-serif;background:#FFFFFF;">
  <div style="padding:36px;color:#0F172A;">
    <div style="font-size:14px;font-weight:600;color:#6366f1;letter-spacing:0.18em;">{{business_name}}</div>
    <div style="margin-top:14px;font-size:34px;font-weight:700;line-height:1.05;letter-spacing:-0.02em;">
      Saw your permit, {{first_name}}.
    </div>
    <div style="margin-top:14px;font-size:15px;color:#475569;line-height:1.4;">
      We're a licensed Massachusetts contractor. Free same-week estimate for your {{project_type}} at {{address_line1}}.
    </div>
    <div style="margin-top:24px;font-size:22px;font-weight:700;color:#0F172A;">{{phone}}</div>
    <div style="margin-top:6px;font-size:13px;color:#64748B;">{{website}}</div>
  </div>
</body>
</html>`.trim();
}

function defaultBackHtml(): string {
  return `
<html>
<body style="margin:0;padding:0;width:6in;height:4in;font-family:Helvetica,Arial,sans-serif;background:#FFFFFF;">
  <div style="padding:24px 36px;color:#0F172A;">
    <div style="font-size:13px;color:#475569;line-height:1.5;">
      Hi {{first_name}} — we noticed a building permit was issued at {{address_line1}} for a {{project_type}}. If you haven't locked in a contractor yet, we'd love to give you a free, no-pressure estimate this week.
    </div>
    <div style="margin-top:12px;font-size:13px;color:#475569;line-height:1.5;">
      Licensed · Insured · Local. 5-star reviews on Google.
    </div>
    <div style="margin-top:14px;font-size:18px;font-weight:700;">{{phone}}</div>
    <div style="font-size:12px;color:#64748B;">{{website}}</div>
  </div>
</body>
</html>`.trim();
}

function applyVars(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => vars[k] ?? "");
}

export interface SendPostcardArgs {
  apiKey: string;
  to: LobAddress;
  vars: Record<string, string>;
  testMode?: boolean;
  description?: string;
}

/*
 * Send one postcard via Lob's /v1/postcards endpoint.
 * Docs: https://docs.lob.com/#tag/Postcards/operation/postcard_create
 */
export async function sendLobPostcard({ apiKey, to, vars, testMode, description }: SendPostcardArgs): Promise<{ ok: true; data: LobPostcardResponse } | { ok: false; error: string; status?: number }> {
  const from: LobAddress = {
    name:           process.env.LOB_FROM_NAME  ?? "ContractorFlow",
    address_line1:  process.env.LOB_FROM_LINE1 ?? "1 Main St",
    address_city:   process.env.LOB_FROM_CITY  ?? "Boston",
    address_state:  process.env.LOB_FROM_STATE ?? "MA",
    address_zip:    process.env.LOB_FROM_ZIP   ?? "02101",
  };

  const front = applyVars(process.env.LOB_POSTCARD_FRONT_HTML ?? defaultFrontHtml(), vars);
  const back  = applyVars(process.env.LOB_POSTCARD_BACK_HTML  ?? defaultBackHtml(),  vars);

  const form = new URLSearchParams();
  form.set("description", description ?? "ContractorFlow auto-postcard");
  form.set("to[name]", to.name);
  form.set("to[address_line1]", to.address_line1);
  if (to.address_line2) form.set("to[address_line2]", to.address_line2);
  form.set("to[address_city]", to.address_city);
  form.set("to[address_state]", to.address_state);
  form.set("to[address_zip]", to.address_zip);
  form.set("from[name]", from.name);
  form.set("from[address_line1]", from.address_line1);
  form.set("from[address_city]", from.address_city);
  form.set("from[address_state]", from.address_state);
  form.set("from[address_zip]", from.address_zip);
  form.set("front", front);
  form.set("back", back);
  form.set("size", "4x6");
  form.set("mail_type", "usps_first_class");
  if (testMode) form.set("use_type", "marketing");

  try {
    const auth = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
    const res = await fetch("https://api.lob.com/v1/postcards", {
      method: "POST",
      headers: {
        "Authorization": auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const text = await res.text();
    let json: unknown = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    if (!res.ok) {
      const err = json && typeof json === "object" && "error" in json
        ? String((json as { error?: { message?: string } }).error?.message ?? text.slice(0, 300))
        : text.slice(0, 300);
      return { ok: false, error: err, status: res.status };
    }
    return { ok: true, data: json as LobPostcardResponse };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function parseStreetFromAddress(addressLine: string | null): { line1: string; line2?: string } | null {
  if (!addressLine) return null;
  const parts = addressLine.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return { line1: parts[0], line2: parts[1] };
}
