import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold text-white">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-white">
        CC
      </span>
      <span>
        ContractorClose <span className="text-brand-300">AI</span>
      </span>
    </Link>
  );
}
