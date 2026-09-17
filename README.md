```
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   ███████╗██╗   ██╗███╗   ██╗██████╗ ███████╗███████╗   ║
  ║   ██╔════╝██║   ██║████╗  ██║██╔══██╗██╔════╝██╔════╝   ║
  ║   ███████╗██║   ██║██╔██╗ ██║██║  ██║█████╗  ███████╗   ║
  ║   ╚════██║██║   ██║██║╚██╗██║██║  ██║██╔══╝  ╚════██║   ║
  ║   ███████║╚██████╔╝██║ ╚████║██████╔╝███████╗███████║   ║
  ║   ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚══════╝╚══════╝ ║
  ║                                                           ║
  ║   setup.social — Autonomous Social Identity Pipeline      ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
```

**From seed name to full digital presence. Agent does everything. Human approves purchases.**

Pick a name → check handles across all platforms → buy domain → wire email → signup YouTube, Instagram, TikTok, X → done. ~$14/yr. ~30 minutes.

---

## The QP Proof System

Every capacity produces a QP receipt — deterministic, verifiable, append-only.

```
Agent proposes → QP validates authority → executes via adapter →
independent readback → judges evaluate → TRUE/FALSE/UNKNOWN →
TransitionReceipt → canonical state
```

**Key invariant:** Postiz says success → that's evidence. QP asks the platform independently → that's proof.

| Component | File | Purpose |
|-----------|------|---------|
| Kernel | `qp/kernel.ts` | Actuality, Claim, ProofSpec, Receipt, Replay |
| Judges | `qp/judges.ts` | 6 judges + 3 gates (TRUE/FALSE/UNKNOWN) |
| Authority | `qp/authority.ts` | Ed25519 grants, validation, replay prevention |
| Identity | `qp/identity.ts` | Program identity (source hash, git SHA) |
| Edges | `qp/edges.ts` | Typed dependency graph (REQUIRES/ENABLES/etc) |
| Probes | `qp/probes/` | Email round-trip nonce proof |
| Social | `qp/social/` | Executor interface + YouTube adapter |
| Tests | `qp/adversarial.test.ts` | 26 adversarial tests |

---

## MCP Tools (37 total)

### Email (12)
`email.list_domains`, `email.list_mailboxes`, `email.inbox`, `email.search`, `email.read`, `email.thread`, `email.draft`, `email.reply`, `email.send`, `email.archive`, `email.label`, `email.needs_reply`, `email.ask`

### Name (11)
`name.check`, `name.verify_domain`, `name.check_handles`, `name.search`, `name.social`, `name.bulk_check`, `name.bulk_history`, `name.cf_check`, `name.cf_purchase`, `name.wire_email`

### Phone (4)
`name.phone_search`, `name.phone_list`, `name.phone_purchase`, `name.phone_recommend`, `name.read_sms`

### Task (5) + Pipeline (2)
`task.create`, `task.list`, `task.get`, `task.deliver`, `task.complete`, `pipeline.start`, `pipeline.status`

### QP Capacity (3) ← NEW
`capacity.list`, `capacity.verify`, `mission.status`

---

## ProofSpecs (13)

```
proofspecs/
  domain_available.v1.json      P1: registrar reports domain registrable
  domain_owned.v1.json          P2: domain owned in account (requires authority)
  dns_configured.v1.json        P3: DNS matches expected config
  email_route_configured.v1.json P4: routing rule covers address
  email_receives.v1.json        P5: nonce round-trip proof
  phone_owned.v1.json           P6: phone provisioned (requires authority)
  handle_available.v1.json      P8: platform reports handle unassigned
  account_owned.v1.json         P9: credential authenticates as account
  handle_bound.v1.json          P10: account bound to handle
  oauth_authorized.v1.json      P11: active auth with required scopes
  can_post.v1.json              P12: authorization permits write
  email_send_accepted.v1.json   P13: provider accepted payload
  email_delivered.v1.json       P14: independent delivery confirmation
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    setup.social                          │
├─────────────────────────────────────────────────────────┤
│  QP KERNEL (qp/)                                       │
│  ├── kernel.ts       Actuality + Claim + Receipt        │
│  ├── judges.ts       6 judges + 3 gates                 │
│  ├── authority.ts    Ed25519 grants                     │
│  ├── identity.ts     Program identity                   │
│  ├── edges.ts        Typed dependency graph             │
│  └── social/         Executor interface + adapters      │
│                                                          │
│  TARGETS (targets/*.json)                               │
│  ├── domain, email, phone (infrastructure)              │
│  └── youtube, instagram, tiktok, x, bluesky (social)   │
│                                                          │
│  RUNTIME (src/)                                         │
│  ├── mcp.ts          37 MCP tools                       │
│  ├── targets.ts      Dependency resolver + costs        │
│  ├── verifiers.ts    QP-backed verifiers                │
│  ├── social-rules.ts Per-platform username rules        │
│  └── capacity.ts     Capacity registry                  │
│                                                          │
│  PROOFS (proofspecs/*.json)                             │
│  └── 13 immutable ProofSpecs                            │
│                                                          │
│  INFRASTRUCTURE                                         │
│  ├── Cloudflare Registrar + Email Routing               │
│  ├── cmail Worker (D1 + R2)                             │
│  ├── Telnyx (phone)                                     │
│  └── Apify (handle checking)                            │
└─────────────────────────────────────────────────────────┘
```

```
SEED NAME → HANDLE CHECK → DOMAIN → EMAIL → ALL SOCIALS (parallel)
   │            │            │        │            │
   │            │            │        │            ├─ 🟢 YouTube (Google API)
   │            │            │        │            ├─ 🟢 Instagram (Meta Graph API)
   │            │            │        │            ├─ 🟢 TikTok (Content Posting API)
   │            │            │        │            ├─ 🟢 X (API v2)
   │            │            │        │            ├─ 🟢 Facebook (Meta bundle)
   │            │            │        │            └─ 🟢 WhatsApp (Meta bundle + phone)
   │            │            │        │
   │            │            │        └─ 🟢 FREE (Cloudflare Email Routing)
   │            │            │
   │            │            └─ 👤 HUMAN: "BUY {domain}" (~$2-10/yr)
   │            │
   │            └─ Apify check (15 platforms) + format validation (10 platforms)
   │
   └─ Human provides seed: "mxthart" → agent finds "mxthartist" works everywhere
```

### The Dependency Chain

```
Step 1: 👤 BUY DOMAIN (human approves)
   ↓
Step 2: 🟢 EMAIL + 👤 PHONE (parallel)
   ↓
Step 3: 🟢 ALL SOCIALS (parallel)
   ├─ Bluesky (API, no captcha)
   ├─ YouTube (Playwright, captcha possible)
   ├─ Instagram (Playwright, captcha likely)
   ├─ TikTok (Playwright, complex captcha)
   ├─ X (Playwright, captcha possible)
   ├─ Facebook (Meta bundle via Instagram)
   └─ WhatsApp (Meta bundle + phone)
```

**Human touches 2 things:** domain purchase + phone purchase. Everything else is agent.

---

## Quick Start

```bash
# Check a handle across all platforms
bash scripts/check-identity.sh mxthartist

# Check with domain
bash scripts/check-identity.sh privatelywin privately.win

# Run the full pipeline
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"pipeline.start","args":{"name":"mxthartist"}}'
```

---

## Cost

| Item | Cost | Notes |
|------|------|-------|
| Domain | $2-10/yr | Cloudflare at-cost |
| Phone | $1/mo | Telnyx (for SMS verification) |
| Email | FREE | Cloudflare Email Routing |
| YouTube | FREE | Data API v3 (10k units/day) |
| Instagram | FREE | Graph API via Meta Business |
| TikTok | FREE | Content Posting API |
| X | FREE | API v2 (50 tweets/mo write) |
| **Total** | **~$14/yr** | |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    setup.social                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  TARGETS (targets/*.json)                                │
│  ├─ domain.json        — Cloudflare domain purchase      │
│  ├─ email.json         — Cloudflare Email Routing        │
│  ├─ phone.json         — Telnyx phone number             │
│  ├─ bluesky.json       — AT Protocol (full auto)         │
│  ├─ youtube.json       — Google OAuth + Data API v3      │
│  ├─ instagram.json     — Meta Business → Graph API       │
│  ├─ facebook.json      — Meta bundle                     │
│  ├─ whatsapp.json      — Meta bundle + phone             │
│  ├─ x.json             — X API v2                        │
│  ├─ tiktok.json        — Content Posting API             │
│  └─ _template.json     — Copy to add new platforms       │
│                                                          │
│  RUNTIME (src/)                                          │
│  ├─ targets.ts         — Dependency resolver + costs     │
│  ├─ verifiers.ts       — QP gate verifiers               │
│  ├─ capacity.ts        — Capacity registry + proofs      │
│  └─ social-rules.ts    — Per-platform username rules     │
│                                                          │
│  PROOFS (scripts/)                                       │
│  ├─ verify-capacity.sh — 7-layer infrastructure proof    │
│  └─ check-identity.sh  — Handle check (Apify + format)  │
│                                                          │
│  INFRASTRUCTURE                                          │
│  ├─ Cloudflare Registrar — domain purchase               │
│  ├─ Cloudflare Email Routing — email receive             │
│  ├─ cmail Worker — email processing + MCP API            │
│  ├─ Telnyx — phone numbers + SMS                         │
│  └─ Apify — social handle checking                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## The Capacity Chain (QP Proofs)

Every step produces a **QP proof** — a deterministic, verifiable record that a capacity is ACTIVE.

```
CAPACITY: have_domain(privately.win)
  PROOF: MX records + CF zone API → all green
  GATES: [dns_valid_v1, cf_zone_active_v1]
  → GRANT: receive_email(*@privately.win)

CAPACITY: receive_email(agents@privately.win)
  PROOF: verify-capacity.sh → 7/7 layers green
  GATES: [email_infrastructure_v1, routing_catchall_v1, worker_live_v1, mailbox_indexed_v1]
  → GRANT: can_signup_service(agents@privately.win, *)

CAPACITY: have_handle(youtube, @privatelywin)
  PROOF: YouTube Data API v3 → channels.list returns data
  GATES: [channel_created_v1, handle_owned_v1]
  → GRANT: can_post(youtube, @privatelywin)
```

**No self-promotion.** Only gates decide truth. Receipts are the sole path from UNKNOWN → ACTIVE.

See `SPEC-QP-CAPACITY-CHAIN.md` for the full QP formalism.

---

## Adding a New Platform

Copy `targets/_template.json`, fill in the blanks:

```json
{
  "id": "target:new_platform",
  "name": "New Platform",
  "captcha_risk": "medium",
  "depends_on": ["target:email"],
  "capabilities_granted": ["have_handle:new_platform"],
  "tasks": [{
    "id": "task:signup_new_platform",
    "type": "agent_or_human",
    "method": "playwright",
    "captcha": true,
    "captcha_action": "ESCALATE_TO_HUMAN",
    "browser_action": {
      "url": "https://platform.com/signup",
      "steps": ["fill email", "fill password", "captcha? → pause"]
    }
  }]
}
```

The agent picks it up automatically. The QP proof system validates it. The dependency grid incorporates it.

See `examples/mxthartist-identity-flow.md` for a complete walkthrough.

---

## Per-Platform Rules

| Platform | Max Length | Allowed Chars | Captcha |
|----------|-----------|---------------|---------|
| Instagram | 30 | `a-z0-9._` | High |
| YouTube | 30 | `a-zA-Z0-9._-` | Medium |
| TikTok | 24 | `a-zA-Z0-9._` | High |
| X | 15 | `a-zA-Z0-9_` | Medium |
| Bluesky | 18 | `a-zA-Z0-9-` | None |
| Facebook | 50 | `a-zA-Z0-9.` | Medium |
| WhatsApp | 25 | `a-zA-Z0-9 .-` | Low |
| Twitch | 25 | `a-zA-Z0-9_` | Low |
| Snapchat | 15 | `a-zA-Z0-9_-` | Medium |
| Telegram | 32 | `a-zA-Z0-9_` | Low |

See `src/social-rules.ts` for validation logic.

---

## API Setup

Each platform requires a one-time setup (~40 min total):

| Platform | Setup Time | What Human Does |
|----------|-----------|----------------|
| YouTube | ~5 min | Create Google Cloud project + OAuth creds |
| Instagram | ~15 min | Create Meta Business + FB App + link IG |
| TikTok | ~10 min | Create developer account + app |
| X | ~10 min | Create developer account + project + app |

After setup, agent handles everything autonomously.

See `docs/API-SETUP-PATHS.md` for exact steps.

---

## Documentation

| Doc | Purpose |
|-----|---------|
| **[GUIDE.md](GUIDE.md)** | Complete journey from name to email |
| **[docs/API-REFERENCE.md](docs/API-REFERENCE.md)** | YouTube, Instagram, TikTok, X API docs |
| **[docs/API-SETUP-PATHS.md](docs/API-SETUP-PATHS.md)** | Exact setup steps for each platform |
| **[docs/MCP_REFERENCE.md](docs/MCP_REFERENCE.md)** | All 34 MCP tools |
| **[docs/EMAIL_VERIFICATION.md](docs/EMAIL_VERIFICATION.md)** | 9-layer email verification |
| **[SPEC-CAPACITY-CHAIN.md](SPEC-CAPACITY-CHAIN.md)** | Capacity chain specification |
| **[SPEC-QP-CAPACITY-CHAIN.md](SPEC-QP-CAPACITY-CHAIN.md)** | QP proof formalism |
| **[SPEC-QP-FULL-CHAIN.md](SPEC-QP-FULL-CHAIN.md)** | Full dependency grid |
| **[SPEC-RESOLUTION-ORDER.md](SPEC-RESOLUTION-ORDER.md)** | Parallel resolution flow |
| **[examples/mxthartist-identity-flow.md](examples/mxthartist-identity-flow.md)** | Example: mxthartist |
| **[examples/privatelywin-identity-flow.md](examples/privatelywin-identity-flow.md)** | Example: privatelywin |
| **[vision.md](vision.md)** | Future extensions |
| **[AGENTS.md](AGENTS.md)** | Operating manual for agents |

---

## Laws

1. **Never buy without asking.** Every purchase needs `confirmed:true`.
2. **DNS lies.** Only the registrar confirms availability.
3. **No claims without proof.** Every capacity has a QP receipt.
4. **Secrets stay safe.** Keys in vault. Never in code.
5. **Agent attempts, human fallback.** Captcha → pause → notify human.
6. **Parallel after infrastructure.** Email + phone unlock everything at once.

---

## Live

**Worker:** `https://cmail.tradesprior.workers.dev`
**MCP:** `https://cmail.tradesprior.workers.dev/mcp`
**Dashboard:** `https://cmail.tradesprior.workers.dev/ui/`
