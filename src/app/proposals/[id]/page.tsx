import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, MobileTopbar } from "@/components/Sidebar";
import { ProposalEditor } from "@/components/ProposalEditor";
import type { Proposal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditProposalPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: proposal, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (error || !proposal) notFound();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar email={user.email ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <ProposalEditor userId={user.id} proposal={proposal as Proposal} />
        </main>
      </div>
    </div>
  );
}
