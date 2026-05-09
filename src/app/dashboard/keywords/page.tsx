import Link from "next/link";
import { getActiveBusiness, listKeywords } from "@/lib/data";
import { KeywordGenerator } from "@/components/KeywordGenerator";

export default async function KeywordsPage() {
  const b = await getActiveBusiness();
  if (!b) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Set up your business first</h1>
        <Link href="/dashboard/business" className="btn-primary mt-4 inline-flex">Add business</Link>
      </div>
    );
  }
  const ideas = await listKeywords(b.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Local keyword ideas</h1>
        <p className="text-sm text-slate-600">
          AI-generated long-tail keywords with local intent for {b.name}.
        </p>
      </div>

      <KeywordGenerator businessId={b.id} />

      {ideas.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-900">Saved ideas</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Keyword</th>
                  <th className="py-2">Intent</th>
                  <th className="py-2">Difficulty</th>
                  <th className="py-2">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ideas.map((k) => (
                  <tr key={k.id}>
                    <td className="py-2 font-medium text-slate-900">{k.keyword}</td>
                    <td className="py-2 text-slate-600">{k.intent}</td>
                    <td className="py-2 text-slate-600">{k.difficulty}</td>
                    <td className="py-2 text-slate-600">{k.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
