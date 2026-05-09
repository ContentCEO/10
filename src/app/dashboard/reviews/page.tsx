import Link from "next/link";
import { getActiveBusiness, listReviewResponses } from "@/lib/data";
import { ReviewResponderForm } from "@/components/ReviewResponderForm";

export default async function ReviewsPage() {
  const b = await getActiveBusiness();
  if (!b) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Set up your business first</h1>
        <Link href="/dashboard/business" className="btn-primary mt-4 inline-flex">Add business</Link>
      </div>
    );
  }
  const past = await listReviewResponses(b.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Review responder</h1>
        <p className="text-sm text-slate-600">Paste a Google review and get an on-brand reply.</p>
      </div>

      <ReviewResponderForm businessId={b.id} businessName={b.name} />

      {past.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-900">Recent replies</h2>
          <ul className="mt-3 space-y-4">
            {past.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {r.rating ? <span>★ {r.rating}</span> : null}
                  {r.tone ? <span>· tone: {r.tone}</span> : null}
                  <span>· {new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">“{r.review_text}”</p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-900">{r.response}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
