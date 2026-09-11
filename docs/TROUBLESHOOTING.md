# Troubleshooting master

Start here for any failure. Fix in layer order; name the layer; file the receipt.

## Email inbound (see also: EMAIL_VERIFICATION.md, INBOUND_TROUBLESHOOTING.md)

| # | Check | Command | Red means |
|---|---|---|---|
| 1 | MX resolves | `dig +short MX <domain>` | nothing can ever arrive; stop |
| 2 | Routing status ready | CF API zones/:id/email/routing | `misconfigured/locked` names the record (usually SPF) |
| 3 | Rules + catch-all enabled → worker | same API, rules list | misrouted or disabled |
| 4 | Worker live | `GET /api/stats` | deploy/regression issue |
| 5 | Tail during live send | `wrangler tail` | `message.raw.arrayBuffer is not a function` = old build; redeploy |
| 6 | D1 direct | `wrangler d1 execute … SELECT … messages` | distinguishes worker-loss vs MCP-query bug |
| 7 | Sender side | sent folder + bounces | Gmail queued/bounced (needs working OAuth) |

Known incident shapes: no-MX domain (feedify), stale build throwing on
`message.raw` (fixed + deployed 2026-09-11 v8d627be1), dead Gmail token (400).

## Domains

| Symptom | Cause | Fix |
|---|---|---|
| "Available" but unregistrable | DNS-only verdict, no RDAP | `cf_check` is the only truth; code path fixed, regression-tested |
| RDAP 429s | Nominet + strict registries | stop, no hammering; DNS heuristic + registrar confirm |
| Subrequest limits in worker | >100 names/call | page with offset (beast mode caps at 100) |

## Worker / deploy

| Symptom | Cause | Fix |
|---|---|---|
| `wrangler tail` empty on live traffic | wrong worker name / account | check wrangler.toml name + account id |
| MCP 403 | actor perms | owner = ADMIN; mailbox actors use row perms |
| SEND returns sent:false | Workers Paid / SENDER unbound | honest error by design; enable paid + binding |
| Tests fail on network | live DNS/RDAP/APIs | rerun; persistent fail = upstream outage, not code |

## Socials / phone

| Symptom | Cause | Fix |
|---|---|---|
| Handles all `unknown` | APIFY_TOKEN unset / Meta blocks | set token; manual-five links to human |
| `TELNYX_API_KEY not set` | worker secret missing | `wrangler secret put`; vault is source of truth |
| SMS not arriving | messaging profile unset | profile id → vault, webhook pointed |

## Rules for every fix

1. Reproduce before patching; receipt after.
2. Smallest diff that kills the root cause; regression test asserting it.
3. Never rewrite history — append corrections, log loudly.
4. Update the relevant doc in the same commit as the fix.
