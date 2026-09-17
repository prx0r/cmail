# MCP Reference — all 34 tools

Base: `POST https://cmail.tradesprior.workers.dev/mcp`
Body: `{"tool":"<name>","args":{...},"actor":"owner"}`
`GET /mcp` lists tool names. Unknown tool → 400 + list.

Permissions: owner = ADMIN always. Mailbox actors use their row's
permissions. `email.send` needs SEND; drafts need DRAFT; everything else READ,
except money-gated tools below which need explicit confirmation flags.

Conventions: `confirmed:true` alone = preview for money tools; actual spend
additionally needs `confirm_text` (exact string given per tool). Audit-logged.

## Email (13)

| Tool | Args | Notes |
|---|---|---|
| `email.list_domains` | — | all domains + status |
| `email.list_mailboxes` | — | id, address, agent, permissions |
| `email.inbox` | `mailbox` | latest 50, newest first |
| `email.search` | `q` | LIKE over subject+summary |
| `email.read` | `message_id` | meta + raw .eml (first 20KB) from R2 |
| `email.thread` | `thread_id` | full thread, oldest first |
| `email.needs_reply` | — | `needs_reply=1 AND status=new`, max 50 |
| `email.draft` / `email.reply` | `to`/`message_id`, `subject`, `body` | auto-draft only; never sends |
| `email.send` | `to`, `subject`, `body`, `confirmed:true`, `from?`, `draft_id?` | **money-adjacent gate**; returns `sent:false` + honest error while Workers Paid/SENDER unbound |
| `email.archive` | `message_id` | sets status archived |
| `email.label` | `message_id`, `labels` | JSON labels |
| `email.ask` | `q` | Workers AI over last 30 non-quarantine messages |

## Names: check + social (5)

| Tool | Args | Notes |
|---|---|---|
| `name.check` | `name`, `tlds?` (default 10) | multi-TLD availability |
| `name.verify_domain` | `domain` | DNS + RDAP deep check. **No-RDAP TLDs cap at unknown/low — DNS alone never means free** |
| `name.check_handles` | `name` | 9 platforms, status-code + marker checks |
| `name.search` | `name` | 15 TLDs × 4 registrars with pricing |
| `name.social` | `name` | local checks + Apify (needs APIFY_TOKEN) + suggestions |

## Names: beast mode (2)

| Tool | Args | Notes |
|---|---|---|
| `name.bulk_check` | `names[]` (≤100), `rules{tlds,max_len,allow_hyphen,allow_digits,min_vowel_ratio,min_confidence,verify_hits,max_names,offset}` | structural + van scoring; hits ranked; persists run to D1 (`run_id`, `persisted`) |
| `name.bulk_history` | `rules_hash?` | empirical hit-rate per rules-hash, Wilson lower bound, low-sample warning <30 |

Registrar verification: when the worker holds Cloudflare creds, bulk hits
confirm via registrar API automatically (`verify_hits`, opt-out available).

## Names: purchase + wire — MONEY GATES (2)

| Tool | Args | Notes |
|---|---|---|
| `name.cf_check` | `domain` | **free, always run first**: registrable, price, renewal |
| `name.cf_purchase` | `domain`, `confirmed:true`, `confirm_text:"BUY {domain}"` | **charges account**. Preview mode without flags. Audit-logged |
| `name.wire_email` | `domain`, `worker?`, `confirmed:true` | creates zone + catch-all routing. Preview without flag. Audit-logged |

Standing rule: **NEVER buy without explicit human `confirmed:true` in-session.**
Availability research is always free; say so in every quote.

## Phone / SMS (5, needs TELNYX_API_KEY)

| Tool | Args | Notes |
|---|---|---|
| `name.phone_search` | `country` (default US) | available numbers + features |
| `name.phone_recommend` | `country`, `intent{locality_is_purchase_signal, national_identity_value, expected_expansion, trust_sensitivity, sms_required, same_number_sms_required, locality, monthly_budget}` | **read-only strategy + scored top-3** (UK blueprint rubric). No purchase path exists in this tool; returns `purchasable:false`, `requires_confirmation:true` |
| `name.phone_list` | — | owned numbers |
| `name.phone_purchase` | `phone_number`, `connection_id`, `confirmed:true` | **money gate**, preview without flag, audit-logged. Agent never passes confirmed:true without explicit human approval in-session |
| `name.read_sms` | `to`, `limit?` | in-memory relay store (latest 10 default) |

## Tasks (5) + pipeline (2)

| Tool | Args | Notes |
|---|---|---|
| `task.create` | `summary`, `kind?`, `needed_from?`, `payload?`, `blocked_by?`, `ttl_hours?`, `confirm_text?` | human/agent feeds |
| `task.list` | `kind?` | filter + count |
| `task.get` / `task.deliver` / `task.complete` | `id` (+`payload` for deliver) | deliver flips predicted→real; reconcile re-queues dependents |
| `pipeline.start` | `name` | brand acquisition pipeline |
| `pipeline.status` | — | open/predicted/done counts + tasks |

## Admin / utility (HTTP, not MCP)

| Endpoint | Method | Notes |
|---|---|---|
| `/api/stats` | GET | `{needs_me,total}` health |
| `/api/inbox?needs_reply=1` | GET | quick inbox |
| `/admin/address` | POST (ADMIN) | `{actor, domain, local, agent?, permissions?}` register mailbox |
| `/admin/alias` | POST (ADMIN) | `{actor, alias, target}` alias routing |
| `/api/drafts` | GET/POST | draft queue (POST needs secret) |
| `/test/ingest` | POST (secret) | synthetic inbound through the real pipeline |
| `/ui/` | GET | dashboard |

## Agent notes

- Read-only first: inbox/search/read/verify/check cost nothing and never mutate (except audit lines for drafts/sends).
- Availability ≠ purchasable: only `cf_check.registrable:true` is truth. Say prices from `cf_check`, never from estimates.
- After any purchase or wire: run `scripts/verify-email.sh` equivalent layers and file the receipt before declaring done.
