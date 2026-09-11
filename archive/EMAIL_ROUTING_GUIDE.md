# Email Routing via MCP — Agent Guide

## Overview
Set up email on any Cloudflare domain → routes to cmail worker → accessible via MCP.

## One-Shot Setup (via MCP)

### Step 1: Check domain is on Cloudflare
```bash
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.cf_check","args":{"domain":"yourdomain.com"}}'
```

### Step 2: Wire email routing (preview)
```bash
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.wire_email","args":{"domain":"yourdomain.com"}}'
```
Returns preview: zone_id, worker name, note.

### Step 3: Wire email routing (execute)
```bash
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.wire_email","args":{"domain":"yourdomain.com","confirmed":true}}'
```
Returns: zone_id, email_routing=true, catch_all=true, aliases created.

### Step 4: Verify email works
```bash
# Send email to hello@yourdomain.com, then check:
curl https://cmail.tradesprior.workers.dev/api/stats
```

## What the Tool Does

`name.wire_email` with `confirmed:true`:

1. **Enables Email Routing** on the Cloudflare zone
2. **Sets catch-all** → cmail worker (any email to any address goes to cmail)
3. **Creates mailbox routes** for: hello@, support@, billing@, agents@
4. **Returns** zone_id, status, and alias results

## What You Get

After wiring, these addresses work:
- `hello@yourdomain.com` → cmail worker
- `support@yourdomain.com` → cmail worker
- `billing@yourdomain.com` → cmail worker
- `agents@yourdomain.com` → cmail worker
- `*@yourdomain.com` (catch-all) → cmail worker

## MCP Access to Emails

### List all emails
```bash
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"email.inbox","args":{}}'
```

### Check stats
```bash
curl https://cmail.tradesprior.workers.dev/api/stats
```

### Search emails
```bash
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"email.search","args":{"q":"invoice"}}'
```

### Read specific email
```bash
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"email.read","args":{"message_id":"12345"}}'
```

## Full Pipeline Example

Agent wants to establish "postagi" as a brand:

```bash
# 1. Check domain availability
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"name.search","args":{"name":"postagi"}}'
# → postagi.trade available at $2.98

# 2. Check social handles
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"name.social","args":{"name":"postagi"}}'
# → GitHub available, X available, YouTube taken

# 3. Buy domain (when ready)
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"name.cf_purchase","args":{"domain":"postagi.trade","confirmed":true}}'

# 4. Wire email
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"name.wire_email","args":{"domain":"postagi.trade","confirmed":true}}'

# 5. Email is live — hello@postagi.trade, support@postagi.trade, etc.
# 6. Use email to sign up for social accounts
# 7. Read OTP codes from email via MCP
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"email.search","args":{"q":"verification"}}'
```

## Current Domains with Email Routing

| Domain | Status | Email Routing |
|--------|--------|---------------|
| intelligentothers.xyz | Active | ✅ hello@, support@, agents@, billing@, info@, contact@ |
| egoic.ai | Active | ✅ hello@, support@, agents@, billing@ |
| moltwork.com | Active | Not yet wired |
| freak.town | Active | Not yet wired |
| sanskrit.help | Active | Not yet wired |
| ochema.xyz | Active | Not yet wired |
| tantrafiles.xyz | Active | Not yet wired |

## Requirements

- Domain must be on Cloudflare (or transferred to Cloudflare)
- CLOUDFLARE_API_TOKEN with Zone:Email Routing permissions
- cmail worker deployed (already deployed at cmail.tradesprior.workers.dev)
