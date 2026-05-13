import { redirect } from "next/navigation";
import { NpsForm } from "./NpsForm";

// Plan 1 / D-9 — public NPS landing.
// /nps/<job_id>?score=8  (optional pre-fill from email link)

export const dynamic = "force-dynamic";

export default function NpsPage({ params, searchParams }: {
  params: { jobId: string };
  searchParams?: { score?: string };
}) {
  if (!params.jobId || params.jobId.length < 6) redirect("/");
  const initial = searchParams?.score ? Math.max(0, Math.min(10, Number(searchParams.score))) : null;
  return <NpsForm jobId={params.jobId} initialScore={Number.isFinite(initial as number) ? initial : null} />;
}
