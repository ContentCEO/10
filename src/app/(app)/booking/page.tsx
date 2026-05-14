import { revalidatePath } from "next/cache";
import { Calendar, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CopyField } from "../integrations/CopyField";

export const dynamic = "force-dynamic";

interface Slot {
  id: string;
  start_at: string;
  end_at: string;
  booked_at: string | null;
  booked_by: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  service_type: string | null;
  notes: string | null;
}

async function createSlots(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const date = String(formData.get("date") ?? "");
  const startHour = Number(formData.get("start_hour") ?? 9);
  const endHour = Number(formData.get("end_hour") ?? 17);
  const durationMin = Number(formData.get("duration") ?? 60);
  if (!date || endHour <= startHour) return;

  const rows: { user_id: string; start_at: string; end_at: string }[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += durationMin) {
      const start = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      const end = new Date(start.getTime() + durationMin * 60_000);
      // Don't overlap into next hour bucket beyond endHour
      if (end.getHours() > endHour || (end.getHours() === endHour && end.getMinutes() > 0)) continue;
      rows.push({
        user_id: user.id,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
      });
    }
  }
  if (rows.length === 0) return;
  await supabase.from("booking_slots").insert(rows);
  revalidatePath("/booking");
}

async function deleteSlot(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("booking_slots").delete().eq("id", id);
  revalidatePath("/booking");
}

export default async function BookingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date().toISOString();
  const { data: upcoming } = await supabase
    .from("booking_slots").select("*")
    .eq("user_id", user.id)
    .gte("start_at", now)
    .order("start_at", { ascending: true })
    .limit(50);
  const list = (upcoming ?? []) as Slot[];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const publicUrl = `${baseUrl}/book/${user.id}`;
  const embedSnippet = `<iframe src="${publicUrl}" style="border:0;width:100%;max-width:560px;height:720px;" loading="lazy"></iframe>`;

  const open = list.filter((s) => !s.booked_at);
  const booked = list.filter((s) => s.booked_at);

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand-600" /> Booking
        </h1>
        <p className="text-sm text-slate-500">
          Publish open time slots. Homeowners self-book an estimate visit via your
          public page or embedded iframe. Every booking creates a lead.
        </p>
      </header>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Your public booking page</h2>
        <CopyField value={publicUrl} />
        <div>
          <div className="label">Embed snippet</div>
          <pre className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs overflow-x-auto whitespace-pre-wrap">{embedSnippet}</pre>
        </div>
      </section>

      <section className="card p-5 space-y-3 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">Add slots for a day</h2>
        </div>
        <form action={createSlots} className="grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" name="date" type="date" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="start_hour">Start hour</label>
            <input id="start_hour" name="start_hour" type="number" min="0" max="23"
              defaultValue="9" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="end_hour">End hour</label>
            <input id="end_hour" name="end_hour" type="number" min="0" max="23"
              defaultValue="17" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="duration">Slot length (min)</label>
            <input id="duration" name="duration" type="number" min="15" step="15"
              defaultValue="60" className="input" />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <button className="btn-primary">Create slots</button>
          </div>
        </form>
      </section>

      {booked.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Upcoming bookings ({booked.length})</h2>
          <ul className="card divide-y divide-slate-100">
            {booked.map((s) => (
              <li key={s.id} className="px-4 py-3 text-sm">
                <div className="font-medium">
                  {s.customer_name ?? "Customer"} · {s.service_type ?? "Estimate"}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(s.start_at).toLocaleString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })}
                  {s.customer_phone ? ` · ${s.customer_phone}` : ""}
                </div>
                {s.notes && <p className="mt-1 text-xs text-slate-700">{s.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">Open slots ({open.length})</h2>
        {open.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">
            No open slots. Add some above so homeowners can book.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {open.map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <span>
                  {new Date(s.start_at).toLocaleString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })}
                </span>
                <form action={deleteSlot.bind(null, s.id)}>
                  <button className="btn-secondary !py-1 text-xs">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
