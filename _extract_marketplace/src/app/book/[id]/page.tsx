import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";
import { BookingForm } from "./BookingForm";

export const dynamic = "force-dynamic";

interface Slot {
  id: string;
  start_at: string;
  end_at: string;
}

export default async function PublicBookingPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id,business_name,logo_url,phone_public,account_type")
    .eq("id", params.id).single();

  if (!profile || (profile as { account_type: string }).account_type !== "contractor") notFound();
  const p = profile as Pick<Profile, "id" | "business_name" | "logo_url" | "phone_public">;

  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() + 60 * 86_400_000).toISOString(); // 60 days out
  const { data: slotsRaw } = await admin
    .from("booking_slots").select("id,start_at,end_at")
    .eq("user_id", params.id)
    .gte("start_at", now).lte("start_at", cutoff)
    .is("booked_at", null)
    .order("start_at", { ascending: true });
  const slots = (slotsRaw ?? []) as Slot[];

  // Group by date
  const byDay: Record<string, Slot[]> = {};
  for (const s of slots) {
    const d = new Date(s.start_at).toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
    });
    (byDay[d] ||= []).push(s);
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-xl">
        <div className="card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            {p.logo_url ? (
              <img src={p.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-brand-gradient text-white grid place-items-center font-bold">
                {(p.business_name ?? "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">Book with {p.business_name ?? "this contractor"}</h1>
              <p className="text-xs text-slate-500">
                Pick a time — they'll reach out to confirm.
              </p>
            </div>
          </div>

          {slots.length === 0 ? (
            <div className="mt-6 text-center text-sm text-slate-500">
              No available time slots right now.
              {p.phone_public && <> Call <strong>{p.phone_public}</strong> to schedule.</>}
            </div>
          ) : (
            <BookingForm contractorId={params.id} slotsByDay={byDay} />
          )}

          <p className="mt-6 text-[10px] text-slate-400 text-center">
            Powered by ContractorFlow
          </p>
        </div>
      </div>
    </main>
  );
}
