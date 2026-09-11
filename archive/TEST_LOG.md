# cmail MCP Pipeline — Test Run Log
**Date:** 2026-09-10 10:54 UTC
**Worker:** https://cmail.tradesprior.workers.dev (v5e0ba302)

## Local Tests
- `tsc --noEmit` → clean
- `vitest run` → **19/19 pass** (13 lib + 6 names)

## Deploy
- Upload: 37.11 KiB / gzip: 9.92 KiB
- Startup: 5ms
- Bindings: D1, R2, KV, DO, AI

## Live MCP Tests (all via POST /mcp)

### 1. name.check — Unified availability
- **Input:** name="postagi", tlds=["com","io","trade"]
- **Result:** 1/3 domains available, 5/9 handles available
- **Domains:** postagi.com=taken, postagi.io=unknown, postagi.trade=available ✅
- **Handles:** github=available, x=available, youtube=taken, npm=available, pypi=available, crates=available

### 2. name.verify_domain — Single domain
- **Input:** domain="postagi.trade"
- **Result:** status=available, confidence=high, DNS=no records

### 3. name.check_handles — Social/platform check
- **Input:** name="postagi"
- **Result:** 9 platforms checked, 5 available, 1 taken, 3 unknown (expected: IG/TikTok/Twitch block serverside)

### 4. name.cf_check — Cloudflare Registrar check
- **Input:** domain="postagi.trade"
- **Result:** registrable=true, price=$4.18, renewal=$5.18

### 5. name.cf_purchase — Preview mode
- **Input:** domain="postagi.trade" (no confirmed)
- **Result:** mode=preview, shows price, note="set confirmed:true to actually purchase"

### 6. name.wire_email — Preview mode
- **Input:** domain="postagi.trade" (no confirmed)
- **Result:** mode=preview, shows worker="cmail", note="set confirmed:true to wire email routing"

### 7. name.phone_search — Telnyx (no key)
- **Input:** country="US"
- **Result:** error="TELNYX_API_KEY not set" (graceful degradation)

### 8. name.phone_list — Telnyx (no key)
- **Result:** error="TELNYX_API_KEY not set" (graceful degradation)

### 9. name.read_sms — SMS store
- **Input:** to="+15555551234"
- **Result:** messages=[], count=0 (empty store, as expected)

### 10. MCP tools list — GET /mcp
- **Result:** 22 tools listed (13 email + 9 name)

### 11. name.cf_purchase — Taken domain
- **Input:** domain="google.com"
- **Result:** registrable=false, reason="domain_unavailable" ✅

### 12. name.check — Default TLDs
- **Input:** name="testname123"
- **Result:** 3/10 domains available (com, net, trade), 3/9 handles available

## Secrets Set
- `CLOUDFLARE_API_TOKEN` = CLOUDFLARE_REGISTRAR_TOKEN (has Registrar write)
- `CLOUDFLARE_ACCOUNT_ID` = (already set)
- `TELNYX_API_KEY` = NOT SET (phone tools degrade gracefully)

## Files Modified
- `src/names.ts` — NEW: domain verification, handle checking, Cloudflare Registrar, email wiring, Telnyx
- `src/mcp.ts` — Added 9 name.* tools
- `src/names.test.ts` — NEW: 6 tests for names module
- `wrangler.toml` — Added env var docs for CF Registrar + Telnyx
