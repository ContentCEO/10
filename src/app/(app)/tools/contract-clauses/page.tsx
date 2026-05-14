import { redirect } from "next/navigation";
import { ClauseLibrary } from "./ClauseLibrary";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContractClausesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <ClauseLibrary />;
}
