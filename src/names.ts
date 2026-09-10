// names.ts — Name acquisition pipeline: check, purchase, wire, provision, verify.
// Ports domain verification + handle checking from names-checker,
// domain purchase + email wiring from stevejobless, Telnyx from telephony.py.

// === DNS + RDAP VERIFICATION ===

const RDAP_SERVERS: Record<string, string> = {
  com: 'https://rdap.verisign.com/com/v1/domain/',
  net: 'https://rdap.verisign.com/net/v1/domain/',
  org: 'https://rdap.publicinterestregistry.org/rdap/domain/',
  io: 'https://rdap.nic.io/domain/',
  dev: 'https://pubapi.registry.google/rdap/domain/',
  ai: 'https://rdap.nic.ai/domain/',
  co: 'https://rdap.nic.co/domain/',
  sh: 'https://rdap.identitydigital.services/rdap/domain/',
  xyz: 'https://rdap.nic.xyz/domain/',
  app: 'https://pubapi.registry.google/rdap/domain/',
  trade: 'https://rdap.nic.trade/domain/',
};

const CLOUDFLARE_BUY_LINK = (d: string) => `https://www.cloudflare.com/products/registrar/?utm_source=domainchecker&query=${d}`;

interface VerifyResult {
  domain: string;
  dns: { has_records: boolean; records: any[]; error?: string };
  registration: { status: 'available' | 'taken' | 'unknown' | 'error'; registrar?: string; expires?: string; confidence: string; error?: string };
  buy_url: string;
}

export async function verifyDomain(domain: string): Promise<VerifyResult> {
  const tld = domain.split('.').pop()?.toLowerCase() || '';
  const result: VerifyResult = {
    domain,
    dns: { has_records: false, records: [] },
    registration: { status: 'unknown', confidence: 'low' },
    buy_url: CLOUDFLARE_BUY_LINK(domain),
  };

  // DNS probe — check for NXDOMAIN (domain doesn't exist = available)
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
      headers: { 'Accept': 'application/dns-json' },
    });
    const data: any = await r.json();
    const status = data.Status;
    // Status 3 = NXDOMAIN = domain does not exist = available
    // Status 0 = NOERROR with Answer = domain has records = taken
    // Status 0 = NOERROR with Authority only = possible CNAME/nxdomain ambiguity
    if (status === 3) {
      // NXDOMAIN — domain definitely doesn't exist
      result.dns.records = [];
      result.dns.has_records = false;
      result.registration = { status: 'available', confidence: 'high' };
      return result; // RDAP can override, but NXDOMAIN is strong signal
    }
    result.dns.records = data.Answer || [];
    result.dns.has_records = result.dns.records.length > 0;
  } catch (e: any) {
    result.dns.error = e.message;
  }

  // RDAP check — follow redirects, handle 302→404 chains
  const base = RDAP_SERVERS[tld];
  if (base) {
    try {
      const r = await fetch(base + domain, { redirect: 'follow' });
      if (r.status === 200) {
        const data: any = await r.json();
        const events = data.events || [];
        const expires = events.find((e: any) => e.eventAction === 'expiration');
        const status = data.status || [];
        const registrar = data.ldhName ? (status[0] || 'registered') : 'unknown';
        result.registration = {
          status: 'taken',
          registrar: data.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3] || registrar,
          expires: expires?.eventDate,
          confidence: 'high',
        };
      } else if (r.status === 404) {
        result.registration = { status: 'available', confidence: 'high' };
      }
      // Other statuses (429, 500, etc.) — keep whatever DNS said
    } catch (e: any) {
      result.registration.error = e.message;
    }
  } else {
    // No RDAP server — trust DNS heuristic
    if (result.registration.status !== 'available') {
      result.registration.status = result.dns.has_records ? 'taken' : 'unknown';
      result.registration.confidence = result.dns.has_records ? 'medium' : 'low';
    }
  }

  return result;
}

// === HANDLE CHECKING ===

interface HandleResult {
  platform: string;
  label: string;
  status: 'taken' | 'available' | 'unknown' | 'invalid';
  url?: string;
  confidence: string;
  note?: string;
  rule?: string;
  suggestions?: HandleSuggestion[];
}

const HANDLE_CHECKS: Array<{
  platform: string; label: string;
  url: (u: string) => string;
  take?: number[]; free?: number[];
  freeStatus?: number[];
  takenMarkers?: (u: string) => string[];
  freeMarkers?: (u: string) => string[];
  pageCheck?: boolean;
  oembed?: boolean;
  conf: string;
  rule: string;
  note?: string;
}> = [
  { platform: 'github', label: 'GitHub', url: u => `https://api.github.com/users/${u}`, take: [200], free: [404], conf: 'high', rule: '≤39 chars, alnum + hyphens' },
  { platform: 'x', label: 'X', url: u => `https://x.com/${u}`, freeStatus: [404], takenMarkers: u => ['This account doesn&#39;t exist', "This account doesn't exist"], conf: 'medium', rule: '≤15 chars, letters/numbers/_' },
  { platform: 'youtube', label: 'YouTube', url: u => `https://www.youtube.com/@${u}`, freeStatus: [404], takenMarkers: u => ['"channelId":"UC', '"browseId":"UC'], conf: 'medium', rule: '3–30 chars' },
  { platform: 'instagram', label: 'Instagram', url: u => `https://www.instagram.com/${u}/`, conf: 'high', rule: '≤30 chars, lowercase/numbers/./_', note: 'Uses Apify API when APIFY_TOKEN set' },
  { platform: 'tiktok', label: 'TikTok', url: u => `https://www.tiktok.com/@${u}`, freeMarkers: () => ["couldn't find this account", 'page not found', 'not found'], takenMarkers: u => [`"uniqueId":"${u}"`, `"nickname":"${u}"`], conf: 'medium', rule: '2–24 chars', pageCheck: true },
  { platform: 'twitch', label: 'Twitch', url: u => `https://www.twitch.tv/${u.toLowerCase()}`, takenMarkers: u => [`"login":"${u.toLowerCase()}"`, 'isLiveBroadcast'], freeMarkers: u => ['time machine'], conf: 'medium', rule: '4–25 chars' },
  { platform: 'npm', label: 'npm', url: u => `https://registry.npmjs.org/${encodeURIComponent(u.toLowerCase())}`, take: [200], free: [404], conf: 'high', rule: 'lowercase, URL-safe' },
  { platform: 'pypi', label: 'PyPI', url: u => `https://pypi.org/pypi/${encodeURIComponent(u.toLowerCase().replace(/[-_.]+/g, '-'))}/json`, take: [200], free: [404], conf: 'high', rule: 'PEP-normalized' },
  { platform: 'crates', label: 'crates.io', url: u => `https://crates.io/api/v1/crates/${encodeURIComponent(u.toLowerCase())}`, take: [200], free: [404], conf: 'high', rule: 'lowercase alnum/-/_' },
];

function escRx(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function checkOneHandle(name: string, check: typeof HANDLE_CHECKS[0]): Promise<HandleResult> {
  const base: HandleResult = { platform: check.platform, label: check.label, status: 'unknown', confidence: check.conf, rule: check.rule, note: check.note };
  try {
    const url = check.url(name);
    base.url = url;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
    });

    // Status-code based (GitHub, npm, PyPI, crates)
    if (check.take && check.free) {
      if (check.take.includes(r.status)) return { ...base, status: 'taken' };
      if (check.free.includes(r.status)) return { ...base, status: 'available' };
      return { ...base, status: 'unknown', note: `HTTP ${r.status}` };
    }

    // Free-status based (X, YouTube)
    if (check.freeStatus) {
      if (check.freeStatus.includes(r.status)) return { ...base, status: 'available' };
    }

    // Body-marker based
    const body = await r.text().catch(() => '');

    if (check.takenMarkers) {
      for (const marker of check.takenMarkers(name)) {
        if (new RegExp(marker, 'i').test(body)) return { ...base, status: 'taken' };
      }
    }
    if (check.freeMarkers) {
      for (const marker of check.freeMarkers(name)) {
        if (body.includes(marker)) return { ...base, status: 'available' };
      }
    }

    // oEmbed (TikTok oembed mode)
    if (check.oembed) {
      try {
        const j = JSON.parse(body);
        if (j.author_name && j.author_name.toLowerCase() === name.toLowerCase()) return { ...base, status: 'taken' };
        if (j.author_name === '' || j.error) return { ...base, status: 'available' };
      } catch { /* fall through */ }
    }

    return { ...base, status: 'unknown', note: 'no signal' };
  } catch (e: any) {
    return { ...base, status: 'unknown', note: e.message?.slice(0, 100) };
  }
}

export async function checkHandles(name: string): Promise<HandleResult[]> {
  return Promise.all(HANDLE_CHECKS.map(c => checkOneHandle(name, c)));
}

// === APIFY SOCIAL CHECK (15 platforms) ===

interface ApifyEnv { APIFY_TOKEN?: string; }

export async function apifySocialCheck(name: string, env: ApifyEnv): Promise<HandleResult[]> {
  const token = env.APIFY_TOKEN;
  if (!token) return [];

  try {
    // Start run
    const startR = await fetch(`https://api.apify.com/v2/acts/corent1robert~social-handle-checker/runs?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handles: [name], coverage: 'all' }),
    });
    const startD: any = await startR.json();
    const runId = startD?.data?.id;
    if (!runId) return [];

    // Poll for completion (max 30s)
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusR = await fetch(`https://api.apify.com/v2/acts/corent1robert~social-handle-checker/runs/${runId}?token=${token}`);
      const statusD: any = await statusR.json();
      if (statusD?.data?.status === 'SUCCEEDED') {
        const dsId = statusD.data.defaultDatasetId;
        const itemsR = await fetch(`https://api.apify.com/v2/datasets/${dsId}/items?token=${token}`);
        const items: any[] = await itemsR.json();
        if (items.length > 0) {
          const row = items[0];
          const results: HandleResult[] = [];
          const platformMap: Record<string, string> = {
            tiktok: 'TikTok', twitter: 'X', youtube: 'YouTube', github: 'GitHub',
            twitch: 'Twitch', snapchat: 'Snapchat', bluesky: 'Bluesky',
            telegram: 'Telegram', gitlab: 'GitLab', soundcloud: 'SoundCloud',
            pinterest: 'Pinterest', reddit: 'Reddit', facebook: 'Facebook',
            threads: 'Threads', instagram: 'Instagram',
          };
          for (const [key, label] of Object.entries(platformMap)) {
            const val = row[`available_${key}`];
            if (val === 'yes') results.push({ platform: key, label, status: 'available', confidence: row[`confidence_${key}`] || 'medium', note: 'Apify verified' });
            else if (val === 'no') results.push({ platform: key, label, status: 'taken', confidence: row[`confidence_${key}`] || 'medium', note: 'Apify verified' });
            else results.push({ platform: key, label, status: 'unknown', confidence: 'low', note: 'Apify error' });
          }
          return results;
        }
      }
      if (statusD?.data?.status === 'FAILED' || statusD?.data?.status === 'ABORTED') break;
    }
  } catch { /* fall through to empty */ }
  return [];
}

// === HANDLE SUGGESTIONS ===

const SUFFIXES = ['official', 'app', 'hq', 'team', 'io', 'dev', 'xyz', 'co', 'lab', 'hub', 'site', 'online', 'get', 'try', 'use', 'go', 'the', 'my', 'we'];
const PREFIXES = ['get', 'try', 'use', 'go', 'the', 'my', 'we', 'hey', 'oh'];

export interface HandleSuggestion {
  handle: string;
  source: string; // e.g. "suffix:official", "prefix:get", "domain:tld"
}

export function suggestHandles(name: string, takenHandles: string[], availableDomains: string[]): HandleSuggestion[] {
  const taken = new Set(takenHandles.map(h => h.toLowerCase()));
  const suggestions: HandleSuggestion[] = [];
  const seen = new Set<string>();

  function add(handle: string, source: string) {
    const h = handle.toLowerCase();
    if (h === name || taken.has(h) || seen.has(h) || h.length > 30) return;
    seen.add(h);
    suggestions.push({ handle: h, source });
  }

  // Suffix variations: pogtownofficial, pogtownhq, pogtownapp
  for (const suffix of SUFFIXES) {
    add(`${name}${suffix}`, `suffix:${suffix}`);
  }

  // Prefix variations: getpogtown, thepogtown
  for (const prefix of PREFIXES) {
    add(`${prefix}${name}`, `prefix:${prefix}`);
  }

  // Domain-based: if pogtown.io is available, suggest "pogtownio" as handle
  for (const domain of availableDomains) {
    const tld = domain.split('.').pop() || '';
    if (tld && tld !== 'com' && tld.length <= 6) {
      add(`${name}${tld}`, `domain:${tld}`);
    }
  }

  // Dot variations: pog.town (if name has common splits)
  // Hyphen variations if name is compound

  return suggestions.slice(0, 15);
}

export interface SocialReport {
  name: string;
  handles: (HandleResult & { suggestions?: HandleSuggestion[] })[];
  taken: string[];
  available: string[];
  unknown: string[];
  allSuggestions: HandleSuggestion[];
}

export async function fullSocialCheck(name: string, env?: ApifyEnv): Promise<SocialReport> {
  // Custom checks (GitHub, npm, PyPI, crates - fast, reliable)
  const customHandles = await checkHandles(name);

  // Apify check (15 platforms - TikTok, X, YouTube, Twitch, Snapchat, Bluesky, etc.)
  const apifyHandles = env ? await apifySocialCheck(name, env) : [];

  // Merge: custom handles take priority for platforms we check locally
  const customPlatforms = new Set(customHandles.map(h => h.platform));
  const merged = [...customHandles, ...apifyHandles.filter(h => !customPlatforms.has(h.platform))];

  const taken = merged.filter(h => h.status === 'taken').map(h => h.platform);
  const available = merged.filter(h => h.status === 'available').map(h => h.platform);
  const unknown = merged.filter(h => h.status === 'unknown').map(h => h.platform);

  // Generate suggestions for taken platforms
  const allSuggestions = suggestHandles(name, taken, []);

  // Attach top suggestions to each taken handle
  for (const h of merged) {
    if (h.status === 'taken') {
      h.suggestions = allSuggestions.slice(0, 3);
    }
  }

  return { name, handles: merged, taken, available, unknown, allSuggestions };
}

// === UNIFIED AVAILABILITY CHECK ===

export interface AvailabilityReport {
  name: string;
  domains: Array<{ domain: string; status: string; confidence: string; price?: number | null; buy_url: string }>;
  handles: HandleResult[];
  summary: {
    domains_available: number;
    domains_total: number;
    handles_available: number;
    handles_total: number;
  };
  timestamp: string;
}

export async function checkAvailability(name: string, tlds?: string[]): Promise<AvailabilityReport> {
  const targetTlds = tlds && tlds.length > 0 ? tlds : ['com', 'net', 'org', 'io', 'dev', 'ai', 'xyz', 'app', 'co', 'trade'];
  const clean = name.toLowerCase().replace(/[^a-z0-9-]/g, '');

  const domainChecks = targetTlds.map(async tld => {
    const domain = `${clean}.${tld}`;
    const v = await verifyDomain(domain);
    return {
      domain,
      status: v.registration.status,
      confidence: v.registration.confidence,
      buy_url: v.buy_url,
    };
  });

  const [domains, handles] = await Promise.all([
    Promise.all(domainChecks),
    checkHandles(clean),
  ]);

  return {
    name: clean,
    domains,
    handles,
    summary: {
      domains_available: domains.filter(d => d.status === 'available').length,
      domains_total: domains.length,
      handles_available: handles.filter(h => h.status === 'available').length,
      handles_total: handles.length,
    },
    timestamp: new Date().toISOString(),
  };
}

// === TLD PRICING (4 registrars, 15 TLDs) ===

export interface RegistrarQuote {
  registrar: string;
  registrar_name: string;
  registration: number;
  renewal: number;
  privacy: number;
  promo: string | null;
  total_5_year: number;
  buy_url: string;
}

const REGISTRAR_NAMES: Record<string, string> = { porkbun: 'Porkbun', cloudflare: 'Cloudflare', namecheap: 'Namecheap', dynadot: 'Dynadot' };
const BUY_LINK: Record<string, (d: string) => string> = {
  porkbun: d => `https://porkbun.com/products/domains?search=${encodeURIComponent(d)}`,
  cloudflare: d => `https://www.cloudflare.com/products/registrar/?query=${encodeURIComponent(d)}`,
  namecheap: d => `https://www.namecheap.com/domains/registration/results.aspx?domain=${encodeURIComponent(d)}`,
  dynadot: d => `https://www.dynadot.com/domain/search?domain=${encodeURIComponent(d)}`,
};

const TLD_PRICING: Record<string, Record<string, { registration: number; renewal: number; privacy: number; promo?: string | null }>> = {
  com:    { porkbun: { registration: 11.08, renewal: 11.08, privacy: 0 }, cloudflare: { registration: 10.44, renewal: 10.44, privacy: 0 }, namecheap: { registration: 9.58, renewal: 13.98, privacy: 2.88 }, dynadot: { registration: 9.99, renewal: 9.99, privacy: 0 } },
  net:    { porkbun: { registration: 11.49, renewal: 11.49, privacy: 0 }, cloudflare: { registration: 10.44, renewal: 10.44, privacy: 0 }, namecheap: { registration: 11.98, renewal: 14.98, privacy: 0 }, dynadot: { registration: 10.99, renewal: 10.99, privacy: 0 } },
  org:    { porkbun: { registration: 11.49, renewal: 11.49, privacy: 0 }, cloudflare: { registration: 10.44, renewal: 10.44, privacy: 0 }, namecheap: { registration: 9.98, renewal: 13.98, privacy: 0 }, dynadot: { registration: 10.49, renewal: 10.49, privacy: 0 } },
  io:     { porkbun: { registration: 28.12, renewal: 51.80, privacy: 0 }, cloudflare: { registration: 50.00, renewal: 50.00, privacy: 0 }, namecheap: { registration: 34.98, renewal: 75.98, privacy: 0 }, dynadot: { registration: 28.89, renewal: 53.50, privacy: 0 } },
  dev:    { porkbun: { registration: 8.75, renewal: 12.87, privacy: 0 }, cloudflare: { registration: 12.20, renewal: 12.20, privacy: 0 }, namecheap: { registration: 14.98, renewal: 14.98, privacy: 0 }, dynadot: { registration: 8.00, renewal: 12.50, privacy: 0 } },
  ai:     { porkbun: { registration: 82.70, renewal: 82.70, privacy: 0 }, cloudflare: { registration: 80.00, renewal: 80.00, privacy: 0 }, namecheap: { registration: 74.98, renewal: 74.98, privacy: 0 }, dynadot: { registration: 85.60, renewal: 85.60, privacy: 0 } },
  xyz:    { porkbun: { registration: 1.15, renewal: 11.99, privacy: 0, promo: 'first year $1.15' }, cloudflare: { registration: 12.00, renewal: 12.00, privacy: 0 }, namecheap: { registration: 1.98, renewal: 12.98, privacy: 0, promo: 'first year $1.98' }, dynadot: { registration: 12.99, renewal: 12.99, privacy: 0 } },
  app:    { porkbun: { registration: 8.75, renewal: 14.93, privacy: 0 }, cloudflare: { registration: 14.20, renewal: 14.20, privacy: 0 }, namecheap: { registration: 14.98, renewal: 14.98, privacy: 0 }, dynadot: { registration: 9.99, renewal: 14.50, privacy: 0 } },
  co:     { porkbun: { registration: 15.76, renewal: 31.20, privacy: 0 }, cloudflare: { registration: 30.00, renewal: 30.00, privacy: 0 }, namecheap: { registration: 9.98, renewal: 29.98, privacy: 0 }, dynadot: { registration: 15.50, renewal: 31.20, privacy: 0 } },
  sh:     { porkbun: { registration: 39.99, renewal: 39.99, privacy: 0 }, cloudflare: { registration: 39.00, renewal: 39.00, privacy: 0 }, namecheap: { registration: 39.98, renewal: 39.98, privacy: 0 }, dynadot: { registration: 38.99, renewal: 38.99, privacy: 0 } },
  trade:  { porkbun: { registration: 2.99, renewal: 2.99, privacy: 0 }, cloudflare: { registration: 4.18, renewal: 5.18, privacy: 0 }, namecheap: { registration: 2.98, renewal: 2.98, privacy: 0 }, dynadot: { registration: 2.99, renewal: 2.99, privacy: 0 } },
  site:   { porkbun: { registration: 2.99, renewal: 2.99, privacy: 0 }, cloudflare: { registration: 10.00, renewal: 10.00, privacy: 0 }, namecheap: { registration: 2.98, renewal: 9.98, privacy: 0 }, dynadot: { registration: 3.99, renewal: 3.99, privacy: 0 } },
  online: { porkbun: { registration: 3.99, renewal: 3.99, privacy: 0 }, cloudflare: { registration: 40.00, renewal: 40.00, privacy: 0 }, namecheap: { registration: 3.98, renewal: 3.98, privacy: 0 }, dynadot: { registration: 29.99, renewal: 29.99, privacy: 0 } },
  store:  { porkbun: { registration: 2.99, renewal: 2.99, privacy: 0 }, cloudflare: { registration: 50.00, renewal: 50.00, privacy: 0 }, namecheap: { registration: 2.98, renewal: 2.98, privacy: 0 }, dynadot: { registration: 2.99, renewal: 2.99, privacy: 0 } },
  tech:   { porkbun: { registration: 4.99, renewal: 4.99, privacy: 0 }, cloudflare: { registration: 40.00, renewal: 40.00, privacy: 0 }, namecheap: { registration: 4.98, renewal: 4.98, privacy: 0 }, dynadot: { registration: 4.99, renewal: 4.99, privacy: 0 } },
};

function getPricingQuotes(domain: string): RegistrarQuote[] {
  const tld = domain.split('.').pop()?.toLowerCase() || '';
  const pricing = TLD_PRICING[tld];
  if (!pricing) return [];

  const quotes: RegistrarQuote[] = Object.entries(pricing).map(([reg, p]) => ({
    registrar: reg,
    registrar_name: REGISTRAR_NAMES[reg] || reg,
    registration: p.registration,
    renewal: p.renewal,
    privacy: p.privacy,
    promo: p.promo || null,
    total_5_year: (p.registration + p.privacy) + p.renewal * 4,
    buy_url: BUY_LINK[reg]?.(domain) || '',
  }));

  quotes.sort((a, b) => a.registration - b.registration);
  return quotes;
}

// === DOMAIN SEARCH (Namecheap/Porkbun style) ===

export interface DomainResult {
  domain: string;
  available: boolean;
  confidence: string;
  best_price: number | null;
  best_registrar: string | null;
  quotes: RegistrarQuote[];
}

export interface SearchReport {
  query: string;
  domains: DomainResult[];
  summary: { available: number; taken: number; unknown: number; total: number };
  timestamp: string;
}

const SEARCH_TLDS = ['com', 'net', 'org', 'io', 'dev', 'ai', 'xyz', 'app', 'co', 'sh', 'trade', 'site', 'online', 'store', 'tech'];

export async function searchDomains(name: string): Promise<SearchReport> {
  const clean = name.toLowerCase().replace(/[^a-z0-9-]/g, '');

  const checks = SEARCH_TLDS.map(async tld => {
    const domain = `${clean}.${tld}`;
    const v = await verifyDomain(domain);
    const quotes = getPricingQuotes(domain);
    const best = quotes[0] || null;
    return {
      domain,
      available: v.registration.status === 'available',
      confidence: v.registration.confidence,
      best_price: best?.registration ?? null,
      best_registrar: best?.registrar_name ?? null,
      quotes,
    };
  });

  const domains = await Promise.all(checks);

  return {
    query: clean,
    domains,
    summary: {
      available: domains.filter(d => d.available).length,
      taken: domains.filter(d => !d.available && d.confidence === 'high').length,
      unknown: domains.filter(d => !d.available && d.confidence !== 'high').length,
      total: domains.length,
    },
    timestamp: new Date().toISOString(),
  };
}

interface CfEnv {
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
}

export async function cfCheckDomain(domain: string, env: CfEnv): Promise<any> {
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) return { error: "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID required" };

  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/registrar/domain-check`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ domains: [domain] }),
  });
  const d: any = await r.json();
  if (!d.success) return { error: d.errors?.[0]?.message || "check failed", raw: d };
  const info = d.result?.domains?.[0];
  return {
    domain: info?.name || domain,
    registrable: info?.registrable ?? false,
    price: info?.pricing?.registration_cost ?? null,
    renewal: info?.pricing?.renewal_cost ?? null,
    currency: info?.pricing?.currency ?? "USD",
    tier: info?.tier,
    reason: info?.reason,
  };
}

export async function cfRegisterDomain(domain: string, env: CfEnv, contact?: any): Promise<any> {
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) return { error: "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID required" };

  // Final check before purchase
  const check = await cfCheckDomain(domain, env);
  if (check.error) return check;
  if (!check.registrable) return { error: `domain not registrable: ${check.reason || "unknown"}`, check };

  const body: any = { domain_name: domain };
  if (contact) {
    body.contacts = {
      registrant: {
        first_name: contact.firstName || "Agent",
        last_name: contact.lastName || "User",
        email: contact.email || "noreply@cmail.tradesprior.workers.dev",
        phone: contact.phone || "+1.5555551234",
        postal_info: {
          name: `${contact.firstName || "Agent"} ${contact.lastName || "User"}`,
          address: {
            street: contact.address1 || "123 Main St",
            city: contact.city || "San Francisco",
            state: contact.state || "CA",
            postal_code: contact.postalCode || "94105",
            country_code: contact.country || "US",
          }
        }
      }
    };
  }

  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/registrar/registrations`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d: any = await r.json();
  if (!d.success) return { error: d.errors?.[0]?.message || "registration failed", raw: d };

  const result = d.result;
  return {
    domain: result?.domain_name || domain,
    state: result?.state,
    completed: result?.completed,
    registration: result?.context?.registration,
    created_at: result?.created_at,
  };
}

// === EMAIL WIRING: ZONE + NAMESERVERS + EMAIL ROUTING ===

export async function cfWireEmail(domain: string, workerName: string, env: CfEnv): Promise<any> {
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) return { error: "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID required" };

  const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
  const base = `https://api.cloudflare.com/client/v4`;

  // 1. Find or create zone
  let zoneId = "";
  const zonesR = await fetch(`${base}/zones?name=${domain}`, { headers });
  const zonesD: any = await zonesR.json();
  const existingZone = zonesD.result?.[0];
  if (existingZone) {
    zoneId = existingZone.id;
  } else {
    const createR = await fetch(`${base}/zones`, {
      method: "POST", headers,
      body: JSON.stringify({ name: domain, account: { id: accountId } }),
    });
    const createD: any = await createR.json();
    zoneId = createD.result?.id;
    if (!zoneId) return { error: "failed to create zone", raw: createD };
  }

  // 2. Enable Email Routing (adds CF MX records)
  const routingR = await fetch(`${base}/zones/${zoneId}/email/routing/dns`, {
    method: "POST", headers, body: "{}",
  });
  const routingD: any = await routingR.json();

  // 3. Set up catch-all → cmail worker
  const catchallR = await fetch(`${base}/zones/${zoneId}/email/routing/rules/catch_all`, {
    method: "PUT", headers,
    body: JSON.stringify({
      name: "cmail catch-all", enabled: true,
      actions: [{ type: "worker", value: [workerName] }],
      matchers: [{ type: "all" }],
    }),
  });
  const catchallD: any = await catchallR.json();

  // 4. Create standard mailboxes via aliases
  const aliases = ["hello", "support", "billing", "agents"];
  const aliasResults = [];
  for (const local of aliases) {
    const addr = `${local}@${domain}`;
    const aliasR = await fetch(`${base}/zones/${zoneId}/email/routing/rules`, {
      method: "POST", headers,
      body: JSON.stringify({
        name: `${local}-routing`, enabled: true, priority: 10,
        actions: [{ type: "worker", value: [workerName] }],
        matchers: [{ type: "literal", field: "to", value: addr }],
      }),
    });
    aliasResults.push({ address: addr, ok: aliasR.ok });
  }

  return {
    domain,
    zone_id: zoneId,
    email_routing: routingD.success ?? false,
    catch_all: catchallD.success ?? false,
    aliases: aliasResults,
    note: "email routing configured — messages will arrive at cmail worker",
  };
}

// === TELNYX: PHONE PROVISIONING + SMS ===

interface TelnyxEnv {
  TELNYX_API_KEY?: string;
}

const TELNYX_API = "https://api.telnyx.com/v2";

async function telnyxCall(method: string, path: string, apiKey: string, body?: any): Promise<any> {
  const r = await fetch(TELNYX_API + path, {
    method,
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d: any = await r.json();
  if (!r.ok) return { error: d.errors?.[0]?.message || `HTTP ${r.status}`, raw: d };
  return d;
}

export async function telnyxSearchNumbers(country: string, env: TelnyxEnv): Promise<any> {
  const key = env.TELNYX_API_KEY;
  if (!key) return { error: "TELNYX_API_KEY not set", numbers: [] };
  const d = await telnyxCall("GET", `/available_phone_numbers?filter[country_code]=${country}&page[size]=10`, key);
  if (d.error) return d;
  return {
    numbers: (d.data || []).map((n: any) => ({
      number: n.phone_number,
      features: n.features || [],
      cost: n.cost_per_month || null,
    })),
    country,
  };
}

export async function telnyxListNumbers(env: TelnyxEnv): Promise<any> {
  const key = env.TELNYX_API_KEY;
  if (!key) return { error: "TELNYX_API_KEY not set", numbers: [] };
  const d = await telnyxCall("GET", "/phone_numbers?page[size]=100", key);
  if (d.error) return d;
  return {
    numbers: (d.data || []).map((n: any) => ({
      number: n.phone_number,
      connection_id: n.connection_id,
      status: n.status,
    })),
  };
}

export async function telnyxPurchaseNumber(phoneNumber: string, connectionId: string, env: TelnyxEnv): Promise<any> {
  const key = env.TELNYX_API_KEY;
  if (!key) return { error: "TELNYX_API_KEY not set" };
  const d = await telnyxCall("POST", "/phone_numbers", key, {
    phone_number: phoneNumber,
    connection_id: connectionId,
  });
  if (d.error) return d;
  const p = d.data || {};
  return {
    number: p.phone_number,
    connection_id: p.connection_id,
    status: p.status,
    id: p.id,
  };
}

// In-memory SMS store (survives within a single worker instance)
const smsStore: Map<string, Array<{ from: string; to: string; text: string; received_at: string }>> = new Map();

export function storeInboundSms(from: string, to: string, text: string): void {
  const key = to;
  const arr = smsStore.get(key) || [];
  arr.push({ from, to, text, received_at: new Date().toISOString() });
  if (arr.length > 50) arr.splice(0, arr.length - 50); // cap
  smsStore.set(key, arr);
}

export function readSms(to: string, limit: number = 10): Array<{ from: string; to: string; text: string; received_at: string }> {
  return (smsStore.get(to) || []).slice(-limit);
}
