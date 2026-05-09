import { createClient } from "@/lib/supabase/server";
import type { ContentItem } from "@/lib/types";
import CalendarGrid from "./CalendarGrid";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { m?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date();
  const [yearStr, monthStr] = (searchParams.m ?? "").split("-");
  const year = Number(yearStr) || today.getFullYear();
  const month = (Number(monthStr) || today.getMonth() + 1) - 1;

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("user_id", user!.id)
    .gte("scheduled_for", startISO)
    .lte("scheduled_for", endISO)
    .order("scheduled_for");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Content calendar</h1>
      <p className="mt-1 text-slate-600">All scheduled and published posts for the month.</p>
      <div className="mt-6">
        <CalendarGrid year={year} month={month} items={(data ?? []) as ContentItem[]} />
      </div>
    </div>
  );
}
