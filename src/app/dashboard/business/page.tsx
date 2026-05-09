import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveBusiness, upsertBusiness } from "@/lib/data";

async function saveBusiness(formData: FormData) {
  "use server";
  const id = (formData.get("id") as string) || undefined;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  await upsertBusiness({
    id,
    name,
    website: (formData.get("website") as string) || null,
    category: (formData.get("category") as string) || null,
    address: (formData.get("address") as string) || null,
    city: (formData.get("city") as string) || null,
    region: (formData.get("region") as string) || null,
    postal_code: (formData.get("postal_code") as string) || null,
    country: (formData.get("country") as string) || null,
    phone: (formData.get("phone") as string) || null,
    gbp_url: (formData.get("gbp_url") as string) || null,
    primary_keyword: (formData.get("primary_keyword") as string) || null,
    service_area: (formData.get("service_area") as string) || null,
    description: (formData.get("description") as string) || null,
  });
  revalidatePath("/dashboard");
  redirect("/dashboard/audit");
}

export default async function BusinessPage() {
  const b = await getActiveBusiness();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Business profile</h1>
      <p className="mt-1 text-sm text-slate-600">
        Tell us about your business. We use this to generate your audit, plan, and reports.
      </p>

      <form action={saveBusiness} className="card mt-6 space-y-4">
        {b && <input type="hidden" name="id" value={b.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" name="name" required defaultValue={b?.name} />
          <Field label="Category" name="category" placeholder="e.g. Plumber, Coffee shop" defaultValue={b?.category ?? ""} />
          <Field label="Website URL" name="website" type="url" placeholder="https://" defaultValue={b?.website ?? ""} />
          <Field label="Google Business Profile URL" name="gbp_url" type="url" placeholder="https://maps.google.com/..." defaultValue={b?.gbp_url ?? ""} />
          <Field label="Phone" name="phone" defaultValue={b?.phone ?? ""} />
          <Field label="Primary keyword" name="primary_keyword" placeholder="e.g. emergency plumber Austin" defaultValue={b?.primary_keyword ?? ""} />
        </div>

        <Field label="Street address" name="address" defaultValue={b?.address ?? ""} />
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="City" name="city" defaultValue={b?.city ?? ""} />
          <Field label="Region / state" name="region" defaultValue={b?.region ?? ""} />
          <Field label="Postal code" name="postal_code" defaultValue={b?.postal_code ?? ""} />
          <Field label="Country" name="country" defaultValue={b?.country ?? ""} />
        </div>

        <Field label="Service area" name="service_area" placeholder="e.g. Greater Austin metro" defaultValue={b?.service_area ?? ""} />
        <div>
          <label className="label" htmlFor="description">Short description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={b?.description ?? ""}
            className="input"
            placeholder="What you do, who you serve, what makes you different."
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">
            {b ? "Save & run audit" : "Save & run first audit"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, name, type = "text", required, placeholder, defaultValue,
}: {
  label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="input"
      />
    </div>
  );
}
