# Email Verification Protocol (EVP-1) — strict

**Law: no address is ever declared "working" without a passing verification
receipt. Registry entries, routing rules, and DNS records are claims.
Only a live round-trip is proof. (Adopted 2026-09-11 after the feedify
incident: mailbox existed in index, domain had no MX, nothing could ever arrive.)**

## Layers (check in order; stop and name the failing layer)

| # | Layer | Check | Pass criteria | Evidence |
|---|---|---|---|---|
| 1 | MX | `dig +short MX <domain>` | ≥1 record pointing at the intended receiver | dig output |
| 2 | SPF | `dig +short TXT <domain>` | `v=spf1` present, includes sending hosts | TXT output |
| 3 | DMARC | `dig +short TXT _dmarc.<domain>` | policy record present (`p=...`) | TXT output |
| 4 | Zone | Cloudflare `GET /zones?name=` | zone active, in our account | zone id + status |
| 5 | Routing rules | `GET /zones/{id}/email/routing/rules` | literal rule for address → worker, enabled; or enabled catch-all → worker | rule JSON |
| 6 | Worker live | `GET https://cmail.tradesprior.workers.dev/api/stats` | HTTP 200, valid JSON | response + latency |
| 7 | Mailbox indexed | `email.list_mailboxes` | address present | mailbox row |
| 8 | Round-trip | send external mail with token subject → poll inbox | message arrives ≤10 min, token matches | message_id + timestamps |
| 9 | Outbound (if sold) | `email.send` with `confirmed:true` | delivery accepted, receipt stored | send receipt |

## Verdicts

- **CERTIFIED**: layers 1–8 green (1–9 if outbound sold). Receipt filed. Address may be handed to a customer.
- **DEGRADED**: 1–7 green, 8 pending. May be used internally only. Round-trip must complete within 24h or verdict lapses to FAILED.
- **FAILED**: any layer 1–7 red. Name the layer. Nothing downstream may be claimed.

## Rules

1. Re-verify on every change (DNS edit, rule edit, worker deploy, mailbox change).
2. Freshness: every CERTIFIED customer address re-runs layers 1–7 weekly; round-trip monthly.
3. Evidence bundle per run: `receipts/email-verify/<domain>/<address>/<ts>.json` with every layer's raw output. No bundle = didn't happen.
4. Never declare from a subset. The feedify failure was layers 7-only thinking ("mailbox exists") with layer 1 red.
5. DKIM: required before any outbound volume; recommended at setup.

## Automation

`scripts/verify-email.sh check <domain> <address>` runs layers 1–7, exits 0
only on full pass, writes the evidence bundle.
`scripts/verify-email.sh roundtrip <mailbox> <token>` polls the inbox for a
token subject (human sends the probe mail first).
