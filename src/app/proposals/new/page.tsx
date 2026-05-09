import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, MobileTopbar } from "@/components/Sidebar";
import { ProposalEditor } from "@/components/ProposalEditor";

export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar email={user.email ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <ProposalEditor userId={user.id} />
        </main>
      </div>
    </div>
  );
}
