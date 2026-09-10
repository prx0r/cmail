# Recipe: Acquire Domain + Set Up Email

## Prerequisites
- Cloudflare account with Registrar enabled
- CLOUDFLARE_API_TOKEN with Zone + Registrar permissions
- cmail worker deployed

## The Recipe

### Step 1: Check Availability
```bash
# Check if the name is available across TLDs
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.search","args":{"name":"TARGET_NAME"}}'
```
Returns: 15 TLDs with prices from 4 registrars.

### Step 2: Check Social Handles
```bash
# Check if the name is available on social platforms
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.social","args":{"name":"TARGET_NAME"}}'
```
Returns: 13 platforms + suggestions for taken ones.

### Step 3: Preview Purchase
```bash
# Check Cloudflare price (no money spent)
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.cf_check","args":{"domain":"TARGET_NAME.com"}}'
```
Returns: registrable, price, renewal.

### Step 4: Buy Domain
```bash
# Actually purchase (charges Cloudflare account)
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.cf_purchase","args":{"domain":"TARGET_NAME.com","confirmed":true}}'
```
Returns: domain, state, completed, registration details.

### Step 5: Wire Email
```bash
# Set up email routing to cmail worker
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"name.wire_email","args":{"domain":"TARGET_NAME.com","confirmed":true}}'
```
Returns: zone_id, email_routing=true, catch_all=true.

### Step 6: Verify Email Works
```bash
# Send test email, then check
curl https://cmail.tradesprior.workers.dev/api/stats
```

## What You Get
- `TARGET_NAME.com` — owned domain
- `hello@TARGET_NAME.com` → cmail worker
- `support@TARGET_NAME.com` → cmail worker
- `agents@TARGET_NAME.com` → cmail worker
- `*@TARGET_NAME.com` (catch-all) → cmail worker

## Agent Automation

The entire flow can be automated:

1. Agent calls `name.search` → sees available TLDs
2. Agent calls `name.social` → sees available handles
3. Agent calls `name.cf_purchase` confirmed:true → buys domain
4. Agent calls `name.wire_email` confirmed:true → sets up email
5. Agent calls `email.inbox` → reads emails from the new domain
6. Agent uses email to sign up for social accounts
7. Agent calls `email.search` → reads OTP verification codes

## Cost Breakdown

| Step | Cost |
|------|------|
| Domain check | $0 |
| Social check | $0 (direct) or $0.006 (Apify) |
| Domain purchase | ~$10/yr (Cloudflare at cost) |
| Email routing | $0 (Cloudflare free tier) |
| Email receiving | $0 (cmail worker) |
| **Total to get started** | **~$10** |
