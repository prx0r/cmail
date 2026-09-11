# FINAL REVIEW — 2026-09-10

## What We Built

### The Vision
An autonomous name acquisition pipeline: agent types a name → sees all domains + handles → buys domain → wires email → provisions phone → signs up for accounts.

### What Actually Works

**23 MCP tools, deployed and tested:**

| Category | Tools | Status |
|----------|-------|--------|
| Domain check | name.verify_domain, name.check, name.search | ✅ Working |
| Domain purchase | name.cf_check, name.cf_purchase | ✅ Working (preview mode) |
| Email wiring | name.wire_email | ✅ Working (preview mode) |
| Social handles | name.check_handles, name.social | ✅ Working (13 platforms) |
| Phone/SMS | name.phone_search, name.read_sms | ⚠️ Needs Telnyx key |
| Email | email.list_domains, email.inbox, etc. | ✅ Working |
| Domain Hunter | check_availability, get_prices, etc. | ✅ Working |
| Namecheap | namecheap_list_domains, etc. | ⚠️ Needs API creds |

### What We Learned

#### 1. Domain checking is solved
- RDAP gives authoritative answers for 1200+ TLDs
- Our MCP + Domain Hunter both get the same results (5/5 match)
- Pricing from 4 registrars (Porkbun, Cloudflare, Namecheap, Dynadot)
- Cost: $0 per check

#### 2. Social handle checking is 70% solved
- **7 platforms free** (direct API): GitHub, X, YouTube, TikTok, npm, PyPI, crates.io
- **6 platforms via Apify** ($0.006/handle): Snapchat, Bluesky, Telegram, GitLab, SoundCloud, Pinterest
- **5 platforms blocked** (manual check): Instagram, Facebook, Threads, Reddit, Twitch
- Instagram is fundamentally not checkable from any server — Meta blocks all automated access

#### 3. Domain purchase works via Cloudflare
- Cloudflare Registrar API: check availability + register
- Requires: CLOUDFLARE_API_TOKEN with Registrar permissions
- Cost: at-cost pricing (e.g. .com $10.46/yr)
- Confirmation gate: confirmed:true required

#### 4. Email wiring works via Cloudflare
- Create zone → enable Email Routing → set catch-all to cmail worker
- hello@, support@, agents@ go live immediately
- Requires: same Cloudflare token

#### 5. Phone/SMS needs Telnyx
- Telnyx API for number search + purchase
- SMS webhook for receiving verification codes
- Still needs: TELNYX_API_KEY in vault

#### 6. Social signup is the hard part
- Easy: GitHub, npm, Bluesky, GitLab, SoundCloud (no CAPTCHA)
- Medium: X, YouTube, Pinterest (may need phone)
- Hard: TikTok, Snapchat (heavy CAPTCHA)
- Needs: Playwright + email (cmail) + phone (Telnyx)

#### 7. Pricing matters
- Porkbun cheapest for .io ($28.12 vs Namecheap $34.98)
- Dynadot cheapest for .dev ($8.00 vs Cloudflare $12.20)
- Our pricing table was stale — fixed with Domain Hunter live data

### Performance

| Metric | Value |
|--------|-------|
| Our MCP (5 domains) | 0.7s |
| Domain Hunter CLI (5 domains) | 0.1s (7x faster, parallel) |
| Social check (9 platforms) | ~2s |
| Social check + Apify (13 platforms) | ~8s |

### Bugs Fixed

1. **RDAP Redirect** — .org RDAP returned 302 → PIR → 404. Fixed: use direct PIR URL.
2. **DNS NXDOMAIN** — Status 3 + SOA was wrongly "taken". Fixed: NXDOMAIN = available.
3. **CORS** — cmail MCP missing Access-Control-Allow-Origin. Fixed: added CORS headers.
4. **Pricing stale** — Porkbun .io was $44.99, should be $28.12. Fixed with live data.

### What's Missing

1. **Telnyx key** — phone provisioning + SMS relay
2. **Namecheap API creds** — alternative registrar
3. **Git remote** — repo not pushed to GitHub
4. **Instagram automation** — impossible without Meta app review
5. **CAPTCHA solving** — TikTok, Snapchat need human assist or CAPTCHA service

## The Pipeline (what an agent can do today)

```
1. CHECK     → name.search "postagi" → 15 TLDs + prices from 4 registrars
2. HANDLES   → name.social "postagi" → 13 platforms + suggestions for taken
3. MANUAL    → Open 5 links for Instagram/Facebook/Threads/Reddit/Twitch
4. BUY       → name.cf_purchase "postagi.trade" confirmed:true → $4.18
5. EMAIL     → name.wire_email "postagi.trade" confirmed:true → hello@, support@
6. PHONE     → name.phone_search country=US → get number (needs Telnyx)
7. SIGNUP    → Playwright fills signup forms using email + phone
8. VERIFY    → name.read_sms → get verification codes
```

## Key Files

```
cmail/
├── src/
│   ├── names.ts           (684 lines) — All domain/handle/purchase/phone logic
│   ├── mcp.ts             (215 lines) — 23 MCP tool definitions
│   ├── lib.ts             (104 lines) — Email classification
│   ├── names.test.ts      (49 lines) — Domain/handle tests
│   └── lib.test.ts        (69 lines) — Email pipeline tests
├── domain-hunter-lib/     — Cloned Domain Hunter (our tools added to MCP)
├── domain-hunter-site/    — Deployed UI (domain check + socials + manual)
├── namecheap-mcp/         — Cloned Namecheap MCP
├── seed0/                 — Task framework (A/H/M tasks)
├── docs/                  — Cloudflare API docs
├── migrations/            — D1 schema
├── bridge/                — stevejobless sync
├── a-logs/                — Session logs
├── HANDOVER.md            — Fresh agent starting guide
├── SESSION_SUMMARY.md     — Everything built today
├── REVIEW.md              — Technical reference
├── PLAN.md                — A-task registry
├── GOAL.md                — Vision document
├── SIGNUP_AUTOMATION.md   — Platform signup steps
├── SIGNUP_TASKS.md        — A/H/M task registry
├── SOCIAL_ENDPOINTS.md    — Canonical endpoints per platform
├── MANUAL_CHECK_GUIDE.md  — How to check blocked platforms
├── APIFY_LOG.md           — Apify actors tested
├── PLATFORM_DOCS.md       — Platform detection methods
├── "OUTPUT hamtask.com.md" — Working output example
└── SESSION_LOG.md         — This file
```

## Secrets (agent-vault oracle)

```
CLOUDFLARE_API_TOKEN     — Cloudflare API (registrar + workers)
CLOUDFLARE_ACCOUNT_ID    — 954612afb5a97bb15dddcdc70176813d
CLOUDFLARE_WORKERS_TOKEN — Cloudflare Workers deploy
CLOUDFLARE_REGISTRAR_TOKEN — Cloudflare Registrar (domain purchase)
APIFY_TOKEN              — Apify (social handle checking)
```

## What To Do Next

### Immediate (unlocks phone + signup)
1. Get Telnyx API key → add to vault
2. Test: name.phone_search → should return real numbers
3. Test: provision number → send SMS → name.read_sms → verify

### Then (domain purchase flow)
1. Say "buy hamtask.com for $10.46" → agent calls cf_purchase
2. After purchase → agent calls wire_email
3. Email live: hello@, support@, agents@

### Then (social signup)
1. Install Playwright: npm install playwright && npx playwright install chromium
2. Build signup scripts per platform
3. Use cmail for OTP emails, Telnyx for SMS verification

### Finally (git push)
1. gh repo create prx0r/cmail --private --source=. --push
2. Or: git remote add origin git@github.com:prx0r/cmail.git && git push -u origin master
