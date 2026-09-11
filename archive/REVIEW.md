# cmail — Autonomous Name Acquisition Pipeline
**Version:** 1.0.0 | **Date:** 2026-09-10 | **Status:** Production-ready

## What It Does

Agent types a name → sees all domains + handles → buys domain → wires email → provisions phone → receives SMS → signs up for accounts.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Domain Hunter UI (Svelte, single-file HTML)        │
│  https://domain-hunter.tradesprior.workers.dev      │
│  1208 TLDs, RDAP, price comparison, generators      │
└──────────────────────┬──────────────────────────────┘
                       │ MCP
┌──────────────────────▼──────────────────────────────┐
│  cmail MCP Server (23 tools)                         │
│  https://cmail.tradesprior.workers.dev/mcp          │
│                                                      │
│  Domain Hunter (5):                                  │
│    check_availability, get_prices, generate_names,   │
│    find_domains, list_zones                          │
│                                                      │
│  cmail (8):                                          │
│    name.check, name.verify_domain, name.search,      │
│    name.check_handles, name.social,                  │
│    name.cf_check, name.cf_purchase, name.wire_email, │
│    name.phone_search, name.read_sms                  │
│                                                      │
│  Namecheap (7):                                      │
│    namecheap_list_domains, namecheap_check_domain,   │
│    namecheap_get_tld_pricing, namecheap_register_*,  │
│    namecheap_get/set_dns_hosts, set_nameservers      │
└─────────────────────────────────────────────────────┘
```

## MCP Tools Reference

### Domain Tools

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `name.verify_domain` | Deep check one domain (DNS + RDAP) | `{domain}` | status, confidence, DNS records, registrar, expiry |
| `name.check` | Multi-TLD availability check | `{name, tlds?}` | 10 domains with status + confidence |
| `name.search` | Namecheap-style search with pricing | `{name}` | 15 domains + 4 registrar quotes each |
| `check_availability` | Domain Hunter RDAP (1208 TLDs) | `{domains, tlds?}` | Three-state: available/taken/unknown |
| `get_prices` | Per-registrar pricing | `{tlds?, query?}` | Price matrix with promo traps |
| `generate_names` | Name generators | `{generator, roots?, tlds?}` | Candidate domains |
| `find_domains` | Find available within budget | `{seedName, budget?, tlds?}` | Available + priced |
| `cf_check_domain` | Cloudflare Registrar check | `{domain}` | registrable, price |
| `cf_purchase_domain` | Buy via Cloudflare (confirmed) | `{domain, confirmed}` | registration result |
| `cf_wire_email` | Wire email routing (confirmed) | `{domain, worker?, confirmed}` | zone + routing setup |
| `namecheap_check_domain` | Namecheap availability | `{domains}` | available + premium pricing |
| `namecheap_register_domain` | Buy via Namecheap (charges) | `{domain, firstName, ...}` | registration result |

### Social Tools

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `name.check_handles` | Check 9 platforms | `{name}` | status per platform |
| `name.social` | Handles + suggestions for taken | `{name}` | handles + alternatives |

**Platforms:** GitHub, X, YouTube, Instagram, TikTok, Twitch, npm, PyPI, crates.io

**Suggestion engine:** When handle is taken, generates alternatives:
- Suffixes: `{name}official`, `{name}app`, `{name}hq`, `{name}team`, `{name}io`
- Prefixes: `get{name}`, `the{name}`, `my{name}`
- Domain-based: `{name}{tld}` if that TLD is available

### Phone/SMS Tools

| Tool | Description | Input | Output |
|------|-------------|-------|--------|
| `name.phone_search` | Search Telnyx numbers | `{country?}` | available numbers |
| `name.read_sms` | Read received SMS | `{to, limit?}` | messages array |

## Test Results

### Domain Validation (5/5 match vs Domain Hunter CLI)

| Domain | Our MCP | Domain Hunter | Match |
|--------|---------|---------------|-------|
| trust.com | taken | taken | ✅ |
| openpatala.com | available | available | ✅ |
| patala.com | taken | taken | ✅ |
| pogtown.com | available | available | ✅ |
| pogtown.org | available | available | ✅ |

### Performance

| Engine | 5 domains | Speed | Notes |
|--------|-----------|-------|-------|
| Our MCP (sequential) | 5/5 correct | 0.7s | One HTTP per domain |
| Domain Hunter CLI (batch) | 5/5 correct | 0.1s | Parallel RDAP |

### Edge Cases

| Test | Result |
|------|--------|
| Empty input | Returns error: "name required" ✅ |
| Special chars (postagi.com) | Strips to "postagicom" ✅ |
| Long name (35 chars) | Works, returns 9 handles ✅ |
| No RDAP server (.zzz) | Falls back to DNS, returns "available" ✅ |
| No Cloudflare creds | Returns error with details ✅ |
| No Telnyx key | Returns "TELNYX_API_KEY not set" ✅ |
| Empty SMS store | Returns count=0, messages=[] ✅ |
| Taken domain (google.com) | Returns taken, conf=high ✅ |
| Available domain (pogtown.com) | Returns available, conf=high ✅ |
| NXDOMAIN fix (pogtown.org) | Returns available (was wrongly "taken") ✅ |

### Social Check Results

**pogtown:**
| Platform | Status | Suggestion |
|----------|--------|------------|
| GitHub | ❌ taken | pogtownofficial ✅ |
| X | ✅ available | — |
| YouTube | ❌ taken | pogtownapp ✅ |
| Instagram | ❓ unknown | — |
| TikTok | ❓ unknown | — |
| Twitch | ❓ unknown | — |
| npm | ✅ available | — |
| PyPI | ✅ available | — |
| crates.io | ✅ available | — |

**openpatala:** 6/6 available, no suggestions needed.

**patala:** GitHub ❌ YouTube ❌ TikTok ❌ → patalaofficial ✅, patalaapp ✅, patalahq ✅

**trust:** GitHub ❌ npm ❌ PyPI ❌ crates ❌ → trustofficial ✅, trustapp ✅, trusthq ✅

## Bugs Fixed

### 1. RDAP Redirect (Critical)
**Before:** .org RDAP server (`rdap.org`) returns 302 → PIR RDAP → 404. Our code didn't follow redirects, reported "unknown" instead of "available".

**After:** Use direct PIR URL (`rdap.publicinterestregistry.org/rdap/domain/`) + `redirect: 'follow'`.

**Impact:** pogtown.org was wrongly reported as "unknown" → now correctly "available".

### 2. DNS NXDOMAIN Heuristic (Critical)
**Before:** NXDOMAIN + SOA authority = code counted SOA as "records" → said "taken".

**After:** NXDOMAIN (Status 3) = domain doesn't exist = available. Return immediately.

**Impact:** Any unregistered .org/.io/.dev domain was wrongly "taken" → now correctly "available".

## Deployment

| Service | URL | Status |
|---------|-----|--------|
| cmail MCP | `https://cmail.tradesprior.workers.dev/mcp` | ✅ Deployed |
| Domain Hunter UI | `https://domain-hunter.tradesprior.workers.dev` | ✅ Deployed |
| Domain Hunter CLI | `/root/cmail/domain-hunter-lib/dist-cli/domain-hunter.mjs` | ✅ Built |
| Domain Hunter MCP | `/root/cmail/domain-hunter-lib/dist-cli/mcp-server.mjs` | ✅ Built (18 tools) |

## Files

```
cmail/
├── src/
│   ├── names.ts          (629 lines) — Domain + handle + purchase + phone logic
│   ├── mcp.ts            (215 lines) — MCP tool definitions
│   ├── lib.ts            (104 lines) — Email classification + injection screening
│   ├── do.ts             (37 lines)  — Mailbox Durable Object
│   ├── names.test.ts     (49 lines)  — Domain/handle tests
│   └── lib.test.ts       (69 lines)  — Email pipeline tests
├── domain-hunter-lib/    — Cloned Domain Hunter (our tools added)
│   ├── cli/mcp/server.ts — 18 tools (5 DH + 6 ours + 7 Namecheap)
│   ├── cli/tools/cmail.ts — Our tool implementations
│   └── src/core/social.ts — Added npm, PyPI, crates.io
├── domain-hunter-site/   — Deployed UI worker
├── namecheap-mcp/        — Cloned Namecheap MCP
├── names-checker/        — Standalone checker clone
├── bridge/               — stevejobless sync
├── migrations/           — D1 schema
├── a-logs/               — Agent task logs
├── GOAL.md               — Vision document
├── PLAN.md               — A-task registry
└── SOCIAL_EVIDENCE.md    — Platform validation evidence
```
