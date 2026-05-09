export function formatCurrency(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format((cents ?? 0) / 100);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
    case "succeeded":
    case "paid":
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "pending":
    case "submitted":
    case "draft":
    case "open":
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
    case "en_route":
    case "trialing":
      return "bg-amber-100 text-amber-800";
    case "past_due":
    case "failed":
    case "high":
    case "urgent":
      return "bg-rose-100 text-rose-800";
    case "canceled":
    case "void":
    case "refunded":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
