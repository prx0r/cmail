# Capacity Chain Spec — Autonomous Agent Commerce Pipeline

## The Problem

cmail has the pieces (domain buy, email wire, social checks, task deps) but they're disconnected. The pipeline creates tasks and then... nothing happens. No auto-advancement, no proofs, no capacity tracking, no human queue. We need a **closed-loop system** where:

1. Agent does everything it can autonomously
2. Human approval gates are explicit, queued, and dependency-aware
3. Every completed step produces a **deterministic proof** that downstream steps inherit
4. The whole thing is a single DAG with receipts at every node

---

## Core Concepts

### 1. Capacity

A **capacity** is a boolean capability the system can prove it has. Capacities are the building blocks — missions require them, proofs verify them.

```typescript
interface Capacity {
  id: string;                    // "cap:email:agents@privately.win"
  type: CapacityType;            // see below
  domain?: string;               // the domain this capacity is on
  address?: string;              // email/phone/handle
  status: "unknown" | "pending" | "active" | "failed";
  proof?: CapacityProof;         // the proof that it works
  created: number;
  verified_at?: number;
}

type CapacityType =
  | "have_domain"        // owned + DNS active
  | "receive_email"      // can receive inbound email
  | "receive_sms"        // can receive SMS
  | "have_phone"         // own a phone number
  | "have_handle"        // own a social handle
  | "can_send_email"     // can send outbound (requires Workers Paid)
  | "can_send_sms"       // can send SMS via Telnyx
  | "have_cloudflare_zone"; // zone exists in our CF account
```

### 2. Proof (QP-style)

A **proof** is a deterministic, verifiable record that a capacity is real. The format is borrowed from agentcomfinal's QP adapter — CLAIM → TASK → EVIDENCE → GRANT.

```typescript
interface CapacityProof {
  type: string;                  // "email_roundtrip" | "dns_verify" | "api_check" | "manual_attest"
  evidence: string;              // the raw evidence (email content, DNS output, API response)
  evidence_hash: string;         // SHA-256 of evidence
  timestamp: number;             // when proof was generated
  verifier: string;              // "automated" | "human:<id>"
  expires?: number;              // proof expiry (e.g., weekly re-verify)
}
```

#### Proof Types

| Capacity | Proof Method | Evidence |
|----------|-------------|----------|
| `have_domain` | `dig MX <domain>` + RDAP check | DNS output + registrar response |
| `receive_email` | Send exact token to `<addr>@<domain>`, poll inbox, match token | `{token, subject, received_at, message_id}` |
| `receive_sms` | Send exact token to phone, read via Telnyx | `{token, from, body, timestamp}` |
| `have_phone` | List purchased numbers via Telnyx API | `{number, features, monthly_cost}` |
| `have_handle` | HTTP check on platform (status code + body marker) | `{platform, status, marker_found}` |
| `can_send_email` | Send test email, verify delivery | `{to, message_id, delivery_status}` |
| `have_cloudflare_zone` | CF API zone check | `{zone_id, status, name_servers}` |

#### Proof Chain

Proofs **inherit**. If you have `have_domain:privately.win`, and you prove `receive_email:agents@privately.win`, the email proof **embeds** the domain proof's hash:

```typescript
interface ChainedProof extends CapacityProof {
  depends_on?: string;           // hash of parent proof
  chain: string[];               // full ancestry: [domain_proof_hash, email_proof_hash, ...]
}
```

This means: "I can receive email at `agents@privately.win` BECAUSE I own `privately.win` (proven) AND email routing is configured (proven) AND this exact message arrived (proven)."

### 3. Mission

A **mission** is a high-level goal that decomposes into required capacities. Missions are what the human sees. Capacities are what the system tracks.

```typescript
interface Mission {
  id: string;                    // "mission:setup-privately-win"
  name: string;                  // "Set up privately.win"
  domain: string;                // "privately.win"
  status: "planning" | "executing" | "waiting_human" | "complete" | "failed";
  phases: MissionPhase[];
  created: number;
  updated: number;
}

interface MissionPhase {
  id: string;                    // "phase:email-setup"
  name: string;                  // "Email Setup"
  required_capacities: string[]; // ["cap:have_domain:privately.win", "cap:receive_email:agents@privately.win"]
  tasks: string[];               // task IDs
  status: "pending" | "active" | "complete" | "blocked";
}
```

### 4. Human Queue

The **human queue** is a prioritized list of actions only a human can take. Each entry shows:
- What needs to happen
- What it unblocks (downstream capacities/missions)
- The approval format (exact text to type)
- Expiry

```typescript
interface HumanAction {
  id: string;                    // "HA-001"
  kind: "approve_purchase" | "provide_credential" | "manual_verify" | "sign_up";
  summary: string;               // "Buy privately.win for $8.03"
  unblocks: string[];            // task IDs this enables
  required_capacities: string[]; // what this creates
  approval_format: string;       // "confirm BUY privately.win"
  cost?: { amount: number; currency: string };
  expires: number;
  status: "pending" | "approved" | "executed" | "expired";
  receipts: Proof[];
}
```

---

## The Chain

Here's how it works end-to-end for a name like `privately.win`:

```
PHASE 0: RECON (agent, autonomous)
├── name.search("privately")          → domain prices
├── name.social("privately")          → handle availability
├── name.cf_check("privately.win")    → registrable: true
└── Capacity: none yet (just intel)

PHASE 1: DOMAIN (human approval → agent executes)
├── HUMAN: "Buy privately.win for $8.03"
│   └── approval_format: "confirm BUY privately.win"
├── agent: name.cf_purchase(confirmed:true)
├── PROOF: { type: "api_check", evidence: CF registration receipt }
├── Capacity: have_domain:privately.win → ACTIVE
└── Capacity: have_cloudflare_zone:privately.win → ACTIVE

PHASE 2: EMAIL (agent, autonomous — depends on Phase 1)
├── agent: name.wire_email(domain:"privately.win", confirmed:true)
├── PROOF: { type: "dns_verify", evidence: MX + routing rules output }
├── Capacity: receive_email:agents@privately.win → PENDING
│
├── PROOF: { type: "email_roundtrip", evidence: {token, subject, received_at} }
│   └── depends_on: [domain_proof_hash]
│   └── chain: [domain_proof_hash]
└── Capacity: receive_email:agents@privately.win → ACTIVE

PHASE 3: SOCIALS (agent, autonomous — depends on Phase 2)
├── For each platform (github, x, youtube, npm, etc.):
│   ├── agent: sign up using agents@privately.win
│   ├── PROOF: { type: "api_check", evidence: account creation response }
│   └── Capacity: have_handle:<platform>:privately → ACTIVE
└── All social signups are parallel (all blocked on email capacity)

PHASE 4: PHONE (human approval → agent executes)
├── HUMAN: "Buy +1-XXX-XXXX for $1/mo"
│   └── approval_format: "confirm PHONE +1-XXX-XXXX"
├── agent: name.phone_purchase(confirmed:true)
├── PROOF: { type: "api_check", evidence: Telnyx purchase receipt }
└── Capacity: have_phone:privately.win → ACTIVE
```

### Dependency Graph

```
                    ┌─────────────────┐
                    │  name.search()  │ (no proof needed, just intel)
                    │  name.social()  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  HUMAN: Buy     │
                    │  domain $8.03   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  have_domain    │  PROOF: CF registration receipt
                    │  privately.win  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  wire_email()   │  PROOF: DNS MX + routing output
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ receive_email   │  PROOF: round-trip token match
                    │ agents@...win   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐  ┌──────▼──────┐  ┌───▼────────┐
     │  github    │  │     x       │  │  youtube   │
     │  signup    │  │   signup    │  │  signup    │
     └────────────┘  └─────────────┘  └────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │  HUMAN: Buy     │
                    │  phone $1/mo    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  have_phone     │  PROOF: Telnyx receipt
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  MISSION        │
                    │  COMPLETE       │
                    └─────────────────┘
```

---

## Proof Verification

Each proof type has a deterministic verifier. The verifier is a **pure function** that takes evidence and returns pass/fail.

### Verifier Format

```typescript
// Verifier: (evidence: string) => { pass: boolean; reason?: string }
// Each capacity type has exactly one verifier.

const VERIFIERS: Record<string, (evidence: string) => { pass: boolean; reason?: string }> = {
  "email_roundtrip": (evidence) => {
    // evidence = JSON {token: "CMAIL-TEST-XXXX", subject: "...", received_at: "...", message_id: "..."}
    const e = JSON.parse(evidence);
    if (!e.token || !e.token.startsWith("CMAIL-TEST-")) return { pass: false, reason: "invalid token format" };
    if (!e.message_id) return { pass: false, reason: "no message_id" };
    const age = Date.now() - new Date(e.received_at).getTime();
    if (age > 600_000) return { pass: false, reason: "proof expired ( >10min )" }; // 10 min
    return { pass: true };
  },

  "dns_verify": (evidence) => {
    // evidence = raw dig output + CF API response
    const hasMX = /route\d+\.mx\.cloudflare\.net/.test(evidence);
    const hasSPF = /v=spf1/.test(evidence);
    return hasMX && hasSPF
      ? { pass: true }
      : { pass: false, reason: `MX: ${hasMX}, SPF: ${hasSPF}` };
  },

  "api_check": (evidence) => {
    // evidence = JSON API response
    try {
      const r = JSON.parse(evidence);
      return r.ok !== false
        ? { pass: true }
        : { pass: false, reason: r.error || "API returned ok:false" };
    } catch {
      return { pass: false, reason: "invalid JSON evidence" };
    }
  },

  "manual_attest": (evidence) => {
    // evidence = human-provided text with timestamp
    return evidence.length > 10
      ? { pass: true }
      : { pass: false, reason: "attestation too short" };
  },
};
```

### Verification Flow

```
1. Agent completes action (e.g., receives email)
2. Agent generates evidence (raw data from the action)
3. Evidence is hashed: SHA-256(evidence) → evidence_hash
4. Verifier runs: VERIFIERS[type](evidence) → {pass, reason}
5. If pass: Capacity status → ACTIVE, proof stored
6. If fail: Capacity status → FAILED, reason logged, retry or escalate
7. Downstream capacities check their dependencies' proofs before attempting
```

---

## The Human Queue (Dashboard)

The dashboard is split into 3 zones:

```
┌─────────────────────────────────────────────────────────────┐
│  ZONE 1: CAPACITY MAP (left 2/3)                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ have_domain  │──│ receive_email│──│  github ✓    │     │
│  │ privately.win│  │ agents@...win│  │  @privately  │     │
│  │ ✓ PROOF: ... │  │ ✓ PROOF: ... │  │  ✓ PROOF:... │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  x ✓        │  │  youtube     │  │  have_phone  │     │
│  │  @privately  │  │  ⏳ blocked  │  │  ⏳ waiting  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ZONE 2: HUMAN QUEUE (right 1/3)                           │
│                                                             │
│  ┌──────────────────────────────────────┐                  │
│  │ 🔴 BUY DOMAIN                        │                  │
│  │ privately.win — $8.03/yr             │                  │
│  │ Unlocks: receive_email, all socials  │                  │
│  │                                      │                  │
│  │ > confirm BUY privately.win          │                  │
│  │                                      │                  │
│  │ [APPROVE]  [SKIP]  [REJECT]         │                  │
│  └──────────────────────────────────────┘                  │
│                                                             │
│  ┌──────────────────────────────────────┐                  │
│  │ 🟡 BUY PHONE (blocked on domain)    │                  │
│  │ +1-XXX-XXXX — $1.00/mo              │                  │
│  │ Unlocks: SMS verification            │                  │
│  │ ⏳ waiting for: have_domain          │                  │
│  └──────────────────────────────────────┘                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ZONE 3: PROOF LOG (bottom)                                │
│                                                             │
│  [10:42:31] PASS dns_verify: MX route2.mx.cloudflare.net   │
│  [10:42:32] PASS api_check: CF zone active                 │
│  [10:43:01] PASS email_roundtrip: token CMAIL-TEST-7X2K    │
│  [10:43:05] FAIL social:github — rate limited, retry 30s   │
│  [10:43:35] PASS social:github: @privately available        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Approval Flow

1. Agent needs human action → creates `HumanAction` entry
2. Entry appears in Zone 2 with:
   - What to do
   - What it costs
   - What it unblocks
   - **Exact approval text** (copy-paste ready)
3. Human types the approval text (or clicks APPROVE)
4. Agent receives approval, executes the action
5. Agent generates proof, updates capacity
6. Downstream tasks auto-unblock

---

## What Needs to Change in cmail

### New Files

| File | Purpose |
|------|---------|
| `src/capacity.ts` | Capacity registry, proof generation, verifier dispatch |
| `src/proofs.ts` | Proof types, chaining, verification |
| `src/missions.ts` | Mission decomposition, phase tracking |
| `src/human-queue.ts` | Human action queue, approval flow |
| `src/verifiers.ts` | Deterministic proof verifiers (pure functions) |
| `src/dashboard.ts` | HTML dashboard (Zone 1/2/3 layout) |

### Modified Files

| File | Change |
|------|--------|
| `src/tasks.ts` | Add `capacity_id` field, auto-transition on proof, persist to D1 |
| `src/pipeline.ts` | Use missions instead of raw tasks, wire capacities |
| `src/mcp.ts` | Add tools: `capacity.list`, `capacity.proof`, `mission.status`, `human.approve` |
| `src/index.ts` | Add `/dashboard` route, `/api/capacities`, `/api/human-queue` |

### New MCP Tools

| Tool | Purpose |
|------|---------|
| `capacity.list` | List all capacities + status + proofs |
| `capacity.proof` | Get proof for a specific capacity |
| `capacity.verify` | Re-run verifier on a capacity |
| `mission.list` | List all missions + phases |
| `mission.start` | Create a new mission from a name |
| `mission.status` | Get mission progress + blocked phases |
| `human queue` | List pending human actions |
| `human.approve` | Approve a human action (triggers execution) |

---

## Hard Rule: No Purchases Without Approval

This is enforced at 3 levels:

1. **Code level**: `name.cf_purchase` requires `confirmed:true` AND `confirm_text:"BUY {domain}"`. No bypass.
2. **Capacity level**: `have_domain` capacity can only transition to ACTIVE via a proof that includes a `HumanAction` receipt. Self-generated proofs without human approval are INVALID.
3. **Dashboard level**: Purchase actions appear in Zone 2 (human queue) only. Agent cannot execute them from Zone 1 (capacity map).

The agentcomfinal kernel's `$8.50 incident` is the reference case: agent manufactured its own authorization context. The fix was `human_principal_only` flag + HMAC-signed approval tokens + `FakeCloudflareRegistrar` for testing. We adopt the same pattern.

---

## Testing Without Purchasing

For testing the full chain without spending money:

1. **Use `FakeCloudflareRegistrar`** (from agentcom kernel) — mimics CF API, returns fake zone IDs
2. **Use `email.roundtrip` with local worker** — send test email to `test@intelligentothers.xyz` (already working)
3. **Proof verifiers are pure functions** — test with synthetic evidence strings
4. **Capacity transitions are deterministic** — mock the proofs, verify the state machine

Test commands:
```bash
# Test proof generation + verification
npx vitest run --grep "capacity"

# Test human queue flow
npx vitest run --grep "human-queue"

# Test mission decomposition
npx vitest run --grep "missions"

# Live test with existing domain (no purchase needed)
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"capacity.list"}'

# Live test email round-trip on intelligentothers.xyz
curl -X POST https://cmail.tradesprior.workers.dev/mcp \
  -d '{"tool":"capacity.verify","args":{"capacity_id":"cap:receive_email:agents@intelligentothers.xyz"}}'
```

---

## Reusable Patterns from agentcom Kernel

### From `agentcom/kernel/approvals/__init__.py` (290 lines)

Adopt as-is for TypeScript port:

```typescript
// Key invariant: agents REQUEST, humans APPROVE
// Binding hash prevents parameter tampering
// Single-use + expiry + amount bounds

interface Approval {
  approval_id: string;        // "APR-" + hex
  task_id: string;
  action: string;             // "domain.purchase"
  resource: string;           // "cloudflare/domain/privately.win"
  provider: string;
  max_amount?: number;
  currency: string;
  parameters: Record<string, any>;
  expires_at: number;
  single_use: boolean;
  created_by: string;         // "agent:cmail" or "human:tom"
  approved_by?: string;       // MUST be "human:*" for financial actions
  status: "pending" | "approved" | "consumed" | "expired" | "revoked";
}
```

Rule from $8.50 incident: Agent manufactured authorization, created approval, executed purchase. Fix:
- `human_principal_only` flag on FINANCIAL actions
- Binding hash on parameters (replay detection)
- `FakeCloudflareRegistrar` for testing

### From `agentcom/kernel/adapters/fake_cloudflare.py` (120 lines)

Use for testing without purchases:

```typescript
class FakeCloudflareRegistrar {
  check(domain) -> {registrable: true, pricing: {...}}
  purchase(domain) -> {success: true, charged: 0.0, note: "SIMULATED"}
  wire_email(domain) -> {success: true, zone_id: "fake-zone-...", email_routing: true}
  audit_log() -> all simulated API calls
}
```

This is the testing backbone. Every capacity proof can be generated against the fake registrar. The full chain runs without spending $0.01.

### From `agentcom/kernel/adapters/cmail_adapter.py` (248 lines)

Tool -> Capability Gate mapping:

```typescript
const TOOL_MAP = {
  "name.search":       { action: "domain.check",   sideEffect: "PURE" },
  "name.cf_check":     { action: "domain.check",   sideEffect: "PURE" },
  "name.cf_purchase":  { action: "domain.purchase", sideEffect: "FINANCIAL" },
  "name.wire_email":   { action: "email.write",    sideEffect: "REVERSIBLE" },
  "name.phone_search": { action: "phone.search",   sideEffect: "PURE" },
  "name.phone_purchase":{ action: "phone.purchase", sideEffect: "FINANCIAL" },
  "email.send":        { action: "email.send",     sideEffect: "EXTERNAL" },
};
```

Every `FINANCIAL` or `EXTERNAL` side effect automatically queues to human queue.

---

## Session Rule: No Purchases

Hardcoded for this session (and recommended as default for new domains):

```typescript
// In mcp.ts -- override cf_purchase to always reject real purchases
case "name.cf_purchase": {
  if (args.confirmed) {
    return Response.json({
      error: "PURCHASES DISABLED IN THIS SESSION",
      note: "Set PURCHASES_ENABLED=true in env to enable. This is a safety gate.",
      domain: args.domain,
      mode: "blocked",
    });
  }
  // ... existing preview logic
}
```

The FakeCloudflareRegistrar handles testing. Real purchases only happen when:
1. `PURCHASES_ENABLED=true` is explicitly set in wrangler.toml `[vars]`
2. Human types the exact `confirm_text`
3. Approval is logged in audit trail

---

## D1 Migration for Capacities + Proofs

```sql
CREATE TABLE IF NOT EXISTS capacities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  domain TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  proof_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at TEXT
);

CREATE TABLE IF NOT EXISTS proofs (
  id TEXT PRIMARY KEY,
  capacity_id TEXT NOT NULL REFERENCES capacities(id),
  type TEXT NOT NULL,
  evidence TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  depends_on TEXT,
  chain TEXT NOT NULL DEFAULT '[]',
  verifier TEXT NOT NULL,
  pass INTEGER NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS human_actions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  unblocks TEXT NOT NULL DEFAULT '[]',
  required_capacities TEXT NOT NULL DEFAULT '[]',
  approval_format TEXT NOT NULL,
  cost_amount REAL,
  cost_currency TEXT,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approval_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  phases TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## Implementation Order

1. **`src/capacity.ts`** -- Capacity registry + types (standalone, no deps)
2. **`src/verifiers.ts`** -- Pure function verifiers (testable immediately)
3. **`src/proofs.ts`** -- Proof generation + chaining
4. **`src/human-queue.ts`** -- Human action queue
5. **`src/missions.ts`** -- Mission decomposition (uses capacity + tasks)
6. **`src/dashboard.ts`** -- HTML UI (Zone 1/2/3)
7. **Wire into `mcp.ts`** -- New MCP tools
8. **Wire into `pipeline.ts`** -- Replace raw tasks with missions
9. **Persist to D1** -- Migration for capacities + proofs + human_actions
10. **Tests** -- Verifiers first, then integration
