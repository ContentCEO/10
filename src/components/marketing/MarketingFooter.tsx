import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t mt-20" style={{ borderColor: "rgba(255,255,255,0.07)", background: "#06060A" }}>
      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-white font-semibold tracking-tight">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>CF</span>
              <span style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 20 }}>Contractor Flow</span>
            </Link>
            <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
              Built in Massachusetts, for Massachusetts contractors. Hyper-local, founder-led.
            </p>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.40)" }}>Products</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/crm" className="hover:text-white" style={{ color: "rgba(255,255,255,0.70)" }}>CRM</Link></li>
              <li><Link href="/marketplace" className="hover:text-white" style={{ color: "rgba(255,255,255,0.70)" }}>Marketplace</Link></li>
              <li><Link href="/launchpad" className="hover:text-white" style={{ color: "rgba(255,255,255,0.70)" }}>Launchpad</Link></li>
              <li><Link href="/pricing" className="hover:text-white" style={{ color: "rgba(255,255,255,0.70)" }}>Pricing</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.40)" }}>Company</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white" style={{ color: "rgba(255,255,255,0.70)" }}>About</Link></li>
              <li><a href="mailto:hello@contractorflowstore.com" className="hover:text-white" style={{ color: "rgba(255,255,255,0.70)" }}>Contact</a></li>
              <li><Link href="/signup" className="hover:text-white" style={{ color: "rgba(255,255,255,0.70)" }}>Sign up</Link></li>
              <li><Link href="/login" className="hover:text-white" style={{ color: "rgba(255,255,255,0.70)" }}>Log in</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "rgba(255,255,255,0.40)" }}>Legal</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-white" style={{ color: "rgba(255,255,255,0.70)" }}>Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white" style={{ color: "rgba(255,255,255,0.70)" }}>Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
          style={{ borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.40)" }}>
          <span>© {new Date().getFullYear()} Contractor Flow. Built in Massachusetts.</span>
          <span>Made by Davi Chaves · One developer · One state.</span>
        </div>
      </div>
    </footer>
  );
}
