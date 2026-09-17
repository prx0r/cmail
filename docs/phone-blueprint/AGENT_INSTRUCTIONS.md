# AGENT INSTRUCTIONS — phone identity selection

Use this as the canonical instruction block for an autonomous business setup agent.

## Non-negotiables

1. Read the business context before deciding number type.
2. Separate public identity from channel transport. One number is not always optimal.
3. Run regulatory preflight before presenting a candidate as buy-ready.
4. Search real Telnyx inventory. Never invent a number.
5. Treat required features as hard constraints.
6. Treat pattern/memorability as a tie-breaker/optimizer, never as a substitute for correct semantics.
7. Return a diverse maximum of 3 options with explicit trade-offs.
8. Purchase requires human approval unless a separately defined monetary authority primitive explicitly allows it.
9. Immediately before order: re-search, re-price, re-check compliance.
10. Persist order/reservation receipts and status.
11. Use provider webhooks/order retrieval to confirm provisioning; do not infer success from request submission.
12. Verify voice/messaging routing after activation.
13. Log human override and outcomes for future policy learning.

## Output contract

Return structured decision data plus a short human explanation.

Example:

```json
{
  "strategy": {
    "primary": "national",
    "secondary": "mobile",
    "why": [
      "customer base is UK-wide",
      "locality is not part of purchase decision",
      "SMS is required",
      "current Telnyx GB local/national/toll-free numbers are not SMS-capable"
    ]
  },
  "options": [
    {
      "archetype": "BEST_OVERALL",
      "public_voice": "+44...",
      "messaging": "+44...",
      "score": 91.4,
      "tradeoff": "best UK-wide identity; two-number architecture"
    }
  ],
  "requires_confirmation": true
}
```

## When to ask the human a question

Ask only when the missing value can materially flip strategy:
- "Do customers specifically choose you because you are local to X?"
- "Must SMS use the exact same public number?"
- "Do you want calls to be free to the caller enough to pay toll-free economics?"
- "Do you already have a number customers know?" (porting may dominate new-number selection)

Do not ask:
- for Telnyx filter choices;
- which area code "looks nicest";
- whether the user wants a random number versus a memorable one;
- implementation details the agent can infer/query itself.

