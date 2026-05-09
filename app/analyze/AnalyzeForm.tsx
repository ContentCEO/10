"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SAMPLE = `Rep: Hey John, thanks for having me out. So you mentioned the roof has a leak above the kitchen?
Homeowner: Yeah, started about a month ago. Got worse with the last storm.
Rep: Got it. I took a look up there — you've got curling shingles, granules in the gutters, and the flashing around the chimney is shot. Honestly the whole roof's at end of life.
Homeowner: Okay. So how much are we talking?
Rep: For a full tear-off and architectural shingle, you're looking at $14,800.
Homeowner: Ouch. That's a lot more than I was expecting.
Rep: Yeah, materials have been crazy this year.
Homeowner: I'll need to talk to my wife and get a couple other quotes.
Rep: Sure, no problem. I'll email you the quote tonight. Just let me know.`;

const TRADES = [
  "Roofing",
  "HVAC",
  "Remodeling",
  "Plumbing",
  "Solar",
  "Windows & Doors",
  "Landscaping",
  "Painting",
  "Other",
];

export function AnalyzeForm() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [prospect, setProspect] = useState("");
  const [jobType, setJobType] = useState("");
  const [trade, setTrade] = useState("Roofing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transcript,
              title: title || undefined,
              prospect_name: prospect || undefined,
              job_type: jobType || undefined,
              trade,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to analyze");
          router.push(`/analyze/${data.id}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
          setLoading(false);
        }
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="prospect">
            Prospect name
          </label>
          <input
            id="prospect"
            className="input"
            placeholder="e.g. John Davis"
            value={prospect}
            onChange={(e) => setProspect(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="trade">
            Trade
          </label>
          <select
            id="trade"
            className="input"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
          >
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="jobType">
            Job type
          </label>
          <input
            id="jobType"
            className="input"
            placeholder="e.g. Full roof replacement"
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="title">
            Call title (optional)
          </label>
          <input
            id="title"
            className="input"
            placeholder="Auto-generated if blank"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between">
          <label className="label" htmlFor="transcript">
            Call transcript
          </label>
          <button
            type="button"
            className="text-xs text-brand-300 hover:text-brand-200"
            onClick={() => setTranscript(SAMPLE)}
          >
            Use sample transcript
          </button>
        </div>
        <textarea
          id="transcript"
          className="input min-h-[280px] font-mono text-xs leading-relaxed"
          placeholder="Paste the full call transcript here. Include speaker labels (Rep:/Homeowner:) when possible."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          required
          minLength={40}
        />
        <p className="mt-1 text-xs text-ink-500">
          Minimum ~40 characters. Longer, fuller transcripts produce better
          analyses.
        </p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex items-center justify-end gap-3">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Analyzing call…" : "Analyze call"}
        </button>
      </div>
    </form>
  );
}
