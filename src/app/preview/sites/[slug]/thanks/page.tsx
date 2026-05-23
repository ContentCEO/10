import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function ThanksPage({ params }: { params: { slug: string } }) {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-5">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center">
        <CheckCircle2 className="h-14 w-14 mx-auto" style={{ color: "#C44A26" }} />
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-stone-900 text-white px-3 py-1 text-[10px] font-semibold tracking-wider uppercase">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#C44A26" }} />
          Contractor Flow Launchpad
        </div>
        <h1 className="mt-4 text-2xl font-bold text-stone-900">You're in.</h1>
        <p className="mt-2 text-stone-600">
          We received your order. Davi from Contractor Flow will reach out within one business day
          to confirm your domain, gather logo + photos if you have them, and walk you through what's next.
        </p>
        <Link
          href={`/preview/sites/${params.slug}`}
          className="mt-6 inline-block rounded-lg bg-stone-900 text-white px-5 py-2 font-semibold hover:bg-stone-800"
        >
          Back to your site preview
        </Link>
      </div>
    </main>
  );
}
