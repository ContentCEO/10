import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getActiveBusiness, listChecklist, upsertChecklistItem, bulkInsertChecklist } from "@/lib/data";
import type { ChecklistItem } from "@/lib/types";

const SEED_ITEMS: Array<Omit<ChecklistItem, "id" | "updated_at" | "business_id">> = [
  { title: "Claim and verify Google Business Profile", category: "GBP", status: "open", priority: "high", notes: null },
  { title: "Add NAP (Name, Address, Phone) to site footer", category: "On-page", status: "open", priority: "high", notes: null },
  { title: "Embed Google Map on contact page", category: "On-page", status: "open", priority: "medium", notes: null },
  { title: "Create city + service landing pages", category: "Content", status: "open", priority: "high", notes: null },
  { title: "Add LocalBusiness schema markup", category: "Technical", status: "open", priority: "medium", notes: null },
  { title: "Submit to top 10 local citation sites", category: "Citations", status: "open", priority: "medium", notes: null },
  { title: "Request reviews from last 20 customers", category: "Reviews", status: "open", priority: "high", notes: null },
  { title: "Optimize page titles with city + service", category: "On-page", status: "open", priority: "medium", notes: null },
];

async function toggleItem(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const status = formData.get("status") as ChecklistItem["status"];
  const business_id = formData.get("business_id") as string;
  const title = formData.get("title") as string;
  await upsertChecklistItem({ id, business_id, title, status });
  revalidatePath("/dashboard/checklist");
}

async function seedChecklist(formData: FormData) {
  "use server";
  const business_id = formData.get("business_id") as string;
  await bulkInsertChecklist(SEED_ITEMS.map((s) => ({ ...s, business_id })));
  revalidatePath("/dashboard/checklist");
}

export default async function ChecklistPage() {
  const b = await getActiveBusiness();
  if (!b) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Set up your business first</h1>
        <Link href="/dashboard/business" className="btn-primary mt-4 inline-flex">Add business</Link>
      </div>
    );
  }
  const items = await listChecklist(b.id);
  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, it) => {
    const key = it.category ?? "General";
    (acc[key] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Local SEO checklist</h1>
          <p className="text-sm text-slate-600">Track the fundamentals that move local rankings.</p>
        </div>
        {items.length === 0 && (
          <form action={seedChecklist}>
            <input type="hidden" name="business_id" value={b.id} />
            <button className="btn-primary">Load starter checklist</button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card text-sm text-slate-600">
          No items yet. Load the starter checklist to begin.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat} className="card">
              <h2 className="text-sm font-semibold text-slate-900">{cat}</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {list.map((it) => (
                  <li key={it.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <form action={toggleItem}>
                        <input type="hidden" name="id" value={it.id} />
                        <input type="hidden" name="business_id" value={it.business_id} />
                        <input type="hidden" name="title" value={it.title} />
                        <input
                          type="hidden"
                          name="status"
                          value={it.status === "done" ? "open" : "done"}
                        />
                        <button
                          type="submit"
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            it.status === "done" ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"
                          }`}
                          aria-label="Toggle"
                        >
                          {it.status === "done" ? "✓" : ""}
                        </button>
                      </form>
                      <span className={it.status === "done" ? "text-sm text-slate-400 line-through" : "text-sm text-slate-800"}>
                        {it.title}
                      </span>
                    </div>
                    <span className={`badge ${priorityClass(it.priority)}`}>{it.priority}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function priorityClass(p: string) {
  switch (p) {
    case "high": return "bg-red-50 text-red-700";
    case "medium": return "bg-amber-50 text-amber-700";
    default: return "bg-slate-100 text-slate-600";
  }
}
