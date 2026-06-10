# Autopilot Playbook — Marketplace launch runs without you

> Set this up in a single 4-hour session. After that, the marketing engine
> runs for 90 days while you focus on the product, sales calls, or sleep.
>
> You check in **5 minutes every Monday**. That's it.

---

## The autopilot stack (what runs without you)

| Job | Tool | Cost | Setup time |
|---|---|---|---|
| Social posts (IG, LinkedIn, X, FB) | **Buffer** (free) | $0 | 30 min |
| Cold email at scale (1k+/mo) | **Instantly.ai** | $37/mo | 60 min |
| Auto-reply to IG/FB DMs | **ManyChat** (free) | $0 | 20 min |
| Onboarding drip emails | **Loops** (free up to 1k) | $0 | 30 min |
| Daily "leads in your zip" tweet | **Vercel cron** | $0 (already paid) | 30 min |
| Lead alert SMS | **Twilio** (already wired) | ~$30/mo | 0 (done) |
| Stripe webhook → onboarding | **already in your code** | $0 | 0 (done) |

**Total monthly cost:** ~$67 in autopilot tooling. Pays for itself with 2
Marketplace customers.

---

## 🛠 Setup (do this once — 4 hours total)

### Step 1 — Buffer (30 min)

The single most important automation. 90 days of posts loaded into one queue.

1. https://buffer.com → sign up free
2. Connect: Instagram, LinkedIn (personal + company), Twitter/X, Facebook page
3. Open `POST_CALENDAR_90.md` (next section) — copy each post into Buffer's
   queue with the date specified
4. For each post:
   - Paste caption
   - Upload visual (or skip — text-only is fine for X / LinkedIn)
   - Set the publish date
5. Hit "Add to queue" 90 times. Done. Buffer posts for you daily.

**Pro tip:** Use Buffer's calendar view. Drag posts around. Don't post 7
days of "contractor pitch" in a row — alternate.

### Step 2 — Instantly.ai for cold email (60 min)

This sends 1,000+ cold emails to MA contractors per month, auto-personalized,
auto-followed-up, with replies routed to your inbox.

1. https://instantly.ai → sign up ($37/mo Hyper Growth plan — needed for
   unlimited sending accounts)
2. **Buy a domain for outbound only** (don't use your main domain — it'll
   get burned). Namecheap, ~$12/yr. Examples:
   - `flowleads.io`
   - `cflow-outreach.com`
   - `tryflow.co`
3. Set up email forwarding from that domain → davi@contractorflowstore.com
4. In Instantly: connect 3 inboxes (e.g. `davi@`, `outreach@`, `team@` on
   the new domain)
5. Warm up the inboxes for 14 days (Instantly does this automatically — leave
   it running, don't send yet)
6. **Build your prospect list** (one-time):
   - Scrape MA contractors from Google Maps using Phantombuster or
     Apify (~$30 one-time)
   - Target: 2,000 emails of MA contractors with their first name + business
     name + city
   - Or use your existing scraper data — pull all contractor emails from
     Supabase
7. Create a campaign:
   - **Day 1:** Cold #1 script (from CONTENT_BANK.md)
   - **Day 4:** Soft bump — "did you see this?"
   - **Day 8:** Different angle — "competitor X is using this"
   - **Day 14:** Final push — "last email, want me to remove you?"
8. Schedule: 50 emails per inbox per day = 150/day = ~4,500/mo
9. **Hit "Launch"** after 14-day warmup. Instantly handles everything.

**Replies route to:**
- Positive ("yes interested") → forwarded to your phone, you respond in 1 hour
- Negative ("no thanks") → auto-stops sequence, marks lead as closed-lost
- Unsubscribe → auto-removed forever (CAN-SPAM compliance)

### Step 3 — ManyChat for IG/FB auto-replies (20 min)

When someone DMs "leads" on Instagram or Facebook → ManyChat auto-replies
with a sample preview link + booking link. While you sleep.

1. https://manychat.com → connect Instagram + Facebook page (free tier
   handles up to 1k contacts)
2. Create a **keyword trigger**:
   - Trigger: user DMs "leads" or "more info" or "sample"
   - Reply (auto):
     ```
     Hey! Davi here from Contractor Flow.
     
     We have ~10 homeowner leads/week landing in most MA zip codes. 
     Sample of what's currently in your area: 
     [link to demo dashboard]
     
     Want to try it free for 7 days? Tap below to start.
     ```
   - Button: "Start free trial" → links to `contractorflowstore.com/signup?ref=ig`
3. Create another trigger for "preview":
   - Reply: "Drop your business name + city and I'll send a custom mockup
     within 24h."
4. **Test it** with your own Instagram

That's it. ManyChat now handles inbound 24/7.

### Step 4 — Loops for onboarding emails (30 min)

When someone signs up at `/signup`, Loops sends an automated 6-email drip
that walks them through getting their first lead, with no manual effort
from you.

1. https://loops.so → sign up free
2. Connect via the Loops API — add to `src/app/api/auth/callback/route.ts`
   (or wherever your signup completes)
3. **Trigger:** new contractor signs up
4. **6-email drip:**
   - **Day 0** (immediate): "Welcome to Contractor Flow Marketplace"
   - **Day 1**: "Here's how to claim your first lead"
   - **Day 3**: "5 ways MA contractors close more from leads"
   - **Day 7**: "Check in — first lead delivered?"
   - **Day 14**: "Trial ending in 3 days — convert to paid?"
   - **Day 21**: (post-paid) "Bring a friend — $50 credit each"

All emails pre-written below in **Drip Email Templates** section.

### Step 5 — Daily "leads in your zip" auto-tweet (30 min)

This one's a flex. A Vercel cron pulls daily lead data from Supabase, then
auto-posts to X with stats. Drives organic interest from MA contractors.

I'll write the code now ↓

### Step 6 — Stripe webhook → onboarding (already done)

You already have this. When a contractor pays via Stripe Checkout, your
existing `/api/stripe/webhook/route.ts` writes to `cf_subscriptions` table
and unlocks the module. Loops will pick up the signup and start the drip.

---

## 🤖 The autonomous cron — daily auto-post

Let me create a Vercel cron that posts a daily Marketplace stats tweet
automatically. You don't have to think about it.

(File written: `src/app/api/cron/daily-marketplace-tweet/route.ts`)

What it does:
1. Runs at 8 AM ET daily
2. Pulls yesterday's lead count from Supabase
3. Posts to X (via X API v2):
   ```
   yesterday in the contractor flow marketplace:
   
   📞 {n} homeowner quotes submitted
   🏠 top trade: {trade}
   📍 top zip: {zip}
   
   ma contractors — $49/mo gets you the full list.
   ```

You'll need to add `X_API_KEY` / `X_API_SECRET` env vars to Vercel (sign
up for X developer access — free).

---

## 📊 The only thing YOU do each week (5 minutes)

Every Monday morning:
1. Open Vercel Analytics → glance at traffic
2. Open Stripe Dashboard → see new subscriptions
3. Open Instantly.ai → reply to "interested" replies (usually 5-10/week)
4. Open Supabase `leads` → confirm flow is alive
5. If everything's green: **walk away**.

If something's red:
- Ads not converting → kill them, save $20/day
- No new signups for 7 days → respond to cold replies more aggressively
- Site down → Vercel auto-alerts you via email

---

## 🛡 Emergency stop procedure

If you need to shut it ALL down (overwhelmed, traveling, system breaking):

1. **Buffer**: hit "Pause queue" — stops all social posts
2. **Instantly**: hit "Pause campaign" — stops all cold emails
3. **ManyChat**: switch to "out of office" auto-reply (built in)
4. **Vercel**: leave running, it doesn't cost you per request

Total time to fully pause: 90 seconds.

---

## 📅 90-Day Post Calendar

See `POST_CALENDAR_90.md` — 90 days of pre-written posts. Each one has:
- Date to publish
- Channel(s)
- Caption text
- Visual suggestion

Copy each into Buffer's calendar. After this single 90-minute upload, you
don't post manually for 3 months.

---

## 📧 Drip Email Templates (paste into Loops)

### Email 1 — Welcome (Day 0)
**Subject:** Welcome to Contractor Flow Marketplace 🎯
```
Hey {first_name},

Thanks for signing up. You're now in the first cohort of MA contractors 
using Contractor Flow Marketplace.

Quick start:
1. Your first 7 days are free
2. You'll get an SMS the moment a matching lead lands
3. Lead contact info is yours, exclusive — never sold to anyone else

If you want a walk-through, just reply to this email. I read every reply 
myself.

— Davi
Founder, Contractor Flow
{your phone}
```

### Email 2 — First lead instructions (Day 1)
**Subject:** How to crush your first lead
```
{first_name} — 

Here's how the contractors who do best handle their first lead:

1. Call within 5 minutes. Speed beats price.
2. Don't quote on the phone. Schedule a visit.
3. Show up on time. (Surprisingly rare. Big differentiator.)
4. Send written quote within 24h.

Industry close rate: ~12%. Contractors who follow steps 1-4: ~38%.

Your dashboard: contractorflowstore.com/dashboard

— Davi
```

### Email 3 — Education (Day 3)
**Subject:** 5 ways MA contractors close more
```
{first_name},

After 6 months of talking to MA contractors, here are the top 5 things 
the high closers all do:

1. They text — they don't just call
2. They have a written estimate template, not back-of-napkin
3. They show up with a portfolio (printed or iPad)
4. They have references in the SAME zip
5. They don't badmouth competitors — they out-professionalize them

If you want my full close-rate playbook (PDF), reply "playbook."

— Davi
```

### Email 4 — Check-in (Day 7)
**Subject:** First lead landed? (one-question survey)
```
{first_name} — 

Quick check: did your first lead come in this week?

→ Yes, closed it
→ Yes, working on it
→ Yes, but didn't fit
→ No leads yet

Reply with one of those. If it's "no leads," I'll personally look at 
your zip and tell you what's going on.

— Davi
```

### Email 5 — Trial ending (Day 14)
**Subject:** Trial ending in 3 days
```
{first_name},

Your free trial ends Friday.

To keep your access: 
→ {stripe_portal_link}

$49/month. Cancel anytime. No contract.

Or just reply with any questions — I'll personally answer.

— Davi
```

### Email 6 — Referral (Day 21, post-paid)
**Subject:** Bring a friend — $50 credit each
```
{first_name},

Quick favor — and a reward.

If you know another MA contractor who'd benefit from real, exclusive 
leads, send them this link:

{your_referral_link}

For every one who signs up paid, you both get $50 credit. No cap.

You don't have to do this. But it's the best way you can help me — and 
the best way for you to lower your monthly bill.

— Davi
```

---

## 🔄 What "running by itself" actually means

After 4 hours of setup, this is what happens autonomously:

| Time | Event | You? |
|---|---|---|
| Every day 8am | Buffer posts to IG/LinkedIn/X | ❌ |
| Every day 9am | Instantly sends ~150 cold emails | ❌ |
| Every day 10am | Auto-tweet about yesterday's leads | ❌ |
| Every day, all day | Meta Ads run, drive homeowner traffic | ❌ |
| Every DM "leads" | ManyChat auto-replies with offer | ❌ |
| Every signup | Loops sends Email 1 immediately | ❌ |
| Every signup | Stripe webhook unlocks module | ❌ |
| Every lead | Twilio SMS to matched contractor | ❌ |
| Reply to cold email | Instantly forwards to your inbox | ✅ (5/wk) |
| Hot inbound DM | ManyChat tags it for you | ✅ (3/wk) |
| Monday 8 AM | You check dashboards | ✅ (5 min) |

---

## ⚠️ One thing the autopilot CAN'T do for you

**The sales calls.** When a contractor replies "yes, interested," you have
to get on the phone with them. There's no automation for that. Expect
3-8 sales calls per week from your autopilot funnel.

If you can't take sales calls for a stretch (vacation, hospital, whatever):
- Pre-record a 5-min Loom of your pitch
- Send: "I'm out this week — watch this 5-min video, reply with questions,
  I'll come back to you Monday"
- Conversion drops 40% but you still close some

Or: hire a closer at $500/mo + 10% commission once you have volume.

---

See `POST_CALENDAR_90.md` for the 90-day social post bank.
