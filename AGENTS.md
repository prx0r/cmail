```
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   setup.social — Agent Operating Manual                   ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
```

## What This Is

Autonomous social identity pipeline. Seed name → handle check → domain → email → all socials. Agent does everything. Human approves purchases.

## The Constitutional Boundary

**QP is the only way to cause consequential effects.** MCP creates proposals + grants. QP executes. No direct provider mutators.

```
AGENT → proposal + grant → QP EFFECT GATEWAY → adapter → readback → receipt
```

The effect gateway (`qp/effects.ts`) is the constitutional boundary. Everything flows through it.

## How the System Works

### The Dependency Chain

```
Step 1: 👤 BUY DOMAIN (human: "BUY {domain}")
  ↓ capacity: have_domain (QP receipt)
Step 2: 🟢 EMAIL + 👤 PHONE (parallel)
  ↓ capacity: receive_email, have_phone (QP receipts)
Step 3: 🟢 ALL SOCIALS (parallel)
  ↓ capacity: have_handle:* (QP receipts)
```

**Critical:** Steps 2-3 are PARALLEL. Once email + phone exist, ALL socials unlock simultaneously.

### The QP Proof System

Every capacity produces a QP receipt — deterministic, verifiable, append-only.

```
Agent proposes → QP validates authority → executes via adapter →
independent readback → judges evaluate → TRUE/FALSE/UNKNOWN →
TransitionReceipt → canonical state
```

**Key invariant:** Postiz says success → that's evidence. QP asks the platform independently → that's proof.

### The Effect Gateway

The ONE entry point for consequential actions:

```
MCP creates proposal + grant
  → executeEffect()
  → validates grant (Ed25519 signature)
  → reserves grant (atomic, single-use)
  → executes via adapter (Postiz/direct)
  → independent readback (NOT from adapter)
  → judges readback evidence
  → settles: TRUE/FALSE/UNKNOWN receipt
```

No direct provider mutators from MCP. Everything through QP.

## Standing Laws

1. **NEVER buy without explicit human `confirmed:true`** — domains, phones, sends.
2. **DNS lies.** Only `cf_check.registrable:true` is truth.
3. **No claims without proof.** Every capacity needs a QP receipt.
4. **Secrets stay safe.** Keys in vault. Never in code.
5. **Agent attempts, human fallback.** Captcha → pause → notify.
6. **Parallel after infrastructure.** Email + phone unlock everything.
7. **QP is constitutional.** No consequential effect bypasses the gateway.
8. **Postiz is executor, not kernel.** Never trust adapter success state.
9. **Capabilities, not credentials.** Agents get `social.youtube.channel[UC123].post_video`.
10. **UNKNOWN never coerces.** Network timeout ≠ FALSE. Missing data ≠ FALSE.

## Costs

| Item | Cost | Required? |
|------|------|-----------|
| Domain | $2-10/yr | Yes (Cloudflare at-cost) |
| Phone | $1/mo | Only for X/TikTok/YouTube SMS verify |
| Email | FREE | Cloudflare Email Routing |
| All socials | FREE | — |
| **Minimum** | **~$14/yr** | domain + phone |
| **Without phone** | **~$2/yr** | domain only |

## Adding New Platforms (QP-Native)

The process is formulaic. One JSON file = agent knows what to do.

### Step 1: Copy template
```bash
cp targets/_template.json targets/newplatform.json
```

### Step 2: Fill in the JSON
```json
{
  "id": "target:newplatform",
  "name": "New Platform",
  "captcha_risk": "medium",
  "depends_on": ["target:email"],
  "capabilities_granted": ["have_handle:newplatform"],
  "tasks": [{
    "id": "task:signup_newplatform",
    "type": "agent_or_human",
    "method": "playwright",
    "captcha": true,
    "captcha_action": "ESCALATE_TO_HUMAN",
    "browser_action": {
      "url": "https://platform.com/signup",
      "steps": ["fill email", "fill password", "captcha? → pause"]
    },
    "verification": { "method": "email", "inbox": "agents@{domain}" }
  }]
}
```

### Step 3: Add QP ProofSpec (if new capacity type)
```json
{
  "protocol": "qp/1",
  "spec_id": "new_platform_owned",
  "version": 1,
  "judges": [{ "id": "judge_new_platform", "program_hash": "..." }],
  "gates": [{ "id": "all_judges_pass", "required": true }],
  "freshness": { "platform_readback": 3600 },
  "proof_requirement": "TRUE"
}
```

### Step 4: Add username rules (if new format)
```typescript
// In src/social-rules.ts, add to PLATFORM_RULES:
{
  platform: "newplatform",
  min_length: 3,
  max_length: 20,
  allowed_pattern: /^[a-z0-9_]+$/,
  requires_verification: "email",
  signup_method: "playwright",
  captcha_risk: "medium",
}
```

### Step 5: Agent picks it up automatically
The orchestrator resolves the dependency graph. The QP system validates proofs. The human queue shows any steps needing approval.

## Key Files

| File | Purpose |
|------|---------|
| `qp/effects.ts` | The constitutional boundary — effect gateway |
| `qp/kernel.ts` | QP core (Actuality, Claim, ProofSpec, Receipt, Replay) |
| `qp/judges.ts` | 6 judges + 3 gates |
| `qp/authority.ts` | Ed25519 grants |
| `qp/social/executor.ts` | SocialExecutor interface + PostizAdapter |
| `targets/*.json` | Platform definitions (11 targets) |
| `src/mcp.ts` | 37 MCP tools |
| `src/verifiers.ts` | QP-backed verifiers |
| `src/targets.ts` | Dependency resolver + costs |
| `scripts/check-identity.sh` | Handle availability check |
| `scripts/verify-capacity.sh` | Infrastructure proof |
| `proofspecs/*.json` | 13 immutable ProofSpecs |

## Deployed

- **Worker:** `https://cmail.tradesprior.workers.dev`
- **MCP:** `https://cmail.tradesprior.workers.dev/mcp`
- **Dashboard:** `https://cmail.tradesprior.workers.dev/ui/`

## Peer Review Status

| Item | Status |
|------|--------|
| P0-1: Auth spoof | ✅ Fixed |
| P0-2: Effect gateway | ✅ Fixed |
| P0-3: Fabricated evidence | ✅ Fixed |
| Kernel 1.1: Judge hashes | ✅ Fixed |
| Kernel 1.6: State transition | ✅ Fixed |
| Kernel 1.2: actuality_dag | ⏳ Next |
| Kernel 1.3: Evidence integrity | ⏳ Next |
| Kernel 1.4: Freshness strict | ⏳ Next |
| Kernel 1.5: Claim bound to root | ⏳ Next |
