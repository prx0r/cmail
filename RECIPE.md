# Recipe: Domain + Email in 8 Steps

**Full guide:** [GUIDE.md](GUIDE.md)

---

## The Steps

| # | Step | Tool | Cost |
|---|------|------|------|
| 1 | Search names | `name.search` | $0 |
| 2 | Check handles | `name.social` | $0 |
| 3 | Confirm availability | `name.cf_check` | $0 |
| 4 | Buy domain | `name.cf_purchase` | ~$10/yr |
| 5 | Wire email | `name.wire_email` | $0 |
| 6 | Verify works | `email.inbox` | $0 |
| 7 | Read mail | `email.search` | $0 |
| 8 | Draft replies | `email.draft` | $0 |

---

## Quick Commands

```bash
# Search
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.search","args":{"name":"TARGET"}}'

# Buy (requires confirmed:true + confirm_text)
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.cf_purchase","args":{"domain":"TARGET.com","confirmed":true,"confirm_text":"BUY TARGET.com"}}'

# Wire email
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.wire_email","args":{"domain":"TARGET.com","confirmed":true}}'

# Check inbox
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"email.inbox","args":{"mailbox":"hello@TARGET.com"}}'
```

---

## What You Get

- Domain owned (at-cost)
- Infinite email addresses (all routed)
- Social handles checked
- Agent-ready inbox
- Verification receipts
- Full audit trail

**Cost to start:** ~$10/yr
**Cost to run:** $0/mo (inbound) or $5/mo (with outbound)
