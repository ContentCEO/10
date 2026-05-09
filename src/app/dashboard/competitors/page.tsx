import Link from "next/link";
import { revalidatePath } from "next/cache";
import { addCompetitor, getActiveBusiness, listCompetitors } from "@/lib/data";
import { CompareButton } from "@/components/CompareButton";

async function add(formData: FormData) {
  "use server";
  const business_id = formData.get("business_id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!business_id || !name) return;
  await addCompetitor({
    business_id,
    name,
    website: (formData.get("website") as string) || null,
    gbp_url: (formData.get("gbp_url") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });
  revalidatePath("/dashboard/competitors");
}

export default async function CompetitorsPage() {
  const b = await getActiveBusiness();
  if (!b) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Set up your business first</h1>
        <Link href="/dashboard/business" className="btn-primary mt-4 inline-flex">Add business</Link>
      </div>
    );
  }
  const list = await listCompetitors(b.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Competitor comparison</h1>
        <p className="text-sm text-slate-600">Add the businesses ranking above you in the local pack.</p>
      </div>

      <form action={add} className="card grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="business_id" value={b.id} />
        <Field label="Competitor name" name="name" required />
        <Field label="Website" name="website" type="url" placeholder="https://" />
        <Field label="GBP URL" name="gbp_url" type="url" placeholder="https://maps.google.com/..." />
        <Field label="Notes" name="notes" placeholder="Why are they ranking?" />
        <div className="sm:col-span-2 flex justify-end">
          <button className="btn-primary">Add competitor</button>
        </div>
      </form>

      {list.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Your competitors</h2>
            <CompareButton businessId={b.id} />
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {list.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900">{c.name}</div>
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
                      {c.website}
                    </a>
                  )}
                </div>
                {c.notes && <div className="mt-1 text-sm text-slate-600">{c.notes}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({
  label, name, type = "text", required, placeholder,
}: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} required={required} placeholder={placeholder} className="input" />
    </div>
  );
}
