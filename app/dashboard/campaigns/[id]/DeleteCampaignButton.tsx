"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteCampaignButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!confirm("Delete this campaign and its creatives?")) return;
    setBusy(true);
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to delete");
      setBusy(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button onClick={onClick} disabled={busy} className="btn-outline text-red-600">
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
