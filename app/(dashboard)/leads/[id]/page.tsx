import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { LeadDetail } from "./LeadDetail";
import type { Lead, Message } from "@/lib/types";

export default async function LeadPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return null;

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .eq("workspace_id", ws.id)
    .maybeSingle();

  if (!lead) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("lead_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <LeadDetail
      lead={lead as Lead}
      messages={(messages ?? []) as Message[]}
      businessContext={ws.business_context}
    />
  );
}
