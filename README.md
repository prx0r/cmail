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

**From name idea to working email in 20 minutes.**

A-COM is the agent's business in a box. Pick a name, check the handles, buy the domain, wire the email — all through one API. No dashboards. No clicks. Just code.

---

## Start Here

📖 **[GUIDE.md](GUIDE.md)** — The complete journey from name to working email.

Everything else is reference.

---

## Quick Start

```bash
# 1. Find a name
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.search","args":{"name":"sparky"}}'

# 2. Check handles
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.social","args":{"name":"sparky"}}'

# 3. Buy domain
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.cf_purchase","args":{"domain":"sparky.co","confirmed":true,"confirm_text":"BUY sparky.co"}}'

# 4. Wire email
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.wire_email","args":{"domain":"sparky.co","confirmed":true}}'

# 5. Read inbox
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"email.inbox","args":{"mailbox":"hello@sparky.co"}}'
```

---

## Pricing

| What | Cost | When |
|------|------|------|
| Name search | $0 | Always |
| Handle check | $0 | Always |
| Domain | ~$10/yr | Once |
| Email receive | $0 | Always |
| Email send | $5/mo | Only if you need outbound |

**Inbound is free.** Outbound is optional.

---

## Architecture

```
Internet → Cloudflare Email Routing → A-COM Worker → D1 + R2
                                                   ↓
                                             MCP API (34 tools)
                                                   ↓
                                             Dashboard (/ui/)
```

**Live:** `https://cmail.tradesprior.workers.dev`
**D1:** `cmail-index` | **R2:** `cmail-raw`

---

## Documentation

| Doc | What It Covers |
|-----|----------------|
| [GUIDE.md](GUIDE.md) | **Start here** — complete journey from name to email |
| [docs/MCP_REFERENCE.md](docs/MCP_REFERENCE.md) | All 34 tools: args, permissions, examples |
| [docs/DOMAINS.md](docs/DOMAINS.md) | Buying flow, registrar truth, naming science |
| [docs/SOCIALS.md](docs/SOCIALS.md) | Handle checking, signup automation |
| [docs/EMAIL_VERIFICATION.md](docs/EMAIL_VERIFICATION.md) | 9-layer verification protocol |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Every failure class + fix |
| [RECIPE.md](RECIPE.md) | Quick recipe: domain + email |
| [AGENTS.md](AGENTS.md) | Operating manual + standing laws |

---

## Laws

1. **Never buy without asking.** Every purchase needs `confirmed:true`.
2. **DNS lies.** Only the registrar confirms availability.
3. **No claims without proof.** Every working address has a verification receipt.
4. **Secrets stay safe.** Keys in vault. Never in code.
