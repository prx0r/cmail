# cmail — studio communication bus: email, domains, handles, phone

```
Internet → Email Routing → Worker → Mailbox DO (SQLite) + D1 index + R2 raw
Web UI (/ui/) + MCP (/mcp) on top. Drafts default; sends and purchases need explicit confirm.
```

Live: `https://cmail.tradesprior.workers.dev` · D1 `cmail-index` · R2 `cmail-raw`

## Docs (canonical — read these, not root history)

| Doc | Covers |
|---|---|
| `docs/MCP_REFERENCE.md` | All 34 tools: args, perms, examples, money gates |
| `docs/DOMAINS.md` | Buying flow, registrar-truth law, naming process + science |
| `docs/SOCIALS.md` | Handle checks, manual-five, signup automation |
| `docs/PHONE.md` | Telnyx provisioning, SMS, GPT-Live voice path |
| `docs/EMAIL_VERIFICATION.md` | EVP-1: 9 layers, verdicts, re-verification cadence |
| `docs/INBOUND_TROUBLESHOOTING.md` | Failure accounting + inbound debug protocol |
| `docs/TROUBLESHOOTING.md` | Master index: every failure class + fix |
| `docs/SOCIAL_ENDPOINTS.md` | Per-platform check endpoints |
| `RECIPE.md` | Quickstart: domain + email in 8 steps (depth in DOMAINS.md) |
| `AGENTS.md` | Operating manual + standing laws |
| `a-logs/` | Session gold: EVSPARK_BRAND, NAMING_LOG_2026-09-11 |
| `archive/` | Superseded session docs (history, not guidance) |

## Laws

1. **NEVER buy without explicit human `confirmed:true` in-session** (domains, phones, sends, ad spend).
2. **DNS suggests, registrar decides** (`cf_check.registrable` is the only availability truth).
3. **No address declared working without an EVP-1 receipt** (live round-trip included).
4. Secrets in vault/env only. Commit locally, owner pushes.
