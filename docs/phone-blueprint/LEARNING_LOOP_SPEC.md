# Phone learning loop — spec: how recommendations become the moat

Status: SPEC (query-001 recorded at `a-logs/phone-query-001.json`, pick pending).
Principle: **whoever owns the outcome history knows what setups businesses
actually choose — and that knowledge is the sellable asset** (cf. alphaintel:
marginal value of information; worlds: DomainsWorld from data we already own).

## 1. What we track per query

Three linked records. Query (auto) → pick (human) → outcome (measured).

### phone_queries (auto, every `name.phone_recommend` call)
- `query_id`, `ts`, `worker_version`, `actor`
- `business_profile`: vertical, country, use_cases[], geography
- `intent`: the full intent object as passed
- `assumptions`: anything inferred, not stated (unconfirmed flags)
- `architecture`: primary/secondary + all four strategy scores
- `candidates_searched`: count per strategy + filters used (not full numbers)
- `options_presented`: archetype, number ref, strategy, score + components,
  setup/mrc at decision time
- `pricing_snapshot`: ref to pricing file version
- `status`: `recommended_awaiting_pick`

### phone_picks (human, one row per query)
- `query_id`, `ts`, how captured (reply / task deliver / dashboard)
- `picked`: option ref | `none` | `custom` (bought something else entirely)
- `override`: bool — picked something other than BEST_OVERALL
- `override_reason`: free text if given ("wanted memorable", "cheaper", …)
- `status` → query flips to `picked` | `declined` | `expired_30d`

### phone_outcomes (measured, longitudinal)
- `query_id`, `activated`, `wired_voice`, `wired_sms`
- `monthly_spend_usd`: actual, sampled monthly
- `recall_errors`: customer-reported "couldn't remember/dictate number" events
- `port_change_events`: number changed/ported away + why
- `regret_signals`: support tickets mentioning the number, early churn

## 2. Privacy rules (numbers are sensitive)

- Full DIDs live only in `options_presented`/`picked`, access-controlled,
  same boundary as mailbox content. Never in logs, prompts, or eval corpora.
- All aggregation below archetype/strategy/vertical level uses **patterns,
  not numbers**: score bands, price bands, strategy pairs.
- Retention: raw per-query rows 24 months, aggregates indefinite. State this
  in the privacy policy before any non-owner customer's data enters the loop.

## 3. Aggregation queries (the intel)

Run monthly once n ≥ 30; Wilson lower bounds throughout (same pattern as
`bulkHistory` — one learning-loop convention across cmail):

1. **Archetype pick rate per vertical**: do ecommerce founders take
   BEST_OVERALL or BEST_VALUE? Per-vertical priors replace the generic top-3.
2. **Override rate per strategy**: if `local`-primary recommendations get
   overridden 40% of the time, the locality weight is wrong — recalibrate.
3. **Price sensitivity**: picked setup/mrc vs cheapest presented. Are we
   leaving money on the table recommending up, or losing picks recommending
   down? This prices the memorability premium empirically.
4. **Pattern premium**: do high-memorability picks actually produce fewer
   recall errors? If not, the 20-point memorability weight is theater.
5. **SMS-split acceptance**: how often does the two-number architecture survive
   contact with a real human? Resistance here means the explanation contract
   needs work, not the math.
6. **Time-to-decision**: days from recommend to pick. Stale picks (>30d)
   expire — inventory turns over, re-recommend instead.

## 4. Calibration (closing the loop)

- Override rate per strategy/direction feeds weight adjustments with the same
  discipline as the naming loop: propose delta, backtest against stored
  queries, require human sign-off before changing `phoneIdentity.ts` weights.
- Never auto-tune on n < 30 per cell. Never tune on declined/expired queries.
- Every weight change ships with the before/after override-rate prediction so
  the next month's data falsifies it or not.

## 5. How this becomes money (the moat, staged)

1. **Better recommendations** (free, internal): per-vertical priors beat the
   generic rubric within months. Our tool picks better numbers than any
   competitor's static rubric.
2. **Telephony-setup intel** (AlphaIntel): "how UK ecommerce businesses set up
   phone identity" — archetype distributions, price bands, SMS-split rates.
   Sold per-niche to entrants, agencies, and (later) operators pricing their
   own onboarding.
3. **Operator proof** (AlphaOperator): when a vertical operator launches,
   outcome history (spend, recall errors, churn-by-setup) is the training data
   and the sales story ("setups like yours retain X% better").
4. **Information market pricing** (monster version): marginal value per signal
   — did memorability scores actually predict recall? Price the signals by
   demonstrated EV, same as `/a-budget` does for ad intel.

## 6. Generalization (one loop convention)

This is the template, not a one-off:
- Domain picks: `bulkHistory` already does runs + Wilson. Extend records with
  pick (which domain bought) the same way.
- Any future recommender (plan tiers, ad budgets, suppliers) ships with
  query/pick/outcome tables from day one. No recommender without a loop.

## 7. Build order

1. ✅ Query records (this file's schema; query-001 live).
2. Pick capture: smallest path is a `phone_pick` log via existing task deliver
   payload or a narrow MCP tool. Human replies in chat also count — agent
   transcribes.
3. D1 tables mirroring §1 (queries/picks/outcomes) + monthly aggregation query.
4. Calibration rule wired to weight-change proposals.
5. Intel packaging (stage 2 above) only when n ≥ 100 picked queries.
