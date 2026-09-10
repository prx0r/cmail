# cmail — Session Summary 2026-09-10

## What Was Built

### Autonomous Name Acquisition Pipeline
Agent types a name → sees domains + handles → buys domain → wires email → provisions phone → signs up for accounts.

### Deployed Services
| Service | URL | Status |
|---------|-----|--------|
| cmail MCP | `https://cmail.tradesprior.workers.dev/mcp` | ✅ 23 tools |
| Domain Hunter UI | `https://domain-hunter.tradesprior.workers.dev` | ✅ |
| Domain Hunter CLI | `/root/cmail/domain-hunter-lib/dist-cli/domain-hunter.mjs` | ✅ |
| Domain Hunter MCP | `/root/cmail/domain-hunter-lib/dist-cli/mcp-server.mjs` | ✅ 18 tools |

### 23 MCP Tools

**Domain (7):**
- `name.verify_domain` — DNS + RDAP deep check
- `name.check` — Multi-TLD availability (10 TLDs)
- `name.search` — Namecheap-style pricing (15 TLDs, 4 registrars)
- `check_availability` — Domain Hunter RDAP (1208 TLDs)
- `cf_check_domain` — Cloudflare Registrar price
- `cf_purchase_domain` — Buy via Cloudflare (confirmed:true)
- `cf_wire_email` — Wire email routing (confirmed:true)

**Social (2):**
- `name.check_handles` — 9 platforms (GitHub, X, YouTube, TikTok, npm, PyPI, crates + Apify for Snapchat/Bluesky/Telegram/GitLab/SoundCloud/Pinterest)
- `name.social` — Handles + suggestions for taken platforms

**Phone (2):**
- `name.phone_search` — Telnyx number search
- `name.read_sms` — Read received SMS

**Email (6):** email.list_domains, email.inbox, email.search, email.read, email.draft, email.send

**Namecheap (6):** namecheap_list_domains, namecheap_check_domain, namecheap_get_tld_pricing, namecheap_register_domain, namecheap_get/set_dns_hosts, set_nameservers

### Social Platform Coverage

| Platform | Method | Cost |
|----------|--------|------|
| GitHub | REST API | $0 |
| X | Page fetch | $0 |
| YouTube | Page fetch | $0 |
| TikTok | Page fetch | $0 |
| npm | Registry API | $0 |
| PyPI | JSON API | $0 |
| crates.io | API | $0 |
| Snapchat | Apify | $0.006 |
| Bluesky | Apify | $0.006 |
| Telegram | Apify | $0.006 |
| GitLab | Apify | $0.006 |
| SoundCloud | Apify | $0.006 |
| Pinterest | Apify | $0.006 |
| Instagram | ❌ Meta blocks | manual |
| Facebook | ❌ Meta blocks | manual |
| Threads | ❌ Meta blocks | manual |
| Reddit | ❌ blocks anon | manual |
| Twitch | ❌ JS-rendered | manual |

**Total: 13 automated + 5 manual = $0.036 per name**

### Bugs Fixed
1. **RDAP Redirect** — .org used rdap.org (302 redirect). Fixed: use direct PIR URL + `redirect: 'follow'`
2. **DNS NXDOMAIN** — Status 3 + SOA authority was wrongly "taken". Fixed: NXDOMAIN = available

### Validation Results
- 5/5 domains match Domain Hunter CLI (trust.com, openpatala.com, patala.com, pogtown.com, pogtown.org)
- 19/19 unit tests pass
- 8/8 edge cases pass
- Performance: 0.7s (our MCP) vs 0.1s (Domain Hunter batch, 7x faster)

## Canonical Path

```
1. CHECK     → name.search "postagi" → see 15 TLDs + prices
2. HANDLES   → name.social "postagi" → see 13 platforms + suggestions
3. BUY       → name.cf_purchase "postagi.trade" confirmed:true
4. EMAIL     → name.wire_email "postagi.trade" confirmed:true
5. PHONE     → name.phone_search country=US
6. SIGNUP    → Use email + phone to create accounts
7. VERIFY    → name.read_sms to get verification codes
```

## Files
```
cmail/
├── src/names.ts           — Domain + handle + purchase + phone logic
├── src/mcp.ts             — MCP tool definitions (23 tools)
├── src/lib.ts             — Email classification + injection screening
├── src/names.test.ts      — Domain/handle tests
├── src/lib.test.ts        — Email pipeline tests
├── domain-hunter-lib/     — Cloned Domain Hunter (our tools added)
├── domain-hunter-site/    — Deployed UI worker
├── namecheap-mcp/         — Cloned Namecheap MCP
├── names-checker/         — Standalone checker clone
├── names-hunter/          — RDAP check worker
├── a-logs/                — Agent task logs
├── APIFY_LOG.md           — Apify actors tested
├── SOCIAL_ENDPOINTS.md    — Canonical endpoints per platform
├── MANUAL_CHECK_GUIDE.md  — How to manually check blocked platforms
├── PLATFORM_DOCS.md       — Platform detection methods
├── REVIEW.md              — Technical reference
├── PLAN.md                — A-task registry
├── GOAL.md                — Vision document
└── "OUTPUT hamtask.com.md" — Working output
```
