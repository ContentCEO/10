import type { CampaignStructure } from "@/lib/types";

export function CampaignStructureCard({ structure }: { structure: CampaignStructure }) {
  return (
    <div className="card space-y-4">
      <div>
        <h3 className="font-semibold">Campaign structure</h3>
        <p className="text-sm text-zinc-600">{structure.campaign?.name}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Objective</span>
          <p className="mt-1">{structure.campaign?.objective}</p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Budget</span>
          <p className="mt-1">{structure.campaign?.budget_suggestion}</p>
        </div>
      </div>
      {structure.ad_sets?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Ad sets</h4>
          <div className="space-y-2">
            {structure.ad_sets.map((set, i) => (
              <div key={i} className="rounded-md border border-zinc-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{set.name}</span>
                  <span className="text-xs text-zinc-500">{set.budget_split}</span>
                </div>
                <p className="mt-1 text-zinc-700">{set.audience}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Placements: {set.placements?.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {structure.testing_plan && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">Testing plan</h4>
          <p className="text-sm text-zinc-800 whitespace-pre-wrap">{structure.testing_plan}</p>
        </div>
      )}
      {structure.kpis?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">KPIs</h4>
          <div className="flex flex-wrap gap-1">
            {structure.kpis.map((k) => (
              <span key={k} className="badge bg-zinc-100 text-zinc-700">{k}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
