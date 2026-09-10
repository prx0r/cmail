# AGENTS.md — cmail

## What This Is
Autonomous name acquisition pipeline. Agent types a name → sees domains + handles → buys domain → wires email → signs up for accounts.

## Quick Start
```bash
# Check a name
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.search","args":{"name":"hamtask"}}'

# Check socials
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.social","args":{"name":"hamtask"}}'

# Preview purchase
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.cf_purchase","args":{"domain":"hamtask.com"}}'
```

## 23 MCP Tools

### Domain (7)
- `name.verify_domain` — DNS + RDAP deep check
- `name.check` — Multi-TLD availability (10 TLDs)
- `name.search` — Pricing from 4 registrars (15 TLDs)
- `check_availability` — Domain Hunter RDAP (1208 TLDs)
- `cf_check_domain` — Cloudflare Registrar price
- `cf_purchase_domain` — Buy via Cloudflare (confirmed:true)
- `cf_wire_email` — Wire email routing (confirmed:true)

### Social (2)
- `name.check_handles` — 9 platforms (GitHub, X, YouTube, TikTok, npm, PyPI, crates + Apify)
- `name.social` — Handles + suggestions for taken platforms

### Phone (2)
- `name.phone_search` — Telnyx number search ✅
- `name.read_sms` — Read received SMS ✅

### Email (6)
- email.list_domains, email.inbox, email.search, email.read, email.draft, email.send

### Domain Hunter (5)
- check_availability, get_prices, generate_names, find_domains, list_zones

### Namecheap (6)
- namecheap_list_domains, namecheap_check_domain, namecheap_get_tld_pricing, namecheap_register_domain, namecheap_get/set_dns_hosts, set_nameservers

## Social Platforms

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
| Instagram | Manual | — |
| Facebook | Manual | — |
| Threads | Manual | — |
| Reddit | Manual | — |
| Twitch | Manual | — |

## Secrets (agent-vault oracle)
```
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_WORKERS_TOKEN,
CLOUDFLARE_REGISTRAR_TOKEN, APIFY_TOKEN, TELNYX_API_KEY
```

## Key Files
- `src/names.ts` — Domain + handle + purchase + phone logic (684 lines)
- `src/mcp.ts` — 23 MCP tools (215 lines)
- `HANDOVER.md` — Fresh agent guide
- `FINAL_REVIEW.md` — Complete conclusions
- `SOCIAL_ENDPOINTS.md` — Canonical endpoints per platform
- `SIGNUP_AUTOMATION.md` — Platform signup steps
- `APIFY_LOG.md` — Apify actors tested

## Deployed
- cmail MCP: https://cmail.tradesprior.workers.dev/mcp
- UI: https://domain-hunter.tradesprior.workers.dev
