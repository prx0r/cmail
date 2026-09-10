# AVAILABILITY REFERENCE — deterministic handle checks per platform

How we (and anyone) determine available-vs-taken without guessing. Rule used
throughout: **report the method's actual strength; unknown beats a wrong green.**

## Solved deterministically (free, no login)

| Platform | Method | Signal | Confidence |
|---|---|---|---|
| Domains (most TLDs) | registry RDAP (IANA bootstrap) | 200 taken / 404 free | high |
| GitHub | `api.github.com/users/{u}` | 200 / 404 | high (watch shared-IP 60/hr limit → unknown on 403/429) |
| npm / PyPI / crates.io | registry APIs | 200 / 404 | high |
| ENS | ensideas resolve | address set / zero | medium-high |
| **YouTube** | **Data API v3 `channels.list?forHandle=`** (key in worker secret `YT_API_KEY`) | items 1 / 0 | high |
| App Store | iTunes Search exact-match | exact hit / none | medium (Apple 429s datacenter IPs → unknown; KV-cached 6h) |
| TikTok | oEmbed (`author_name` vs `Something went wrong`) | body match | medium |

## Solved with operator keys (env secrets, documented risk)

| Platform | Method | State |
|---|---|---|
| Twitch | Helix `users?login` via client-credentials (free app) — `TWITCH_CLIENT_ID/SECRET` | built, awaiting keys |
| Reddit | app-only OAuth `user/about.json` — `REDDIT_CLIENT_ID/SECRET` | built, awaiting keys |
| Instagram / X / TikTok-gated | operator session passthrough (`IG_SESSIONID`, `X_AUTH_TOKEN`, `TIKTOK_COOKIE`) — your own sessions, low volume | built, awaiting sessions |
| LinkedIn | **verdict: manual-only** — no public, no oEmbed, blocks servers | not building; checklist link |

## Solvable with someone else's pipe (not from datacenter IPs)

| Platform | Why servers fail | Deterministic path |
|---|---|---|
| Instagram | 200 + login wall for free and taken alike | **Apify residential actors** (no-login profile API, ~free tier 20/run) or Zyla API (~$21/mo). No official endpoint exists — Graph API has none. |
| TikTok edge cases | login/age-gated profiles hide data | logged-in cookie (kuji2336 pattern) or residential proxies |
| X taken | login wall on profile HTML | 404s still work for free; taken needs session or paid API |
| Twitch | consent/wall variance | content markers work sometimes; residential otherwise |
| Reddit / LinkedIn | 403 / block server callers | residential proxies only |

## No deterministic server-side path (report unknown)

Reddit, LinkedIn from datacenters. Personal-IG-only data. Anything requiring a
logged-in session we don't have.

## Cost ladder for full coverage

1. Free tier (us today): everything in table 1 — ~70% of what founders need.
2. Apify pay-per-run residential: IG/TikTok/X certainty, pennies per check.
3. Zyla-style API subscription: same, flat monthly.
4. Official OAuth (Meta/Google) where we operate accounts anyway.

## Implementation map (this repo)

- `worker/src/index.js`: `HANDLE_CHECKS` (status/API), `probeProfile` (content),
  `checkAppStores` (iTunes + Play sniff), YouTube via `YT_API_KEY` secret.
- Rule violations (X 15-char cap etc.) report the rule, never a status.
- Conflicting markers or fetch failures → `unknown` with reason. Always.
