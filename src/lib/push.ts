// Web Push delivery — uses the `web-push` library for RFC 8291 encryption.
//
// Generate VAPID keys once:    npx web-push generate-vapid-keys
// Then set in Vercel env vars:
//   VAPID_PUBLIC_KEY        (server-side)
//   VAPID_PRIVATE_KEY       (server-side)
//   NEXT_PUBLIC_VAPID_KEY   (same as public — client subscribes with this)
//   VAPID_SUBJECT           (mailto:you@yourdomain.com)

import webpush from "web-push";

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@contractorflow.app";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function publicVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_KEY ?? null;
}

export async function sendPush(
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<{ ok: boolean; error?: string; expired?: boolean }> {
  if (!ensureConfigured()) {
    return { ok: false, error: "VAPID keys not configured" };
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 86400, urgency: "high" },
    );
    return { ok: true };
  } catch (e) {
    const err = e as { statusCode?: number; message?: string };
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { ok: false, expired: true, error: "Subscription expired" };
    }
    return { ok: false, error: err.message ?? "Push failed" };
  }
}
