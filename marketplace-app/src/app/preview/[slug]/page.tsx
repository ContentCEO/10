import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, Award, BadgeCheck, Calendar, CheckCircle2, ChevronRight, ClipboardList,
  Clock, CreditCard, Facebook, Hammer, Handshake, Home, Instagram, Mail, MapPin,
  Menu, MessageSquare, Phone, Shield, Star, ThumbsUp, Wrench,
} from "lucide-react";

export const dynamic = "force-static";
export const revalidate = 86400;

/*
 * Cold-outreach mockup page. Davi sends a prospective contractor a link
 * like /preview/joes-roofing-marblehead, the prospect sees a fully-
 * rendered "this is what your site could look like" mock with their
 * business name baked in. CF attribution is subtle, only at the very
 * bottom — so the prospect sees their own brand, not a sales pitch.
 *
 * Real-time business data isn't wired yet — everything is derived from
 * the slug + a stable per-trade theme + sensible defaults.
 */

function decodeSlug(slug: string): { biz: string; city: string | null; trade: TradeKey } {
  const parts = decodeURIComponent(slug).split("-");
  const cityCandidate = parts[parts.length - 1] ?? "";
  const looksLikeCity = /^[a-z]{4,}$/.test(cityCandidate);
  const city = looksLikeCity ? cap(cityCandidate) : null;
  const bizParts = looksLikeCity ? parts.slice(0, -1) : parts;
  const biz = bizParts.map(cap).join(" ") || "Your Business";
  return { biz, city, trade: inferTrade(biz) };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

type TradeKey = "roofing" | "siding" | "plumbing" | "electrical" | "hvac" | "painting" | "landscaping" | "cleaning" | "remodel" | "general";

function inferTrade(biz: string): TradeKey {
  const lower = biz.toLowerCase();
  if (/roof/.test(lower))                       return "roofing";
  if (/sid|gutter/.test(lower))                 return "siding";
  if (/plumb/.test(lower))                      return "plumbing";
  if (/electric|wiring/.test(lower))            return "electrical";
  if (/hvac|heat|cool|ac\b/.test(lower))        return "hvac";
  if (/paint/.test(lower))                      return "painting";
  if (/landscap|lawn|tree/.test(lower))         return "landscaping";
  if (/clean/.test(lower))                      return "cleaning";
  if (/remodel|kitchen|bath|reno/.test(lower))  return "remodel";
  return "general";
}

interface TradeTheme {
  label: string;
  tagline: string;
  heroImg: string;
  accentBg: string;       // tailwind bg
  accentText: string;     // tailwind text
  accentBorder: string;
  accentHover: string;
  ctaBg: string;
  ctaHover: string;
  services: { icon: typeof Hammer; title: string; body: string }[];
  gallery: { img: string; title: string; town: string }[];
  testimonials: { name: string; town: string; body: string; project: string }[];
  faqs: { q: string; a: string }[];
}

const THEMES: Record<TradeKey, TradeTheme> = {
  roofing: {
    label: "Roofing",
    tagline: "Built to outlast the next nor'easter.",
    heroImg: "https://images.unsplash.com/photo-1632154333781-21f1a36f5f6e?w=1600&q=80&auto=format&fit=crop",
    accentBg: "bg-amber-500",
    accentText: "text-amber-600",
    accentBorder: "border-amber-200",
    accentHover: "hover:bg-amber-600",
    ctaBg: "bg-amber-600",
    ctaHover: "hover:bg-amber-500",
    services: [
      { icon: Home,    title: "Asphalt shingle roofs",     body: "GAF & Owens Corning architectural shingles. 50-year materials, 10-year workmanship warranty." },
      { icon: Shield,  title: "Metal & standing seam",     body: "Lifetime metal panels for steep-slope, low-slope, and accent roofs. Energy-rated finishes." },
      { icon: Wrench,  title: "Roof repairs & leak fixes", body: "Same-week response. Most leaks repaired in one visit. Written diagnosis before any work." },
      { icon: Hammer,  title: "Storm damage claims",       body: "We meet with your adjuster, document damage, and handle the paperwork end-to-end." },
      { icon: ClipboardList, title: "Gutter installation", body: "Seamless aluminum gutters, leaf guards, and downspouts sized for your roof's pitch and pitch." },
      { icon: Award,   title: "Ice & water shield",        body: "Full perimeter protection. The detail that keeps your ceilings dry during a January thaw." },
    ],
    gallery: [
      { img: "https://images.unsplash.com/photo-1632154333781-21f1a36f5f6e?w=800&q=80&auto=format&fit=crop", title: "Full tear-off + GAF Timberline HDZ", town: "Marblehead" },
      { img: "https://images.unsplash.com/photo-1604754742629-3e0498a8e0aa?w=800&q=80&auto=format&fit=crop", title: "Standing seam metal roof",            town: "Newburyport" },
      { img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80&auto=format&fit=crop", title: "Cape Cod re-roof + skylights",        town: "Hingham" },
      { img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop", title: "Storm damage repair + insurance",     town: "Beverly" },
      { img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop", title: "New gutters + ice shield",            town: "Salem" },
      { img: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80&auto=format&fit=crop", title: "Slate-look composite",                town: "Andover" },
    ],
    testimonials: [
      { name: "Karen M.", town: "Marblehead",  project: "Full tear-off",    body: "They were the only ones who didn't try to upsell me. Showed up when they said they would. Site was spotless when they left. The roof looks beautiful." },
      { name: "Tom R.",   town: "Beverly",     project: "Leak repair",      body: "Had a leak the day before Thanksgiving. They came out the same afternoon, found it, fixed it. No drama." },
      { name: "Lisa G.",  town: "Newburyport", project: "Standing seam",    body: "We got 4 quotes. They weren't the cheapest but they explained everything in plain English. Two years in and not a single issue." },
    ],
    faqs: [
      { q: "How long does a typical re-roof take?",          a: "Most single-family asphalt re-roofs take 1-2 days. Metal and complex roofs take 3-5 days. We give you a precise day count in the written quote." },
      { q: "Do you handle the insurance claim?",             a: "Yes. We meet with your adjuster on-site, document the damage with photos, and submit supplements when needed. No extra charge." },
      { q: "What if it rains during my install?",            a: "We watch the forecast carefully. If rain is in the day's outlook, we don't open the roof. Any open area gets tarped overnight." },
      { q: "What's the warranty?",                           a: "10 years on workmanship from us, plus the manufacturer warranty on materials (typically 30-50 years for asphalt, lifetime for metal)." },
      { q: "Do you offer financing?",                        a: "Yes — 0% APR for 12 months, or low monthly payments up to 84 months. Soft credit check, no impact on your score." },
    ],
  },
  siding: {
    label: "Siding",
    tagline: "Curb appeal that holds up to MA winters.",
    heroImg: "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1600&q=80&auto=format&fit=crop",
    accentBg: "bg-slate-700",
    accentText: "text-slate-700",
    accentBorder: "border-slate-200",
    accentHover: "hover:bg-slate-800",
    ctaBg: "bg-slate-800",
    ctaHover: "hover:bg-slate-700",
    services: [
      { icon: Home,    title: "James Hardie fiber cement", body: "Class-A fire rated, hail resistant, 30-year color warranty. The MA standard for durable siding." },
      { icon: Shield,  title: "Vinyl siding",              body: "Insulated and standard vinyl in 40+ colors. Lifetime fade warranty from CertainTeed and Mastic." },
      { icon: Wrench,  title: "Cedar shingle restoration", body: "Hand-split shake replacement, staining, and re-coursing. Preserve the New England look." },
      { icon: Hammer,  title: "Trim & soffit",             body: "Azek, PVC, and composite trim that won't rot. Custom milled to match historic profiles." },
      { icon: Award,   title: "Gutter & leader systems",   body: "Half-round and K-style aluminum. Sized to your roof's load. Leaf guards available." },
      { icon: BadgeCheck, title: "Energy-saving wrap",     body: "Tyvek house wrap + foam board insulation. Lower heating bills, dryer walls." },
    ],
    gallery: [
      { img: "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800&q=80&auto=format&fit=crop", title: "James Hardie + black trim",    town: "Brookline" },
      { img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80&auto=format&fit=crop", title: "Vinyl re-side + new gutters",  town: "Wakefield" },
      { img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop", title: "Cedar shake restoration",      town: "Marblehead" },
      { img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop", title: "Full Hardie wrap",             town: "Lexington" },
      { img: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80&auto=format&fit=crop", title: "Modern Azek trim package",     town: "Concord" },
      { img: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80&auto=format&fit=crop", title: "Color match for HOA",          town: "Newton" },
    ],
    testimonials: [
      { name: "Frank D.",  town: "Brookline",   project: "Full Hardie install", body: "Crew was the most professional I've hired. Daily cleanup. Foreman walked me through everything. House looks 20 years younger." },
      { name: "Megan A.",  town: "Wakefield",   project: "Vinyl + trim",        body: "Quote was exactly what I paid. No surprises. They finished a day early." },
      { name: "Joe & Pat", town: "Marblehead",  project: "Cedar restoration",   body: "We were nervous about losing the original look. They matched it perfectly and the new wood is hand-split, not machine cut." },
    ],
    faqs: [
      { q: "How long does a full siding job take?",      a: "Most single-family homes are 5-10 working days, weather depending. We give you a precise schedule in the quote." },
      { q: "Vinyl or Hardie — which is better?",         a: "Hardie lasts longer and looks more premium but costs ~30% more. We walk through your specific house and budget on the in-home estimate." },
      { q: "Will you match my HOA color rules?",         a: "Yes. We submit color samples for your HOA's approval before ordering material. No surprises." },
      { q: "Do you replace rotten sheathing?",           a: "Yes. We open a section first, find any rot, and quote the repair separately so you only pay for what's actually rotted." },
      { q: "Financing?",                                 a: "0% APR for 18 months on jobs over $10k, or fixed monthly payments up to 10 years. Soft credit check." },
    ],
  },
  plumbing: {
    label: "Plumbing",
    tagline: "Master plumbers. Honest pricing. No upsells.",
    heroImg: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1600&q=80&auto=format&fit=crop",
    accentBg: "bg-cyan-700",
    accentText: "text-cyan-700",
    accentBorder: "border-cyan-200",
    accentHover: "hover:bg-cyan-800",
    ctaBg: "bg-cyan-700",
    ctaHover: "hover:bg-cyan-600",
    services: [
      { icon: Wrench,  title: "Emergency repairs",       body: "Burst pipes, water heater failures, sewage backups. We answer the phone after hours." },
      { icon: Home,    title: "Water heater install",    body: "Tankless and conventional. Rheem, Rinnai, Bradford White. Full hookup + permit." },
      { icon: Shield,  title: "Drain cleaning",          body: "Hydro-jet, snake, and camera inspection. We find the cause, not just the symptom." },
      { icon: Hammer,  title: "Bathroom & kitchen reno", body: "Rough plumbing, fixture install, gas line work. We coordinate with your GC or work standalone." },
      { icon: Award,   title: "Sewer line repair",       body: "Trenchless lining and traditional excavation. Camera inspection included." },
      { icon: ThumbsUp, title: "Fixture upgrades",       body: "Toilets, faucets, garbage disposals, ice makers. Premium brands at fair pricing." },
    ],
    gallery: [
      { img: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80&auto=format&fit=crop", title: "Tankless water heater install", town: "Dedham" },
      { img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format&fit=crop", title: "Full bath rough plumbing",      town: "Watertown" },
      { img: "https://images.unsplash.com/photo-1581094289810-adf5d25690e3?w=800&q=80&auto=format&fit=crop", title: "Sewer line replacement",        town: "Belmont" },
      { img: "https://images.unsplash.com/photo-1604754742629-3e0498a8e0aa?w=800&q=80&auto=format&fit=crop", title: "Emergency burst pipe",          town: "Brookline" },
      { img: "https://images.unsplash.com/photo-1581094289810-adf5d25690e3?w=800&q=80&auto=format&fit=crop", title: "Gas line for new range",        town: "Newton" },
      { img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format&fit=crop", title: "Tile-shower drain conversion",   town: "Arlington" },
    ],
    testimonials: [
      { name: "Sarah K.", town: "Dedham",     project: "Water heater swap",  body: "Hot water died at 9pm. They were here at 7am. New tankless installed same day. Fair price." },
      { name: "Mike T.",  town: "Watertown",  project: "Bath remodel rough", body: "Coordinated with our GC, never delayed the job, inspector signed off first try." },
      { name: "Rachel P.", town: "Belmont",   project: "Sewer line",         body: "Trenchless saved our front yard. They explained every option and didn't push the most expensive one." },
    ],
    faqs: [
      { q: "Do you charge for estimates?",          a: "No charge for in-home estimates on jobs over $500. Emergency diagnostic fee ($89) is credited toward the repair if you proceed." },
      { q: "Are you licensed and insured?",         a: "Yes. MA Master Plumber License #XXXXX. $2M liability, full workers comp. Certificates on request." },
      { q: "Do you offer financing?",               a: "Yes — Synchrony Financing for repairs over $1,000. Same-day decision." },
      { q: "What's your warranty?",                 a: "1 year on labor, plus full manufacturer warranties on parts. We honor extended warranties on water heaters." },
      { q: "How fast can you come for an emergency?", a: "Within 2 hours during business hours. After-hours: 1 hour for active leaks, 4 hours for non-emergency." },
    ],
  },
  electrical: {
    label: "Electrical",
    tagline: "MA Master Electricians. Code-correct, every time.",
    heroImg: "https://images.unsplash.com/photo-1597176116047-876a32798fcc?w=1600&q=80&auto=format&fit=crop",
    accentBg: "bg-yellow-500",
    accentText: "text-yellow-600",
    accentBorder: "border-yellow-200",
    accentHover: "hover:bg-yellow-600",
    ctaBg: "bg-slate-900",
    ctaHover: "hover:bg-slate-800",
    services: [
      { icon: Shield,  title: "Panel upgrades",            body: "100A → 200A service upgrades. Square D, Eaton, Siemens. Permit + utility coordination included." },
      { icon: Home,    title: "EV charger install",        body: "Level 2 chargers — Tesla, ChargePoint, Wallbox. MassSave rebate paperwork done for you." },
      { icon: Wrench,  title: "Whole-home rewiring",       body: "Knob-and-tube replacement, aluminum-to-copper conversion. We work room-by-room to keep you living in the house." },
      { icon: Hammer,  title: "Generator install",         body: "Generac and Kohler standby generators. Sized to your load, transfer switch included." },
      { icon: Award,   title: "Recessed lighting",         body: "LED retrofit, dimmer controls, smart switches. Energy audit included on jobs over $2k." },
      { icon: BadgeCheck, title: "Code inspection prep",   body: "Buying or selling a home? We do pre-inspection and remediation so you don't fail at closing." },
    ],
    gallery: [
      { img: "https://images.unsplash.com/photo-1597176116047-876a32798fcc?w=800&q=80&auto=format&fit=crop", title: "200A panel upgrade",      town: "Cambridge" },
      { img: "https://images.unsplash.com/photo-1581094289810-adf5d25690e3?w=800&q=80&auto=format&fit=crop", title: "EV charger + sub-panel",  town: "Newton" },
      { img: "https://images.unsplash.com/photo-1604754742629-3e0498a8e0aa?w=800&q=80&auto=format&fit=crop", title: "Knob-and-tube replacement", town: "Somerville" },
      { img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80&auto=format&fit=crop", title: "Whole-home recessed LED", town: "Brookline" },
      { img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop", title: "Generac 22kW standby",    town: "Lexington" },
      { img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop", title: "Garage shop sub-panel",   town: "Arlington" },
    ],
    testimonials: [
      { name: "Dan C.",  town: "Cambridge", project: "Panel upgrade",       body: "Got 3 quotes. They were neither cheapest nor most expensive but they were the ONLY ones who actually came inside to look at the panel before quoting." },
      { name: "Maria S.", town: "Newton",   project: "EV charger",          body: "Done in 4 hours. Handled the MassSave rebate paperwork. $400 back in my mailbox three months later." },
      { name: "Greg L.",  town: "Somerville", project: "Knob-and-tube swap",body: "We were nervous about the dust and disruption. They covered everything, room by room. Smart, clean, fast." },
    ],
    faqs: [
      { q: "Do you pull permits?",                a: "Yes, for every job that requires one. The permit + inspection cost is included in our quote, never an add-on." },
      { q: "Are your electricians MA-licensed?",  a: "Every tech on a job site is at minimum a journeyman, supervised by a master. Master Electrician License #XXXXX." },
      { q: "Will my power be off all day?",       a: "We schedule the actual cut-over for ~2 hours, usually mid-morning. We coordinate with you so it lands during work hours, not dinner." },
      { q: "How long for an EV charger?",         a: "Most installs are 3-4 hours. Complex routing through finished basement can run 6-8 hours. We quote with a precise time estimate." },
      { q: "What's your warranty?",               a: "2 years on workmanship, manufacturer warranty on parts. Lifetime free service on panel work we did." },
    ],
  },
  hvac: {
    label: "HVAC",
    tagline: "Comfortable homes. Honest service. Lower bills.",
    heroImg: "https://images.unsplash.com/photo-1581094288338-2244c4aa1c5e?w=1600&q=80&auto=format&fit=crop",
    accentBg: "bg-rose-600",
    accentText: "text-rose-600",
    accentBorder: "border-rose-200",
    accentHover: "hover:bg-rose-700",
    ctaBg: "bg-rose-600",
    ctaHover: "hover:bg-rose-500",
    services: [
      { icon: Home,    title: "Heat pump install",     body: "Mitsubishi, Daikin, LG. Cold-climate units that work down to -15°F. MassSave $10k rebate handled for you." },
      { icon: Shield,  title: "Furnace + AC",          body: "Gas, oil, and electric furnaces. Variable-speed central AC. Carrier, Trane, Lennox." },
      { icon: Wrench,  title: "Mini-split systems",    body: "Ductless multi-zone systems. Perfect for additions, attics, and homes without ductwork." },
      { icon: Hammer,  title: "Ductwork & venting",    body: "Custom sheet metal, flex line, and venting. We size your duct system to your actual load, not a rule of thumb." },
      { icon: Award,   title: "Annual maintenance",    body: "Spring + fall tune-ups. Filter replacement, refrigerant check, coil cleaning, safety check." },
      { icon: BadgeCheck, title: "Indoor air quality", body: "HEPA filtration, UV sanitization, humidifier/dehumidifier integration. Allergy-friendly homes." },
    ],
    gallery: [
      { img: "https://images.unsplash.com/photo-1581094288338-2244c4aa1c5e?w=800&q=80&auto=format&fit=crop", title: "Mitsubishi heat pump",      town: "Lincoln" },
      { img: "https://images.unsplash.com/photo-1581094289810-adf5d25690e3?w=800&q=80&auto=format&fit=crop", title: "Ductless mini-split",       town: "Acton" },
      { img: "https://images.unsplash.com/photo-1597176116047-876a32798fcc?w=800&q=80&auto=format&fit=crop", title: "Furnace + AC upgrade",      town: "Wellesley" },
      { img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop", title: "Whole-house ducted system", town: "Weston" },
      { img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop", title: "Attic mini-split zone",     town: "Concord" },
      { img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80&auto=format&fit=crop", title: "Boiler + indirect tank",    town: "Sudbury" },
    ],
    testimonials: [
      { name: "Pat & Joe", town: "Lincoln",   project: "Heat pump conversion", body: "Ditched oil after 30 years. Heat pump is quieter than the boiler ever was and the rebate paperwork was handled for us." },
      { name: "Ellen R.",  town: "Acton",     project: "Mini-split for addition", body: "Our addition was always 10° colder. Single zone mini-split fixed it in one day." },
      { name: "Brian D.",  town: "Wellesley", project: "Furnace + AC",         body: "Got 4 quotes for the same Trane equipment, prices varied $4k. They were in the middle but offered the best warranty." },
    ],
    faqs: [
      { q: "How big should my heat pump be?",         a: "We do a Manual J load calc — proper sizing matters more than brand. Oversized units short-cycle and underdehumidify." },
      { q: "What about the MassSave rebate?",         a: "Up to $10,000 back per home on whole-home heat pumps. We do the paperwork end-to-end. Check arrives ~12 weeks after install." },
      { q: "How cold can a heat pump work?",          a: "Modern cold-climate heat pumps are rated to -15°F. We size with backup electric resistance for the few hours per year you'd need it." },
      { q: "Do you service brands you didn't install?", a: "Yes — we service all major brands. Most repairs done in one visit, parts truck stocked daily." },
      { q: "Financing?",                              a: "0% APR for 24 months on full-system installs through MassSave HEAT Loan program. Soft credit pull." },
    ],
  },
  painting: {
    label: "Painting",
    tagline: "Clean lines. Lasting finish. Clean crew.",
    heroImg: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1600&q=80&auto=format&fit=crop",
    accentBg: "bg-violet-700",
    accentText: "text-violet-700",
    accentBorder: "border-violet-200",
    accentHover: "hover:bg-violet-800",
    ctaBg: "bg-violet-700",
    ctaHover: "hover:bg-violet-600",
    services: [
      { icon: Home,    title: "Interior painting",      body: "Walls, ceilings, trim. Benjamin Moore Aura + Regal Select. Two coats minimum, prep done right." },
      { icon: Shield,  title: "Exterior painting",      body: "Power wash, scrape, prime, paint. Sherwin Williams Duration. 7-year warranty on the finish." },
      { icon: Wrench,  title: "Cabinet refinishing",    body: "Spray finish kitchen cabinets — like new without the cost of replacement. 5-day turn-around." },
      { icon: Hammer,  title: "Deck staining",          body: "Cabot, Sikkens, and Olympic stains. Wood prep + repair before stain. Sealed for water + UV." },
      { icon: Award,   title: "Wallpaper removal",      body: "Steam-strip + skim coat. We restore the wall to perfectly smooth before we paint." },
      { icon: BadgeCheck, title: "Drywall + plaster repair", body: "Cracks, holes, water damage. We blend the patch to match texture before paint." },
    ],
    gallery: [
      { img: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80&auto=format&fit=crop", title: "Whole-house interior",       town: "Wellesley" },
      { img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format&fit=crop", title: "Kitchen cabinet refinish",   town: "Belmont" },
      { img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop", title: "Exterior + trim",            town: "Newton" },
      { img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop", title: "Two-tone exterior",          town: "Brookline" },
      { img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80&auto=format&fit=crop", title: "Cedar deck stain",          town: "Lexington" },
      { img: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80&auto=format&fit=crop", title: "Period home restoration",    town: "Concord" },
    ],
    testimonials: [
      { name: "Lauren H.", town: "Wellesley", project: "Whole-house interior", body: "Crew showed up at 7am, left at 5pm, every day for a week. House was cleaner when they left than when they arrived." },
      { name: "Steven K.", town: "Belmont",   project: "Cabinet refinish",     body: "We were going to spend $40k on new cabinets. They sprayed ours for $4,500 and they look brand new." },
      { name: "Diane W.",  town: "Newton",    project: "Exterior paint",       body: "5 years later and still no peeling. The prep work made the difference." },
    ],
    faqs: [
      { q: "Do you cover furniture and floors?",     a: "Plastic over everything that stays, 12oz drop cloths over floors. Items we move get re-placed exactly where they were." },
      { q: "How many coats do you do?",              a: "Two coats minimum on interior, with proper drying time between. Exterior: prime + two coats. We never bid one-coat jobs." },
      { q: "What paint do you use?",                 a: "Benjamin Moore Aura/Regal Select interior, Sherwin Williams Duration exterior. Premium brands only — no contractor-grade." },
      { q: "Will my house smell?",                   a: "We use low-VOC paints. Most rooms are usable within 4 hours, sleep-able the same night with windows open." },
      { q: "Warranty?",                              a: "3 years interior, 7 years exterior on workmanship. We come back and fix peeling/cracking at no charge within that window." },
    ],
  },
  landscaping: {
    label: "Landscaping",
    tagline: "Yards your neighbors notice.",
    heroImg: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&q=80&auto=format&fit=crop",
    accentBg: "bg-emerald-700",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-200",
    accentHover: "hover:bg-emerald-800",
    ctaBg: "bg-emerald-700",
    ctaHover: "hover:bg-emerald-600",
    services: [
      { icon: Home,    title: "Weekly lawn care",         body: "Mow, edge, trim, blow. Same crew every week. Twice-monthly fertilization included." },
      { icon: Shield,  title: "Spring + fall cleanup",    body: "Leaf removal, bed cleanup, mulching. We haul everything away — no piles left behind." },
      { icon: Wrench,  title: "Hardscape & patios",       body: "Bluestone, brick, and pavers. Sitting walls, fire pits, walkways. Engineered to last 30+ years." },
      { icon: Hammer,  title: "Planting design",          body: "Native and deer-resistant. Designed for 4-season interest. Installation + 1-year guarantee on plants." },
      { icon: Award,   title: "Irrigation systems",       body: "Smart controllers, drip zones, rain sensors. Lower water bills, healthier lawn." },
      { icon: BadgeCheck, title: "Snow + ice management", body: "Driveway + walkway clearing within 4 hours of 2\" accumulation. Per-event or seasonal contracts." },
    ],
    gallery: [
      { img: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80&auto=format&fit=crop", title: "Bluestone patio + firepit", town: "Concord" },
      { img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop", title: "Native plant garden",       town: "Lincoln" },
      { img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop", title: "Front walk redesign",       town: "Lexington" },
      { img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80&auto=format&fit=crop", title: "Sitting wall + path",       town: "Weston" },
      { img: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80&auto=format&fit=crop", title: "Full backyard transform",   town: "Wellesley" },
      { img: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80&auto=format&fit=crop", title: "Drainage + regrade",        town: "Sudbury" },
    ],
    testimonials: [
      { name: "Carolyn B.", town: "Concord", project: "Patio + firepit",       body: "We use it three seasons a year. Crew was respectful, foreman walked us through every decision, finished a week early." },
      { name: "Mark T.",    town: "Lincoln", project: "Front garden redesign", body: "We've gotten more compliments in 6 months than in the previous 15 years of owning the house." },
      { name: "Joanne R.",  town: "Lexington", project: "Weekly lawn + spring cleanup", body: "Same crew every Tuesday. They notice when something needs attention before I do." },
    ],
    faqs: [
      { q: "Do you do design?",                  a: "Yes — in-house designer creates a planting plan + hardscape plan for any project over $5k. Design fee credited toward install if you proceed." },
      { q: "What's your maintenance schedule?",  a: "Weekly mow March-November, every other week in shoulder seasons. Fertilization 4x/year. Aeration + overseeding every fall." },
      { q: "Plant guarantee?",                   a: "Plants we install are guaranteed for 1 year if maintained per our care sheet. Free replacement, no questions." },
      { q: "Snow contracts?",                    a: "Seasonal flat-rate or per-event. We start clearing once 2\" has fallen and finish within 4 hours of storm end." },
      { q: "Are you insured?",                   a: "$2M liability, full workers comp. Certificate of insurance on request before work begins." },
    ],
  },
  cleaning: {
    label: "Cleaning",
    tagline: "A home that feels like new — every visit.",
    heroImg: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80&auto=format&fit=crop",
    accentBg: "bg-sky-600",
    accentText: "text-sky-700",
    accentBorder: "border-sky-200",
    accentHover: "hover:bg-sky-700",
    ctaBg: "bg-sky-700",
    ctaHover: "hover:bg-sky-600",
    services: [
      { icon: Home,    title: "Weekly + bi-weekly",     body: "Same team every time. They learn your home, your preferences, your pets. Checklists you approve." },
      { icon: Shield,  title: "Deep cleans",            body: "Inside oven, fridge, baseboards, windows. The full-day reset before holidays or after a long winter." },
      { icon: Wrench,  title: "Move-in / move-out",     body: "Empty house, top to bottom. Inside cabinets, behind appliances. Photos at the end so you can see the work." },
      { icon: Hammer,  title: "Post-construction",     body: "Drywall dust, paint splatter, debris. We restore to move-in condition after your renovation wraps." },
      { icon: Award,   title: "Green cleaning",        body: "Plant-based products, microfiber cloths, HEPA vacuums. Safe around kids, pets, and allergies." },
      { icon: BadgeCheck, title: "Vacation rental turnovers", body: "Same-day turnover between guests. Linens, restocking, light maintenance reports." },
    ],
    gallery: [
      { img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&auto=format&fit=crop", title: "Family home deep clean",     town: "Wellesley" },
      { img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format&fit=crop", title: "Move-out reset",             town: "Brookline" },
      { img: "https://images.unsplash.com/photo-1581094289810-adf5d25690e3?w=800&q=80&auto=format&fit=crop", title: "Vacation rental turnover",   town: "Cape Cod" },
      { img: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80&auto=format&fit=crop", title: "Post-renovation cleanup",    town: "Newton" },
      { img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop", title: "Kitchen deep clean",         town: "Belmont" },
      { img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop", title: "Weekly family service",      town: "Lexington" },
    ],
    testimonials: [
      { name: "Heather S.", town: "Wellesley", project: "Weekly service",  body: "Same team for 3 years. They notice if I'm running low on sponges and leave a note. Like having a really thoughtful housekeeper." },
      { name: "Andy P.",    town: "Brookline", project: "Move-out",         body: "Got our full deposit back. Landlord said it was the cleanest move-out he'd ever seen." },
      { name: "Jen & Mike", town: "Newton",    project: "Post-construction", body: "After a 6-month renovation, drywall dust was EVERYWHERE. They got it down to zero in one day." },
    ],
    faqs: [
      { q: "Are you bonded and insured?",         a: "Yes. $1M liability, $25k bonding. Every team member is W-2, background-checked, and trained to our checklist." },
      { q: "Same team every time?",               a: "Yes — for recurring service, you get the same 2-person team every visit. We send a different crew only with your notice." },
      { q: "Products?",                           a: "Green-certified plant-based products by default. We can use your preferred products if you supply them. Microfiber + HEPA only." },
      { q: "What if something breaks?",           a: "We document anything we notice that's already broken. If we break it, we replace it. Period." },
      { q: "Do I need to be home?",               a: "No — most clients give us a code or key. Bonded staff, background-checked, full insurance." },
    ],
  },
  remodel: {
    label: "Remodeling",
    tagline: "Honest builders. Beautiful renovations. On schedule.",
    heroImg: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=80&auto=format&fit=crop",
    accentBg: "bg-stone-800",
    accentText: "text-stone-800",
    accentBorder: "border-stone-300",
    accentHover: "hover:bg-stone-900",
    ctaBg: "bg-stone-900",
    ctaHover: "hover:bg-stone-800",
    services: [
      { icon: Home,    title: "Kitchen remodels",        body: "Custom cabinetry, quartz/granite tops, full appliance integration. Design-build with in-house team." },
      { icon: Shield,  title: "Bathroom renovations",    body: "Master suites, family baths, powder rooms. Tile, plumbing, lighting, ventilation all in-house." },
      { icon: Wrench,  title: "Basement finishing",      body: "Egress windows, full HVAC, framing, finishes. Add 800-1500 sqft of usable space." },
      { icon: Hammer,  title: "Additions",               body: "Family rooms, master suites, second stories. Architectural, structural, and finish work all coordinated." },
      { icon: Award,   title: "Whole-home remodels",     body: "Empty-house renovations. Live-in renovations done in phases. We coordinate every trade." },
      { icon: BadgeCheck, title: "Historic restoration", body: "Period detail, plaster work, historically accurate finishes. Approved for HDC and Historical Commission jobs." },
    ],
    gallery: [
      { img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format&fit=crop", title: "Open-concept kitchen",  town: "Wellesley" },
      { img: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80&auto=format&fit=crop", title: "Master bath suite",   town: "Lexington" },
      { img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop", title: "Finished basement",   town: "Newton" },
      { img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop", title: "Second-story addition", town: "Concord" },
      { img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80&auto=format&fit=crop", title: "Whole-home reno",     town: "Brookline" },
      { img: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80&auto=format&fit=crop", title: "Period home restoration", town: "Cambridge" },
    ],
    testimonials: [
      { name: "Anne L.",  town: "Wellesley", project: "Kitchen remodel",      body: "We were terrified of going over budget. They finished $3k under on a $90k job. Foreman gave us a written change-order policy on day one." },
      { name: "Tom H.",   town: "Lexington", project: "Master bath",          body: "11-week schedule, finished in 10. The tile work is museum quality." },
      { name: "Carla M.", town: "Newton",    project: "Basement finish",      body: "They turned an unusable basement into our favorite room in the house. Permit, egress, HVAC, the works." },
    ],
    faqs: [
      { q: "How much over budget do projects go?",        a: "On average, less than 5% — and that's on changes we mark up at cost +10%, not surprises. We give you a written change-order policy on day one." },
      { q: "Can we live in the house during?",            a: "Most kitchens + baths, yes (with a temp kitchen we set up). Whole-home renos usually require you to move out for 2-4 weeks at the worst phase." },
      { q: "Do you have a designer in-house?",            a: "Yes — every project includes design consultation. We do drawings, 3D renderings, and finish selection in-house." },
      { q: "How do you handle change orders?",            a: "Written approval required before any change is made. You always know what you're paying for." },
      { q: "Warranty?",                                   a: "1 year on all workmanship, 2 years on cabinetry, manufacturer warranties on appliances and fixtures. Punch list complete before we invoice the final draw." },
    ],
  },
  general: {
    label: "Home services",
    tagline: "Local craftsmen. Honest pricing. Beautiful work.",
    heroImg: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80&auto=format&fit=crop",
    accentBg: "bg-orange-600",
    accentText: "text-orange-700",
    accentBorder: "border-orange-200",
    accentHover: "hover:bg-orange-700",
    ctaBg: "bg-orange-600",
    ctaHover: "hover:bg-orange-500",
    services: [
      { icon: Home,    title: "Carpentry",            body: "Trim, doors, built-ins, decks. Custom millwork in our shop." },
      { icon: Shield,  title: "Repairs & punch lists", body: "The small list of things that never gets done. We knock them out in a day or two." },
      { icon: Wrench,  title: "Bath + kitchen reno",  body: "Full design-build or fixture-only refresh. We work to your scope and budget." },
      { icon: Hammer,  title: "Decks & porches",      body: "Trex, ipe, and pressure-treated. Built to last with code-correct framing." },
      { icon: Award,   title: "Painting & finishing", body: "Interior and exterior. Two-coat minimum. Premium paints." },
      { icon: BadgeCheck, title: "Permits + inspection", body: "We handle the paperwork. Pull permits, schedule inspections, sign off the final." },
    ],
    gallery: [
      { img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80&auto=format&fit=crop", title: "Front porch rebuild",  town: "Newton" },
      { img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format&fit=crop", title: "Built-in bookshelves", town: "Brookline" },
      { img: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80&auto=format&fit=crop", title: "Trim + interior doors", town: "Wellesley" },
      { img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&auto=format&fit=crop", title: "Backyard deck",        town: "Lexington" },
      { img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80&auto=format&fit=crop", title: "Bath refresh",         town: "Belmont" },
      { img: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80&auto=format&fit=crop", title: "Garage organizer",     town: "Arlington" },
    ],
    testimonials: [
      { name: "Lou D.",  town: "Newton",     project: "Porch rebuild",     body: "Honest, on time, on budget. Our porch was rotted; you'd never know it now." },
      { name: "Beth W.", town: "Brookline",  project: "Built-ins",         body: "Custom shop work, beautiful finish, fair price." },
      { name: "Greg & Sue", town: "Wellesley", project: "Trim package",    body: "Crew was professional, foreman walked us through every step, finished on time." },
    ],
    faqs: [
      { q: "Are you licensed and insured?",   a: "Yes. MA HIC #XXXX, CSL #XXXX. $2M liability + full workers comp. Certificates on request." },
      { q: "Do you give written estimates?",  a: "Always — itemized, line by line. No surprises mid-job. Change orders require written approval." },
      { q: "Will the crew be respectful?",    a: "Same lead carpenter every day on your project. Cleanup at the end of every shift. We treat your house like our own." },
      { q: "Financing?",                      a: "Yes, through Synchrony. Same-day soft credit decision, 0% APR options on most jobs over $2k." },
      { q: "Warranty?",                       a: "2 years on workmanship. Anything we did goes wrong in the first 2 years, we come fix it at no charge." },
    ],
  },
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { biz, city } = decodeSlug(params.slug);
  return {
    title: `${biz}${city ? ` — ${city} MA` : ""}`,
    description: `${biz}: licensed, insured, and trusted Massachusetts contractors. Free estimates, same-week response, 5-star reviews.`,
    robots: { index: false, follow: false },
  };
}

export default function PreviewMockup({ params }: { params: { slug: string } }) {
  const { biz, city, trade } = decodeSlug(params.slug);
  const theme = THEMES[trade];
  const phone = "(617) 555-0123";
  const phoneHref = phone.replace(/\D/g, "");
  const initials = biz.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  const founder = biz.split(" ")[0] ?? "Owner";
  const serviceArea = city
    ? [city, neighborOf(city)].filter(Boolean).join(", ") + ", and the surrounding North Shore"
    : "Greater Boston and the North Shore";

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 antialiased">

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 shrink-0 rounded-lg ${theme.accentBg} text-white grid place-items-center font-bold text-sm tracking-tight`}>
              {initials || "CF"}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-stone-900 truncate text-sm leading-tight">{biz}</div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 leading-tight">{theme.label}{city ? ` · ${city} MA` : ""}</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <a href="#services"  className="hover:text-stone-900">Services</a>
            <a href="#projects"  className="hover:text-stone-900">Projects</a>
            <a href="#about"     className="hover:text-stone-900">About</a>
            <a href="#reviews"   className="hover:text-stone-900">Reviews</a>
            <a href="#faq"       className="hover:text-stone-900">FAQ</a>
            <a href="#contact"   className="hover:text-stone-900">Contact</a>
          </nav>
          <a href={`tel:${phoneHref}`} className={`inline-flex items-center gap-2 rounded-lg ${theme.ctaBg} ${theme.ctaHover} text-white font-semibold px-4 py-2 text-sm transition`}>
            <Phone className="h-4 w-4" /> <span className="hidden sm:inline">{phone}</span><span className="sm:hidden">Call</span>
          </a>
        </div>
      </header>

      {/* Hero with full-bleed photo */}
      <section className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${theme.heroImg})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/65 to-black/40" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 py-28 sm:py-36 text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-white/85 mb-5">
            <BadgeCheck className="h-3.5 w-3.5" />
            {city ? `${city}, MA` : "Massachusetts"} · Licensed · Insured · Family-owned since 1998
          </div>
          <h1 className="font-serif text-5xl sm:text-7xl lg:text-[5.5rem] tracking-tight leading-[0.98] max-w-4xl">
            {biz}
          </h1>
          <p className="mt-5 text-lg sm:text-2xl text-white/85 max-w-2xl font-light leading-snug">
            {theme.tagline}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={`tel:${phoneHref}`} className={`inline-flex items-center gap-2 rounded-xl ${theme.ctaBg} ${theme.ctaHover} text-white font-semibold px-6 py-3.5 transition shadow-lg shadow-black/20`}>
              <Phone className="h-4 w-4" /> Call {phone}
            </a>
            <a href="#contact" className="inline-flex items-center gap-2 rounded-xl bg-white/10 ring-1 ring-white/30 backdrop-blur text-white font-semibold px-6 py-3.5 hover:bg-white/20 transition">
              Get a free estimate <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-2 text-xs text-white/70">
            <span className="inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-300 fill-amber-300" /> 4.9 on Google (147 reviews)</span>
            <span className="inline-flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-300" /> Angi Super Service Award</span>
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-amber-300" /> BBB A+ Rated</span>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-stone-900 text-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-center">
          <TrustItem n="27" label="years in business" />
          <TrustItem n="1,800+" label="homes served" />
          <TrustItem n="100%" label="licensed + insured" />
          <TrustItem n="4.9★" label="across 147 reviews" />
        </div>
      </section>

      {/* Services */}
      <section id="services" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-2">What we do</div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight max-w-2xl leading-tight">
            Full-service <em className="italic">{theme.label.toLowerCase()}</em> across {city ?? "Massachusetts"}.
          </h2>
          <p className="text-sm text-stone-600 max-w-md">
            From small repairs to whole-home projects. Every job gets a master craftsman on-site, a clean job site, and a written warranty.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {theme.services.map((s) => (
            <div key={s.title} className="group rounded-2xl bg-white ring-1 ring-stone-200/80 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className={`h-11 w-11 rounded-xl ${theme.accentBg} text-white grid place-items-center mb-4`}>
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg text-stone-900">{s.title}</h3>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">{s.body}</p>
              <div className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${theme.accentText} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Learn more <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="bg-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-2">Why homeowners choose us</div>
          <h2 className="font-serif text-3xl sm:text-4xl tracking-tight max-w-2xl leading-tight">
            We sweat the details so you don&apos;t have to.
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <WhyCard icon={Handshake} title="Honest pricing"
              body="Itemized written estimates. Change orders require your approval. No surprise add-ons mid-job." />
            <WhyCard icon={Clock}     title="On-time, every time"
              body="If we say Tuesday at 8am, we&apos;re there Tuesday at 8am. If we&apos;re ever late, we call." />
            <WhyCard icon={Shield}    title="Master craftsmen only"
              body="Every job has a master tradesman on-site — no rookies running your project." />
            <WhyCard icon={Award}     title="Lifetime warranty"
              body="If our workmanship ever fails, we come back and fix it. That&apos;s the promise." />
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-2">How it works</div>
        <h2 className="font-serif text-3xl sm:text-4xl tracking-tight max-w-2xl leading-tight">
          From first call to final walk-through — four simple steps.
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ProcessStep n="01" title="Free in-home estimate"  body="We visit your home, take measurements, and walk through your options. No high-pressure sales." accent={theme.accentText} />
          <ProcessStep n="02" title="Written quote + plan"   body="Detailed line-item quote within 24 hours. Materials, labor, timeline, and warranty — all in writing." accent={theme.accentText} />
          <ProcessStep n="03" title="Scheduled, clean install" body="Same crew every day. Daily cleanup. Foreman walks you through end-of-day progress." accent={theme.accentText} />
          <ProcessStep n="04" title="Final walk-through"     body="We don&apos;t bill the final draw until YOU sign off on the punch list. That&apos;s our standard." accent={theme.accentText} />
        </div>
      </section>

      {/* Project gallery */}
      <section id="projects" className="bg-stone-900 text-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-xs uppercase tracking-widest text-stone-400 font-mono mb-2">Recent projects</div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-serif text-3xl sm:text-4xl tracking-tight max-w-2xl leading-tight">
              Real homes. Real {city ?? "Massachusetts"} towns.
            </h2>
            <p className="text-sm text-stone-400 max-w-md">
              A small sample of the {theme.label.toLowerCase()} work we&apos;ve done across the region. We&apos;d be happy to share local references near you.
            </p>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {theme.gallery.map((g) => (
              <div key={g.title} className="group rounded-2xl overflow-hidden ring-1 ring-white/10 bg-stone-800">
                <div
                  className="aspect-[4/3] bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url(${g.img})` }}
                  aria-hidden
                />
                <div className="p-4">
                  <div className="font-semibold text-stone-100">{g.title}</div>
                  <div className="mt-0.5 text-xs text-stone-400 inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {g.town}, MA</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-2">What our neighbors say</div>
        <h2 className="font-serif text-3xl sm:text-4xl tracking-tight max-w-2xl leading-tight">
          4.9 stars across 147 Google reviews.
        </h2>
        <div className="mt-10 grid lg:grid-cols-3 gap-5">
          {theme.testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl bg-white ring-1 ring-stone-200 p-6 flex flex-col">
              <div className="flex items-center gap-0.5 text-amber-500 mb-3">
                {[0,1,2,3,4].map((i) => <Star key={i} className="h-4 w-4 fill-amber-500" />)}
              </div>
              <p className="text-stone-700 leading-relaxed text-[15px] flex-1">&ldquo;{t.body}&rdquo;</p>
              <div className="mt-5 pt-4 border-t border-stone-100">
                <div className="font-semibold text-stone-900">{t.name}</div>
                <div className="text-xs text-stone-500">{t.town}, MA · {t.project}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-xs text-stone-500 inline-flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          Featured on Angi, BBB, NextDoor, and Google's Local Top Pro list.
        </div>
      </section>

      {/* Founder / about */}
      <section id="about" className="bg-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-5 gap-10 items-center">
          <div className="lg:col-span-2">
            <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-stone-300 to-stone-400 grid place-items-center text-stone-500 text-xs ring-1 ring-stone-200">
              <div className="text-center">
                <div className={`h-20 w-20 rounded-full ${theme.accentBg} text-white grid place-items-center text-2xl font-bold mx-auto`}>
                  {founder[0] ?? "C"}
                </div>
                <div className="mt-3 font-semibold text-stone-700">{founder}, Owner</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-3">
            <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-2">About {biz}</div>
            <h2 className="font-serif text-3xl sm:text-4xl tracking-tight leading-tight">
              A {city ? city : "Massachusetts"} business, built on doing right by neighbors.
            </h2>
            <p className="mt-5 text-stone-700 leading-relaxed">
              {biz} started in 1998 with a single truck, a hammer, and the promise to do the job right the first time. Almost three decades later, we&apos;re a family-run team of master tradesmen serving {serviceArea}.
            </p>
            <p className="mt-3 text-stone-700 leading-relaxed">
              Our reputation is built on three things: showing up when we said we would, delivering the work we quoted, and standing behind it for life. That&apos;s why 60% of our work comes from referrals — and why we still answer the phone when you call.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-white ring-1 ring-stone-200 p-4">
                <div className="text-2xl font-bold text-stone-900">27+</div>
                <div className="text-xs text-stone-500 uppercase tracking-wide mt-1">Years</div>
              </div>
              <div className="rounded-xl bg-white ring-1 ring-stone-200 p-4">
                <div className="text-2xl font-bold text-stone-900">60%</div>
                <div className="text-xs text-stone-500 uppercase tracking-wide mt-1">Repeat clients</div>
              </div>
              <div className="rounded-xl bg-white ring-1 ring-stone-200 p-4">
                <div className="text-2xl font-bold text-stone-900">A+</div>
                <div className="text-xs text-stone-500 uppercase tracking-wide mt-1">BBB rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service area */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-2">Service area</div>
            <h2 className="font-serif text-3xl sm:text-4xl tracking-tight leading-tight">
              Proudly serving the {city ? city : "Greater Boston"} area.
            </h2>
            <p className="mt-4 text-stone-700">
              Crews dispatched daily from our {city ?? "Boston-area"} shop. Most service areas reachable within 30 minutes — emergency response within an hour.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-stone-700">
              {serviceTowns(city).map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${theme.accentText} shrink-0`} />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-stone-500">Outside this area? Call us anyway — we travel for the right project.</p>
          </div>
          <div className="aspect-[5/4] rounded-2xl bg-gradient-to-br from-stone-200 to-stone-300 ring-1 ring-stone-200 grid place-items-center text-stone-500 relative overflow-hidden">
            {/* Subtle "map" stripes */}
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 2px, transparent 2px 16px)",
            }} />
            <div className="relative text-center">
              <MapPin className={`h-10 w-10 ${theme.accentText} mx-auto`} />
              <div className="mt-2 text-stone-700 font-semibold">{city ?? "Boston"}, Massachusetts</div>
              <div className="mt-0.5 text-xs text-stone-500">+ 12 surrounding towns</div>
            </div>
          </div>
        </div>
      </section>

      {/* Financing strip */}
      <section className={`${theme.accentBg} text-white`}>
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <CreditCard className="h-10 w-10 shrink-0" />
            <div>
              <div className="font-semibold text-lg">0% APR financing available</div>
              <div className="text-sm text-white/80">12-month interest-free, or low monthly payments up to 10 years. Soft credit check — no impact on your score.</div>
            </div>
          </div>
          <a href="#contact" className="inline-flex items-center gap-2 rounded-xl bg-white text-stone-900 font-semibold px-5 py-3 hover:bg-white/90 transition shrink-0">
            See if you qualify <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-2 text-center">Frequently asked</div>
        <h2 className="font-serif text-3xl sm:text-4xl tracking-tight text-center leading-tight">
          Questions we get a lot.
        </h2>
        <div className="mt-10 space-y-3">
          {theme.faqs.map((f, i) => (
            <details key={f.q} className="group rounded-xl bg-white ring-1 ring-stone-200 p-5" {...(i === 0 ? { open: true } : {})}>
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-stone-900">
                <span>{f.q}</span>
                <ChevronRight className="h-4 w-4 text-stone-400 group-open:rotate-90 transition" />
              </summary>
              <p className="mt-3 text-sm text-stone-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-10">
          <div>
            <div className="text-xs uppercase tracking-widest text-stone-500 font-mono mb-2">Free estimate</div>
            <h2 className="font-serif text-3xl sm:text-5xl tracking-tight leading-[1.05]">
              Tell us about your project.
            </h2>
            <p className="mt-4 text-stone-700">
              Free in-home estimate within 48 hours. Most quotes delivered in writing the same day as the visit. No high-pressure sales — ever.
            </p>
            <div className="mt-8 space-y-3 text-sm text-stone-700">
              <div className="flex items-start gap-3">
                <Phone className={`h-5 w-5 mt-0.5 ${theme.accentText} shrink-0`} />
                <div><div className="font-semibold text-stone-900">{phone}</div><div className="text-xs text-stone-500">Mon-Sat 7am-7pm. After-hours emergency line.</div></div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className={`h-5 w-5 mt-0.5 ${theme.accentText} shrink-0`} />
                <div><div className="font-semibold text-stone-900">info@{slugDomain(biz)}.com</div><div className="text-xs text-stone-500">Replies within one business day.</div></div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className={`h-5 w-5 mt-0.5 ${theme.accentText} shrink-0`} />
                <div><div className="font-semibold text-stone-900">{city ?? "Greater Boston"}, MA</div><div className="text-xs text-stone-500">Serving {serviceArea}.</div></div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare className={`h-5 w-5 mt-0.5 ${theme.accentText} shrink-0`} />
                <div><div className="font-semibold text-stone-900">Text us anytime</div><div className="text-xs text-stone-500">Quickest way to get a same-day reply.</div></div>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <a className="h-9 w-9 rounded-full bg-stone-900 text-white grid place-items-center hover:bg-stone-700 transition" aria-label="Facebook"><Facebook className="h-4 w-4" /></a>
              <a className="h-9 w-9 rounded-full bg-stone-900 text-white grid place-items-center hover:bg-stone-700 transition" aria-label="Instagram"><Instagram className="h-4 w-4" /></a>
            </div>
          </div>

          <form className="rounded-2xl bg-white ring-1 ring-stone-200 p-7 space-y-4 shadow-lg shadow-stone-200/50">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="First name"  placeholder="Pat" />
              <Field label="Last name"   placeholder="Smith" />
            </div>
            <Field label="Phone"  type="tel"   placeholder="(617) 555-0142" />
            <Field label="Email"  type="email" placeholder="pat@example.com" />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">What can we help with?</label>
              <select className="w-full rounded-xl ring-1 ring-stone-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-900">
                {theme.services.map((s) => <option key={s.title}>{s.title}</option>)}
                <option>Something else</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">Tell us about it</label>
              <textarea rows={4} placeholder="Project details, timeline, anything we should know..." className="w-full rounded-xl ring-1 ring-stone-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
            </div>
            <button type="button" className={`w-full inline-flex items-center justify-center gap-2 rounded-xl ${theme.ctaBg} ${theme.ctaHover} text-white font-semibold px-5 py-3.5 transition`}>
              Request my free estimate <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-[11px] text-stone-500 text-center">We&apos;ll respond within 1 business hour. Your info is never shared.</p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400">
        <div className="max-w-6xl mx-auto px-6 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-9 w-9 rounded-lg ${theme.accentBg} text-white grid place-items-center font-bold text-sm`}>{initials || "CF"}</div>
              <div className="font-semibold text-white">{biz}</div>
            </div>
            <p className="text-xs leading-relaxed">{theme.tagline}</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-300 font-semibold mb-3">Services</div>
            <ul className="space-y-1.5 text-xs">
              {theme.services.slice(0, 5).map((s) => <li key={s.title}>{s.title}</li>)}
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-300 font-semibold mb-3">Contact</div>
            <ul className="space-y-1.5 text-xs">
              <li>{phone}</li>
              <li>info@{slugDomain(biz)}.com</li>
              <li>{city ?? "Boston"}, MA</li>
              <li>Mon-Sat 7am-7pm</li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-300 font-semibold mb-3">Credentials</div>
            <ul className="space-y-1.5 text-xs">
              <li>MA HIC #XXXXXX</li>
              <li>BBB A+ Rated</li>
              <li>$2M Liability Insured</li>
              <li>Member, NARI &amp; NAHB</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-stone-800">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-500">
            <span>© {new Date().getFullYear()} {biz}. All rights reserved.</span>
            <span>
              Site preview by{" "}
              <Link href="https://contractorflowstore.com/launchpad" className="text-stone-300 hover:text-white underline underline-offset-2">
                Contractor Flow Launchpad
              </Link>
            </span>
          </div>
        </div>
      </footer>

      {/* Floating Claim CTA — small + dismissible-feeling, only visible after scroll */}
      <div className="fixed bottom-5 right-5 z-50 max-w-xs">
        <Link href="https://contractorflowstore.com/launchpad" className="block rounded-2xl bg-stone-900/95 backdrop-blur ring-1 ring-white/10 text-white p-4 shadow-2xl shadow-black/30 hover:bg-stone-800 transition">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-500 grid place-items-center shrink-0"><BadgeCheck className="h-4 w-4" /></div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-orange-300 font-mono">Preview</div>
              <div className="text-sm font-semibold mt-0.5 leading-tight">This is what your site could look like.</div>
              <div className="mt-2 text-[11px] text-stone-300">Built in 2 weeks. From $1,997. <span className="text-orange-300 font-semibold">Claim it →</span></div>
            </div>
          </div>
        </Link>
      </div>

    </main>
  );
}

function TrustItem({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-serif text-3xl sm:text-4xl text-white">{n}</div>
      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-stone-400 mt-1">{label}</div>
    </div>
  );
}

function WhyCard({ icon: Icon, title, body }: { icon: typeof Hammer; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-stone-200 p-5">
      <Icon className="h-6 w-6 text-stone-900 mb-3" />
      <div className="font-semibold text-stone-900">{title}</div>
      <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">{body}</p>
    </div>
  );
}

function ProcessStep({ n, title, body, accent }: { n: string; title: string; body: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 ring-1 ring-stone-200 p-5">
      <div className={`font-serif text-3xl ${accent}`}>{n}</div>
      <div className="mt-3 font-semibold text-stone-900">{title}</div>
      <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">{body}</p>
    </div>
  );
}

function Field({ label, type = "text", placeholder }: { label: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">{label}</label>
      <input type={type} placeholder={placeholder} className="w-full rounded-xl ring-1 ring-stone-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
    </div>
  );
}

function slugDomain(biz: string): string {
  return biz.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "yourbusiness";
}

function neighborOf(city: string): string | null {
  // Crude proximity table — covers most North Shore + MetroWest towns we'd reach.
  const NEAR: Record<string, string> = {
    marblehead: "Salem", salem: "Beverly", beverly: "Danvers", danvers: "Peabody",
    peabody: "Lynn", lynn: "Saugus", newburyport: "Amesbury", amesbury: "Salisbury",
    quincy: "Milton", milton: "Braintree", braintree: "Weymouth", hingham: "Cohasset",
    newton: "Brookline", brookline: "Boston", boston: "Cambridge", cambridge: "Somerville",
    somerville: "Medford", medford: "Arlington", arlington: "Lexington", lexington: "Concord",
    concord: "Acton", acton: "Sudbury", sudbury: "Wayland", wayland: "Weston",
    weston: "Wellesley", wellesley: "Needham", needham: "Dedham", dedham: "Westwood",
    belmont: "Watertown", watertown: "Waltham", waltham: "Newton",
  };
  return NEAR[city.toLowerCase()] ?? null;
}

function serviceTowns(city: string | null): string[] {
  if (!city) {
    return ["Boston", "Brookline", "Newton", "Cambridge", "Somerville", "Arlington", "Lexington", "Concord", "Wellesley", "Needham", "Belmont", "Watertown"];
  }
  const base = [city];
  const n = neighborOf(city);
  if (n) base.push(n);
  const fillers = ["Salem", "Beverly", "Marblehead", "Lynn", "Peabody", "Danvers", "Boston", "Cambridge", "Newton", "Brookline", "Lexington", "Concord"];
  for (const f of fillers) {
    if (base.length >= 12) break;
    if (!base.includes(f)) base.push(f);
  }
  return base.slice(0, 12);
}
