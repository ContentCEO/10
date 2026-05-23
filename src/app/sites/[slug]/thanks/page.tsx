import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function ThanksPage({ params }: { params: { slug: string } }) {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-5">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
        <h1 className="mt-4 text-2xl font-bold">You're in.</h1>
        <p className="mt-2 text-slate-600">
          We received your order. A real human from ContractorFlow will reach out within one business day
          to confirm your domain, gather logo + photos if you have them, and walk you through what's next.
        </p>
        <Link
          href={`/sites/${params.slug}`}
          className="mt-6 inline-block rounded-lg bg-slate-900 text-white px-5 py-2 font-semibold hover:bg-slate-800"
        >
          Back to your site preview
        </Link>
      </div>
    </main>
  );
}
