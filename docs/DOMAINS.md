# Domains — buying flow + naming process

## The law (registrar truth)
**DNS suggests, registrar decides.** NXDOMAIN without RDAP corroboration means
*unknown*, never *available* — registered-but-undelegated domains NXDOMAIN too
(proven live: christina.co.uk, marlyn.co.uk). `.co.uk` has no usable RDAP
(Nominet 429s); only `cf_check.registrable` confirms. Never quote availability
without it.

## Buying flow (exact order, cheapest first)

1. **Generate** — seed batch (industry words, human names, talkto-/get-/hey- variants).
2. **Bulk check** — `name.bulk_check` (≤100/call, page with offset), rules tuned
   per brief. Free. Hits ranked by combined structural+van score.
3. **Confirm** — `name.cf_check` on shortlist (free): registrable + exact price.
4. **Socials** — `name.social` (see SOCIALS.md). No-go if core handles taken
   (unless brand strategy says otherwise — record the waiver).
5. **Brand pick** — human picks; record rejections + why (training data).
6. **Purchase** — `name.cf_purchase` with `confirmed:true` +
   `confirm_text:"BUY {domain}"`. **NEVER without explicit human confirmation
   in-session.** Standing rule: no domain purchases, ever, until strict
   purchase rules are approved (owner order 2026-09-11).
7. **Wire** — `name.wire_email` with `confirmed:true` (zone + catch-all).
8. **Verify** — EVP-1 `scripts/verify-email.sh` to CERTIFIED before handoff.

## Naming process (the science, condensed)

- **Structural score** (steals domainarena): vowel ratio + length fit (≤12 chars).
- **Van test**: spellable aloud over a bad line; alpha-only; 2+ vowels; ≤7 chars ideal.
- **Age test**: reads 40s–50s for trust brands (kills trending-baby and ancient lanes).
- **Meme test**: kill Karen/Gary/Nigel-class names.
- **Namespace rules**: obvious names are mined (73/73 classics taken); hunt
  uncommon-vintage + variant spellings (Marlyn←Marilyn) + `talkto-`/`a-` prefixes
  (hyphens dodge squatters — 35/46 free in the `a-` hunt).
- **Learning loop**: every bulk run persists to D1; `name.bulk_history` gives
  Wilson P(hit|rules). Determination hunter: `ab/pipelines/naming.py` (brief in,
  loops to target, registrar-only truth, checked-set ledger).
- Full session gold: `a-logs/NAMING_LOG_2026-09-11.md`.

## Pricing reference
`.co.uk` ~$5.30/yr via Cloudflare (at-cost). Always quote from `cf_check`,
never memory. Renewal price matters as much as registration.

## Agent notes
- Availability research is free — say so; never imply cost.
- Present 3 ranked picks max + prices + social status; human decides.
- After purchase: receipt to `receipts/`, BUSINESS.json identity block, then EVP-1.
