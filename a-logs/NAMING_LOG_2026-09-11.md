# TalkToSue / Malorie — Brand Selection Process (naming log)

## Date: 2026-09-11

## Standing rule (binding)
**NEVER buy a domain.** No purchases, ever, until explicit strict purchase
rules are planned and approved. Availability research only. (Owner order,
2026-09-11. Full purchase-rule design is future work.)

## Finalists (all registrar-confirmed free, $5.30)
1. **talktosue.co.uk** — top pick. 3-letter name, one syllable, zero misspellings.
   The domain IS the product instruction. Sue = universal UK trust.
2. **malorie.co.uk** — prettiest brand, bare firstname .co.uk. "Malorie's on it."
3. **talktolinda.co.uk** — the original concept; Linda herself (.co.uk + handles) taken.
4. Backups, all free: talktobetty, talktoalan, askmalorie, hellomalorie,
   almeta, cissie, delores, albertina, aldith, ambrosine, ermentrude, aleisha.

## The brand thesis
Human name, hidden AI. Customers hire Malorie/Sue, not software.
Positioning spine: "Malorie answers when you can't." / "You do the work — Malorie's on it."
Proof line: "Sole traders miss 62% of calls during working hours. Malorie misses zero."
Never say "AI receptionist" customer-facing.

## How we found them (batch log)

| # | Batch | Checked | Method | Confirmed free |
|---|-------|---------|--------|----------------|
| 1 | Vintage + modern ladies | 238 | DNS triage | 11 claimed (UNRELIABLE — see bug) |
| 2 | C-names | 66 | DNS triage | cher/christina/cosette claimed (ALL FALSE — see bug) |
| 3 | Trending baby names | 49 | DNS + registrar confirm | evaluna, olivette, isabeau |
| 4 | Reliable no-BS (73 classics) | 73 | DNS + registrar confirm | 0 — classic lane 100% mined |
| 5 | talkto-/ask-/hello- variants | 6 | registrar direct | talktolinda, getlinda, talktobetty, talktoalan, askmalorie, hellomalorie |
| 6 | Vibe re-check + sue | 2 | registrar direct | talktosue (sue.co.uk taken) |
| 7 | Determination hunter run | 203 | verify + registrar confirm | almeta, cissie, delores |

## The false-available bug (gold for the engine)
DNS NXDOMAIN was scored available/high. **Wrong:** registered-but-undelegated
domains also NXDOMAIN. 7 of 15 early claims were actually taken
(christina, marlyn, cher, cosette, althea, glenda, henrietta).
Fix (cmail branch tasks/a-cmail-verifyfix): no RDAP corroboration caps at
unknown/low; bulk hits confirm via Cloudflare registrar API; live regression
tests guard christina.co.uk + marlyn.co.uk. Rule learned: **DNS suggests,
registrar decides. Never claim without registrar truth.**

## Brand filters (for the naming engine)
1. **Van test:** spellable aloud over a bad line. Kills ambrosine, ermentrude.
2. **Age test:** reads 40s-50s, not newborn (kills trending-baby lane), not 70s (kills delores).
3. **Meme test:** kill Karen, Gary, Nigel and equivalents.
4. **Trust test:** bare firstname .co.uk > prefixed variant (malorie > talktolinda on trust; prefix wins only on instruction-clarity).
5. **Namespace rule:** obvious names are mined (73/73 classics taken). Hunt uncommon-vintage + variant spellings (Marlyn←Marilyn) + talkto- prefix to reopen lanes.
6. **Trending-baby rule:** parents-optimizing-for-uniqueness is the inverse of our buyer. Skip the charts.

## Beast mode (built this session, cmail branch tasks/a-cmail-beast, unpushed)
`name.bulk_check`: ≤100 names/call, rules {tlds, max_len, hyphen, digits,
vowel ratio, confidence}, structural + van scoring (steals domainarena),
D1 `bulk_runs` ledger. `name.bulk_history`: Wilson P(hit|rules) per rules-hash.
Determination hunter: `ab/pipelines/naming.py` — brief in, loops to target,
registrar-only truth, checked-set ledger. Deploy (wrangler + CF creds) H-gated.

## Files
- `/root/ab/pipelines/naming.py` — determination hunter
- `/root/ab/tests/test_naming.py` — loop + scoring tests
- `/root/ab/businesses/_naming/receipts/` — run receipts + checked-set ledger
- `/tmp/check_names.py`, `check_c.py`, `check_trending.py`, `check_vibes.py` — batch scripts
- `/root/ab/intelligence/gcp_apis.json`, `gcp_api_guide.json` — 531-API catalog + ratings

## Addendum: a- prefix hunt (2026-09-11)
46 checked, 35 registrar-confirmed free ($5.30). Hyphenated namespace
essentially unmined — squatters don't bother. Standouts: a-sue, a-malorie,
a-spark, a-calls, a-leads, a-quotes, a-fixes, a-knock, a-door. Full list in
session transcript. Rule learned: **hyphens dodge squatters.**
