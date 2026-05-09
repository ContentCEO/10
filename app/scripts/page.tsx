import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { ScriptGenerator } from "./ScriptGenerator";

export const dynamic = "force-dynamic";

export default async function ScriptsPage() {
  const supabase = createClient();
  const { data: scripts } = await supabase
    .from("scripts")
    .select("id, name, trade, scenario, body, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-white">Sales scripts</h1>
          <p className="mt-1 text-ink-400">
            Generate proven scripts for any selling situation, then save the
            ones you'll use.
          </p>
        </div>

        <ScriptGenerator />

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-white">Saved scripts</h2>
          {scripts && scripts.length > 0 ? (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {scripts.map((s) => (
                <div key={s.id} className="card">
                  <div className="text-sm text-ink-400">
                    {s.trade}
                    {s.scenario ? ` · ${s.scenario}` : ""}
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-white">
                    {s.name}
                  </h3>
                  <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm text-ink-200">
                    {s.body}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-400">No saved scripts yet.</p>
          )}
        </div>
      </main>
    </>
  );
}
