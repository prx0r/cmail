# SteveJobless Review — 2026-09-10

## Verdict: RUNNING, MOSTLY WORKING, GAPS IDENTIFIED

### Infrastructure: GREEN
- systemd service active (pid 654949)
- Cloudflare tunnel active → `steve.intelligentothers.xyz`
- Health check: `{"ok":true,"service":"stevejobless"}` (HTTP 200)
- DB: 15 tables, 5 projects, 8 tradie jobs, 13 human actions, 8 domain deals

### What's Working (with evidence)

| Component | Evidence |
|-----------|----------|
| FastAPI app | Health, projects, tradie, domains, email all respond |
| Tradie pipeline | 8 jobs, 4 quotes (£534.60, £432.50, £142.20, £93.60), 2 kernels loaded |
| Email observation intake | 7 email actions in DB from cmail bridge |
| cmail→steve bridge | STEVE_URL set as Worker secret, 7 email actions received, quarantine works |
| Domain deal pipeline | 8 deals, state machine working, CF + name.com configured, DOMAINS_ALLOW_LIVE=1 |
| Credential vault | 6 credentials stored, CRUD functional |
| Reconcile endpoint | Returns 8 checks for sparky (kernel READY, email READY, cmail reachable) |
| Test suite | 93/94 passing (1 time-of-day flake) |
| Post scheduler | Background thread running, ticks every 15s |

### What's Broken / Missing

| Issue | Severity | Fix |
|-------|----------|-----|
| Vault XOR with default key | HIGH | Set STEVE_MASTER_KEY in systemd |
| Bridge token auth open | HIGH | Set STEVE_BRIDGE_TOKEN in cmail + steve |
| WhatsApp: no creds | HIGH | Set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN |
| Telnyx: no creds | HIGH | Set TELNYX_API_KEY in vault |
| LiveKit: no creds | MEDIUM | Depends on Telnyx first |
| Google Calendar: no refresh_token | MEDIUM | Complete OAuth flow |
| Instagram: no verify token | MEDIUM | Set INSTAGRAM_VERIFY_TOKEN |
| Outbound email: Workers Paid | MEDIUM | Flip $5/mo, uncomment SENDER binding |
| Social accounts: empty | LOW | No accounts connected yet |
| Postiz: not configured | LOW | Set POSTIZ_URL, POSTIZ_API_KEY |

### DB Schema Drift
- Systemd DB (`/root/stevejobless.db`): 15 tables (full schema)
- Repo DB (`/root/stevejobless/stevejobless.db`): 9 tables (missing tradie + domain_deals)
- **Risk:** Running from repo dir would fail. Always use systemd.

### Env Vars Status

**SET:** STEVE_DB_URL, CMAIL_DRAFT_SECRET, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, DOMAINS_ALLOW_LIVE=1

**VAULT:** sparky/google (client_id, client_secret, redirect_uri — NO refresh_token), studio/namecom (username, token, base_url)

**MISSING:** STEVE_MASTER_KEY, STEVE_BRIDGE_TOKEN, TELNYX_API_KEY, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, INSTAGRAM_VERIFY_TOKEN, POSTIZ_URL, POSTIZ_API_KEY, GITHUB_TOKEN, DEFAULT_REGISTRANT_EMAIL

### cmail Worker Secrets

**SET:** CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, STEVE_URL, TEST_INGEST_SECRET

**MISSING:** STEVE_BRIDGE_TOKEN, TELNYX_API_KEY
