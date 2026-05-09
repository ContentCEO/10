import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { isAiConfigured, isSupabaseConfigured } from "@/lib/env";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1">
        <MobileNav />
        {(!isSupabaseConfigured || !isAiConfigured) && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-900">
            <span className="font-semibold">Demo mode:</span>{" "}
            {!isSupabaseConfigured && "Supabase not configured (data is in-memory). "}
            {!isAiConfigured && "AI not configured (using sample outputs). "}
            Set keys in <code className="rounded bg-amber-100 px-1">.env.local</code> to enable.
          </div>
        )}
        <main className="px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
