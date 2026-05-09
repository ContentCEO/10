import { Resend } from "resend";
import twilio from "twilio";

let resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

let twilioClient: ReturnType<typeof twilio> | null = null;
function getTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!twilioClient) twilioClient = twilio(sid, token);
  return twilioClient;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = getResend();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!client || !from) {
    console.warn("[notify] Resend not configured; skipping email to", opts.to);
    return { ok: false, error: "resend_not_configured" };
  }
  try {
    await client.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function sendSMS(opts: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = getTwilio();
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!client || !from) {
    console.warn("[notify] Twilio not configured; skipping SMS to", opts.to);
    return { ok: false, error: "twilio_not_configured" };
  }
  try {
    await client.messages.create({ from, to: opts.to, body: opts.body });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
