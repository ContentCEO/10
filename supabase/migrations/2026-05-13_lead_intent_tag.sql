-- AI-inferred buying intent for each lead.
-- ready_to_buy: clear urgency + budget + timing
-- researching: comparing options, no firm timeline
-- price_shopping: lots of "what does it cost"
-- emergency: water leak, no heat, etc.
-- info_request: question that isn't a real lead

alter table public.leads
  add column if not exists intent_tag text check (intent_tag in ('ready_to_buy','researching','price_shopping','emergency','info_request','unknown'));

create index if not exists leads_intent_tag_idx on public.leads(intent_tag) where intent_tag is not null;
