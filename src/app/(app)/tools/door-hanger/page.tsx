import { redirect } from "next/navigation";
import { DoorHangerBuilder } from "./DoorHangerBuilder";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DoorHangerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("business_name,phone,license_number,services").eq("id", user.id).single();
  const p = profile as { business_name: string|null; phone: string|null; license_number: string|null; services: string[]|null } | null;
  return <DoorHangerBuilder defaults={{
    business_name: p?.business_name ?? "",
    phone: p?.phone ?? "",
    license_number: p?.license_number ?? "",
    service: p?.services?.[0] ?? "",
  }} />;
}
