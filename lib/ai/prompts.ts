export const SALES_ANALYST_SYSTEM = `You are an elite sales coach for home-improvement and trade contractors (roofing, HVAC, remodeling, plumbing, solar, landscaping, etc.). You analyze recorded sales conversations between a contractor's sales rep and a homeowner prospect.

You are pragmatic, direct, and trade-aware. You understand pricing objections, "I need to talk to my spouse," "I'm getting other quotes," timing concerns, financing, warranty, and trust signals. You write in plain language a contractor can act on tomorrow.

Always return STRICT JSON that matches the schema requested. Never include prose outside the JSON. Never invent details that are not in the transcript.`;

export function buildAnalysisPrompt(transcript: string, context?: {
  trade?: string;
  jobType?: string;
  prospectName?: string;
}) {
  const trade = context?.trade ? `Trade: ${context.trade}` : "";
  const jobType = context?.jobType ? `Job type: ${context.jobType}` : "";
  const prospectName = context?.prospectName
    ? `Prospect: ${context.prospectName}`
    : "";
  const ctx = [trade, jobType, prospectName].filter(Boolean).join("\n");

  return `Analyze the following sales call transcript.

${ctx ? `Context:\n${ctx}\n\n` : ""}Transcript:
"""
${transcript}
"""

Return ONLY valid JSON in this exact shape:

{
  "score": <integer 1-100, overall call quality>,
  "close_probability": <integer 0-100, likelihood this lead closes within 30 days>,
  "summary": "<2-3 sentence executive summary of how the call went>",
  "strengths": ["<specific thing the rep did well, with a brief example>", ...],
  "missed_opportunities": [
    {
      "moment": "<short label, e.g. 'Did not isolate the price objection'>",
      "what_happened": "<1 sentence describing what the rep did or failed to do>",
      "better_response": "<exact words the rep should have said, in quotes-ready form>"
    }
  ],
  "objections": [
    {
      "objection": "<the prospect's objection, paraphrased>",
      "category": "<price | timing | spouse | competition | trust | scope | financing | other>",
      "rep_handled_well": <true|false>,
      "recommended_response": "<a polished response the rep can use next time, written as the rep speaking>"
    }
  ],
  "next_steps": ["<concrete action the rep should take in the next 24-48h>", ...],
  "followup_email": "<a ready-to-send follow-up email from the rep to the prospect, 120-180 words, friendly, references specifics from the call, ends with a clear CTA>",
  "followup_sms": "<a ready-to-send SMS, under 320 characters, casual but professional, with a clear CTA>"
}

Scoring rubric:
- 90-100: Excellent discovery, strong rapport, objections handled, clear next step booked
- 75-89: Solid call, minor gaps
- 60-74: Average, several missed opportunities
- 40-59: Weak discovery or weak close
- 1-39: Poor — likely lost deal

Be honest. If the rep was strong, say so. If the rep talked over the customer or didn't ask for the sale, score accordingly. Use specifics from the transcript whenever possible.`;
}

export function buildScriptPrompt(input: {
  trade: string;
  scenario: string;
  tone?: string;
  notes?: string;
}) {
  return `Write a sales script for a contractor.

Trade: ${input.trade}
Scenario: ${input.scenario}
${input.tone ? `Tone: ${input.tone}` : ""}
${input.notes ? `Notes: ${input.notes}` : ""}

Return ONLY JSON:
{
  "name": "<short name for the script>",
  "body": "<full script, including: opener, discovery questions, presenting value, handling 1-2 likely objections, and a clear ask for the sale or next step. Use plain text with section headers in ALL CAPS on their own line.>"
}`;
}

export function buildObjectionPrompt(objection: string, trade?: string) {
  return `A homeowner just said the following objection to a ${trade || "contractor"} sales rep:

"${objection}"

Return ONLY JSON:
{
  "category": "<price | timing | spouse | competition | trust | scope | financing | other>",
  "response": "<a 60-110 word response, written as the rep speaking, that acknowledges the concern, isolates it, and moves the conversation forward without being pushy>"
}`;
}
