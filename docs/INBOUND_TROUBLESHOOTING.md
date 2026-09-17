# Inbound Delivery Troubleshooting + What Went Wrong (2026-09-11)

## What I got wrong (complete list, no excuses)

1. **Recommended `agents@feedify.dev` from the mailbox registry without
   checking MX.** The mailbox existed in cmail's index; the domain had no MX
   records at all. Nothing addressed there could ever arrive. I verified the
   app layer and skipped the DNS layer.
2. **Recommended `agents@intelligentothers.xyz` after checking MX + routing
   but not mailbox registration.** Better, still incomplete — my own EVP-1
   (written the same day) demands all layers before declaring, and I declared
   early.
3. **"Fixed" mailbox registration as if it were the blocker.** Code audit
   later showed `processInbound` writes regardless of registration. I fixed
   something that was never on the failure path, and said so only afterward.
4. **Relied on a Gmail token without testing it.** Refresh returned 400
   (revoked/expired) at the exact moment I needed it. Untested credential =
   no credential.
5. **No live traffic test until late.** Thirteen real forwards were the first
   genuine inbound this path ever saw. Test traffic should have preceded any
   recommendation.

## Resolved this session

- **Root cause found:** zone `misconfigured/locked` — SPF pointed only at
  `zoho.eu`, Cloudflare wants `include:_spf.mx.cloudflare.net`. Fixed additively
  (`include:zoho.eu include:_spf.mx.cloudflare.net`), status now `ready`.
- Mailbox registered, routing rules + catch-all verified enabled.
- **Bug 1 (killed 2026-09-11, deployed):** `email()` called
  `message.raw.arrayBuffer()` — but `ForwardableEmailMessage.raw` is a
  `ReadableStream` per the official interface. Every real inbound threw before
  storage. Test-ingested mail (`raw:null`) bypassed it, hiding the bug.
- **Bug 2 (killed 2026-09-11, deployed v3c3a4ed3):** first fix read the stream
  for text, then passed the consumed stream to R2 → `ReadableStream disturbed`.
  Fix: single read into bytes (`readRawBytes`); text + R2 both derive from it.
  Rule: **touch `message.raw` exactly once per invocation.**
- Docs-confirmed limits: inbound ≤25 MiB (109KB ZIP fine); Free-plan CPU can
  also kill complex handlers (watch for EXCEEDED_CPU, distinct from TypeErrors).

## Inbound debug protocol (use before blaming anyone)

1. `dig MX <domain>` — no MX = nothing can ever arrive. Stop here.
2. Cloudflare routing status API — must read `ready`; `misconfigured/locked`
   names the exact record to fix.
3. Routing rules + catch-all enabled, action = worker.
4. `wrangler tail` on the worker while a live test mail is sent — watch for
   `Worker threw exception` (uncaught throw in `email()` = lost mail).
5. Check the D1 `messages` table directly (bypass MCP) for arrival.
6. Check sender side: Gmail sent folder + bounces (needs working OAuth).
7. Suspect order: DNS → routing status → worker errors → sender queue.
   Never mailbox registration (write path doesn't check it).

## Rules going forward

- EVP-1 stands: no address declared working without a passing receipt,
  including a live round-trip (layer 8).
- Test traffic precedes recommendations, always.
- Credentials get health-checked before they're depended on.
- This file grows with every new failure mode. Append, don't rewrite.

## Appendix 2026-09-11: expected email never arrived (recipient-side checklist)

Case: sender says mail was sent, nothing matching in inbox/search. Run in order:

1. **Exact recipient address?** Ask the sender for the literal To: header.
   Per-address routing rules take priority over catch-all; a typo'd local part
   still lands via catch-all, but a wrong *domain* (or a domain whose MX points
   at Zoho/external) never touches cmail. `drawdle.dev`/`feedify.dev`/
   `breadup.dev` are external-zoho — mail there goes to Zoho, not cmail.
2. **Sender-side bounce?** Check sender's sent folder + bounce/DSN. A 550
   (unknown user / policy rejection) or Cloudflare rejection happens before
   the worker ever runs. No bounce + no arrival = still in a queue somewhere.
3. **Quarantine?** `email.search` covers subject+summary, but quarantined mail
   has a `[QUARANTINED: ...]`-prefixed summary. Search for the sender address
   rather than keywords.
4. **Attachment-only bodies are near-invisible to search.** The stored snippet
   is derived from raw text; a message whose body is only a ZIP/PDF attachment
   yields base64 garbage or an empty snippet, and keyword search over
   subject+summary will miss it. If subject is unknown: list the mailbox by
   time (`email.inbox`), then `email.read` the candidates — it returns the raw
   `.eml` from R2 including attachments. Inbound cap is 25 MiB; a normal ZIP
   is fine.
5. **Time window.** Poll `email.inbox` for the mailbox sorted newest-first;
   don't rely on memory of "nothing arrived." Confirm the send timestamp and
   look ±15 min around it.
6. **Only then** work the worker-side protocol above (MX → routing → tail →
   D1 → sender OAuth).

## Appendix 2026-09-11: attachment recovery via R2 (proven live)

Case: `uk-business-phone-agent-blueprint.zip` (33KB) arrived on
`agents@intelligentothers.xyz` (msg `1789139919097-24xkzi0ruu4`).
`email.read` returns only the first 20KB of raw — headers plus the start of
base64, no body text, truncated attachment. Recovery path that worked:

1. `email.read` → `meta.r2_raw_key` (here
   `email/raw/intelligentothers.xyz/agents/1789139919097.eml`).
2. Fetch the full `.eml` from the `cmail-raw` R2 bucket with S3 creds
   (vault: R2 token, endpoint
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
3. Parse with Python `email` lib: body parts + `get_filename()` attachments.
4. Full 53KB recovered, zip extracted, contents verified.

Rules: MCP `email.read` is for triage (metadata + first 20KB), never for
attachment extraction. Anything with attachments goes R2-direct. Consider a
future `email.attachment` tool that lists attachment names/sizes from stored
metadata so this doesn't need S3 creds every time.
