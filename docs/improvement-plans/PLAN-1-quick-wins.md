# ContractorFlow Improvement Plan · PDF 1 of 3

> Theme: **Quick wins.** Ideas that ship in 1–2 days each, deliver immediate
> user-visible value, and need no external accounts/integrations to start.

---

## A · Customer / Client Dashboard (20)

1. **Inline lead editor** — click any lead row, edit name/phone/email in place, save on Enter. No detail-page round trip.
2. **Bulk actions** — checkbox column on the leads table, "Mark won / Mark lost / Assign to ..." actions at the top.
3. **Saved filters** — let the user save filter combinations ("Bathroom leads, Boston, last 7 days") with a one-click apply chip on the page.
4. **Stuck-lead alert** — a banner when any active lead hasn't been touched in 14 days, with a one-tap "Send a check-in" action.
5. **Daily morning brief** — 30-second AI-generated paragraph at the top of the dashboard summarizing what changed overnight.
6. **Wallet auto-refill** — checkbox: "Top up $50 when balance drops below $20". One-and-done config.
7. **Quick add via voice** — a mic button that transcribes a 10-second voice note into a fully-formed lead (Claude does the parsing).
8. **Auto-confirm follow-ups** — when an SMS reply comes in and matches "yes / works / sounds good", mark the proposed slot as confirmed without owner action.
9. **Recently viewed strip** — last 5 leads/customers/jobs the user opened, persistent across pages, top-right of every screen.
10. **Pinned customers** — star a customer to keep them at the top of the customers list with a special "VIP" badge.
11. **Job photo intake** — drag-drop photos into a job, auto-organized by date, accessible from the lead detail page.
12. **Lead value estimator** — when adding a lead with a service type, AI suggests a rough $ value based on past jobs of the same type.
13. **One-tap "looking forward to it" reply** — pre-canned warm response button for inbox messages that just say "thanks".
14. **Today's earnings tile** — show today's invoiced + collected $ at the top of the dashboard as a stat tile.
15. **Map view toggle** — switch the leads list to a map view with a pin for each lead's address.
16. **Customer source tag** — every customer record stores how they originally heard about the contractor (Yelp, referral, drive-by). Filter customers by source.
17. **Weather widget on jobs** — when a job is scheduled outdoors and the forecast shows rain, surface an alert with a "Reschedule?" button.
18. **Estimate vs final variance** — when a job is marked won, show the % variance between original estimate and final invoice. Helps contractors price better.
19. **Last-message preview** in the inbox list — show the most recent SMS/email body inline so you don't need to open every thread.
20. **Print-friendly proposal view** — every proposal has a "Print" route that strips chrome and renders clean for PDF / paper.

---

## B · Owner Mission Control (20)

1. **Per-agent drill-down** — clicking any agent card opens its full action history with filters.
2. **Live SQL console** — a card that lets you paste & run read-only SQL against the DB, results inline (admin-only, no destructive ops).
3. **Top performers leaderboard** — top 10 contractors by revenue / lead conversion this month.
4. **Failed-payment list** — every Stripe failed payment in the last 30 days, with a one-click "Retry" button.
5. **Trial conversion funnel** — % of signups → trial-active → paid, broken down by signup source.
6. **Churn watchlist** — accounts with declining usage in the last 14 days, ranked by likelihood to cancel.
7. **System-wide AI cost dashboard** — Claude/Anthropic spend per day, per agent, per contractor.
8. **Cron schedule visualizer** — calendar grid showing when each scraper next fires.
9. **Manual scraper trigger** — "Run now" button on every agent card and every scraper.
10. **Marketplace lead audit log** — who claimed what, when, for how much, refunds.
11. **Geographic heatmap** — US map showing lead density by ZIP, last 30 days.
12. **API rate-limit watch** — visualize how close each external API (Reddit, NOAA, SAM.gov, SerpAPI) is to its rate limit.
13. **Onboarding funnel** — % of new signups that complete each onboarding step.
14. **Agent action approve-all** — toolbar button to approve every pending action in the queue at once.
15. **Disable-by-source kill switch** — if Reddit starts spamming, one button to disable that one source.
16. **System health badges** in the top bar — Supabase, Stripe, Twilio, Anthropic, GitHub status dots.
17. **Audit log of all admin actions** — who promoted whom to admin, who refunded what.
18. **Pending refunds queue** — marketplace lead refund requests awaiting approval, sortable by age.
19. **Active subscriptions list** — every paying customer, plan, MRR contribution, sortable.
20. **"Impersonate" toggle** — view the app as a specific contractor for support purposes (read-only, audit-logged).

---

## C · Lead Generation (20)

1. **MA Hospital + university capital plans** — scrape MIT, Harvard, BIDMC, etc. capital project announcements.
2. **MA Housing Court calendar** — eviction filings (manual today) → automated where the court site allows.
3. **MassWildfire / damage maps** — when MEMA declares a damage zone, auto-create leads tagged "fire/wind damage".
4. **HOA newsletter RSS** — many MA HOAs publish RSS; extract "contractors needed" notices.
5. **Storm-track radar** — pull NWS storm tracks live, pre-position roofing leads in the path.
6. **Multi-language scraping** — Portuguese / Spanish keyword variants for MA's bilingual neighborhoods (Brockton, Lawrence).
7. **YouTube comments scraping** — search "Boston bathroom remodel" comments — homeowners ask questions there.
8. **Boston subway closures** — when a station shuts for repair, nearby property values + repair activity spike.
9. **Insurance claim publications** — MA insurance commissioner publishes monthly damage reports.
10. **NextDoor "neighbor recommendations" thread parser** — VA paste UI improved to auto-detect contractor recommendations posts.
11. **Yelp request-a-quote aggregator** — when a contractor doesn't respond, mark that as a "stolen lead" opportunity.
12. **Better Business Bureau MA complaints feed** — homeowners with unfinished work need someone else.
13. **MA DPH lead-paint orders** — public list of properties under lead abatement orders; high-value remediation leads.
14. **Permit expiry alerts** — when a building permit is about to expire, the owner often needs a different contractor.
15. **MA-wide foreclosure auctions** — beyond Boston ISD, every county's auction calendar.
16. **Construction-defect class actions** — public docket = homeowners needing repair contractors NOT involved in the defect.
17. **OldHouses subreddit deep cuts** — historic-home subs have extremely high renovation intent.
18. **Reddit cross-posting heuristic** — if a homeowner posts to 2+ MA subreddits in 24h, score them higher (more urgent).
19. **Storm-prep mode** — 48h before forecast severe weather, pre-fetch generators/roofing/tree-removal leads.
20. **Wholesaler off-market property feeds** — investor wholesaler lists (often public via mailing lists) → reno leads.

---

## D · Marketing Tab (20)

1. **Built-in landing page builder** — drag-drop hero + form + thank-you, deployed to a contractor's subdomain.
2. **Reusable proposal templates** — save a great proposal once, re-send to any new lead with one click + AI personalization.
3. **Auto-Google-Business-Profile updater** — when a job is marked complete, generate a post for their GBP automatically.
4. **Yard sign QR code generator** — printable QR sign that links to a contractor-branded review page.
5. **Email signature builder** — branded signature with phone, license #, recent project photo, review badge.
6. **Holiday card sender** — Thanksgiving / Christmas card to all past customers with one click (Lob integration).
7. **Door-hanger printable** — once a job is mid-progress, print door-hangers for the 10 neighboring addresses ("Working next door — same crew, free quotes").
8. **Referral request automation** — 30 days after job complete, auto-draft a referral ask to the customer.
9. **NPS survey** — 14 days post-job, send a quick 1-question survey; high scorers prompted for reviews, low scorers escalated to owner.
10. **Before/after photo carousel** — auto-build social-ready before/after squares from job photos.
11. **Review aggregation** — pull reviews from Yelp/Google/Houzz into one wall the contractor can show prospects.
12. **Local SEO checklist** — per-city checklist of citations to claim, with deep links.
13. **Branded estimate links** — every proposal lives at `contractor.contractorflow.com/p/abc123` with their logo.
14. **Auto-blog post writer** — when contractor finishes a notable job, AI drafts a blog post with photos for their site.
15. **Instagram caption generator** — drop a job photo, get a caption + hashtag set in their voice.
16. **TikTok script generator** — 60-second job-walkthrough scripts from before/after data.
17. **Boosted-post scheduler** — connect Meta Ads, schedule branded posts for the contractor's content automatically.
18. **Customer "thank you" video page** — page that thanks a specific customer by name; shareable on social.
19. **Lead-gen lead magnet** — auto-build a "Free 5-point roof inspection checklist" PDF the contractor can give away.
20. **Drip email sequences** — built-in 7-touch sequence after lead capture, customizable per service type.

---

## E · Sales System (20)

1. **AI proposal length toggle** — short / medium / detailed, contractor picks per proposal.
2. **E-signature on proposals** — embed signature pad inline, signed proposals auto-marked as won.
3. **Deposit-link generator** — every accepted proposal generates a Stripe deposit link sent to the customer.
4. **Auto-invoice on completion** — when a job is marked complete, draft invoice queued for owner review.
5. **Recurring-customer auto-quote** — when a recurring customer asks for the same service, pre-fill the proposal with their last accepted price + inflation adjustment.
6. **Price-match alerts** — if a contractor's quoted price is >25% off industry median for that service+city, surface an alert.
7. **Win/loss reason tracker** — when a lead is marked lost, ask "why?" (price, timing, found someone else) — track patterns.
8. **Quote-to-close time tracker** — average days from estimate sent to won; flag laggards.
9. **Auto-pricing engine** — set base $/sqft per service, auto-calculate proposal totals.
10. **Material cost lookup** — pull live material costs from Home Depot Pro / Ferguson APIs at quote time.
11. **Contract clause library** — saved boilerplate clauses (payment schedule, change orders, warranty) → drag into any proposal.
12. **Change-order workflow** — formal change-order PDF + e-sign for mid-job scope changes.
13. **Lien-waiver auto-generator** — at job completion, auto-draft the conditional lien waiver.
14. **Customer credit check** — quick Experian / Equifax soft pull at quote time for jobs >$10k.
15. **Project milestone billing** — split big jobs into 3-5 invoicing milestones automatically.
16. **Sales pipeline forecasting** — weighted forecast: pipeline $ × probability per stage = expected revenue this month.
17. **Lost-lead auto-nurture** — every lost lead enters a quarterly check-in sequence forever.
18. **Quick estimate calculator** — public calculator widget the contractor embeds on their site; pre-fills a lead in the CRM.
19. **No-show no-payment auto-fee** — auto-add a no-show fee to invoice when customer misses scheduled appointment.
20. **Tip jar on completion email** — let happy customers tip the crew (Stripe), goes directly to the crew's account.

---

## F · Look, Layout & Design (20)

1. **Dark mode for every in-app page** — extend the dashboard's dark theme across leads, jobs, customers, settings.
2. **Per-page hero header pattern** — every page gets a consistent gradient hero with breadcrumbs + page actions.
3. **Density preference applied everywhere** — already saved in /preferences; wire it through to table row heights, padding.
4. **Skeleton loaders** — replace blank loading states with shimmering card skeletons for perceived speed.
5. **Page transitions** — subtle fade between routes (CSS view transitions API).
6. **Animated number counters** — KPI tiles count up from 0 on first paint.
7. **Empty-state illustrations** — when a list is empty, show a hand-drawn-style SVG + helpful CTA, not a sad "no results".
8. **Toast notifications** — bottom-right toast for "Lead saved", "Invoice sent", etc., instead of refresh-to-confirm.
9. **Keyboard shortcuts overlay** — `?` opens a cheat sheet of every shortcut.
10. **Cmd+K command palette** — global jump-to-anything (already designed; wire it up).
11. **Reduce motion respect** — honor `prefers-reduced-motion` for accessibility.
12. **High-contrast accessibility mode** — option in /preferences for higher-contrast borders + text.
13. **Larger touch targets on mobile** — every button ≥44px tall on small screens.
14. **Bottom-nav for mobile** — already exists; refresh it with the same gradient language as the sidebar.
15. **Sidebar collapse memory** — already saved in /preferences; honor on load.
16. **Custom focus rings** — branded focus ring (brand-gradient outline) on every focusable element.
17. **Inline help tooltips** — `?` icon next to obscure features explains them in a tooltip.
18. **Typeface upgrade** — try Geist Mono or JetBrains Mono for the table/data fonts for sharper readability.
19. **System fonts fallback** — for offline / dev, fallback to system UI stack.
20. **Onboarding tour** — 4-step interactive guided tour for new signups, dismissible.

---

*End of PDF 1.*
