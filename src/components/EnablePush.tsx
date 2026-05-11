"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // Use a plain ArrayBuffer (not Uint8Array<ArrayBufferLike>) so the type
  // matches BufferSource that pushManager.subscribe expects under strict TS.
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export function EnablePush({ vapidKey }: { vapidKey: string | null }) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window && Boolean(vapidKey);
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setSubscribed(Boolean(sub)));
    }).catch(() => { /* ignore */ });
  }, [vapidKey]);

  async function subscribe() {
    if (!vapidKey) return;
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications permission denied.");
        setLoading(false);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("Could not register subscription");
      setSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Subscribe failed");
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          method: "DELETE",
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unsubscribe failed");
    } finally {
      setLoading(false);
    }
  }

  if (!vapidKey) {
    return (
      <p className="text-xs text-slate-500">
        Push notifications need <code>NEXT_PUBLIC_VAPID_KEY</code> configured on
        the server. Generate keys with <code>npx web-push generate-vapid-keys</code>.
      </p>
    );
  }
  if (!supported) {
    return <p className="text-xs text-slate-500">Push notifications aren't supported on this browser.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      {subscribed ? (
        <button onClick={unsubscribe} disabled={loading} className="btn-secondary !py-1.5 text-xs">
          <BellOff className="h-3.5 w-3.5" /> {loading ? "…" : "Disable push"}
        </button>
      ) : (
        <button onClick={subscribe} disabled={loading} className="btn-primary !py-1.5 text-xs">
          <Bell className="h-3.5 w-3.5" /> {loading ? "Enabling…" : "Enable push alerts"}
        </button>
      )}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
