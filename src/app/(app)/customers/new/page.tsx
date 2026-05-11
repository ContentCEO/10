import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function createCustomer(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const payload = {
    user_id: user.id,
    name: String(formData.get("name") ?? "").trim(),
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    address: (formData.get("address") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };
  if (!payload.name) return;

  const { data } = await supabase.from("customers").insert(payload).select("id").single();
  if (data) redirect(`/customers/${data.id}`);
}

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/customers" className="text-sm text-slate-500">← Customers</Link>
      <h1 className="text-2xl font-bold">New customer</h1>

      <form action={createCustomer} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="input" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">Address</label>
          <input id="address" name="address" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} className="input" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Link href="/customers" className="btn-secondary">Cancel</Link>
          <button className="btn-primary">Create customer</button>
        </div>
      </form>
    </div>
  );
}
