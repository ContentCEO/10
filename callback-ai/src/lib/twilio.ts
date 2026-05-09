import twilio from "twilio";
import { env } from "@/lib/env";

let cachedClient: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).");
  }
  if (!cachedClient) {
    cachedClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return cachedClient;
}

export type SendSmsArgs = {
  to: string;
  body: string;
  /** Twilio number associated with the business; falls back to messaging service or env default. */
  from?: string;
};

export async function sendSms({ to, body, from }: SendSmsArgs) {
  const client = getTwilioClient();
  const params: Parameters<typeof client.messages.create>[0] = {
    to,
    body
  };

  if (env.TWILIO_MESSAGING_SERVICE_SID) {
    params.messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
  } else if (from) {
    params.from = from;
  } else if (env.TWILIO_FROM_NUMBER) {
    params.from = env.TWILIO_FROM_NUMBER;
  } else {
    throw new Error(
      "No Twilio sender configured: set TWILIO_MESSAGING_SERVICE_SID or business.twilio_number or TWILIO_FROM_NUMBER."
    );
  }

  return client.messages.create(params);
}

/**
 * Validates that an incoming Twilio webhook request actually came from Twilio.
 * In dev, signature verification can be disabled via WEBHOOK_VERIFY_SIGNATURES=false.
 */
export function validateTwilioSignature(opts: {
  signature: string | null;
  url: string;
  params: Record<string, string>;
}): boolean {
  if (!env.WEBHOOK_VERIFY_SIGNATURES) return true;
  if (!env.TWILIO_AUTH_TOKEN) return false;
  if (!opts.signature) return false;
  return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, opts.signature, opts.url, opts.params);
}

/**
 * Twilio call statuses considered "missed" — i.e. the caller didn't reach a human.
 */
export const MISSED_CALL_STATUSES = new Set(["no-answer", "busy", "failed", "canceled"]);

export function isMissedCall(status: string): boolean {
  return MISSED_CALL_STATUSES.has(status);
}
