# Social Site Validation — Full Evidence
**Date:** 2026-09-10
**Name tested:** postagi

## Platform Verdicts

| Platform | MCP Tool | Direct Probe | Match? | Evidence |
|----------|----------|--------------|--------|----------|
| GitHub | unknown (HTTP 403) | 404 (available) | ⚠️ | CF Worker IP gets 403 from GitHub API; direct curl gets 404. Rate limiting issue. |
| X/Twitter | available | 404 | ✅ | `curl -s -o /dev/null -w "%{http_code}" https://x.com/postagi` → 404 |
| YouTube | taken | channelId found | ✅ | `curl -s https://www.youtube.com/@postagi \| grep channelId` → found |
| Instagram | unknown | 302 + username | ⚠️ | JS-rendered page. Server-side returns redirect, grep finds username marker. MCP correctly reports "no signal" — can't scrape without headless browser. |
| TikTok | unknown | empty oEmbed | ⚠️ | oEmbed returns `author_name: ""` for available names. MCP should return "available" but returns "unknown" — needs oEmbed fix. |
| Twitch | unknown | 200 + login | ⚠️ | JS-rendered page. Server-side returns page with login marker. MCP correctly reports "no signal". |
| npm | available | 404 | ✅ | `curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/postagi` → 404 |
| PyPI | available | 404 | ✅ | `curl -s -o /dev/null -w "%{http_code}" https://pypi.org/pypi/postagi/json` → 404 |
| crates.io | available | 403 + "does not exist" | ✅ | `curl -s https://crates.io/api/v1/crates/postagi` → `{"errors":[{"detail":"crate 'postagi' does not exist"}]}` |

## Domain Verdicts

| Domain | MCP Tool | RDAP Probe | Cloudflare Check | Match? |
|--------|----------|------------|------------------|--------|
| postagi.com | taken | RDAP 200 (verisign) | — | ✅ |
| postagi.io | unknown | No RDAP server | — | ⚠️ Falls back to DNS heuristic |
| postagi.trade | available | RDAP 404 | registrable=true, $4.18 | ✅ |
| google.com | taken | RDAP 200 | registrable=false | ✅ |

## MCP Tool Summary (22 tools live)

### Email tools (13) — pre-existing
- email.list_domains, email.list_mailboxes, email.inbox, email.search
- email.read, email.thread, email.draft, email.reply, email.send
- email.archive, email.label, email.needs_reply, email.ask

### Name tools (9) — new today
- name.check — unified domain + handles check ✅
- name.verify_domain — single domain RDAP+DNS ✅
- name.check_handles — 9-platform handle check ✅
- name.cf_check — Cloudflare Registrar availability + price ✅
- name.cf_purchase — domain purchase (preview/confirmed gate) ✅
- name.wire_email — zone + email routing setup (preview/confirmed gate) ✅
- name.phone_search — Telnyx number search (needs TELNYX_API_KEY) ⚠️
- name.phone_list — Telnyx owned numbers (needs TELNYX_API_KEY) ⚠️
- name.phone_purchase — Telnyx number purchase (needs TELNYX_API_KEY) ⚠️
- name.read_sms — read stored inbound SMS ✅

## Known Issues

1. **GitHub 403 from CF Worker** — GitHub API returns 403 to Cloudflare Worker IPs. Direct curl from server gets 404. Need to add retry or use different User-Agent.
2. **TikTok oEmbed** — returns empty `author_name` for available names. MCP tool should return "available" but returns "unknown". Fix: check `author_name === ""` as "available".
3. **Instagram/Twitch** — JS-rendered, can't scrape server-side. "unknown" is the honest answer. Would need headless browser for deterministic checks.
4. **io domains** — no RDAP server for .io in our map. Falls back to DNS heuristic. Could add IANA bootstrap fallback.
