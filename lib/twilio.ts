import twilio from "twilio";

export function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio not configured");
  return twilio(sid, token);
}

export async function sendSms(to: string, body: string): Promise<{ id: string }> {
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) throw new Error("TWILIO_FROM_NUMBER not set");
  const msg = await getTwilioClient().messages.create({ to, from, body });
  return { id: msg.sid };
}
