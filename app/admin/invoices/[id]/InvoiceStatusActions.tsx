"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function InvoiceStatusActions({
  invoiceId,
  status
}: {
  invoiceId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function update(next: string) {
    startTransition(async () => {
      await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {status !== "paid" && (
        <button className="btn-secondary text-xs" disabled={pending} onClick={() => update("paid")}>
          Mark paid
        </button>
      )}
      {status !== "void" && (
        <button className="text-xs text-rose-600 hover:underline" disabled={pending} onClick={() => update("void")}>
          Void
        </button>
      )}
    </div>
  );
}
