import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LienWaiverGenerator } from "./LienWaiverGenerator";

export const dynamic = "force-dynamic";

export default async function LienWaiverPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name,license_number")
    .eq("id", user.id)
    .single();
  const p = profile as { business_name: string | null; license_number: string | null } | null;

  return (
    <LienWaiverGenerator
      defaults={{
        contractor_name: p?.business_name ?? "",
        license_number: p?.license_number ?? "",
      }}
    />
  );
}
