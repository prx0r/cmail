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

```
  THE JOURNEY

  Name  →  Check  →  Buy  →  Wire  →  Live

  "What    "Is it    "Done.    "Routed.   "Email
   should    free?"    $8.03."    Done."    works"
   we call?"
```

---

## Chapter 1: The Name

Every business starts with a name. You have an idea — now find a name that works.

```bash
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.search","args":{"name":"sparky"}}'
```

**What you see:** 15 TLDs across 4 registrars with real prices.

```
sparky.com    $10.26/yr   (Cloudflare)
sparky.io     $32.49/yr   (Cloudflare)  
sparky.co     $8.03/yr    (Cloudflare)   ← winner
sparky.dev    $12.00/yr   (Cloudflare)
```

Pick one. The price is real. No surprises.

---

## Chapter 2: The Handles

Before you buy, check if the name is free on the platforms that matter.

```bash
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.social","args":{"name":"sparky"}}'
```

**What you see:**

| Platform | Status | |
|----------|--------|---|
| GitHub | ✅ available | |
| X | ✅ available | |
| YouTube | ✅ available | |
| TikTok | ⚠️ taken | `@sparky_official` |
| npm | ✅ available | |
| PyPI | ✅ available | |

**Rule:** If the core handles are gone, pick another name. Brand consistency matters.

---

## Chapter 3: The Purchase

You found a name. You checked the handles. Now buy it.

```bash
# First, confirm the price (free check)
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.cf_check","args":{"domain":"sparky.co"}}'

# Then, buy it (real money)
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.cf_purchase","args":{"domain":"sparky.co","confirmed":true,"confirm_text":"BUY sparky.co"}}'
```

**What happens:** Domain registered. Zone created in Cloudflare. You own it.

**Cost:** $8.03/yr (at-cost, no markup).

---

## Chapter 4: The Email

The domain is yours. Now make email work.

```bash
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.wire_email","args":{"domain":"sparky.co","confirmed":true}}'
```

**What happens:**
- MX records created → email flows to Cloudflare
- Catch-all routing → every address works
- `hello@sparky.co` → A-COM worker
- `support@sparky.co` → A-COM worker
- `agents@sparky.co` → A-COM worker
- `anything@sparky.co` → A-COM worker

**You now have infinite email addresses.** All routed. All working.

---

## Chapter 5: The Proof

Never claim it works without proof.

```bash
# Send a test email from outside (Gmail, etc.) to hello@sparky.co
# Then check:
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"email.inbox","args":{"mailbox":"hello@sparky.co"}}'
```

**If the message appears:** You're live.

**Full verification (9 layers):**
```bash
bash scripts/verify-email.sh check sparky.co hello@sparky.co
```

This checks MX → SPF → DMARC → Zone → Routing → Worker → Mailbox → Round-trip.

**Verdict:**
- **CERTIFIED** = ready for customers
- **DEGRADED** = internal use only
- **FAILED** = fix before proceeding

---

## Chapter 6: The Business

Email works. Now run your business.

### Read incoming mail
```bash
# What needs attention?
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"email.needs_reply"}'
```

### Search for codes
```bash
# Platform sent a verification code
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"email.search","args":{"q":"verification code"}}'
```

### Draft replies
```bash
# Auto-draft (never sends without confirmation)
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"email.draft","args":{"to":"customer@example.com","subject":"Re: Your order","body":"Thanks for reaching out..."}}'
```

### Dashboard
Open `https://cmail.tradesprior.workers.dev/ui/` — see everything at a glance.

---

## The Cost

| What | Cost | When |
|------|------|------|
| Name search | $0 | Always |
| Handle check | $0 | Always |
| Domain | ~$10/yr | Once |
| Email receive | $0 | Always |
| Email send | $5/mo | Only if you need outbound |

**Total to start:** ~$10.
**Total to run:** $0/mo (inbound only) or $5/mo (with outbound).

---

## The Law

1. **Never buy without asking.** Every purchase needs your explicit `confirmed:true`.
2. **DNS lies.** Only the registrar confirms availability.
3. **No claims without proof.** Every working address has a verification receipt.
4. **Secrets stay safe.** Keys in vault. Never in code.

---

## The Tools

| Tool | Purpose | Cost |
|------|---------|------|
| `name.search` | Find names + prices | $0 |
| `name.social` | Check handles | $0 |
| `name.cf_check` | Confirm availability | $0 |
| `name.cf_purchase` | Buy domain | ~$10/yr |
| `name.wire_email` | Wire email | $0 |
| `email.inbox` | Read mail | $0 |
| `email.search` | Find messages | $0 |
| `email.read` | Open message | $0 |
| `email.draft` | Write reply | $0 |
| `email.send` | Send reply | $5/mo |

**34 tools total.** See `docs/MCP_REFERENCE.md` for everything.

---

## What You Own

After this guide, you have:

- ✅ A domain (yours, at-cost)
- ✅ Infinite email addresses (all routed)
- ✅ Social handles (checked, available)
- ✅ Agent-ready inbox (read, search, draft)
- ✅ Verification receipts (proof it works)
- ✅ Audit trail (every action logged)

**You are now in business.**
