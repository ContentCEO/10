/*
 * Lead-quality gate for scraped leads.
 *
 * Every lead must have:
 *   - name (real, not a generic placeholder)
 *   - phone (10 or 11 digits after stripping formatting)
 *   - MA location (zip starts 01/02 OR city is in MA list)
 *   - service_type / notes mention a contractor-relevant trade
 *     (painting, remodeling, kitchen, bath, electrical, plumbing, etc.)
 *
 * Leads that fail this gate are skipped at the mirror-to-/leads step
 * and filtered out of the marketplace view.
 */

// Conservative MA zip range. The actual MA range is 01000-02799 with a
// few exceptions, but that envelope is fine for filtering.
const MA_ZIP_RE = /^(?:0[12]\d{3})/;

// Curated MA city list — used when the row has a city but no zip, or
// when the zip is malformed. Lowercase, no punctuation.
const MA_CITY_SET = new Set([
  "boston","cambridge","somerville","worcester","springfield","lowell","lawrence",
  "brookline","newton","quincy","brockton","lynn","new bedford","fall river",
  "framingham","haverhill","waltham","malden","medford","taunton","chicopee",
  "weymouth","revere","peabody","methuen","barnstable","pittsfield","attleboro",
  "salem","westfield","leominster","fitchburg","beverly","holyoke","marlborough",
  "woburn","amherst","braintree","shrewsbury","chelsea","everett","arlington",
  "watertown","randolph","west springfield","north andover","saugus","milford",
  "wellesley","winchester","reading","milton","needham","stoughton","norwood",
  "andover","gloucester","north attleboro","westfield","dedham","wakefield",
  "agawam","greenfield","gardner","easton","melrose","franklin","longmeadow",
  "natick","danvers","mansfield","plymouth","walpole","sharon","canton",
  "burlington","tewksbury","billerica","north reading","wilmington","stoneham",
  "winthrop","westwood","cohasset","hingham","scituate","norwell","duxbury",
  "marshfield","pembroke","hanover","abington","whitman","rockland","kingston",
  "carver","middleboro","wareham","bourne","falmouth","sandwich","mashpee",
  "barnstable","yarmouth","dennis","brewster","orleans","eastham","wellfleet",
  "truro","provincetown","chatham","harwich","nantucket","oak bluffs","edgartown",
  "tisbury","west tisbury","aquinnah","chilmark",
  "ashland","sudbury","wayland","weston","lincoln","concord","lexington",
  "bedford","carlisle","westford","chelmsford","groton","pepperell","townsend",
  "ashby","ayer","harvard","boxborough","acton","stow","maynard","hudson","bolton",
  "berlin","clinton","lancaster","sterling","leicester","spencer","oxford","webster",
  "dudley","southbridge","sturbridge","brimfield","palmer","ware","belchertown",
  "amherst","hadley","northampton","easthampton","south hadley","granby","ludlow",
  "wilbraham","monson","hampden","east longmeadow","longmeadow","feeding hills",
  "haydenville","williamsburg","goshen","cummington","plainfield","hawley","savoy",
  "florida","north adams","adams","cheshire","lanesborough","new ashford","hancock",
  "williamstown","clarksburg","monroe","rowe","heath","colrain","leyden","bernardston",
  "northfield","gill","greenfield","montague","erving","wendell","new salem",
  "shutesbury","leverett","sunderland","deerfield","whately","conway","shelburne",
  "buckland","ashfield","hawley","plainfield",
]);

export const MAX_LEAD_AGE_DAYS = 30;
export const MAX_LEAD_AGE_MS = MAX_LEAD_AGE_DAYS * 24 * 60 * 60 * 1000;

export interface QualityCheckInput {
  name: string | null;
  phone: string | null;
  city: string | null;
  zip: string | null;
  notes: string | null;          // post body / description / address line
  service_type?: string | null;  // headline / trade
  ai_summary?: string | null;    // model-generated headline
  created_at?: string | null;    // ISO timestamp; freshness check
}

export interface QualityResult {
  ok: boolean;
  reasons: string[];
  hasPhone: boolean;
  isMA: boolean;
  hasAddress: boolean;
  hasRealName: boolean;
  hasContractorIntent: boolean;
}

// Keywords that indicate the lead is asking for or about contracting/
// construction work. Substring-matched case-insensitively against
// service_type + ai_summary + notes.
export const CONTRACTOR_INTENT_KEYWORDS = [
  // Whole-job
  "remodel", "remodeling", "renovation", "renovate", "rebuild", "addition",
  "build out", "buildout", "construction", "contractor", "general contractor",
  "handyman", "punch list", "fix", "repair",
  // Rooms
  "kitchen", "bathroom", "bath remodel", "shower", "tub", "vanity",
  "basement", "basement finish", "basement remodel",
  "attic", "garage", "in-law", "mudroom", "laundry room",
  // Structure / framing
  "framing", "frame", "carpentry", "carpenter", "trim", "trim work",
  "drywall", "sheetrock", "plaster", "popcorn ceiling",
  "foundation", "crawlspace", "joist", "beam", "structural",
  // Paint / finish
  "painting", "paint", "interior paint", "exterior paint", "wallpaper",
  // Floors
  "flooring", "hardwood", "refinish", "tile", "carpet",
  "luxury vinyl", "lvp", "lvt", "laminate",
  // Exterior
  "roof", "roofing", "roofer", "shingle", "metal roof",
  "siding", "vinyl siding", "fiber cement", "stucco",
  "gutter", "soffit", "fascia", "chimney",
  "deck", "porch", "patio", "pergola", "screen porch", "fence",
  "window", "windows", "door", "garage door",
  "concrete", "driveway", "paver", "walkway", "asphalt", "masonry",
  "brick", "stone", "stonework",
  // Electrical
  "electrical", "electrician", "wiring", "rewire", "outlet", "panel",
  "panel upgrade", "200 amp", "ev charger", "level 2",
  "ceiling fan", "recessed light", "fixture", "lighting",
  "gfci", "afci", "smoke detector", "generator", "transfer switch",
  // Plumbing
  "plumbing", "plumber", "leak", "water heater", "tankless",
  "drain", "drain cleaning", "clog", "toilet", "faucet", "sink",
  "sewer", "sump pump", "garbage disposal", "boiler",
  "shower install", "tub install", "re-pipe", "repipe",
  // HVAC
  "hvac", "ac unit", "central air", "ductless", "mini split",
  "furnace", "heat pump", "duct", "ductwork", "thermostat",
  // Specialty / damage
  "insulation", "spray foam", "blown in",
  "water damage", "flood", "mold", "mold remediation",
  "asbestos", "lead paint", "lead abatement",
  "solar", "solar panel", "battery backup",
  "cabinet", "cabinetry", "countertop", "quartz", "granite",
  "demolition", "demo", "junk removal",
  "landscaping", "landscape", "sod", "mulch",
  "tree", "tree removal", "stump grinding",
  "snow removal", "plow",
  "pool", "hot tub",
];

export function hasContractorIntent(text: string | null | undefined): boolean {
  if (!text) return false;
  const haystack = text.toLowerCase();
  return CONTRACTOR_INTENT_KEYWORDS.some((kw) => haystack.includes(kw));
}

const GENERIC_NAME_PATTERNS = [
  /^[a-z]+ permit holder$/i,
  /^[a-z]+ permittee$/i,
  /^unknown$/i,
  /^n\/?a$/i,
  /^r\/[a-z]/i,           // reddit thread placeholder "r/sub · u/handle"
  /^reddit/i,
  /^anonymous/i,
];

export function isQualifiedLead(lead: QualityCheckInput): QualityResult {
  const reasons: string[] = [];

  const name = (lead.name ?? "").trim();
  const hasRealName = name.length >= 2 && !GENERIC_NAME_PATTERNS.some((re) => re.test(name));
  if (!hasRealName) reasons.push("no-real-name");

  const phone = (lead.phone ?? "").replace(/\D/g, "");
  const hasPhone = phone.length === 10 || phone.length === 11;
  if (!hasPhone) reasons.push("no-phone");

  const zip = (lead.zip ?? "").trim();
  const cityLower = (lead.city ?? "").trim().toLowerCase();
  const isMA = MA_ZIP_RE.test(zip) || MA_CITY_SET.has(cityLower);
  if (!isMA) reasons.push("not-massachusetts");
  const hasAddress = Boolean(zip || cityLower);

  const intentText = [lead.service_type, lead.ai_summary, lead.notes].filter(Boolean).join(" \n ");
  const hasIntent = hasContractorIntent(intentText);
  if (!hasIntent) reasons.push("no-contractor-intent");

  let isFresh = true;
  if (lead.created_at) {
    const age = Date.now() - new Date(lead.created_at).getTime();
    isFresh = !Number.isNaN(age) && age <= MAX_LEAD_AGE_MS;
    if (!isFresh) reasons.push("stale-over-30-days");
  }

  return {
    ok: hasRealName && hasPhone && isMA && hasIntent && isFresh,
    reasons,
    hasPhone,
    isMA,
    hasAddress,
    hasRealName,
    hasContractorIntent: hasIntent,
  };
}

export function isMassachusettsLead(lead: { city: string | null; zip: string | null }): boolean {
  const zip = (lead.zip ?? "").trim();
  const city = (lead.city ?? "").trim().toLowerCase();
  return MA_ZIP_RE.test(zip) || MA_CITY_SET.has(city);
}

/*
 * Phone enrichment. Reads provider config from env. Two ways to wire:
 *
 *   - BatchData (recommended): set BATCHDATA_API_KEY. We call their
 *     property skip-trace endpoint directly and return the first valid
 *     phone we find on any matched person.
 *
 *   - Generic: set PHONE_ENRICH_URL + PHONE_ENRICH_KEY. Your endpoint
 *     receives JSON { name, address, city, zip } and returns
 *     { phone: string | null }. Use this to plug Whitepages, Endato,
 *     PeopleDataLabs, or a self-hosted proxy.
 *
 * Returns null if no key is configured OR no match is found. The lead
 * is then skipped by the quality gate.
 */
export interface EnrichInput {
  name: string;
  address: string | null;
  city: string | null;
  zip: string | null;
}

interface BatchDataPhone { number?: string; phone?: string }
interface BatchDataPerson { phoneNumbers?: BatchDataPhone[]; phones?: BatchDataPhone[] }
interface BatchDataResponse {
  results?: { persons?: BatchDataPerson[] };
  persons?: BatchDataPerson[];
}

async function batchDataLookup(body: Record<string, unknown>, apiKey: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8_000);
    const res = await fetch("https://api.batchdata.com/api/v1/property/skip-trace", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json().catch(() => null) as BatchDataResponse | null;
    const persons = j?.results?.persons ?? j?.persons ?? [];
    for (const p of persons) {
      const phones = p?.phoneNumbers ?? p?.phones ?? [];
      for (const ph of phones) {
        const num = (ph?.number ?? ph?.phone ?? "").replace(/\D/g, "");
        if (num.length === 10 || num.length === 11) return num;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function enrichPhoneBatchData(input: EnrichInput, apiKey: string): Promise<string | null> {
  const parts = input.name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName  = parts.slice(1).join(" ");
  const street    = (input.address ?? "").split(",")[0]?.trim() ?? "";

  const propertyAddress = {
    street,
    city: input.city ?? "",
    state: "MA",
    zip: input.zip ?? "",
  };

  // First try: address + name (highest precision). If no hit, fall back
  // to address-only (broader match — catches cases where owner-name
  // parsing was off).
  const withName: Record<string, unknown> = {
    requests: [{
      propertyAddress,
      ...(firstName ? { name: { first: firstName, last: lastName } } : {}),
    }],
  };
  const first = await batchDataLookup(withName, apiKey);
  if (first) return first;

  if (firstName || lastName) {
    const addressOnly = { requests: [{ propertyAddress }] };
    return batchDataLookup(addressOnly, apiKey);
  }
  return null;
}

async function enrichPhoneGeneric(input: EnrichInput, url: string, key: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8_000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify(input),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json().catch(() => null) as { phone?: string | null } | null;
    const p = j?.phone?.replace(/\D/g, "") ?? "";
    if (p.length === 10 || p.length === 11) return p;
    return null;
  } catch {
    return null;
  }
}

export async function enrichPhone(input: EnrichInput): Promise<string | null> {
  const batchKey = process.env.BATCHDATA_API_KEY;
  if (batchKey) {
    const p = await enrichPhoneBatchData(input, batchKey);
    if (p) return p;
  }

  const url = process.env.PHONE_ENRICH_URL;
  const key = process.env.PHONE_ENRICH_KEY;
  if (url && key) {
    return enrichPhoneGeneric(input, url, key);
  }

  return null;
}
