// Lightweight Twilio + Resend wrappers. Use direct REST so we don't pull
// large SDKs. Each function returns { ok, id?, error? } and silently no-ops
// when the relevant env vars aren't set, which keeps local + demo deploys
// working without configuring outbound providers.

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, skipped: true, error: "Twilio not configured" };
  }

  const cleanedTo = to.replace(/\s+/g, "");
  if (!cleanedTo) return { ok: false, error: "No 'to' number" };

  const params = new URLSearchParams({
    To:   cleanedTo.startsWith("+") ? cleanedTo : `+1${cleanedTo}`,
    From: from,
    Body: body.slice(0, 1500),
  });
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/x-www-form-urlencoded",
          Authorization:   `Basic ${auth}`,
        },
        body: params.toString(),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Twilio ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { sid?: string };
    return { ok: true, id: data.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Twilio request failed" };
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  fromName?: string,
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) {
    return { ok: false, skipped: true, error: "Resend not configured" };
  }

  const sender = fromName ? `${fromName} <${from}>` : from;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization:   `Bearer ${key}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    sender,
        to:      [to],
        subject: subject.slice(0, 200),
        text:    text.slice(0, 50_000),
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${t.slice(0, 200)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Resend request failed" };
  }
}

export function isOutboundConfigured(): { sms: boolean; email: boolean } {
  return {
    sms:   Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
    email: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
  };
}
