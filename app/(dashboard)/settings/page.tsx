import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-slate-600 mt-1">Workspace details and AI personalization context.</p>
      <SettingsForm
        id={ws.id}
        name={ws.name}
        businessContext={ws.business_context ?? ""}
        plan={ws.plan}
      />
    </div>
  );
}
