"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function ThanksContent() {
  const search = useSearchParams();
  const name = search.get("name");
  const first = name?.split(" ")[0] ?? null;

  return (
    <div className="text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/30 mb-4">
        <CheckCircle2 className="h-9 w-9 text-emerald-400" />
      </div>
      <h1 className="font-serif text-4xl sm:text-5xl tracking-tight leading-[1.05]">
        {first ? <>You&apos;re set, <em>{first}</em>.</> : <>You&apos;re <em>set</em>.</>}
      </h1>
      <p className="mt-3 text-base sm:text-lg text-white/70 max-w-xl mx-auto">
        We got your quote request. A licensed Massachusetts contractor will text or call you within one business day.
      </p>
    </div>
  );
}
