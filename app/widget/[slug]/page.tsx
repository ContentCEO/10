import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { ChatInterface } from "@/components/ChatInterface";
import type { AIEmployee } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { color?: string };
}) {
  const supa = createServiceClient();
  const { data } = await supa
    .from("ai_employees")
    .select("*")
    .eq("public_slug", params.slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) notFound();
  const emp = data as AIEmployee;
  const color = searchParams.color || emp.widget_color || "#0070c4";

  return (
    <div className="h-screen w-screen bg-transparent">
      <ChatInterface
        slug={emp.public_slug!}
        greeting={emp.greeting}
        employeeName={emp.name}
        color={color}
        compact
      />
    </div>
  );
}
