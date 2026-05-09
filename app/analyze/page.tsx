import { AppNav } from "@/components/AppNav";
import { AnalyzeForm } from "./AnalyzeForm";

export default function AnalyzePage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-white">
            Analyze a sales call
          </h1>
          <p className="mt-1 text-ink-400">
            Paste a transcript from your call. We'll score it, find what you
            missed, and draft your follow-up.
          </p>
        </div>
        <AnalyzeForm />
      </main>
    </>
  );
}
