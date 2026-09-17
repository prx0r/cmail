# UK business phone identity rubric

## 0. Agent contract

The agent must distinguish **facts**, **policy**, **heuristics**, and **preference**.

- Facts: Telnyx API capabilities, UK number types, regulatory requirements, live inventory, price, feature support.
- Policy: the business's budget, geography, brand strategy, human-approval requirements.
- Heuristics: memorability and spoken simplicity.
- Preference: which trade-off the human ultimately prefers.

The LLM may explain the result, but it must not fabricate inventory, area-code mappings, features, regulatory status or prices.

---

## 1. Inputs

Build `BusinessPhoneIntent` from data already known during business setup. Ask the user only for unresolved information that can materially change the result.

### Identity and market
- country
- business name
- business model / vertical
- physical premises?
- initial service geography
- whether customers choose partly because the business is nearby
- likely expansion scope: local / regional / national / unknown
- customer type: B2C / B2B / mixed
- perceived trust sensitivity

### Channel requirements
- inbound voice required?
- outbound voice required?
- SMS required?
- WhatsApp required?
- OTP/verification use? (treat separately from ordinary business messaging)
- caller should call free?
- after-hours agent?
- one public number or multiple role-specific numbers?

### Operations
- monthly number budget
- max setup cost
- expected call volume
- routing architecture
- connection_id if already known
- messaging_profile_id if already known
- customer reference / business ID
- regulatory/business documents ready?
- user physically present in UK at purchase time? (Telnyx UK requirement as of the referenced 2026 support doc)

---

## 2. Hard gates — never score through these

A candidate that fails any hard gate is removed.

### H1. Country and number type supported
Query country coverage/inventory before choosing a candidate.

### H2. Required channel supported
Current Telnyx GB guidance states:
- GB local, national and toll-free numbers are **not SMS supported**;
- GB mobile numbers support SMS.

Therefore a UK business that wants a geographic/national public identity **and** SMS may need two numbers. Do not force one DID to satisfy contradictory requirements.

### H3. Regulatory acquisition feasible
For current UK Telnyx orders, preflight the required identity/business/address documentation and physical-presence condition before presenting "ready to buy".

States:
- `READY`
- `MISSING_DOCUMENTS`
- `PHYSICAL_PRESENCE_BLOCK`
- `REVIEW_REQUIRED`
- `UNKNOWN_RECHECK_PROVIDER`

### H4. Budget
Reject if recurring or setup cost exceeds policy budget unless human explicitly allows over-budget recommendations.

### H5. Recent search
Telnyx states that a phone number must have appeared in a recent search before ordering. Re-search immediately before purchase.

### H6. Human authority
Purchase is a spend action. `recommend != reserve != buy`.

---

## 3. Choose number semantics before choosing digits

### A. Local / geographic (01/02)
Strong candidate when:
- customer's buying decision is local;
- a physical/local service radius is core;
- the business benefits from "we are from here";
- local offices/branches will each have their own identity.

Examples: electrician, plumber, garage, dentist, estate agent, restaurant, local solicitor.

Do not choose purely because the company starts in a city. A business can be initially local while its *brand identity* is intended to be national.

### B. National / non-geographic (03)
Strong candidate when:
- one UK-wide identity is desirable;
- locality is not central to trust;
- the company expects regional/national expansion;
- the public number should survive geographic expansion.

Examples: ecommerce, SaaS, national trades marketplace, remote consultancy, nationwide service coordination.

### C. Mobile (07)
Strong candidate when:
- SMS is a hard requirement on the same Telnyx DID;
- mobile/personal reachability is itself appropriate;
- it is an operational messaging endpoint;
- public identity intentionally feels individual/mobile.

Usually a **secondary operational identity** for a more established/local/national business rather than the only public number.

### D. Toll-free (0800/0808)
Strong candidate when:
- removing caller cost/friction matters;
- inbound calls are a primary acquisition/support channel;
- the business accepts paying the economics of toll-free inbound calling;
- national rather than local identity is wanted.

Examples: national helpline, high-ticket lead-generation line, claims/support, national sales desk.

---

## 4. Strategy rubric

Use the following features. Scores are 0..1 unless boolean.

### Business fit features
- `locality_is_purchase_signal`
- `national_identity_value`
- `sms_requirement`
- `free_to_caller_value`
- `personal_mobile_identity_value`
- `geographic_lock_in_risk`
- `branch_specific_identity_value`

### Default strategy weights

#### local geographic
```
+0.40 locality_is_purchase_signal
+0.20 branch_specific_identity_value
+0.15 trust_sensitivity
-0.30 geographic_lock_in_risk
-1.00 sms_requirement IF same-number SMS is mandatory
```

#### national
```
+0.35 national_identity_value
+0.30 geographic_lock_in_risk
+0.15 expected_expansion
+0.10 brand_uniformity_value
-0.20 locality_is_purchase_signal
-1.00 sms_requirement IF same-number SMS is mandatory
```

#### mobile
```
+0.55 sms_requirement
+0.20 personal_mobile_identity_value
+0.10 field_worker_directness
-0.20 formal_public_identity_value
```

#### toll-free
```
+0.45 free_to_caller_value
+0.25 inbound_call_importance
+0.15 national_identity_value
-0.20 cost_sensitivity
```

Do not convert this blindly into a single-number answer. Multi-number architectures are valid and often superior.

---

## 5. Candidate scoring after strategy selection

Recommended total = 100 points.

### 5.1 Semantic/business fit — 30
How well does this actual DID satisfy the chosen identity strategy?

### 5.2 Capability/operations — 20
- exact required features;
- reservable if approval flow needs reservation;
- not held unless intentionally reclaiming;
- compatible with connection/messaging wiring;
- adequate operational status.

### 5.3 Memorability — 20
Use deterministic features:
- adjacent repeats;
- repeated pairs;
- repeated blocks;
- palindromic structure;
- ascending/descending runs;
- low number of chunks;
- lower digit entropy.

Do **not** assign mystical value to lucky digits. Pattern is the feature, not numerology.

### 5.4 Spoken usability — 15
Score:
- short natural chunking;
- repeated groups ("double eight");
- fewer transitions;
- low ambiguity;
- good TTS/ASR roundtrip.

### 5.5 Economics — 10
Compare returned `cost_information` against feasible peers.

### 5.6 Future fit — 5
- minimal unnecessary lock-in;
- compatible with expected business evolution;
- can be ported/retained under business policy.

---

## 6. Memorability rules

Extract the subscriber portion appropriate to the strategy and evaluate patterns.

High-value patterns:
- AAAA: 7777
- AABB: 7722
- ABAB: 2727
- ABBA: 2772
- ABCABC: 314314
- repeated pair series: 88 22 44
- simple sequence: 1234 / 4321

Useful features:
- `longest_run`
- `adjacent_equal_count`
- `pair_repeat_count`
- `block_repeat_score`
- `palindrome_ratio`
- `sequence_run`
- `unique_digit_count`
- `entropy`
- `estimated_chunk_count`

Do not overfit: a mild pattern advantage should not override wrong semantics, missing SMS, regulatory failure, or a large price premium.

---

## 7. Search policy with Telnyx

### Phase 1 — coverage
Use country coverage / inventory coverage when useful to learn available types/regions.

### Phase 2 — broad candidate search
Use:
- `filter[country_code]=GB` (required)
- `filter[phone_number_type]=...`
- `filter[features]=...` only for actual required features
- `filter[locality]=...` for local strategy
- `filter[national_destination_code]=...` when a valid area code is known
- `filter[limit]` high enough to rank a useful pool
- `filter[reservable]=true` if the approval flow will reserve
- `filter[exclude_held_numbers]=true` for ordinary new-number acquisition

Advanced filters:
- `filter[starts_with]`
- `filter[ends_with]`
- `filter[contains]`
- `filter[consecutive]`

Use advanced digit filters **after** semantics/capability are correct; do not repeatedly tunnel into a vanity pattern and accidentally miss better inventory.

### Search constraints from Telnyx
- country code is required;
- wildcards are unsupported;
- recent-search requirement applies before order;
- `cost_information` should be checked per candidate;
- best-effort and quickship have documented scope limitations; do not assume they are general UK optimizers.

---

## 8. Top-three policy

Never show three near-identical options.

Return a small Pareto set:

1. `BEST_OVERALL`
2. `BEST_MEMORY` or `BEST_LOCAL_TRUST`
3. `BEST_VALUE` or `BEST_FUTURE_FIT`

For genuinely different architectures, show those instead:
- local public voice + mobile SMS;
- national public voice + mobile SMS;
- toll-free public voice + mobile SMS.

Every card includes:
- formatted number;
- type;
- channel capability;
- area/locality semantics;
- one-time/monthly cost if returned;
- component scores;
- reasons;
- downsides;
- compliance state;
- reservation eligibility;
- expiry if reserved.

---

## 9. Human-facing explanation contract

Good:
> "We recommend the 03 option because the brand is intended to serve the UK nationally, so a Nottingham geographic identity would add unnecessary lock-in. This number also has a repeated 27-27 pattern and is cheaper than the other two feasible national candidates."

Bad:
> "0330 feels more professional."

Good:
> "You also require SMS. Telnyx's current GB guidance says local/national/toll-free inventory is not SMS-capable, so the clean setup is a public 03 voice number plus a separate 07 messaging number."

Bad:
> "This local number probably supports SMS."

---

## 10. Reservation/purchase state machine

```text
DRAFT_INTENT
  -> COMPLIANCE_PREFLIGHT
  -> STRATEGY_SELECTED
  -> INVENTORY_SEARCHED
  -> CANDIDATES_SCORED
  -> HUMAN_PRESENTED
  -> [optional] RESERVED
  -> HUMAN_APPROVED
  -> FRESH_RECHECK
  -> ORDER_CREATED
  -> REQUIREMENTS_PENDING | PROVISIONING
  -> ACTIVE
  -> WIRED
  -> VERIFIED
```

Reservation is useful when inventory is scarce/patterned and a human is actively deciding. Telnyx reservations last 30 minutes and not all numbers are reservable.

Do not reserve large candidate pools.

---

## 11. Learning loop

Store:
- business profile;
- strategy decision;
- all searched candidates;
- chosen candidate;
- scoring components;
- human override;
- monthly cost;
- calls/leads/conversions by source;
- customer-reported number recall errors;
- port/change events.

Then learn only from identifiable outcomes. Avoid claiming that a number pattern "caused conversion" without enough data.

---

## 12. Red flags / escalation

Create a human task when:
- regulatory preflight is incomplete;
- business geography is ambiguous and local-vs-national changes the strategy materially;
- same-number SMS is demanded alongside a non-SMS UK type;
- user requests misleading locality;
- price is above cap;
- requirement group is missing or rejected;
- desired inventory is unavailable;
- number has unusual/held status;
- porting is required;
- downstream WhatsApp rules need a distinct registration path;
- agent is unsure whether a provider rule has changed.

