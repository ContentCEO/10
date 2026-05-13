import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DepositLinkForm } from "./DepositLinkForm";

export const dynamic = "force-dynamic";

export default async function DepositLinkPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <DepositLinkForm />;
}
