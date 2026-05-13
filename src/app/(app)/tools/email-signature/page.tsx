import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignatureBuilder } from "./SignatureBuilder";

export const dynamic = "force-dynamic";

export default async function EmailSignaturePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name,email,phone,website,services,license_number")
    .eq("id", user.id)
    .single();

  const p = profile as {
    business_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    services: string[] | null;
    license_number: string | null;
  } | null;

  return (
    <SignatureBuilder
      defaults={{
        business_name: p?.business_name ?? "",
        email: p?.email ?? user.email ?? "",
        phone: p?.phone ?? "",
        website: p?.website ?? "",
        services: p?.services ?? [],
        license_number: p?.license_number ?? "",
      }}
    />
  );
}
