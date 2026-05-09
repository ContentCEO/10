import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

async function saveBusiness(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const payload = {
    owner_id: user.id,
    name: String(formData.get("name") ?? "").trim(),
    industry: String(formData.get("industry") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    hours: String(formData.get("hours") ?? "").trim() || null,
    service_area: String(formData.get("service_area") ?? "").trim() || null,
    booking_url: String(formData.get("booking_url") ?? "").trim() || null,
    twilio_number: (() => {
      const raw = String(formData.get("twilio_number") ?? "").trim();
      return raw ? normalizePhone(raw) : null;
    })(),
    ai_persona: String(formData.get("ai_persona") ?? "").trim() || null
  };

  if (!payload.name) {
    return;
  }

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("businesses").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("businesses").insert(payload);
  }

  revalidatePath("/dashboard/business");
  revalidatePath("/dashboard");
}

export default async function BusinessProfilePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user!.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Business profile</h1>
      <p className="mb-6 text-sm text-slate-600">
        These details shape what the AI says when it texts your callers back.
      </p>

      <form action={saveBusiness} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <Field name="name" label="Business name" defaultValue={business?.name} required />
        <Field name="industry" label="Industry" placeholder="HVAC, plumbing, salon, dental, …" defaultValue={business?.industry} />
        <Textarea name="description" label="Short description" defaultValue={business?.description} />
        <Field name="hours" label="Business hours" placeholder="Mon–Fri 8am–6pm" defaultValue={business?.hours} />
        <Field name="service_area" label="Service area" placeholder="Austin, TX + 30 mi" defaultValue={business?.service_area} />
        <Field name="booking_url" label="Booking link (URL)" placeholder="https://cal.com/yourbiz" defaultValue={business?.booking_url} />
        <Field
          name="twilio_number"
          label="Twilio phone number (E.164, e.g. +15125551234)"
          placeholder="+15125551234"
          defaultValue={business?.twilio_number}
        />
        <Textarea
          name="ai_persona"
          label="AI persona / instructions"
          defaultValue={
            business?.ai_persona ??
            "A friendly receptionist who qualifies leads quickly and books appointments."
          }
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
        >
          Save profile
        </button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  required
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
    </label>
  );
}

function Textarea({
  name,
  label,
  defaultValue
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={3}
        className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
    </label>
  );
}
