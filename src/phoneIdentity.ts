// Phone identity recommendation — ported from uk-business-phone-agent-blueprint.
// Deterministic: strategy inference + memorability/spoken scoring. No network
// here except via the injected search function. NO PURCHASE PATH EXISTS in
// this module by design: recommend != reserve != buy (rubric H6).

export interface PhoneIntent {
  locality_is_purchase_signal?: number;
  national_identity_value?: number;
  expected_expansion?: number;
  trust_sensitivity?: number;
  free_to_caller_value?: number;
  inbound_call_importance?: number;
  cost_sensitivity?: number;
  sms_required?: boolean;
  same_number_sms_required?: boolean;
  personal_mobile_identity_value?: boolean | number;
  field_worker_directness?: number;
  formal_public_identity_value?: number;
  brand_uniformity_value?: number;
  branch_specific_identity_value?: number;
  locality?: string; // e.g. "Nottingham" for local strategy
  monthly_budget?: number;
}

export type Strategy = "local" | "national" | "mobile" | "toll_free";

// GB.yaml capability rule: only GB mobile supports SMS on Telnyx.
export const GB_SMS_CAPABLE: Record<Strategy, boolean> = {
  local: false,
  national: false,
  mobile: true,
  toll_free: false,
};

export function strategyScores(x: PhoneIntent): Record<Strategy, number> {
  const n = (v: any, d = 0) => (typeof v === "number" ? v : d);
  const local =
    0.4 * n(x.locality_is_purchase_signal) +
    0.15 * n(x.trust_sensitivity, 0.5) -
    0.3 * n(x.expected_expansion);
  const national =
    0.35 * n(x.national_identity_value) +
    0.3 * n(x.expected_expansion) -
    0.2 * n(x.locality_is_purchase_signal);
  const mobile =
    0.55 * (x.sms_required ? 1 : 0) +
    0.2 * n(x.personal_mobile_identity_value) -
    0.15 * n(x.trust_sensitivity, 0.5);
  const toll_free =
    0.45 * n(x.free_to_caller_value) +
    0.25 * n(x.inbound_call_importance, 0.5) +
    0.15 * n(x.national_identity_value) -
    0.2 * n(x.cost_sensitivity, 0.5);
  const out = { local, national, mobile, toll_free };
  if (x.same_number_sms_required) {
    // Current Telnyx GB policy makes non-mobile same-number SMS invalid.
    out.local -= 10;
    out.national -= 10;
    out.toll_free -= 10;
  }
  return out;
}

export function recommendArchitecture(x: PhoneIntent): {
  primary: Strategy;
  secondary: Strategy | null;
  scores: Record<Strategy, number>;
  reasons: string[];
} {
  const scores = strategyScores(x);
  const primary = (Object.keys(scores) as Strategy[]).reduce((a, b) =>
    scores[a] >= scores[b] ? a : b
  );
  let secondary: Strategy | null = null;
  const reasons: string[] = [];
  if (x.sms_required && (primary === "local" || primary === "national" || primary === "toll_free")) {
    secondary = "mobile";
    reasons.push(
      "Separate GB mobile messaging DID: current Telnyx GB guidance does not support SMS on local/national/toll-free."
    );
  }
  return { primary, secondary, scores, reasons };
}

// ---- memorability / spoken scoring (port of scorer.py) ----

function digits(s: string): string {
  return s.replace(/\D/g, "");
}

function ukNationalDigits(e164: string): string {
  const d = digits(e164);
  return d.startsWith("44") ? "0" + d.slice(2) : d;
}

function longestRun(s: string): number {
  let best = 1, cur = 1;
  for (let i = 1; i < s.length; i++) {
    cur = s[i] === s[i - 1] ? cur + 1 : 1;
    best = Math.max(best, cur);
  }
  return s ? best : 0;
}

function adjacentEqualCount(s: string): number {
  let n = 0;
  for (let i = 1; i < s.length; i++) if (s[i] === s[i - 1]) n++;
  return n;
}

function repeatedBlockScore(s: string): number {
  let best = 0;
  for (let size = 1; size <= Math.floor(s.length / 2); size++) {
    for (let start = 0; start <= s.length - 2 * size; start++) {
      if (s.slice(start, start + size) === s.slice(start + size, start + 2 * size)) {
        best = Math.max(best, Math.min(1, (2 * size) / Math.max(4, s.length)));
      }
    }
  }
  return best;
}

function sequenceRun(s: string): number {
  if (!s) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < s.length; i++) {
    if (Math.abs(parseInt(s[i]) - parseInt(s[i - 1])) === 1) { cur++; best = Math.max(best, cur); }
    else cur = 1;
  }
  return best;
}

function pairStructureScore(s: string): number {
  if (s.length < 4) return 0;
  const pairs: string[] = [];
  for (let i = 0; i < s.length - 1; i += 2) pairs.push(s.slice(i, i + 2));
  const identical = pairs.filter((p) => p.length === 2 && p[0] === p[1]).length;
  return identical / Math.max(1, pairs.length);
}

function palindromeRatio(s: string): number {
  if (!s) return 0;
  const rev = [...s].reverse().join("");
  return [...s].filter((c, i) => c === rev[i]).length / s.length;
}

function entropyScore(s: string): number {
  if (!s) return 0;
  const counts = new Map<string, number>();
  for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1);
  const h = [...counts.values()].reduce((a, v) => a - (v / s.length) * Math.log2(v / s.length), 0);
  const maxH = s.length > 1 ? Math.log2(Math.min(10, s.length)) : 1;
  return maxH ? Math.max(0, 1 - h / maxH) : 1;
}

export function memorabilityScore(number: string, tailLen = 6): number {
  const full = ukNationalDigits(number);
  const tail = full.length >= tailLen ? full.slice(-tailLen) : full;
  const adj = adjacentEqualCount(tail);
  const run = longestRun(tail);
  const raw =
    0.18 * Math.min(1, adj / 3) +
    0.16 * Math.min(1, Math.max(0, run - 1) / 3) +
    0.18 * repeatedBlockScore(tail) +
    0.18 * pairStructureScore(tail) +
    0.1 * palindromeRatio(tail) +
    0.08 * Math.min(1, Math.max(0, sequenceRun(tail) - 1) / 3) +
    0.12 * entropyScore(tail);
  return Math.round(100 * raw * 100) / 100;
}

export function spokenScore(number: string, tailLen = 6): number {
  const full = ukNationalDigits(number);
  const tail = full.length >= tailLen ? full.slice(-tailLen) : full;
  if (!tail) return 0;
  let i = 0, chunks = 0;
  while (i < tail.length) {
    if (i + 4 <= tail.length && tail.slice(i, i + 2) === tail.slice(i + 2, i + 4)) { chunks++; i += 4; continue; }
    if (i + 2 <= tail.length && tail[i] === tail[i + 1]) { chunks++; i += 2; continue; }
    chunks++; i++;
  }
  const score = 100 - Math.max(0, chunks - 2) * 12 + Math.min(15, adjacentEqualCount(tail) * 4) + repeatedBlockScore(tail) * 15;
  return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100;
}

// ---- orchestration ----

export interface TelnyxCandidate {
  number: string;
  features: Array<{ name: string }> | string[];
  monthly_cost?: number | null;
  setup_cost?: number | null;
  reservable?: boolean;
}

export type SearchFn = (strategy: Strategy, intent: PhoneIntent) => Promise<TelnyxCandidate[]>;

function hasSms(features: TelnyxCandidate["features"]): boolean {
  return features.some((f) => (typeof f === "string" ? f : f.name).toLowerCase().includes("sms"));
}

function hardGate(c: TelnyxCandidate, strategy: Strategy, intent: PhoneIntent): string | null {
  if (intent.sms_required && strategy === "mobile" && !hasSms(c.features)) {
    return "mobile candidate lacks SMS feature";
  }
  if (intent.sms_required && !intent.same_number_sms_required && strategy !== "mobile") {
    // SMS rides on the secondary mobile DID; voice DID needs voice.
    const feats = c.features.map((f) => (typeof f === "string" ? f : f.name).toLowerCase());
    if (!feats.some((f) => f.includes("voice") || f.includes("calling"))) return "voice candidate lacks voice feature";
  }
  if (typeof intent.monthly_budget === "number" && typeof c.monthly_cost === "number" && c.monthly_cost > intent.monthly_budget) {
    return "exceeds monthly budget";
  }
  return null;
}

export interface RankedOption {
  archetype: "BEST_OVERALL" | "BEST_MEMORY" | "BEST_VALUE";
  number: string;
  strategy: Strategy;
  score: number;
  components: { memorability: number; spoken_usability: number };
  monthly_cost: number | null;
  reasons: string[];
  downsides: string[];
}

export async function recommendPhoneIdentity(
  intent: PhoneIntent,
  search: SearchFn
): Promise<{
  architecture: ReturnType<typeof recommendArchitecture>;
  options: RankedOption[];
  requires_confirmation: true;
  searched_strategies: Strategy[];
}> {
  const architecture = recommendArchitecture(intent);
  const strategies: Strategy[] = [architecture.primary];
  if (architecture.secondary) strategies.push(architecture.secondary);

  const scored: RankedOption[] = [];
  for (const s of strategies) {
    const candidates = await search(s, intent);
    for (const c of candidates) {
      const gate = hardGate(c, s, intent);
      if (gate) continue;
      const mem = memorabilityScore(c.number);
      const spoken = spokenScore(c.number);
      const score = Math.round((0.5 * mem + 0.3 * spoken + 0.2 * (c.monthly_cost ? 50 : 70)) * 100) / 100;
      const downsides: string[] = [];
      if (!GB_SMS_CAPABLE[s] && intent.sms_required) downsides.push("no SMS on this DID — messaging rides the secondary mobile");
      if (s === "local") downsides.push("geographic lock-in if the business expands nationally");
      if (s === "toll_free") downsides.push("inbound toll-free economics cost the business per call");
      scored.push({
        archetype: "BEST_OVERALL",
        number: c.number,
        strategy: s,
        score,
        components: { memorability: mem, spoken_usability: spoken },
        monthly_cost: c.monthly_cost ?? null,
        reasons: [`fits ${s} strategy (score ${architecture.scores[s].toFixed(2)})`, ...architecture.reasons],
        downsides,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  // Diverse top-3: dedup numbers first, then prefer distinct strategies.
  const uniq: RankedOption[] = [];
  const seenNumbers = new Set<string>();
  for (const c of scored) {
    if (seenNumbers.has(c.number)) continue;
    seenNumbers.add(c.number);
    uniq.push(c);
  }
  const seenStrategies = new Set<string>();
  const top: RankedOption[] = [];
  for (const pass of [0, 1]) {
    for (const c of uniq) {
      if (top.length >= 3) break;
      if (pass === 0) {
        if (seenStrategies.has(c.strategy)) continue;
        seenStrategies.add(c.strategy);
      } else if (top.includes(c)) continue;
      top.push(c);
    }
  }
  const archetypes = ["BEST_OVERALL", "BEST_MEMORY", "BEST_VALUE"] as const;
  top.forEach((o, i) => { o.archetype = archetypes[Math.min(i, 2)]; });

  return {
    architecture,
    options: top.slice(0, 3),
    requires_confirmation: true,
    searched_strategies: strategies,
  };
}
