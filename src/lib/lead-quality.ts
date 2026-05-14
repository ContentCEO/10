/*
 * Lead-quality gate for scraped leads.
 *
 * Every lead must (after enrichment) have:
 *   - name (real, not a generic placeholder)
 *   - phone (E.164 or US 10-digit, matched via regex)
 *   - location: MA city OR MA zip (01000-02799)
 *   - address: street address OR (city + zip) so we know where the property is
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

export interface QualityCheckInput {
  name: string | null;
  phone: string | null;
  city: string | null;
  zip: string | null;
  notes: string | null;  // may contain street address
}

export interface QualityResult {
  ok: boolean;
  reasons: string[];
  hasPhone: boolean;
  isMA: boolean;
  hasAddress: boolean;
  hasRealName: boolean;
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
  const isMAByZip = MA_ZIP_RE.test(zip);
  const isMAByCity = MA_CITY_SET.has(cityLower);
  const isMA = isMAByZip || isMAByCity;
  if (!isMA) reasons.push("not-massachusetts");

  // Address present iff we have a zip OR (city + something street-like in notes).
  const notes = (lead.notes ?? "").toLowerCase();
  const hasStreet = /\b\d+\s+[a-z]/i.test(notes);
  const hasAddress = Boolean(zip || (cityLower && hasStreet));
  if (!hasAddress) reasons.push("no-address");

  return {
    ok: hasRealName && hasPhone && isMA && hasAddress,
    reasons,
    hasPhone,
    isMA,
    hasAddress,
    hasRealName,
  };
}

export function isMassachusettsLead(lead: { city: string | null; zip: string | null }): boolean {
  const zip = (lead.zip ?? "").trim();
  const city = (lead.city ?? "").trim().toLowerCase();
  return MA_ZIP_RE.test(zip) || MA_CITY_SET.has(city);
}

/*
 * Phone enrichment via a configurable HTTP API. Reads:
 *   PHONE_ENRICH_URL — POST endpoint that accepts JSON { name, address, city, zip }
 *                      and returns { phone: string | null }.
 *   PHONE_ENRICH_KEY — bearer token / API key.
 *
 * Designed so the user can drop in BatchData, Whitepages, PeopleDataLabs,
 * Apollo, or a self-hosted proxy without touching code. If env vars
 * aren't set, returns null — the lead is skipped by the quality gate.
 */
export interface EnrichInput {
  name: string;
  address: string | null;
  city: string | null;
  zip: string | null;
}

export async function enrichPhone(input: EnrichInput): Promise<string | null> {
  const url = process.env.PHONE_ENRICH_URL;
  const key = process.env.PHONE_ENRICH_KEY;
  if (!url || !key) return null;

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
