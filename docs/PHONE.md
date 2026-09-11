# Phone — Telnyx provisioning + voice path

## Provisioning (cmail MCP, needs TELNYX_API_KEY in worker secrets)
1. `name.phone_search` (`country: GB`) — free browse; present top 5 + features.
   **Human picks the number** (identity decision, never agent's call).
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
