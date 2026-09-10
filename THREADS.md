# THREADS — every open thread, one page

Status as of 2026-09-10. Each thread: what's blocked, who unblocks, where the
code waits. Closed threads drop off; check git log if you miss one.

## 🔴 Needs a human (nothing moves without these)

| # | Thread | Blocked on | Code ready |
|---|---|---|---|
| T1 | **Inbound email proof** — rule + MX live, zone routing `unconfigured`, mail not landing | Confirm tantrafiles root mail disposable (flip MX) OR fresh domain | `domains.py: enable_routing/catchall_to_worker` verified paths |
| T2 | **$4.99 CF purchase demo** | Dropped per owner — do not raise again | deal 7 PREPARED, machine proven in sandbox |
| T3 | **Outbound email** | Workers Paid $5/mo flip on migration day | `mcp.ts email.send` Paid-ready, drafts queue live |
| T4 | **WhatsApp/IG sends** | Meta tokens (Cloud API + page token + verify) | webhook receivers live, stub paths tested |
| T5 | **Porkbun leg** | account + API key (sandbox free) | client ported, 409-guarded, auto-mode skips honestly |
| T6 | **Telnyx voice/SMS** | account + API key | numbers/search/wire/webhooks built, stub-tested |
| T7 | **Google Calendar live** | one OAuth grant (auth-url ready) | freebusy fallback tested; live path unproven |
| T8 | **GitHub token rotation** | paste token sits in chat history | push flow works (askpass) |

## 🟡 Buildable now (no human needed)

| # | Thread | Next action |
|---|---|---|
| T9 | **Scheduled reconcile sweep** — warm desk by morning | systemd timer hitting `/reconcile` + renewals/sync daily 06:00 |
| T10 | **Social inbox→lead for IG** — webhook exists, no lead test yet | needs Meta tokens (→T4) OR test harness with fixtures |
| T11 | **Second pilot business** — multi-tenancy proven in tests only | run SKILL.md for a real business |
| T12 | **Calibration review** — bands exist, no real outcomes yet | needs closed jobs (→T11) |
| T13 | **Unified MCP** | spec in `docs/MCP.md`; build read-only tools first |
| T14 | **Tax lite handoff** — VAT + CSV built, no accountant format check | first real invoice |
| T15 | **Voice P0 re-audit** — feedback delivered, other agent building | pull `prx0r/voiceagent`, verify against `voiceagentfeedback/` |

## 🟢 Background / hygiene

| # | Thread | Note |
|---|---|---|
| T16 | **`/tmp/cmail-repo` is a copy** — pushes must re-sync from `/root` or diverge | script it (T17) |
| T17 | **Push flow script** — secret-scan + sync + commit + push in one command | half-manual today |
| T18 | **cmail test ingest route** — secret-guarded but public surface | rotate `TEST_INGEST_SECRET` periodically; consider IP allowlist |
| T19 | **Live DB single SQLite** — backups now cover loss; no read replica | fine for pilots |
| T20 | **stevejobless upstream `.git`** — local tree has uncommitted work beyond this repo's scope (postiz/publisher leftovers) | reconcile or leave; this repo is source of truth for our stack |

## Recently closed (don't reopen)

- R2 nightly backups ✅ · drafts UI ✅ · renewal sync ✅ · quarantine screen ✅
- call-back gate ✅ · VAT ✅ · feed ordering ✅ · Porkbun/Name.com/CF providers ✅
- handles + claim_kit ✅ · registrar token in vault ✅ · repo docs ✅
