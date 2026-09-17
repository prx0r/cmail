# Phone — Telnyx provisioning + voice path

## Identity decision (UK blueprint, vendored `docs/phone-blueprint/`)
0. `name.phone_recommend` (`country`, `intent{...}`) — **read-only strategy +
   scored top-3**, ported from `uk-business-phone-agent-blueprint.zip`
   (received 2026-09-11 via `agents@intelligentothers.xyz`, recovered via R2).
   Semantics before digits: local 01/02 vs national 03 vs mobile 07 vs
   toll-free 0800/0808. GB non-mobile DIDs are not SMS-capable → two-number
   architectures are normal, not a failure. Reference: `RUBRIC.md`,
   `GB.yaml`, `OTHER_BUSINESS_BLUEPRINTS.md` (priors per trade), scenarios.
   **Human picks the number** (identity decision, never agent's call).

## Provisioning (cmail MCP, needs TELNYX_API_KEY in worker secrets)
1. `name.phone_search` (`country: GB`) — free browse; present top 5 + features.
2. `name.phone_purchase` (`phone_number`, `connection_id`, `confirmed:true`) —
   **money gate**, preview without flag, audit-logged. ~£1–2/mo rental.
3. Call Control app + messaging profile IDs → vault (never files/logs).
4. Voice webhook → brain (`/api/backend/telnyx/voice-webhook`); SMS relay live.

## Voice path (verified interop)
- **Inbound:** Telnyx trunk → Direct SIP → GPT-Live ($0.05/min) →
  client-delegation → voiceagent backend (graph → policy → tools → event log).
- **Outbound:** originates at Telnyx (Voice API + media bridge); GPT-Live
  cannot originate SIP itself.
- Keep LiveKit as control plane option (handoff, monitoring, non-OpenAI
  providers); no STT/TTS services needed on the GPT-Live path.

## SMS
`name.read_sms` (in-memory relay, latest-first); sending via Telnyx Messages
API (~£0.03/segment). Missed-call → SMS fallback is a core SparkAgent loop.

## Full plan
Staged runbook with human/agent split, costs, rollback: `/root/ab/TELNYX_PLAN.md`.

## Agent notes
- Number purchase = money gate + identity decision: exact number restated,
  `confirmed:true`, receipt filed.
- Secrets via vault at use time; worker secret via `wrangler secret put`.
- Test SMS to owner's mobile before declaring live (EVP-1 layer 9 equivalent).
