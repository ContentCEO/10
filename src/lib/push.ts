// Web Push subscription management.
//
// Sending push notifications properly requires RFC 8291 payload encryption,
// which is a few hundred lines of cryptography. The right move is to install
// `web-push` (16 KB, zero runtime deps) and use it here. To keep this MVP
// dependency-free we expose the subscription storage and a stub send that
// returns ok:false with a helpful error if the lib isn't installed.
//
// To enable real push:
//   npm install web-push
//   npx web-push generate-vapid-keys  →  put public + private in Vercel env
//   Replace this stub with the library call.

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

export async function sendPush(
  _sub: PushSubscriptionRow,
  _payload: PushPayload,
): Promise<{ ok: boolean; error?: string }> {
  return {
    ok: false,
    error: "Install web-push and wire it here to enable delivery (subscription is stored).",
  };
}

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function publicVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_KEY ?? null;
}
