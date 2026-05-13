import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { YardSignBuilder } from "./YardSignBuilder";

export const dynamic = "force-dynamic";

export default async function YardSignQrPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("business_name,phone,website,services").eq("id", user.id).single();
  const p = profile as { business_name: string | null; phone: string | null; website: string | null; services: string[] | null } | null;

  return <YardSignBuilder
    defaults={{
      business_name: p?.business_name ?? "",
      phone: p?.phone ?? "",
      website: p?.website ?? "",
      service: (p?.services?.[0]) ?? "",
    }}
  />;
}
