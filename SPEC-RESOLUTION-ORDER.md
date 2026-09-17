# Resolution Order — Parallel After Infrastructure

```
══════════════════════════════════════════════════════════════
STEP 1: DOMAIN (HUMAN gate)
══════════════════════════════════════════════════════════════

  👤 Human: "BUY {domain}" → agent executes CF purchase
  
  → CAPACITY: have_domain ✓
  → GRANT: can_manage_dns

══════════════════════════════════════════════════════════════
STEP 2: EMAIL (agent, autonomous)
══════════════════════════════════════════════════════════════

  🟢 Agent: wire_email → register_mailbox → verify_capacity.sh
  
  → CAPACITY: receive_email ✓
  → GRANT: can_signup_service(*@domain)

══════════════════════════════════════════════════════════════
STEP 3: PHONE (HUMAN gate)
══════════════════════════════════════════════════════════════

  👤 Human: "PHONE {number}" → agent executes Telnyx purchase
  
  → CAPACITY: have_phone ✓
  → GRANT: can_verify_phone

══════════════════════════════════════════════════════════════
STEP 4: ALL SOCIALS (parallel, agent attempts all at once)
══════════════════════════════════════════════════════════════

  You now have: email + phone
  Therefore: ALL socials are unlocked simultaneously

  🟢 Bluesky ──────────── needs: email only
  🟢 YouTube ──────────── needs: email + phone (Google)
  🟢 Instagram ────────── needs: email + phone (Meta)
  🟢 Facebook ─────────── unlocked via Instagram (Meta bundle)
  🟢 WhatsApp ─────────── unlocked via Instagram (Meta bundle)
  🟢 X ────────────────── needs: email + phone
  🟢 TikTok ───────────── needs: email + phone

  All run in parallel. Each one that hits captcha → pause, notify human.
```

## The Formula

Adding a new social site = filling in one JSON:

```json
{
  "id": "target:NEW_PLATFORM",
  "name": "Platform Name",
  "category": "social",
  "platform": "provider_name",
  "autonomy": "agent_guaranteed",
  "captcha_risk": "low|medium|high",
  "cost": { "min": 0, "max": 0, "free_variant": true },
  "depends_on": ["target:email"],           // or ["target:email", "target:phone"]
  "capabilities_granted": ["have_handle:platform"],
  "tasks": [{
    "id": "task:signup_platform",
    "type": "agent_or_human",
    "method": "playwright",
    "captcha": true,
    "captcha_action": "ESCALATE_TO_HUMAN",
    "browser_action": {
      "url": "https://platform.com/signup",
      "steps": ["fill email", "fill password", "solve captcha?", "verify email"]
    },
    "verification": { "method": "email", "inbox": "agents@{domain}" }
  }]
}
```

That's it. One JSON → agent knows what to do.
