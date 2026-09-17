```
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   setup.social — Agent Operating Manual                   ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
```

## What This Is

Autonomous social identity pipeline. Seed name → handle check → domain → email → all socials. Agent does everything. Human approves purchases.

## How the System Works

### The Dependency Chain

```
Step 1: 👤 BUY DOMAIN (human: "BUY {domain}")
  ↓ capacity: have_domain
Step 2: 🟢 EMAIL + 👤 PHONE (parallel)
  ↓ capacity: receive_email, have_phone
Step 3: 🟢 ALL SOCIALS (parallel)
  ↓ capacity: have_handle:*
```

**Critical:** Steps 2-3 are PARALLEL. Once email + phone exist, ALL socials unlock simultaneously.

### The QP Proof System

Every capacity produces a QP receipt — deterministic, verifiable, append-only.

```
CAPACITY: have_domain(privately.win)
  EVIDENCE: dig MX + CF zone API
  GATES: [dns_valid_v1, cf_zone_active_v1]
  PROOF_LEVEL: V7
  → GRANT: receive_email(*@privately.win)

CAPACITY: receive_email(agents@privately.win)
  EVIDENCE: verify-capacity.sh (7 layers)
  GATES: [email_infrastructure_v1, routing_catchall_v1, worker_live_v1, mailbox_indexed_v1]
  PROOF_LEVEL: V7
  → GRANT: can_signup_service(agents@privately.win, *)
```

**No self-promotion.** Only gates decide truth. Receipts are the sole path from UNKNOWN → ACTIVE.

### The Target System

Each platform is a JSON file in `targets/`. The agent reads these to know what to do.

```
targets/
  domain.json       → Cloudflare domain purchase (human gate)
  email.json        → Cloudflare Email Routing (full auto)
  phone.json        → Telnyx phone number (human gate)
  bluesky.json      → AT Protocol (full auto, no captcha)
  youtube.json      → Google OAuth + Data API v3 (captcha possible)
  instagram.json    → Meta Business → Graph API (captcha likely)
  facebook.json     → Meta bundle (unlocked via Instagram)
  whatsapp.json     → Meta bundle + phone
  x.json            → X API v2 (captcha possible)
  tiktok.json       → Content Posting API (complex captcha)
  _template.json    → Copy to add new platforms
```

### Autonomy Rules

| Class | Behavior |
|-------|----------|
| 🟢 Agent Guaranteed | No captcha, direct API — agent does it |
| 🟡 Agent Or Human | Captcha possible — agent tries, pauses on captcha |
| 👤 Human Gate | Purchase — human types confirm text |

**Captcha rule:** Agent NEVER tries to solve captcha. If captcha appears → pause → notify human → human completes → agent resumes.

## Standing Laws

1. **NEVER buy without explicit human `confirmed:true`** — domains, phones, sends.
2. **DNS suggests, registrar decides.** Only `cf_check.registrable:true` is truth.
3. **No claims without proof.** Every capacity needs a QP receipt.
4. **Secrets stay safe.** Keys in vault. Never in code.
5. **Agent attempts, human fallback.** Captcha → pause → notify.
6. **Parallel after infrastructure.** Email + phone unlock everything at once.

## Costs

| Item | Cost | Required? |
|------|------|-----------|
| Domain | $2-10/yr | Yes (Cloudflare at-cost) |
| Phone | $1/mo | Only for X/TikTok/YouTube SMS verify |
| Email | FREE | Cloudflare Email Routing |
| All socials | FREE | — |
| **Minimum** | **~$14/yr** | domain + phone |
| **Without phone** | **~$2/yr** | domain only (Bluesky + npm) |

## The Chain in Code

```typescript
// 1. Load targets
import { loadAllTargets, resolveLayers } from './src/targets';
const layers = resolveLayers(['target:domain', 'target:email', 'target:phone', 'target:youtube', 'target:instagram', 'target:tiktok', 'target:x']);
// → [['target:domain'], ['target:email', 'target:phone'], ['target:youtube', 'target:instagram', 'target:tiktok', 'target:x']]

// 2. Check handle availability
import { findUniversalHandle } from './src/social-rules';
const best = findUniversalHandle(['mxthartist', 'mxthart']);
// → { handle: 'mxthartist', valid_on: ALL_PLATFORMS }

// 3. Verify capacity
bash scripts/verify-capacity.sh privately.win agents@privately.win
// → VERDICT: CERTIFIED (7/7 layers green)

// 4. Run identity check
bash scripts/check-identity.sh privatelywin privately.win
// → Apify: 11 available, Format: 10/10 valid, Domain: $4.18/yr
```

## Secrets (agent-vault oracle)

```
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
APIFY_TOKEN, TELNYX_API_KEY
GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN
TIKTOK_CLIENT_KEY, TIKTKOK_CLIENT_SECRET
X_CLIENT_ID, X_CLIENT_SECRET, X_BEARER_TOKEN
```

## Key Files

| File | Purpose |
|------|---------|
| `targets/*.json` | Platform definitions (11 targets) |
| `src/targets.ts` | Dependency resolver + cost calculator |
| `src/verifiers.ts` | QP gate verifiers (pure functions) |
| `src/capacity.ts` | Capacity registry + proof generation |
| `src/social-rules.ts` | Per-platform username rules |
| `scripts/verify-capacity.sh` | 7-layer infrastructure proof |
| `scripts/check-identity.sh` | Handle check (Apify + format + domain) |
| `docs/API-REFERENCE.md` | YouTube, Instagram, TikTok, X API docs |
| `docs/API-SETUP-PATHS.md` | Exact setup steps per platform |
| `SPEC-QP-FULL-CHAIN.md` | Full dependency grid + QP formalism |
| `examples/*.md` | Complete walkthrough examples |

## Deployed

- **Worker:** `https://cmail.tradesprior.workers.dev`
- **MCP:** `https://cmail.tradesprior.workers.dev/mcp`
- **Dashboard:** `https://cmail.tradesprior.workers.dev/ui/`

## Extending the System

Add a new platform = copy `targets/_template.json`, fill in blanks. Agent picks it up automatically.

The QP proof system validates it. The dependency grid incorporates it. The cost calculator includes it. No code changes needed.
