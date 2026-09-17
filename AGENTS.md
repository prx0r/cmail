```
  ╔═══════════════════════════════════╗
  ║                                   ║
  ║    ___    ____   ___              ║
  ║   / _ \  / ___| / _ \             ║
  ║  | | | || |  _ | | | |            ║
  ║  | |_| || |_| || |_| |            ║
  ║   \___/  \____| \___/             ║
  ║                                   ║
  ║   Agent Commerce Protocol         ║
  ║                                   ║
  ╚═══════════════════════════════════╝
```

## What This Is
Autonomous name acquisition pipeline. Agent types a name → sees domains + handles → buys domain → wires email → signs up for accounts.

## Start here (docs map)
- **[GUIDE.md](GUIDE.md)** — Complete journey from name to working email
- Tool surface: `docs/MCP_REFERENCE.md` (all 34 tools — read before calling anything unfamiliar)
- Domains: `docs/DOMAINS.md` (buying flow, registrar-truth law, naming science)
- Socials: `docs/SOCIALS.md` · Phone: `docs/PHONE.md`
- Verification: `docs/EMAIL_VERIFICATION.md` (EVP-1) · Failures: `docs/TROUBLESHOOTING.md`
- History, not guidance: `archive/` · Session gold: `a-logs/`

## Pricing (free tier vs paid)

| Feature | Cost | Required? |
|---------|------|-----------|
| Inbound email receive | $0 | ✅ Yes |
| Domain purchase | ~$10/yr | Only if buying domains |
| Outbound email (send) | $5/mo Workers Paid | ❌ **Optional** |

**Outbound is optional.** Inbound works free. Only enable Workers Paid ($5/mo, 3k sends) if A-COM needs to SEND emails.

## Standing laws
1. **NEVER buy without explicit human `confirmed:true`** (domains, phones, sends, ad spend). Standing owner order.
2. **DNS suggests, registrar decides.** Only `cf_check.registrable:true` is availability truth.
3. **No address declared working without an EVP-1 receipt** (round-trip included).
4. Every fix ships with a regression test + doc update in the same commit.

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

## 34 MCP Tools

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

### Tasks (5) + Pipeline (2)
- task.create, task.list, task.get, task.deliver, task.complete
- pipeline.start, pipeline.status

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
- `GUIDE.md` — **Start here** — complete journey
- `src/names.ts` — Domain + handle + purchase + phone logic (684 lines)
- `src/mcp.ts` — 34 MCP tools
- `docs/MCP_REFERENCE.md` — All tools reference
- `docs/DOMAINS.md` — Buying flow
- `docs/SOCIALS.md` — Handle checking
- `docs/EMAIL_VERIFICATION.md` — 9-layer verification
- `docs/TROUBLESHOOTING.md` — Every failure class + fix

## Deployed
- A-COM MCP: https://cmail.tradesprior.workers.dev/mcp
- Dashboard: https://cmail.tradesprior.workers.dev/ui/
