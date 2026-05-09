import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { ObjectionWorkbench } from "./ObjectionWorkbench";

export const dynamic = "force-dynamic";

export default async function ObjectionsPage() {
  const supabase = createClient();
  const { data: items } = await supabase
    .from("objections")
    .select("id, objection, category, response, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-white">
            Objection handling library
          </h1>
          <p className="mt-1 text-ink-400">
            Get a great response to any objection. Save the ones that fit your
            brand.
          </p>
        </div>

        <ObjectionWorkbench />

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-white">Your library</h2>
          {items && items.length > 0 ? (
            <div className="mt-3 space-y-3">
              {items.map((o) => (
                <div key={o.id} className="card">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-white">
                      "{o.objection}"
                    </div>
                    <span className="badge bg-brand-500/20 text-brand-200">
                      {o.category}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-ink-200">{o.response}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-400">
              You haven't saved any objections yet.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
